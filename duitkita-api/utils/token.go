package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"math/big"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is the JWT payload used for short-lived access tokens.
type Claims struct {
	UserID string `json:"sub"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(secret, userID string, ttl time.Duration) (string, error) {
	claims := Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseAccessToken(secret, previousSecret, tokenString string) (*Claims, error) {
	claims, err := parseWithSecret(secret, tokenString)
	if err == nil {
		return claims, nil
	}
	if previousSecret == "" {
		return nil, err
	}
	return parseWithSecret(previousSecret, tokenString)
}

func parseWithSecret(secret, tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func GenerateOpaqueSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func GenerateOTPCode(length int) (string, error) {
	digits := make([]byte, length)
	max := big.NewInt(10)
	for i := range digits {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		digits[i] = byte('0' + n.Int64())
	}
	return string(digits), nil
}
