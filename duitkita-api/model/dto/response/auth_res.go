package response

import "time"

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	// SessionID lets the client recognize its own entry in the sessions list
	// (e.g. to label it "this device" or pass it as the current session when
	// logging out other devices) — the access token itself carries no
	// session identity, only the user's.
	SessionID string       `json:"session_id"`
	User      UserResponse `json:"user"`
}

type RegisterResponse struct {
	Email string `json:"email"`
}

type SessionResponse struct {
	ID           string    `json:"id"`
	DeviceName   string    `json:"device_name,omitempty"`
	IPAddress    string    `json:"ip_address,omitempty"`
	UserAgent    string    `json:"user_agent,omitempty"`
	LastActiveAt time.Time `json:"last_active_at"`
	CreatedAt    time.Time `json:"created_at"`
	IsCurrent    bool      `json:"is_current"`
}
