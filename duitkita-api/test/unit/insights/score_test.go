package insights_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/insights"
	"duitkita-api/pdfreport"
)

func wib(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 12, 0, 0, 0, pdfreport.WIB)
}

func oneCategory(budget, spent int64) []insights.CategoryInput {
	return []insights.CategoryInput{{ID: "c1", Name: "Makan", Budget: budget, Spent: spent}}
}

// Every 7-day block of October has a record.
var allOctoberBlocks = []int{1, 8, 15, 22, 29}

func tipCodes(tips []insights.Tip) []string {
	codes := make([]string, 0, len(tips))
	for _, t := range tips {
		codes = append(codes, t.Code)
	}
	return codes
}

func TestComputeScore_PastMonthUnderBudget(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 10, Today: wib(2026, 11, 10),
		Categories:    oneCategory(3_000_000, 2_400_000),
		DaysWithSpend: allOctoberBlocks,
	})

	require.Equal(t, 100, s.Score)
	require.Equal(t, "A", s.Grade)
	require.Equal(t, insights.PeriodPast, s.Period)
	require.False(t, s.Provisional)
	require.Equal(t, int64(2_400_000), s.ProjectedSpent)
	require.Equal(t, int64(3_000_000), s.TotalBudget)
	require.Equal(t, []insights.Component{
		{Key: "budget", Points: 50, Max: 50},
		{Key: "categories", Points: 30, Max: 30},
		{Key: "recording", Points: 20, Max: 20},
	}, s.Components)
	require.Equal(t, []string{"all_good"}, tipCodes(s.Tips))
}

// The old formula gave 50/100 an A and a month ending at 95% of budget a C.
func TestComputeScore_GradeMatchesScore(t *testing.T) {
	cases := []struct {
		spent int64
		score int
		grade string
	}{
		{1_500_000, 100, "A"}, // u 0.50, f 1
		{2_850_000, 92, "A"},  // u 0.95, f 0.9
		{3_000_000, 84, "B"},  // u 1.00, f 0.8
		{3_450_000, 52, "C"},  // u 1.15, f 0.4
	}
	for _, c := range cases {
		s := insights.ComputeScore(insights.ScoreInput{
			Year: 2026, Month: 10, Today: wib(2026, 11, 10),
			Categories:    oneCategory(3_000_000, c.spent),
			DaysWithSpend: allOctoberBlocks,
		})
		require.Equal(t, c.score, s.Score, "spent %d", c.spent)
		require.Equal(t, c.grade, s.Grade, "spent %d", c.spent)
	}
}

func TestComputeScore_NotRecordingIsNotPerfect(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 10, Today: wib(2026, 11, 10),
		Categories: oneCategory(3_000_000, 0),
	})

	require.Equal(t, 80, s.Score)
	require.Equal(t, insights.Component{Key: "recording", Points: 0, Max: 20}, s.Components[2])
	require.Equal(t, []insights.Tip{{Code: "recording_gap", Weeks: 5}}, s.Tips)
}

func TestComputeScore_EarlyMonthIsProvisional(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 11, Today: wib(2026, 11, 3),
		Categories:    oneCategory(3_000_000, 300_000),
		DaysWithSpend: []int{1, 2, 3},
	})

	require.Equal(t, insights.PeriodCurrent, s.Period)
	require.True(t, s.Provisional)
}

func TestComputeScore_UsesPaceNotToDate(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 11, Today: wib(2026, 11, 10),
		Categories:    oneCategory(3_000_000, 1_500_000),
		DaysWithSpend: []int{2, 5, 9},
	})

	// 1.5jt in 10 days, 20 days to go at the same pace.
	require.Equal(t, int64(4_500_000), s.ProjectedSpent)
	require.Contains(t, s.Tips, insights.Tip{Code: "pace_over_budget", Amount: 4_500_000, Budget: 3_000_000})
}

// Rent paid on the 1st must not read as a 3jt-a-day habit.
func TestComputeScore_RecurringIsNotPace(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 11, Today: wib(2026, 11, 5),
		Categories:    []insights.CategoryInput{{ID: "sewa", Name: "Sewa", Budget: 3_000_000, Spent: 3_000_000}},
		DaysWithSpend: []int{1},
		Schedules:     []insights.Schedule{{CategoryID: "sewa", Amount: 3_000_000, Day: 1, CreatedAt: wib(2026, 10, 1)}},
	})

	require.Equal(t, int64(3_000_000), s.ProjectedSpent)
	require.NotContains(t, tipCodes(s.Tips), "pace_over_budget")
}

func TestComputeScore_ScheduleCreatedMidMonth(t *testing.T) {
	weeklyMonday := insights.Schedule{Weekly: true, Day: int(time.Monday), Amount: 100_000, CreatedAt: wib(2026, 11, 15)}

	// Mondays in Nov 2026: 2, 9, 16, 23, 30 — only the last three come after it was set up.
	require.Equal(t, 3, insights.Occurrences(weeklyMonday, 2026, 11, 1, 30))
	require.Equal(t, 0, insights.Occurrences(weeklyMonday, 2026, 11, 1, 14))
}

func TestComputeScore_CategoryOverTips(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 10, Today: wib(2026, 11, 10),
		Categories: []insights.CategoryInput{
			{ID: "belanja", Name: "Belanja", Budget: 5_000_000, Spent: 1_000_000},
			{ID: "transport", Name: "Transport", Budget: 2_000_000, Spent: 3_000_000},
			{ID: "makan", Name: "Makan", Budget: 1_000_000, Spent: 6_280_000},
		},
		DaysWithSpend: allOctoberBlocks,
	})

	require.Equal(t, []insights.Tip{
		{Code: "category_over", CategoryName: "Makan", Percent: 628},
		{Code: "category_over", CategoryName: "Transport", Percent: 150},
	}, s.Tips)
}

func TestComputeScore_NoBudget(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 10, Today: wib(2026, 11, 10),
		Categories: oneCategory(0, 50_000),
	})

	require.Equal(t, "n/a", s.Grade)
	require.Equal(t, 0, s.Score)
	require.Equal(t, []string{"no_budget"}, tipCodes(s.Tips))
}

func TestComputeScore_FutureMonth(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 12, Today: wib(2026, 11, 10),
		Categories: oneCategory(3_000_000, 0),
	})

	require.Equal(t, insights.PeriodFuture, s.Period)
	require.Equal(t, "n/a", s.Grade)
	require.Equal(t, []string{"period_not_started"}, tipCodes(s.Tips))
}

func TestOccurrences_Day31InFebruary(t *testing.T) {
	monthly31 := insights.Schedule{Day: 31, Amount: 1, CreatedAt: wib(2026, 1, 1)}

	require.Equal(t, 1, insights.Occurrences(monthly31, 2027, 2, 28, 28))
	require.Equal(t, 0, insights.Occurrences(monthly31, 2027, 2, 1, 27))
}

// Nothing recorded yet this month is not a perfect month.
func TestComputeScore_NothingRecordedYetIsNotGraded(t *testing.T) {
	s := insights.ComputeScore(insights.ScoreInput{
		Year: 2026, Month: 11, Today: wib(2026, 11, 3),
		Categories: oneCategory(3_000_000, 0),
	})

	require.Equal(t, "n/a", s.Grade)
	require.Equal(t, 0, s.Score)
	require.True(t, s.Provisional)
	require.Equal(t, []string{"no_records_yet"}, tipCodes(s.Tips))
}
