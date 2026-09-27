package utils

import "net/http"

// AppError is a typed application error carrying an HTTP status code.
// Services return *AppError so handlers/middleware can translate it into
// a consistent JSON response without re-deciding the status code.
type AppError struct {
	Code    int    `json:"-"`
	Message string `json:"message"`
}

func (e *AppError) Error() string {
	return e.Message
}

func NewAppError(code int, message string) *AppError {
	return &AppError{Code: code, Message: message}
}

func ErrBadRequest(message string) *AppError {
	return NewAppError(http.StatusBadRequest, message)
}

func ErrUnauthorized(message string) *AppError {
	return NewAppError(http.StatusUnauthorized, message)
}

func ErrForbidden(message string) *AppError {
	return NewAppError(http.StatusForbidden, message)
}

func ErrNotFound(message string) *AppError {
	return NewAppError(http.StatusNotFound, message)
}

func ErrConflict(message string) *AppError {
	return NewAppError(http.StatusConflict, message)
}

func ErrInternal(message string) *AppError {
	return NewAppError(http.StatusInternalServerError, message)
}

func ErrTooManyRequests(message string) *AppError {
	return NewAppError(http.StatusTooManyRequests, message)
}
