package domain

import (
	"time"

	"gorm.io/datatypes"
)

type SecurityAuditEventType string

const (
	SecurityAuditEventRegisterSuccess       SecurityAuditEventType = "register_success"
	SecurityAuditEventLoginSuccess          SecurityAuditEventType = "login_success"
	SecurityAuditEventLoginFailure          SecurityAuditEventType = "login_failure"
	SecurityAuditEventPasswordChanged       SecurityAuditEventType = "password_changed"
	SecurityAuditEventSessionRevoked        SecurityAuditEventType = "session_revoked"
	SecurityAuditEventSessionsRevokedOthers SecurityAuditEventType = "sessions_revoked_others"
	SecurityAuditEventInvitationSent        SecurityAuditEventType = "invitation_sent"
	SecurityAuditEventInvitationAccepted    SecurityAuditEventType = "invitation_accepted"
	SecurityAuditEventInvitationRejected    SecurityAuditEventType = "invitation_rejected"
	SecurityAuditEventInvitationCancelled   SecurityAuditEventType = "invitation_cancelled"
	SecurityAuditEventPartnerLinked         SecurityAuditEventType = "partner_linked"
	SecurityAuditEventPartnerUnlinked       SecurityAuditEventType = "partner_unlinked"
)

type SecurityAuditLog struct {
	ID        string                 `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    *string                `gorm:"column:user_id;type:uuid;index"`
	User      *User                  `gorm:"foreignKey:UserID;constraint:OnDelete:SET NULL"`
	EventType SecurityAuditEventType `gorm:"column:event_type;type:varchar(40);index;not null"`
	IPAddress *string                `gorm:"column:ip_address;size:64"`
	UserAgent *string                `gorm:"column:user_agent;size:255"`
	Meta      datatypes.JSON         `gorm:""`
	CreatedAt time.Time              `gorm:"column:created_at;autoCreateTime"`
}

func (SecurityAuditLog) TableName() string {
	return "security_audit_logs"
}
