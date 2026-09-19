package request

type SendInvitationRequest struct {
	ReceiverEmail string `json:"receiver_email" binding:"required,email"`
}
