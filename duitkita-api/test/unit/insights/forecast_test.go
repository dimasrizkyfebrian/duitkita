package insights_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/insights"
)

func TestForecastNextMonth_AveragesFullMonthsCountingZeros(t *testing.T) {
	f := insights.ForecastNextMonth(insights.NextMonthInput{
		Year: 2026, Month: 12,
		Totals: [3]int64{0, 3_000_000, 3_000_000},
	})

	require.Equal(t, int64(2_000_000), f.Projected)
	require.Equal(t, 2, f.MonthsWithData)
}

// Past totals already include the monthly 1jt; it's taken out of the
// baseline and added back once for the month being predicted.
func TestForecastNextMonth_AddsRecurringOnce(t *testing.T) {
	f := insights.ForecastNextMonth(insights.NextMonthInput{
		Year: 2026, Month: 12,
		Totals:    [3]int64{4_000_000, 4_000_000, 4_000_000},
		Schedules: []insights.Schedule{{CategoryID: "c", Amount: 1_000_000, Day: 1, CreatedAt: wib(2026, 1, 1)}},
	})

	require.Equal(t, int64(1_000_000), f.RecurringTotal)
	require.Equal(t, int64(4_000_000), f.Projected)
	require.Equal(t, int64(4_000_000), f.Low)
	require.Equal(t, int64(4_000_000), f.High)
}

func TestForecastNextMonth_ConfidenceFromStability(t *testing.T) {
	steady := insights.ForecastNextMonth(insights.NextMonthInput{Year: 2026, Month: 12, Totals: [3]int64{3_000_000, 3_000_000, 3_000_000}})
	require.Equal(t, 1.0, steady.Confidence)

	jumpy := insights.ForecastNextMonth(insights.NextMonthInput{Year: 2026, Month: 12, Totals: [3]int64{1_000_000, 3_000_000, 5_000_000}})
	require.Greater(t, jumpy.Confidence, 0.0)
	require.Less(t, jumpy.Confidence, 0.75)

	empty := insights.ForecastNextMonth(insights.NextMonthInput{Year: 2026, Month: 12})
	require.Equal(t, 0.0, empty.Confidence)
	require.Equal(t, int64(0), empty.Projected)
}

func TestForecastNextMonth_LowNeverBelowRecurring(t *testing.T) {
	f := insights.ForecastNextMonth(insights.NextMonthInput{
		Year: 2026, Month: 12,
		Totals:    [3]int64{0, 0, 9_000_000},
		Schedules: []insights.Schedule{{CategoryID: "c", Amount: 1_000_000, Day: 1, CreatedAt: wib(2026, 1, 1)}},
	})

	require.GreaterOrEqual(t, f.Low, f.RecurringTotal)
	require.Equal(t, int64(1_000_000), f.Low)
}

// The three months before January are October to December of the year before.
func TestForecastNextMonth_AcrossYearEnd(t *testing.T) {
	weekly := insights.Schedule{Weekly: true, Day: 1, Amount: 100_000, CreatedAt: wib(2026, 10, 1)}
	f := insights.ForecastNextMonth(insights.NextMonthInput{
		Year: 2027, Month: 1,
		Totals:    [3]int64{1_000_000, 1_000_000, 1_000_000},
		Schedules: []insights.Schedule{weekly},
	})

	// Mondays in Jan 2027: 4, 11, 18, 25.
	require.Equal(t, int64(400_000), f.RecurringTotal)
}

// The app predicts next month from the three full months before the running
// one, so the history can end earlier than the month before the prediction.
func TestForecastNextMonth_HistoryCanSkipTheRunningMonth(t *testing.T) {
	// Set up on 1 Nov, so it never ran in Aug–Oct.
	newRent := insights.Schedule{CategoryID: "c", Amount: 500_000, Day: 1, CreatedAt: wib(2026, 11, 1)}
	f := insights.ForecastNextMonth(insights.NextMonthInput{
		Year: 2026, Month: 12, LastYear: 2026, LastMonth: 10,
		Totals:    [3]int64{1_000_000, 1_000_000, 1_000_000},
		Schedules: []insights.Schedule{newRent},
	})

	require.Equal(t, int64(1_500_000), f.Projected)
}
