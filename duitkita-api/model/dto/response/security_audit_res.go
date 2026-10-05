package response

import (
	"time"

	"gorm.io/datatypes"
)

type SecurityAuditLogResponse struct {
	ID        string         `json:"id"`
	EventType string         `json:"event_type"`
	IPAddress string         `json:"ip_address,omitempty"`
	UserAgent string         `json:"user_agent,omitempty"`
	Meta      datatypes.JSON `json:"meta,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
}
