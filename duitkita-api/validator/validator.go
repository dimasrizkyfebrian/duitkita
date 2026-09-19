package validator

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

// FormatValidationError converts a go-playground/validator error (as
// returned by gin's c.ShouldBindJSON) into a human-readable message.
func FormatValidationError(err error) string {
	verrs, ok := err.(validator.ValidationErrors)
	if !ok {
		return err.Error()
	}

	messages := make([]string, 0, len(verrs))
	for _, fe := range verrs {
		messages = append(messages, fmt.Sprintf("%s: %s", fe.Field(), ruleMessage(fe)))
	}
	return strings.Join(messages, "; ")
}

func ruleMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email"
	case "min":
		return fmt.Sprintf("must be at least %s", fe.Param())
	case "max":
		return fmt.Sprintf("must be at most %s", fe.Param())
	case "uuid":
		return "must be a valid uuid"
	case "oneof":
		return fmt.Sprintf("must be one of [%s]", fe.Param())
	case "datetime":
		return fmt.Sprintf("must match format %s", fe.Param())
	default:
		return fmt.Sprintf("failed on '%s' validation", fe.Tag())
	}
}

// Validate exposes gin's underlying validator instance in case custom
// struct-level or field-level validators need to be registered at startup.
func Validate() *validator.Validate {
	if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
		return v
	}
	return validator.New()
}
