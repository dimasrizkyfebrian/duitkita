package domain

import "time"

type CoupleInvitationStatus string

const (
	CoupleInvitationStatusPending   CoupleInvitationStatus = "pending"
	CoupleInvitationStatusAccepted  CoupleInvitationStatus = "accepted"
	CoupleInvitationStatusRejected  CoupleInvitationStatus = "rejected"
	CoupleInvitationStatusCancelled CoupleInvitationStatus = "cancelled"
	CoupleInvitationStatusExpired   CoupleInvitationStatus = "expired"
)

type CoupleInvitation struct {
	ID             string                 `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	SenderUserID   string                 `gorm:"column:sender_user_id;type:uuid;index;not null"`
	SenderUser     User                   `gorm:"foreignKey:SenderUserID"`
	ReceiverUserID string                 `gorm:"column:receiver_user_id;type:uuid;index;not null"`
	ReceiverUser   User                   `gorm:"foreignKey:ReceiverUserID"`
	Status         CoupleInvitationStatus `gorm:"type:varchar(20);default:'pending';not null"`
	ExpiresAt      time.Time              `gorm:"column:expires_at;not null"`
	RespondedAt    *time.Time             `gorm:"column:responded_at"`
	CreatedAt      time.Time              `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time              `gorm:"column:updated_at;autoUpdateTime"`
}

func (CoupleInvitation) TableName() string {
	return "couple_invitations"
}
