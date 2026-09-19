package domain

import "time"

type User struct {
	ID               string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name             string    `gorm:"size:100;not null"`
	Email            string    `gorm:"size:255;uniqueIndex;not null"`
	PasswordHash     string    `gorm:"column:password_hash;not null" json:"-"`
	AvatarStorageKey *string   `gorm:"column:avatar_storage_key;size:512"`
	CreatedAt        time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (User) TableName() string {
	return "users"
}
