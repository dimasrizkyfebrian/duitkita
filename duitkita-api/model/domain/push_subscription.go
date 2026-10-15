package domain

import "time"

// PushSubscription mirrors a browser's PushSubscription object (the Web
// Push API, not a third-party notification service) — endpoint is the push
// service URL the browser picked (FCM, Mozilla, etc.), p256dh/auth are the
// keys needed to encrypt messages to it per RFC 8291.
type PushSubscription struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `gorm:"column:user_id;type:uuid;index;not null"`
	User      User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Endpoint  string    `gorm:"uniqueIndex;type:text;not null"`
	P256dh    string    `gorm:"column:p256dh;type:text;not null"`
	Auth      string    `gorm:"column:auth;type:text;not null"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (PushSubscription) TableName() string {
	return "push_subscriptions"
}

// OwnerID satisfies service.Owned for the generic ownership-check helper.
func (p PushSubscription) OwnerID() string {
	return p.UserID
}
