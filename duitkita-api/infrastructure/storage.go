package infrastructure

import (
	"context"
	"fmt"
	"io"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/option"

	"duitkita-api/config"
)

// StorageClient wraps the Google Cloud Storage bucket used for avatar
// uploads and generated report exports.
type StorageClient struct {
	client     *storage.Client
	bucketName string
}

func NewStorageClient(ctx context.Context, cfg config.GCSConfig) (*StorageClient, error) {
	var opts []option.ClientOption
	if cfg.CredentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(cfg.CredentialsFile))
	}

	client, err := storage.NewClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("create gcs client: %w", err)
	}

	return &StorageClient{client: client, bucketName: cfg.BucketName}, nil
}

// Upload writes data to objectKey and returns the storage key (not a public
// URL — callers decide whether to serve it via signed URL or a proxy route).
func (s *StorageClient) Upload(ctx context.Context, objectKey string, data io.Reader, contentType string) (string, error) {
	obj := s.client.Bucket(s.bucketName).Object(objectKey)
	writer := obj.NewWriter(ctx)
	writer.ContentType = contentType

	if _, err := io.Copy(writer, data); err != nil {
		_ = writer.Close()
		return "", fmt.Errorf("upload object: %w", err)
	}
	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("close writer: %w", err)
	}

	return objectKey, nil
}

func (s *StorageClient) Delete(ctx context.Context, objectKey string) error {
	return s.client.Bucket(s.bucketName).Object(objectKey).Delete(ctx)
}

func (s *StorageClient) Reader(ctx context.Context, objectKey string) (io.ReadCloser, error) {
	return s.client.Bucket(s.bucketName).Object(objectKey).NewReader(ctx)
}

// SignedURL issues a temporary download URL for a private object.
func (s *StorageClient) SignedURL(objectKey string, expiry time.Duration) (string, error) {
	return s.client.Bucket(s.bucketName).SignedURL(objectKey, &storage.SignedURLOptions{
		Method:  "GET",
		Expires: time.Now().Add(expiry),
	})
}

func (s *StorageClient) Close() error {
	return s.client.Close()
}

// NoopStorageClient stands in for StorageClient when GCS is disabled
// (GCS_ENABLED=false) — e.g. running locally to test the DB connection
// without needing real Google Cloud credentials. Every method fails with a
// clear error instead of the app crashing at startup or hitting a nil client.
type NoopStorageClient struct{}

func NewNoopStorageClient() *NoopStorageClient {
	return &NoopStorageClient{}
}

var errStorageDisabled = fmt.Errorf("file storage is disabled (set GCS_ENABLED=true and configure GCS_BUCKET_NAME/GCS_CREDENTIALS_FILE)")

func (s *NoopStorageClient) Upload(ctx context.Context, objectKey string, data io.Reader, contentType string) (string, error) {
	return "", errStorageDisabled
}

func (s *NoopStorageClient) Delete(ctx context.Context, objectKey string) error {
	return errStorageDisabled
}

func (s *NoopStorageClient) SignedURL(objectKey string, expiry time.Duration) (string, error) {
	return "", errStorageDisabled
}

func (s *NoopStorageClient) Close() error {
	return nil
}
