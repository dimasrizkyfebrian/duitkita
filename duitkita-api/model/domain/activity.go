package domain

import (
	"time"

	"gorm.io/datatypes"
)

type ActivityAction string

const (
	ActivityActionCreated ActivityAction = "created"
	ActivityActionUpdated ActivityAction = "updated"
	ActivityActionDeleted ActivityAction = "deleted"
)

type ActivityEntityType string

const (
	ActivityEntityTypeExpense ActivityEntityType = "expense"
	ActivityEntityTypeBudget  ActivityEntityType = "budget"
)

type Activity struct {
	ID         string             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	CoupleID   string             `gorm:"column:couple_id;type:uuid;index;not null"`
	Couple     Couple             `gorm:"foreignKey:CoupleID;constraint:OnDelete:CASCADE"`
	ActorID    string             `gorm:"column:actor_id;type:uuid;not null"`
	Actor      User               `gorm:"foreignKey:ActorID"`
	Action     ActivityAction     `gorm:"type:varchar(10);not null"`
	EntityType ActivityEntityType `gorm:"column:entity_type;type:varchar(10);not null"`
	EntityID   string             `gorm:"column:entity_id;type:uuid;not null"`
	Meta       datatypes.JSON     `gorm:""`
	CreatedAt  time.Time          `gorm:"column:created_at;autoCreateTime"`
}

func (Activity) TableName() string {
	return "activities"
}
