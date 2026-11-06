package insights

import (
	"sort"
	"time"
)

// Weights of the three parts of the score; they add up to 100.
const (
	weightBudget     = 50
	weightCategories = 30
	weightRecording  = 20
)

// CategoryInput is one category's budget and spending for the period.
type CategoryInput struct {
	ID, Name string
	Budget   int64
	Spent    int64
}

type ScoreInput struct {
	Year, Month int
	Today       time.Time
	Categories  []CategoryInput
	// Days of the month (1-based) with at least one expense.
	DaysWithSpend []int
	// Active recurring expenses. Only used for the current month, to keep
	// scheduled spending out of the daily pace.
	Schedules []Schedule
}

type Component struct {
	Key    string // budget | categories | recording
	Points int
	Max    int
}

// Tip is one thing worth telling the user, as a code plus the numbers the
// app needs to phrase it.
type Tip struct {
	Code         string // category_over | pace_over_budget | recording_gap | all_good | no_budget | no_records_yet | period_not_started
	CategoryName string
	Percent      int
	Amount       int64
	Budget       int64
	Weeks        int
}

type Score struct {
	Score          int
	Grade          string // A | B | C | D | n/a
	Provisional    bool
	Period         PeriodState
	ProjectedSpent int64
	TotalBudget    int64
	Components     []Component
	Tips           []Tip
}

const maxTips = 3

// ComputeScore grades a month out of 100 from three parts: the projected
// total against the total budget, each category against its own budget, and
// how regularly spending was recorded. The current month is judged on its
// projected end-of-month spending, not on what's been spent so far.
func ComputeScore(in ScoreInput) Score {
	state, elapsed, dim := Progress(in.Year, in.Month, in.Today)

	var totalBudget int64
	for _, c := range in.Categories {
		if c.Budget > 0 {
			totalBudget += c.Budget
		}
	}
	out := Score{Grade: "n/a", Period: state, TotalBudget: totalBudget, Components: []Component{}}

	if state == PeriodFuture {
		out.Tips = []Tip{{Code: "period_not_started"}}
		return out
	}
	projected, _ := projectSpent(in, state, elapsed, dim)
	out.ProjectedSpent = projected
	if totalBudget == 0 {
		out.Tips = []Tip{{Code: "no_budget"}}
		return out
	}
	// With nothing recorded yet there's nothing to grade: an empty month
	// would otherwise score as perfectly under budget.
	if state == PeriodCurrent && daysRecorded(in.DaysWithSpend, elapsed) == 0 {
		out.Provisional = true
		out.Tips = []Tip{{Code: "no_records_yet"}}
		return out
	}

	budgetPts := int(round(weightBudget * adherence(float64(projected)/float64(totalBudget))))

	var weighted float64
	for _, c := range in.Categories {
		if c.Budget > 0 {
			p, _ := projectCategory(c, in, state, elapsed, dim)
			weighted += float64(c.Budget) * adherence(float64(p)/float64(c.Budget))
		}
	}
	categoryPts := int(round(weightCategories * weighted / float64(totalBudget)))

	ratio, gapWeeks := recording(in.DaysWithSpend, elapsed, dim)
	recordingPts := int(round(weightRecording * ratio))

	out.Components = []Component{
		{Key: "budget", Points: budgetPts, Max: weightBudget},
		{Key: "categories", Points: categoryPts, Max: weightCategories},
		{Key: "recording", Points: recordingPts, Max: weightRecording},
	}
	out.Score = budgetPts + categoryPts + recordingPts
	out.Grade = grade(out.Score)
	out.Provisional = state == PeriodCurrent && (elapsed < 5 || daysRecorded(in.DaysWithSpend, elapsed) < 3)
	out.Tips = tips(in, state, projected, totalBudget, gapWeeks)
	return out
}

// ProjectSpent is the month's projected total spending (the actual total
// for a past month) and the part of it still scheduled to come.
func ProjectSpent(in ScoreInput) (projected, recurringRemaining int64) {
	state, elapsed, dim := Progress(in.Year, in.Month, in.Today)
	return projectSpent(in, state, elapsed, dim)
}

func projectSpent(in ScoreInput, state PeriodState, elapsed, dim int) (projected, recurringRemaining int64) {
	if state == PeriodFuture {
		return 0, 0
	}
	for _, c := range in.Categories {
		p, r := projectCategory(c, in, state, elapsed, dim)
		projected += p
		recurringRemaining += r
	}
	return projected, recurringRemaining
}

// projectCategory carries a category's day-to-day pace to the end of the
// month and adds the scheduled spending still to come. Scheduled spending
// already run is kept out of the pace, so rent paid on the 1st doesn't read
// as a daily habit.
func projectCategory(c CategoryInput, in ScoreInput, state PeriodState, elapsed, dim int) (projected, recurringRemaining int64) {
	if state != PeriodCurrent || elapsed <= 0 {
		return c.Spent, 0
	}
	soFar := RecurringAmount(in.Schedules, c.ID, in.Year, in.Month, 1, elapsed)
	remaining := RecurringAmount(in.Schedules, c.ID, in.Year, in.Month, elapsed+1, dim)
	pace := float64(max(c.Spent-soFar, 0)) / float64(elapsed)
	return c.Spent + round(pace*float64(dim-elapsed)) + remaining, remaining
}

// adherence maps spending as a share of budget to 0..1: full marks up to
// 90%, a gentle drop to 0.8 at 100%, then a steep one to nothing at 130%.
// Spending well under budget is not rewarded beyond full marks.
func adherence(u float64) float64 {
	switch {
	case u <= 0.9:
		return 1
	case u <= 1.0:
		return 1 - 2*(u-0.9)
	case u <= 1.3:
		return 0.8 * (1.3 - u) / 0.3
	default:
		return 0
	}
}

// recording splits the month into 7-day blocks from the 1st and returns the
// share of blocks with at least one record, plus how many blocks had none.
// A block still running only counts once it has a record, so a quiet start
// to the week isn't held against anyone.
func recording(days []int, elapsed, dim int) (ratio float64, gapWeeks int) {
	has := map[int]bool{}
	for _, d := range days {
		has[d] = true
	}
	counted, recorded := 0, 0
	for start := 1; start <= dim && start <= elapsed; start += 7 {
		end := min(start+6, dim)
		any := false
		for d := start; d <= min(end, elapsed); d++ {
			if has[d] {
				any = true
				break
			}
		}
		if end <= elapsed || any {
			counted++
		}
		if any {
			recorded++
		}
	}
	if counted == 0 {
		return 1, 0
	}
	return float64(recorded) / float64(counted), counted - recorded
}

func daysRecorded(days []int, elapsed int) int {
	n := 0
	for _, d := range days {
		if d >= 1 && d <= elapsed {
			n++
		}
	}
	return n
}

func grade(score int) string {
	switch {
	case score >= 85:
		return "A"
	case score >= 70:
		return "B"
	case score >= 50:
		return "C"
	default:
		return "D"
	}
}

// tips lists, most important first: the categories already over budget
// (worst two), a projection over the total budget, and weeks with nothing
// recorded — or "all good" when there's none of that.
func tips(in ScoreInput, state PeriodState, projected, totalBudget int64, gapWeeks int) []Tip {
	var over []Tip
	for _, c := range in.Categories {
		if c.Budget > 0 && c.Spent > c.Budget {
			over = append(over, Tip{
				Code:         "category_over",
				CategoryName: c.Name,
				Percent:      int(round(float64(c.Spent) * 100 / float64(c.Budget))),
			})
		}
	}
	sort.SliceStable(over, func(i, j int) bool { return over[i].Percent > over[j].Percent })

	out := over[:min(len(over), 2)]
	if state == PeriodCurrent && projected > totalBudget {
		out = append(out, Tip{Code: "pace_over_budget", Amount: projected, Budget: totalBudget})
	}
	if gapWeeks >= 1 {
		out = append(out, Tip{Code: "recording_gap", Weeks: gapWeeks})
	}
	if len(out) == 0 {
		return []Tip{{Code: "all_good"}}
	}
	return out[:min(len(out), maxTips)]
}
