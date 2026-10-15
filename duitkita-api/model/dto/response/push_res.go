package response

// PushPublicKeyResponse carries the VAPID public key the frontend passes to
// pushManager.subscribe() — safe to expose, it's the public half of the
// keypair the backend signs Web Push requests with.
type PushPublicKeyResponse struct {
	PublicKey string `json:"public_key"`
}
