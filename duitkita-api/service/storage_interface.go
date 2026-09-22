package service

import (
	"context"
	"io"
	"time"
)

type FileStorage interface {
	Upload(ctx context.Context, objectKey string, data io.Reader, contentType string) (string, error)
	Delete(ctx context.Context, objectKey string) error
	SignedURL(objectKey string, expiry time.Duration) (string, error)
}
