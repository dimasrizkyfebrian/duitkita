package service

import "duitkita-api/utils"

// Owned is implemented by any domain model that belongs to exactly one
// user (category, budget, expense, recurring expense, reminder, ...) via a
// value-receiver method, so it's satisfied automatically on the pointer
// type too.
type Owned interface {
	OwnerID() string
}

// mustOwn collapses the "find by id -> nil check -> owner check" sequence
// that used to be duplicated almost verbatim across category_service.go,
// budget_service.go, expense_service.go, recurring_expense_service.go and
// reminder_service.go. Each of those still has its own thin wrapper (it
// knows which repo to call and what "not found" message fits), but the
// actual ownership logic now lives in exactly one place.
func mustOwn[T Owned](item *T, err error, userID, notFoundMsg string) (*T, error) {
	if err != nil {
		return nil, utils.ErrInternal("failed to look up resource")
	}
	if item == nil || (*item).OwnerID() != userID {
		return nil, utils.ErrNotFound(notFoundMsg)
	}
	return item, nil
}
