package domain

import "time"

type Couple struct {
	ID       string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	User1ID  string    `gorm:"column:user1_id;type:uuid;index;not null;uniqueIndex:idx_couples_user1_user2"`
	User1    User      `gorm:"foreignKey:User1ID"`
	User2ID  string    `gorm:"column:user2_id;type:uuid;index;not null;uniqueIndex:idx_couples_user1_user2"`
	User2    User      `gorm:"foreignKey:User2ID"`
	LinkedAt time.Time `gorm:"column:linked_at;autoCreateTime"`
}

func (Couple) TableName() string {
	return "couples"
}
