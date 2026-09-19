package domain

import "time"

type UserSession struct {
	ID               string     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID           string     `gorm:"column:user_id;type:uuid;index;not null"`
	User             User       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	RefreshTokenHash string     `gorm:"column:refresh_token_hash;not null"`
	DeviceName       *string    `gorm:"column:device_name;size:120"`
	IPAddress        *string    `gorm:"column:ip_address;size:64"`
	UserAgent        *string    `gorm:"column:user_agent;size:255"`
	LastActiveAt     time.Time  `gorm:"column:last_active_at;default:now()"`
	ExpiresAt        time.Time  `gorm:"column:expires_at;not null"`
	RevokedAt        *time.Time `gorm:"column:revoked_at"`
	CreatedAt        time.Time  `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt        time.Time  `gorm:"column:updated_at;autoUpdateTime"`
}

func (UserSession) TableName() string {
	return "user_sessions"
}
