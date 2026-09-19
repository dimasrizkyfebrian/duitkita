package service

import (
	"context"
	"io"
	"time"
)

// FileStorage is the subset of infrastructure.StorageClient the service
// layer depends on. Declaring it here (rather than importing the
// infrastructure package) keeps service free of an infra dependency —
// *infrastructure.StorageClient satisfies this interface structurally.
type FileStorage interface {
	Upload(ctx context.Context, objectKey string, data io.Reader, contentType string) (string, error)
	Delete(ctx context.Context, objectKey string) error
	SignedURL(objectKey string, expiry time.Duration) (string, error)
}
