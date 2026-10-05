package response

import "time"

type CoupleResponse struct {
	ID       string       `json:"id"`
	Partner  UserResponse `json:"partner"`
	LinkedAt time.Time    `json:"linked_at"`
}

type InvitationResponse struct {
	ID         string        `json:"id"`
	SenderID   string        `json:"sender_id"`
	ReceiverID string        `json:"receiver_id"`
	Status     string        `json:"status"`
	ExpiresAt  time.Time     `json:"expires_at"`
	CreatedAt  time.Time     `json:"created_at"`
	Sender     *UserResponse `json:"sender,omitempty"`
}
