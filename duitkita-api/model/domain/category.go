package domain

import "time"

type Category struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    string    `gorm:"column:user_id;type:uuid;index;not null"`
	User      User      `gorm:"foreignKey:UserID"`
	Name      string    `gorm:"size:100;not null"`
	Icon      *string   `gorm:"size:10"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Category) TableName() string {
	return "categories"
}

// OwnerID satisfies service.Owned for the generic ownership-check helper.
func (c Category) OwnerID() string {
	return c.UserID
}
