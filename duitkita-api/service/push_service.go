package service

import (
	"context"
	"encoding/json"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"duitkita-api/config"
	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

// pushSendTimeout bounds each individual Web Push HTTP call. Dispatch
// already runs off the request path (via Cloud Tasks or the inline
// fallback), but a per-call timeout still keeps one unreachable push
// service from stalling the whole fan-out when a user has several devices
// subscribed.
const pushSendTimeout = 10 * time.Second

type PushService interface {
	// PublicKey returns the VAPID public key the frontend passes to
	// pushManager.subscribe(). Empty when push isn't configured.
	PublicKey() string
	Subscribe(ctx context.Context, userID string, req request.SubscribePushRequest) error
	Unsubscribe(ctx context.Context, userID string, endpoint string) error
	// Dispatch sends a push for an already-created notification to every
	// device the owning user has subscribed, skipping it entirely if
	// they've turned that notification type off. It's the job body behind
	// both the Cloud Tasks callback and the inline dev fallback — never
	// called directly from a user-facing request.
	Dispatch(ctx context.Context, notificationID string) error
}

type pushService struct {
	subRepo   repository.PushSubscriptionRepository
	notifRepo repository.NotificationRepository
	prefRepo  repository.NotificationPreferenceRepository
	vapid     config.VAPIDConfig
}

func NewPushService(subRepo repository.PushSubscriptionRepository, notifRepo repository.NotificationRepository, prefRepo repository.NotificationPreferenceRepository, vapid config.VAPIDConfig) PushService {
	return &pushService{subRepo: subRepo, notifRepo: notifRepo, prefRepo: prefRepo, vapid: vapid}
}

func (s *pushService) configured() bool {
	return s.vapid.PublicKey != "" && s.vapid.PrivateKey != ""
}

func (s *pushService) PublicKey() string {
	if !s.configured() {
		return ""
	}
	return s.vapid.PublicKey
}

func (s *pushService) Subscribe(ctx context.Context, userID string, req request.SubscribePushRequest) error {
	if !s.configured() {
		return utils.ErrConflict("push notifications are not configured on this server")
	}

	sub := &domain.PushSubscription{
		ID:       uuid.NewString(),
		UserID:   userID,
		Endpoint: req.Endpoint,
		P256dh:   req.Keys.P256dh,
		Auth:     req.Keys.Auth,
	}
	if err := s.subRepo.Upsert(ctx, sub); err != nil {
		return utils.ErrInternal("failed to save push subscription")
	}
	return nil
}

func (s *pushService) Unsubscribe(ctx context.Context, userID string, endpoint string) error {
	if err := s.subRepo.DeleteByEndpoint(ctx, userID, endpoint); err != nil {
		return utils.ErrInternal("failed to remove push subscription")
	}
	return nil
}

func (s *pushService) Dispatch(ctx context.Context, notificationID string) error {
	if !s.configured() {
		return nil
	}

	notification, err := s.notifRepo.FindByID(ctx, notificationID)
	if err != nil {
		return utils.ErrInternal("failed to load notification")
	}
	if notification == nil {
		// Already gone (e.g. swept by retention cleanup before the task
		// ran) — nothing to push, and not worth retrying.
		return nil
	}

	enabled, err := s.preferenceEnabled(ctx, notification.UserID, notification.Type)
	if err != nil {
		return err
	}
	if !enabled {
		return nil
	}

	subs, err := s.subRepo.FindAllByUserID(ctx, notification.UserID)
	if err != nil {
		return utils.ErrInternal("failed to load push subscriptions")
	}
	if len(subs) == 0 {
		return nil
	}

	payload, err := json.Marshal(map[string]string{
		"notification_id": notification.ID,
		"type":            string(notification.Type),
		"title":           notification.Title,
		"body":            notification.Body,
	})
	if err != nil {
		return utils.ErrInternal("failed to encode push payload")
	}

	// Sequential, not fanned out: a user realistically has a handful of
	// subscribed devices, so the bounded per-call timeout above already
	// caps the worst case (handful × 10s) well under what a background
	// job can afford, and it avoids the complexity of coordinating
	// concurrent deletes against the same subscription set.
	for i := range subs {
		s.sendOne(ctx, &subs[i], payload)
	}

	return nil
}

func (s *pushService) sendOne(ctx context.Context, sub *domain.PushSubscription, payload []byte) {
	sendCtx, cancel := context.WithTimeout(ctx, pushSendTimeout)
	defer cancel()

	resp, err := webpush.SendNotificationWithContext(sendCtx, payload, &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys:     webpush.Keys{P256dh: sub.P256dh, Auth: sub.Auth},
	}, &webpush.Options{
		Subscriber:      s.vapid.Subject,
		VAPIDPublicKey:  s.vapid.PublicKey,
		VAPIDPrivateKey: s.vapid.PrivateKey,
		TTL:             3600,
		Urgency:         webpush.UrgencyNormal,
	})
	if err != nil {
		log.Warn().Err(err).Str("subscription_id", sub.ID).Msg("push send failed")
		return
	}
	defer resp.Body.Close()

	// 404/410 means the push service itself says this endpoint is gone
	// (uninstalled, browser data cleared, etc.) — clean it up now instead
	// of paying for a failed HTTP round trip on every future notification.
	if resp.StatusCode == 404 || resp.StatusCode == 410 {
		if err := s.subRepo.Delete(context.Background(), sub.ID); err != nil {
			log.Error().Err(err).Str("subscription_id", sub.ID).Msg("failed to remove expired push subscription")
		}
		return
	}
	if resp.StatusCode >= 300 {
		log.Warn().Int("status", resp.StatusCode).Str("subscription_id", sub.ID).Msg("push service rejected notification")
	}
}

var notificationTypePreferenceKey = map[domain.NotificationType]domain.NotificationPreferenceKey{
	domain.NotificationTypeRecurringExpense: domain.PreferenceRecurringAlert,
	domain.NotificationTypeBillReminder:     domain.PreferenceReminderAlert,
	domain.NotificationTypeBudgetAlert:      domain.PreferenceBudgetAlert,
	domain.NotificationTypePartnerActivity:  domain.PreferencePartnerActivity,
	domain.NotificationTypeWeeklySummary:    domain.PreferenceWeeklySummary,
}

// preferenceEnabled checks only whether this notification should also go
// out as a *push* — the in-app notification row is written regardless, so
// turning a push category off still leaves it visible in the in-app list.
func (s *pushService) preferenceEnabled(ctx context.Context, userID string, notifType domain.NotificationType) (bool, error) {
	key, ok := notificationTypePreferenceKey[notifType]
	if !ok {
		return true, nil
	}

	rows, err := s.prefRepo.FindAllByUserID(ctx, userID)
	if err != nil {
		return false, utils.ErrInternal("failed to load notification preferences")
	}
	for _, row := range rows {
		if row.Key == key {
			return row.Enabled, nil
		}
	}
	// No row yet means the user never touched this toggle — defaults to
	// enabled, same as GetPreferences/buildPreferenceResponse.
	return true, nil
}
