package service_test

import (
	"context"
	"crypto/ecdh"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/stretchr/testify/require"

	"duitkita-api/config"
	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

// testVAPIDKeys generates a real keypair (not placeholder strings) because
// webpush-go signs a VAPID JWT with it before ever making an HTTP request —
// a malformed key fails inside the library, before sendOne's status-code
// handling gets exercised at all.
func testVAPIDKeys(t *testing.T) (private, public string) {
	t.Helper()
	private, public, err := webpush.GenerateVAPIDKeys()
	require.NoError(t, err)
	return private, public
}

// testSubscriberKeys generates a fresh p256dh/auth pair shaped exactly like
// a real PushSubscription.getKey() result — a valid uncompressed P-256
// point and a 16-byte auth secret. webpush-go's encryption step derives a
// shared secret from these before it ever sends the HTTP request, so
// fixture values that aren't a real point on the curve fail there instead
// of exercising what these tests are actually checking.
func testSubscriberKeys(t *testing.T) (p256dh, auth string) {
	t.Helper()
	priv, err := ecdh.P256().GenerateKey(rand.Reader)
	require.NoError(t, err)
	authBytes := make([]byte, 16)
	_, err = rand.Read(authBytes)
	require.NoError(t, err)
	return base64.RawURLEncoding.EncodeToString(priv.PublicKey().Bytes()), base64.RawURLEncoding.EncodeToString(authBytes)
}

func newPushService(t *testing.T, vapid config.VAPIDConfig) (service.PushService, *mocks.PushSubscriptionRepository, *mocks.NotificationRepository, *mocks.NotificationPreferenceRepository) {
	subRepo := mocks.NewPushSubscriptionRepository(t)
	notifRepo := mocks.NewNotificationRepository(t)
	prefRepo := mocks.NewNotificationPreferenceRepository(t)
	return service.NewPushService(subRepo, notifRepo, prefRepo, vapid), subRepo, notifRepo, prefRepo
}

func TestPushService_PublicKey(t *testing.T) {
	t.Run("empty when VAPID isn't configured", func(t *testing.T) {
		svc, _, _, _ := newPushService(t, config.VAPIDConfig{})
		require.Empty(t, svc.PublicKey())
	})

	t.Run("returns the configured public key", func(t *testing.T) {
		priv, pub := testVAPIDKeys(t)
		svc, _, _, _ := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv, Subject: "mailto:ops@duitkita.app"})
		require.Equal(t, pub, svc.PublicKey())
	})
}

func TestPushService_Subscribe(t *testing.T) {
	t.Run("rejected when VAPID isn't configured", func(t *testing.T) {
		svc, subRepo, _, _ := newPushService(t, config.VAPIDConfig{})

		err := svc.Subscribe(context.Background(), "user-1", request.SubscribePushRequest{Endpoint: "https://push.example/abc"})

		requireAppError(t, err, http.StatusConflict, "push notifications are not configured on this server")
		subRepo.AssertNotCalled(t, "Upsert")
	})

	t.Run("upserts the subscription for the owning user", func(t *testing.T) {
		priv, pub := testVAPIDKeys(t)
		svc, subRepo, _, _ := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv})
		req := request.SubscribePushRequest{Endpoint: "https://push.example/abc"}
		req.Keys.P256dh = "p256dh-value"
		req.Keys.Auth = "auth-value"

		subRepo.EXPECT().Upsert(context.Background(), mockMatchByType[*domain.PushSubscription]()).RunAndReturn(func(_ context.Context, sub *domain.PushSubscription) error {
			require.Equal(t, "user-1", sub.UserID)
			require.Equal(t, "https://push.example/abc", sub.Endpoint)
			require.Equal(t, "p256dh-value", sub.P256dh)
			require.Equal(t, "auth-value", sub.Auth)
			return nil
		})

		err := svc.Subscribe(context.Background(), "user-1", req)

		require.NoError(t, err)
	})

	t.Run("repository failure surfaced as internal error", func(t *testing.T) {
		priv, pub := testVAPIDKeys(t)
		svc, subRepo, _, _ := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv})
		subRepo.EXPECT().Upsert(context.Background(), mockMatchByType[*domain.PushSubscription]()).Return(errors.New("db down"))

		err := svc.Subscribe(context.Background(), "user-1", request.SubscribePushRequest{Endpoint: "https://push.example/abc"})

		requireAppError(t, err, http.StatusInternalServerError, "failed to save push subscription")
	})
}

func TestPushService_Unsubscribe(t *testing.T) {
	priv, pub := testVAPIDKeys(t)
	svc, subRepo, _, _ := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv})
	subRepo.EXPECT().DeleteByEndpoint(context.Background(), "user-1", "https://push.example/abc").Return(nil)

	err := svc.Unsubscribe(context.Background(), "user-1", "https://push.example/abc")

	require.NoError(t, err)
}

func TestPushService_Dispatch(t *testing.T) {
	t.Run("no-op when VAPID isn't configured", func(t *testing.T) {
		svc, subRepo, notifRepo, _ := newPushService(t, config.VAPIDConfig{})

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
		notifRepo.AssertNotCalled(t, "FindByID")
		subRepo.AssertNotCalled(t, "FindAllByUserID")
	})

	t.Run("no-op when the notification no longer exists", func(t *testing.T) {
		priv, pub := testVAPIDKeys(t)
		svc, subRepo, notifRepo, _ := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv})
		notifRepo.EXPECT().FindByID(context.Background(), "notif-1").Return(nil, nil)

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
		subRepo.AssertNotCalled(t, "FindAllByUserID")
	})

	t.Run("skips sending when the user turned this notification type off", func(t *testing.T) {
		priv, pub := testVAPIDKeys(t)
		svc, subRepo, notifRepo, prefRepo := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv})
		notifRepo.EXPECT().FindByID(context.Background(), "notif-1").Return(&domain.Notification{
			ID: "notif-1", UserID: "user-1", Type: domain.NotificationTypeBillReminder,
		}, nil)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.NotificationPreference{
			{UserID: "user-1", Key: domain.PreferenceReminderAlert, Enabled: false},
		}, nil)

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
		subRepo.AssertNotCalled(t, "FindAllByUserID")
	})

	t.Run("no-op when the user has no subscribed devices", func(t *testing.T) {
		priv, pub := testVAPIDKeys(t)
		svc, subRepo, notifRepo, prefRepo := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv})
		notifRepo.EXPECT().FindByID(context.Background(), "notif-1").Return(&domain.Notification{
			ID: "notif-1", UserID: "user-1", Type: domain.NotificationTypeBillReminder,
		}, nil)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return(nil, nil)
		subRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return(nil, nil)

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
	})

	t.Run("a live subscription is kept and gets the push", func(t *testing.T) {
		var gotRequest bool
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotRequest = true
			w.WriteHeader(http.StatusCreated)
		}))
		defer server.Close()

		priv, pub := testVAPIDKeys(t)
		p256dh, auth := testSubscriberKeys(t)
		svc, subRepo, notifRepo, prefRepo := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv, Subject: "mailto:ops@duitkita.app"})
		notifRepo.EXPECT().FindByID(context.Background(), "notif-1").Return(&domain.Notification{
			ID: "notif-1", UserID: "user-1", Type: domain.NotificationTypeBillReminder, Title: "Bayar listrik", Body: "Jatuh tempo besok",
		}, nil)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return(nil, nil)
		subRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.PushSubscription{
			{ID: "sub-1", UserID: "user-1", Endpoint: server.URL, P256dh: p256dh, Auth: auth},
		}, nil)

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
		require.True(t, gotRequest, "expected the push service endpoint to receive a request")
		subRepo.AssertNotCalled(t, "Delete")
	})

	t.Run("a gone subscription (410) is removed instead of retried forever", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusGone)
		}))
		defer server.Close()

		priv, pub := testVAPIDKeys(t)
		p256dh, auth := testSubscriberKeys(t)
		svc, subRepo, notifRepo, prefRepo := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv, Subject: "mailto:ops@duitkita.app"})
		notifRepo.EXPECT().FindByID(context.Background(), "notif-1").Return(&domain.Notification{
			ID: "notif-1", UserID: "user-1", Type: domain.NotificationTypeBillReminder, Title: "Bayar listrik", Body: "Jatuh tempo besok",
		}, nil)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return(nil, nil)
		subRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.PushSubscription{
			{ID: "sub-1", UserID: "user-1", Endpoint: server.URL, P256dh: p256dh, Auth: auth},
		}, nil)
		subRepo.EXPECT().Delete(context.Background(), "sub-1").Return(nil)

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
	})

	t.Run("one subscription failing doesn't stop the rest of the fan-out or fail the job", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusCreated)
		}))
		defer server.Close()

		priv, pub := testVAPIDKeys(t)
		p256dh, auth := testSubscriberKeys(t)
		svc, subRepo, notifRepo, prefRepo := newPushService(t, config.VAPIDConfig{PublicKey: pub, PrivateKey: priv, Subject: "mailto:ops@duitkita.app"})
		notifRepo.EXPECT().FindByID(context.Background(), "notif-1").Return(&domain.Notification{
			ID: "notif-1", UserID: "user-1", Type: domain.NotificationTypeBillReminder, Title: "Bayar listrik", Body: "Jatuh tempo besok",
		}, nil)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return(nil, nil)
		subRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.PushSubscription{
			{ID: "sub-dead", UserID: "user-1", Endpoint: "http://127.0.0.1:1/unreachable", P256dh: p256dh, Auth: auth},
			{ID: "sub-alive", UserID: "user-1", Endpoint: server.URL, P256dh: p256dh, Auth: auth},
		}, nil)

		err := svc.Dispatch(context.Background(), "notif-1")

		require.NoError(t, err)
	})
}
