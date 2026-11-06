// Package insights holds the financial health score and spending forecast
// as plain functions of their inputs — no database, cache or clock — so the
// app's API and the PDF report compute exactly the same numbers. Every date
// is read in WIB, like the rest of the reports.
package insights

import (
	"math"
	"time"

	"duitkita-api/pdfreport"
)

// PeriodState says where a month sits relative to today.
type PeriodState string

const (
	PeriodPast    PeriodState = "past"
	PeriodCurrent PeriodState = "current"
	PeriodFuture  PeriodState = "future"
)

func daysIn(year, month int) int {
	return time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

// Progress reports whether year/month is past, current or future as of
// today (read in WIB), how many of its days have elapsed (all of them for a
// past month, none for a future one) and how many days it has.
func Progress(year, month int, today time.Time) (state PeriodState, daysElapsed, daysInMonth int) {
	t := today.In(pdfreport.WIB)
	daysInMonth = daysIn(year, month)
	period := year*12 + month - 1
	current := t.Year()*12 + int(t.Month()) - 1
	switch {
	case period < current:
		return PeriodPast, daysInMonth, daysInMonth
	case period > current:
		return PeriodFuture, 0, daysInMonth
	default:
		return PeriodCurrent, t.Day(), daysInMonth
	}
}

// monthsBefore steps back k months from year/month.
func monthsBefore(year, month, k int) (int, int) {
	t := time.Date(year, time.Month(month)-time.Month(k), 1, 0, 0, 0, 0, time.UTC)
	return t.Year(), int(t.Month())
}

func round(f float64) int64 { return int64(math.Round(f)) }
