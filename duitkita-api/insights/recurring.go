package insights

import (
	"time"

	"duitkita-api/pdfreport"
)

// Schedule is an active recurring expense. Expenses don't record which
// schedule created them, so the recurring part of a month's spending is
// estimated from the schedules as they are now.
type Schedule struct {
	CategoryID string
	Amount     int64
	// Weekly runs every Day-th weekday (0 = Sunday); otherwise it runs once
	// a month on Day, clamped to the month's last day.
	Weekly    bool
	Day       int
	CreatedAt time.Time
}

// Occurrences counts the schedule's runs on days fromDay..toDay of
// year/month, skipping any before the schedule was set up.
func Occurrences(s Schedule, year, month, fromDay, toDay int) int {
	dim := daysIn(year, month)
	fromDay = max(fromDay, 1)
	toDay = min(toDay, dim)
	if fromDay > toDay {
		return 0
	}

	c := s.CreatedAt.In(pdfreport.WIB)
	created := time.Date(c.Year(), c.Month(), c.Day(), 0, 0, 0, 0, pdfreport.WIB)
	monthlyDay := min(max(s.Day, 1), dim)

	n := 0
	for d := fromDay; d <= toDay; d++ {
		day := time.Date(year, time.Month(month), d, 0, 0, 0, 0, pdfreport.WIB)
		if day.Before(created) {
			continue
		}
		if s.Weekly {
			if int(day.Weekday()) == s.Day {
				n++
			}
		} else if d == monthlyDay {
			n++
		}
	}
	return n
}

// RecurringAmount totals what the schedules spend on days fromDay..toDay of
// year/month. An empty categoryID means every category.
func RecurringAmount(ss []Schedule, categoryID string, year, month, fromDay, toDay int) int64 {
	var total int64
	for _, s := range ss {
		if categoryID != "" && s.CategoryID != categoryID {
			continue
		}
		total += s.Amount * int64(Occurrences(s, year, month, fromDay, toDay))
	}
	return total
}
