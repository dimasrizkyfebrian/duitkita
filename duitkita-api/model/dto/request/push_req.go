package request

// SubscribePushRequest mirrors the browser's PushSubscription.toJSON() shape
// so the frontend can forward it to the backend without reshaping it.
type SubscribePushRequest struct {
	Endpoint string `json:"endpoint" binding:"required,url"`
	Keys     struct {
		P256dh string `json:"p256dh" binding:"required"`
		Auth   string `json:"auth" binding:"required"`
	} `json:"keys" binding:"required"`
}

type UnsubscribePushRequest struct {
	Endpoint string `json:"endpoint" binding:"required,url"`
}
