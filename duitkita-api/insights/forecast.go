package insights

import "math"

// NextMonthInput predicts Year/Month from three full months of history.
type NextMonthInput struct {
	Year, Month int
	// The newest of the three history months. Zero means the month right
	// before Year/Month; the app sets it to skip the month still running.
	LastYear, LastMonth int
	// Total spending of the three history months, oldest first. A month
	// with nothing recorded is 0, not left out.
	Totals    [3]int64
	Schedules []Schedule
}

type NextMonth struct {
	Projected, Low, High int64
	// Scheduled spending in the predicted month, included in Projected.
	RecurringTotal int64
	MonthsWithData int
	// 0..1, from how many months had data and how steady they were.
	Confidence float64
}

// ForecastNextMonth averages the day-to-day spending of three full
// months (each month's total less its scheduled spending) and adds the
// scheduled spending of the month being predicted. The range is one
// standard deviation either side, never below what's scheduled.
func ForecastNextMonth(in NextMonthInput) NextMonth {
	recurringNext := RecurringAmount(in.Schedules, "", in.Year, in.Month, 1, 31)

	lastYear, lastMonth := in.LastYear, in.LastMonth
	if lastMonth == 0 {
		lastYear, lastMonth = monthsBefore(in.Year, in.Month, 1)
	}

	var base [3]float64
	monthsWithData := 0
	for i, total := range in.Totals {
		y, m := monthsBefore(lastYear, lastMonth, 2-i)
		recurring := RecurringAmount(in.Schedules, "", y, m, 1, 31)
		base[i] = float64(max(total-recurring, 0))
		if total > 0 {
			monthsWithData++
		}
	}

	mean := (base[0] + base[1] + base[2]) / 3
	var variance float64
	for _, b := range base {
		variance += (b - mean) * (b - mean)
	}
	sd := math.Sqrt(variance / 3)

	projected := round(mean) + recurringNext
	out := NextMonth{
		Projected:      projected,
		Low:            max(recurringNext, projected-round(sd)),
		High:           projected + round(sd),
		RecurringTotal: recurringNext,
		MonthsWithData: monthsWithData,
	}
	if monthsWithData > 0 {
		steadiness := 0.2
		if mean > 0 {
			steadiness = min(max(1-sd/mean, 0.2), 1)
		}
		out.Confidence = math.Round(float64(monthsWithData)/3*steadiness*100) / 100
	}
	return out
}
