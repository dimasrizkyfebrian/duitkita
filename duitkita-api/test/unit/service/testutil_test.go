package service_test

import (
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"duitkita-api/utils"
)

// requireAppError asserts err is a *utils.AppError with the given HTTP
// status code, and (when want != "") the exact message.
func requireAppError(t *testing.T, err error, code int, want string) {
	t.Helper()
	require.Error(t, err)
	appErr, ok := err.(*utils.AppError)
	require.Truef(t, ok, "expected *utils.AppError, got %T: %v", err, err)
	require.Equal(t, code, appErr.Code)
	if want != "" {
		require.Equal(t, want, appErr.Message)
	}
}

// mockMatchByType returns a testify matcher accepting any value of type T,
// for asserting a mock call happened without pinning down every field
// (e.g. a *domain.Category built with a fresh uuid inside the service).
func mockMatchByType[T any]() interface{} {
	return mock.MatchedBy(func(T) bool { return true })
}

func strPtr(s string) *string { return &s }
