package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"golang.org/x/sync/errgroup"

	"duitkita-api/insights"
	"duitkita-api/model/domain"
	"duitkita-api/pdfreport"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

const (
	snapshotTrendMonths   = 6
	snapshotTopExpenses   = 10
	snapshotTopCategories = 4
	snapshotAppendixLimit = 1000
	snapshotMaxInsights   = 4
)

// ReportSnapshotBuilder gathers everything a PDF export shows and derives it
// into a pdfreport.Report. All reads go out in parallel; everything after
// that is plain computation over the returned rows.
type ReportSnapshotBuilder interface {
	Build(ctx context.Context, userID string, year, month int, scope string) (*pdfreport.Report, error)
}

type reportSnapshotBuilder struct {
	repo                  repository.ReportSnapshotRepository
	userRepo              repository.UserRepository
	coupleRepo            repository.CoupleRepository
	activityRetentionDays int
	now                   func() time.Time
}

func NewReportSnapshotBuilder(repo repository.ReportSnapshotRepository, userRepo repository.UserRepository, coupleRepo repository.CoupleRepository, activityRetentionDays int, now func() time.Time) ReportSnapshotBuilder {
	if now == nil {
		now = time.Now
	}
	return &reportSnapshotBuilder{repo: repo, userRepo: userRepo, coupleRepo: coupleRepo, activityRetentionDays: activityRetentionDays, now: now}
}

type snapshotInput struct {
	year, month   int
	couple        bool
	ownerID       string
	owner         *domain.User
	partner       *domain.User
	expenses      []repository.SnapshotExpense
	budgets       []repository.SnapshotCategoryBudget
	history       []repository.SnapshotMonthCategoryTotal
	recurring     []repository.SnapshotRecurring
	bills         []domain.BillReminder
	activity      []repository.SnapshotActivityCount
	activityKnown bool
	now           time.Time
	retentionDays int
}

func (b *reportSnapshotBuilder) Build(ctx context.Context, userID string, year, month int, scope string) (*pdfreport.Report, error) {
	if month < 1 || month > 12 {
		return nil, utils.ErrBadRequest("invalid report month")
	}

	in := snapshotInput{
		year: year, month: month,
		couple:        scope == "couple",
		ownerID:       userID,
		now:           b.now().In(pdfreport.WIB),
		retentionDays: b.activityRetentionDays,
	}

	userIDs := []string{userID}
	var partnerID, coupleID string
	if in.couple {
		couple, err := b.coupleRepo.FindByUserID(ctx, userID)
		if err != nil {
			return nil, utils.ErrInternal("failed to look up partner")
		}
		if couple == nil {
			return nil, utils.ErrNotFound("no linked partner")
		}
		coupleID = couple.ID
		partnerID = couple.User2ID
		if partnerID == userID {
			partnerID = couple.User1ID
		}
		userIDs = append(userIDs, partnerID)
	}

	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)
	historyStart := start.AddDate(0, -(snapshotTrendMonths - 1), 0)

	g, gctx := errgroup.WithContext(ctx)
	read := func(what string, fn func() error) {
		g.Go(func() error {
			if err := fn(); err != nil {
				log.Error().Err(err).Str("user_id", userID).Str("read", what).Msg("report snapshot read failed")
				return utils.ErrInternal("failed to load report data")
			}
			return nil
		})
	}
	read("owner", func() (err error) { in.owner, err = b.userRepo.FindByID(gctx, userID); return })
	if in.couple {
		read("partner", func() (err error) { in.partner, err = b.userRepo.FindByID(gctx, partnerID); return })
		read("activity", func() (err error) {
			in.activity, err = b.repo.ActivityCountsForPeriod(gctx, coupleID, start, end)
			in.activityKnown = err == nil
			return
		})
	}
	read("expenses", func() (err error) { in.expenses, err = b.repo.ExpensesForPeriod(gctx, userIDs, start, end); return })
	read("budgets", func() (err error) {
		in.budgets, err = b.repo.CategoryBudgetsForPeriod(gctx, userIDs, year, month)
		return
	})
	read("history", func() (err error) {
		in.history, err = b.repo.MonthlyCategoryTotals(gctx, userIDs, historyStart, start)
		return
	})
	read("recurring", func() (err error) { in.recurring, err = b.repo.ActiveRecurring(gctx, userIDs); return })
	read("bills", func() (err error) { in.bills, err = b.repo.BillsDueBetween(gctx, userIDs, start, end); return })
	if err := g.Wait(); err != nil {
		return nil, err
	}
	if in.owner == nil || (in.couple && in.partner == nil) {
		return nil, utils.ErrNotFound("user not found")
	}

	return assembleReport(in), nil
}

// assembleReport is pure: rows in, view model out.
func assembleReport(in snapshotInput) *pdfreport.Report {
	start := time.Date(in.year, time.Month(in.month), 1, 0, 0, 0, 0, time.UTC)
	daysInMonth := start.AddDate(0, 1, -1).Day()
	today := time.Date(in.now.Year(), in.now.Month(), in.now.Day(), 0, 0, 0, 0, time.UTC)

	r := &pdfreport.Report{
		Couple:      in.couple,
		Year:        in.year,
		Month:       in.month,
		GeneratedAt: in.now,
		DaysInMonth: daysInMonth,
		Owner:       pdfreport.Person{ID: in.owner.ID, Name: in.owner.Name},
	}
	if in.couple {
		r.Partner = &pdfreport.Person{ID: in.partner.ID, Name: in.partner.Name}
	}

	daysCounted := daysInMonth
	switch {
	case in.now.Year() == in.year && int(in.now.Month()) == in.month:
		r.Partial = true
		r.AsOfDay = in.now.Day()
		daysCounted = r.AsOfDay
	case start.After(today):
		// A future month: nothing has happened yet.
		r.Partial = true
		daysCounted = 0
	}

	ownerOf := func(userID string) pdfreport.Owner {
		if in.couple && userID != in.ownerID {
			return pdfreport.OwnerPartner
		}
		return pdfreport.OwnerMe
	}

	// --- categories ---
	type catAgg struct {
		row   pdfreport.CategoryRow
		id    string
		order int
	}
	cats := map[string]*catAgg{}
	var totalBudget int64
	var budgetBy [2]int64
	for i, cb := range in.budgets {
		o := ownerOf(cb.UserID)
		cats[cb.CategoryID] = &catAgg{id: cb.CategoryID, order: i, row: pdfreport.CategoryRow{
			Owner: o, Name: cb.Name, Budget: cb.Total, Base: cb.Base, Rollover: cb.Rollover,
		}}
		totalBudget += cb.Total
		budgetBy[o] += cb.Total
	}

	// --- one pass over the month's expenses ---
	r.Daily = make([]pdfreport.DayPoint, daysInMonth)
	for i := range r.Daily {
		day := start.AddDate(0, 0, i)
		r.Daily[i] = pdfreport.DayPoint{Day: i + 1, Weekday: day.Weekday(), Future: i+1 > daysCounted}
	}
	dayCount := make([]int, daysInMonth)
	var totalSpent int64
	var spentBy [2]int64
	var txBy [2]int
	for _, e := range in.expenses {
		o := ownerOf(e.UserID)
		totalSpent += e.Amount
		spentBy[o] += e.Amount
		txBy[o]++

		c := cats[e.CategoryID]
		if c == nil {
			c = &catAgg{id: e.CategoryID, order: len(cats), row: pdfreport.CategoryRow{Owner: o, Name: e.CategoryName}}
			cats[e.CategoryID] = c
		}
		c.row.Spent += e.Amount

		if d := e.ExpenseDate.Day() - 1; d >= 0 && d < daysInMonth {
			if o == pdfreport.OwnerPartner {
				r.Daily[d].Partner += e.Amount
			} else {
				r.Daily[d].Me += e.Amount
			}
			dayCount[d]++
		}
	}

	rows := make([]*catAgg, 0, len(cats))
	for _, c := range cats {
		if c.row.Spent > 0 || c.row.Budget > 0 {
			if totalSpent > 0 {
				c.row.Share = float64(c.row.Spent) / float64(totalSpent)
			}
			rows = append(rows, c)
		}
	}
	sort.Slice(rows, func(i, j int) bool {
		a, b := rows[i].row, rows[j].row
		if a.Spent != b.Spent {
			return a.Spent > b.Spent
		}
		if a.Budget != b.Budget {
			return a.Budget > b.Budget
		}
		return a.Name < b.Name
	})
	for _, c := range rows {
		r.Categories = append(r.Categories, c.row)
	}

	// --- summary ---
	s := &r.Summary
	s.TotalSpent = totalSpent
	s.TotalBudget = totalBudget
	s.TxCount = len(in.expenses)
	s.DaysCounted = daysCounted
	if daysCounted > 0 {
		s.AvgDaily = totalSpent / int64(daysCounted)
	}
	for i := 0; i < daysCounted && i < daysInMonth; i++ {
		if r.Daily[i].Total() == 0 {
			s.ZeroSpendDays++
		}
	}
	// Score and projections use the same insights functions as the app, so
	// the PDF prints the numbers the person saw on screen.
	scoreIn := insights.ScoreInput{Year: in.year, Month: in.month, Today: in.now}
	for _, c := range cats {
		scoreIn.Categories = append(scoreIn.Categories, insights.CategoryInput{ID: c.id, Name: c.row.Name, Budget: c.row.Budget, Spent: c.row.Spent})
	}
	for d, n := range dayCount {
		if n > 0 {
			scoreIn.DaysWithSpend = append(scoreIn.DaysWithSpend, d+1)
		}
	}
	for _, re := range in.recurring {
		scoreIn.Schedules = append(scoreIn.Schedules, toSchedule(re.CategoryID, re.Amount, re.ScheduleType, re.ScheduleDay, re.CreatedAt))
	}
	if hs := insights.ComputeScore(scoreIn); hs.Grade != "n/a" {
		s.Health = pdfreport.Health{Score: hs.Score, Grade: hs.Grade}
	}

	// --- weekday averages, Monday first ---
	var wdSum [7]int64
	var wdN [7]int
	for i := 0; i < daysCounted && i < daysInMonth; i++ {
		wd := r.Daily[i].Weekday
		wdSum[wd] += r.Daily[i].Total()
		wdN[wd]++
	}
	for _, wd := range []time.Weekday{time.Monday, time.Tuesday, time.Wednesday, time.Thursday, time.Friday, time.Saturday, time.Sunday} {
		st := pdfreport.WeekdayStat{Weekday: wd, Occurrences: wdN[wd]}
		if wdN[wd] > 0 {
			st.Avg = wdSum[wd] / int64(wdN[wd])
		}
		r.Weekdays = append(r.Weekdays, st)
	}

	// --- 6-month trend (history + this month) ---
	type ym struct{ y, m int }
	months := make([]ym, snapshotTrendMonths)
	idx := map[ym]int{}
	for i := range months {
		t := start.AddDate(0, i-(snapshotTrendMonths-1), 0)
		months[i] = ym{t.Year(), int(t.Month())}
		idx[months[i]] = i
	}
	r.Trend = make([]pdfreport.TrendPoint, snapshotTrendMonths)
	for i, m := range months {
		r.Trend[i] = pdfreport.TrendPoint{Year: m.y, Month: m.m}
	}
	catSeries := map[string][]int64{}
	series := func(catID string) []int64 {
		if catSeries[catID] == nil {
			catSeries[catID] = make([]int64, snapshotTrendMonths)
		}
		return catSeries[catID]
	}
	hasPrev := false
	for _, h := range in.history {
		i, ok := idx[ym{h.Year, h.Month}]
		if !ok {
			continue
		}
		if ownerOf(h.UserID) == pdfreport.OwnerPartner {
			r.Trend[i].Partner += h.Total
		} else {
			r.Trend[i].Me += h.Total
		}
		series(h.CategoryID)[i] += h.Total
		if i == snapshotTrendMonths-2 && h.Total > 0 {
			hasPrev = true
		}
	}
	last := snapshotTrendMonths - 1
	r.Trend[last].Me = spentBy[pdfreport.OwnerMe]
	r.Trend[last].Partner = spentBy[pdfreport.OwnerPartner]
	for _, c := range rows {
		series(c.id)[last] = c.row.Spent
	}
	s.PrevSpent = r.Trend[last-1].Total()
	s.HasPrev = hasPrev

	for _, c := range rows {
		if len(r.CategoryTrends) >= snapshotTopCategories || c.row.Spent <= 0 {
			break
		}
		r.CategoryTrends = append(r.CategoryTrends, pdfreport.CategoryTrend{Owner: c.row.Owner, Name: c.row.Name, Points: series(c.id)})
	}

	// --- projection ---
	nextMonth := start.AddDate(0, 1, 0)
	switch {
	case r.Partial && r.AsOfDay > 0 && totalSpent > 0:
		projected, _ := insights.ProjectSpent(scoreIn)
		r.Projection = &pdfreport.Projection{
			Kind: pdfreport.ProjectionEndOfMonth, Year: in.year, Month: in.month, Amount: projected,
		}
	case !r.Partial && !nextMonth.Before(time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, time.UTC)):
		// Only worth projecting when the next month hasn't already happened.
		next := insights.NextMonthInput{Year: nextMonth.Year(), Month: int(nextMonth.Month()), Schedules: scoreIn.Schedules}
		for i, t := range r.Trend[last-2:] {
			next.Totals[i] = t.Total()
		}
		if f := insights.ForecastNextMonth(next); f.MonthsWithData > 0 {
			r.Projection = &pdfreport.Projection{
				Kind: pdfreport.ProjectionNextMonth, Year: nextMonth.Year(), Month: int(nextMonth.Month()), Amount: f.Projected,
			}
		}
	}

	// --- top expenses & appendix ---
	top := make([]repository.SnapshotExpense, len(in.expenses))
	copy(top, in.expenses)
	sort.SliceStable(top, func(i, j int) bool {
		if top[i].Amount != top[j].Amount {
			return top[i].Amount > top[j].Amount
		}
		return top[i].ExpenseDate.After(top[j].ExpenseDate)
	})
	if len(top) > snapshotTopExpenses {
		top = top[:snapshotTopExpenses]
	}
	toTx := func(e repository.SnapshotExpense) pdfreport.Transaction {
		t := pdfreport.Transaction{Owner: ownerOf(e.UserID), Date: e.ExpenseDate, Category: e.CategoryName, Amount: e.Amount}
		if e.Note != nil {
			t.Note = *e.Note
		}
		return t
	}
	for _, e := range top {
		r.TopExpenses = append(r.TopExpenses, toTx(e))
	}
	appendix := in.expenses
	if len(appendix) > snapshotAppendixLimit {
		r.TransactionsOmitted = len(appendix) - snapshotAppendixLimit
		appendix = appendix[:snapshotAppendixLimit]
	}
	for _, e := range appendix {
		r.Transactions = append(r.Transactions, toTx(e))
	}

	// --- recurring ---
	for _, re := range in.recurring {
		item := pdfreport.RecurringItem{
			Owner:    ownerOf(re.UserID),
			Label:    re.CategoryName,
			Category: re.CategoryName,
			Amount:   re.Amount,
			NextRun:  re.NextRunAt.In(pdfreport.WIB),
		}
		if re.Note != nil && strings.TrimSpace(*re.Note) != "" {
			item.Label = *re.Note
		}
		if re.ScheduleType == string(domain.RecurringScheduleWeekly) {
			n := weekdayOccurrences(start, daysInMonth, time.Weekday(re.ScheduleDay))
			item.MonthlyAmount = re.Amount * int64(n)
			item.Schedule = fmt.Sprintf("Tiap %s · %d×", pdfreport.WeekdayName(time.Weekday(re.ScheduleDay)), n)
		} else {
			item.MonthlyAmount = re.Amount
			item.Schedule = fmt.Sprintf("Tiap tgl %d", re.ScheduleDay)
		}
		r.Recurring.Items = append(r.Recurring.Items, item)
		r.Recurring.MonthlyTotal += item.MonthlyAmount
	}
	sort.SliceStable(r.Recurring.Items, func(i, j int) bool {
		return r.Recurring.Items[i].MonthlyAmount > r.Recurring.Items[j].MonthlyAmount
	})

	// --- bills ---
	for _, bill := range in.bills {
		item := pdfreport.BillItem{Owner: ownerOf(bill.UserID), Title: bill.Title, DueDate: bill.DueDate, Amount: bill.Amount}
		due := time.Date(bill.DueDate.Year(), bill.DueDate.Month(), bill.DueDate.Day(), 0, 0, 0, 0, time.UTC)
		switch {
		case bill.Status == domain.BillReminderStatusDone:
			item.State = pdfreport.BillPaid
			r.Bills.Paid++
		case bill.Status == domain.BillReminderStatusOverdue || due.Before(today):
			item.State = pdfreport.BillOverdue
			r.Bills.Overdue++
		default:
			item.State = pdfreport.BillUpcoming
		}
		if bill.Amount != nil {
			r.Bills.TotalAmount += *bill.Amount
		}
		r.Bills.Items = append(r.Bills.Items, item)
	}

	// --- couple ---
	if in.couple {
		cs := &pdfreport.CoupleSection{RetentionDays: in.retentionDays}
		for o, ps := range []*pdfreport.PersonStats{&cs.Me, &cs.Partner} {
			ps.Spent = spentBy[o]
			ps.Budget = budgetBy[o]
			ps.TxCount = txBy[o]
			if daysCounted > 0 {
				ps.AvgDaily = spentBy[o] / int64(daysCounted)
			}
			for _, c := range r.Categories {
				if int(c.Owner) == o && c.Spent > 0 && len(ps.TopCategories) < 3 {
					ps.TopCategories = append(ps.TopCategories, c)
				}
			}
		}
		cutoff := in.now.AddDate(0, 0, -in.retentionDays)
		cs.ActivityAvailable = in.activityKnown && (in.retentionDays <= 0 || !start.Before(cutoff))
		for _, a := range in.activity {
			st := &cs.MeActivity
			if ownerOf(a.ActorID) == pdfreport.OwnerPartner {
				st = &cs.PartnerActivity
			}
			switch {
			case a.EntityType == string(domain.ActivityEntityTypeBudget):
				st.BudgetChanges += a.Count
			case a.Action == string(domain.ActivityActionCreated):
				st.ExpensesCreated += a.Count
			case a.Action == string(domain.ActivityActionUpdated):
				st.ExpensesUpdated += a.Count
			case a.Action == string(domain.ActivityActionDeleted):
				st.ExpensesDeleted += a.Count
			}
		}
		r.CoupleStats = cs
	}

	r.Insights = buildInsights(r, dayCount)
	return r
}

func weekdayOccurrences(start time.Time, days int, wd time.Weekday) int {
	n := 0
	for i := 0; i < days; i++ {
		if start.AddDate(0, 0, i).Weekday() == wd {
			n++
		}
	}
	return n
}

// buildInsights writes the "Catatan bulan ini" sentences: deterministic
// rules in priority order, the first few that apply.
func buildInsights(r *pdfreport.Report, dayCount []int) []pdfreport.Insight {
	s := r.Summary
	var out []pdfreport.Insight
	add := func(st pdfreport.Status, format string, args ...any) {
		out = append(out, pdfreport.Insight{Status: st, Text: fmt.Sprintf(format, args...)})
	}
	name := func(c pdfreport.CategoryRow) string {
		n := pdfreport.SanitizeText(c.Name)
		if r.Couple && r.Partner != nil {
			owner := r.Owner.Name
			if c.Owner == pdfreport.OwnerPartner {
				owner = r.Partner.Name
			}
			n += " (" + pdfreport.FirstName(pdfreport.SanitizeText(owner)) + ")"
		}
		return n
	}
	period := pdfreport.FormatPeriod(r.Year, r.Month)

	if s.TxCount == 0 {
		add(pdfreport.StatusNeutral, "Belum ada transaksi yang tercatat di %s.", period)
	}

	// 1. Budget status.
	var over []pdfreport.CategoryRow
	for _, c := range r.Categories {
		if c.Budget > 0 && c.Spent > c.Budget {
			over = append(over, c)
		}
	}
	sort.SliceStable(over, func(i, j int) bool { return -over[i].Remaining() > -over[j].Remaining() })
	switch {
	case len(over) == 1:
		c := over[0]
		add(pdfreport.StatusDanger, "Budget %s terlampaui %s (%s dari budget).", name(c), pdfreport.FormatRupiah(-c.Remaining()), pdfreport.FormatPercent(c.Usage()))
	case len(over) > 1:
		names := make([]string, len(over))
		for i, c := range over {
			names[i] = name(c)
		}
		add(pdfreport.StatusDanger, "%d kategori melewati budget: %s.", len(over), pdfreport.JoinList(names, 3))
	case s.HasBudget() && !r.Partial && s.TxCount > 0 && s.TotalSpent <= s.TotalBudget:
		add(pdfreport.StatusGood, "Semua kategori tetap dalam batas budget, dengan sisa %s.", pdfreport.FormatRupiah(s.TotalBudget-s.TotalSpent))
	}

	// 2. Overdue bills.
	var overdue []string
	for _, b := range r.Bills.Items {
		if b.State == pdfreport.BillOverdue {
			overdue = append(overdue, pdfreport.SanitizeText(b.Title))
		}
	}
	if len(overdue) == 1 {
		add(pdfreport.StatusDanger, "Tagihan %s sudah lewat jatuh tempo dan belum ditandai lunas.", overdue[0])
	} else if len(overdue) > 1 {
		add(pdfreport.StatusDanger, "%d tagihan lewat jatuh tempo dan belum lunas: %s.", len(overdue), pdfreport.JoinList(overdue, 2))
	}

	// 3. Pace for a month in progress.
	if r.Partial && r.Projection != nil && r.Projection.Kind == pdfreport.ProjectionEndOfMonth && s.HasBudget() {
		p := r.Projection.Amount
		if p > s.TotalBudget {
			add(pdfreport.StatusWarn, "Dengan laju saat ini, pengeluaran akhir bulan diperkirakan %s, melewati budget sebesar %s.", pdfreport.FormatRupiah(p), pdfreport.FormatRupiah(p-s.TotalBudget))
		} else {
			add(pdfreport.StatusGood, "Laju pengeluaran masih aman: proyeksi akhir bulan %s dari budget %s.", pdfreport.FormatRupiah(p), pdfreport.FormatRupiah(s.TotalBudget))
		}
	}

	// 4. Month over month (complete months only).
	if !r.Partial && s.HasPrev && s.PrevSpent > 0 && s.TxCount > 0 {
		change := float64(s.TotalSpent-s.PrevSpent) / float64(s.PrevSpent)
		prevName := pdfreport.MonthName(r.Trend[len(r.Trend)-2].Month)
		if change >= 0.1 {
			add(pdfreport.StatusWarn, "Pengeluaran naik %s dibanding %s, dari %s menjadi %s.", pdfreport.FormatPercent(change), prevName, pdfreport.FormatRupiah(s.PrevSpent), pdfreport.FormatRupiah(s.TotalSpent))
		} else if change <= -0.1 {
			add(pdfreport.StatusGood, "Pengeluaran turun %s dibanding %s, lebih hemat %s.", pdfreport.FormatPercent(-change), prevName, pdfreport.FormatRupiah(s.PrevSpent-s.TotalSpent))
		}
	}

	// 5. Concentration in one category.
	if len(r.Categories) >= 2 && r.Categories[0].Share >= 0.3 {
		c := r.Categories[0]
		add(pdfreport.StatusNeutral, "%s menyerap %s dari total pengeluaran.", name(c), pdfreport.FormatPercent(c.Share))
	}

	// 6. The single heaviest day.
	peak := -1
	for i, d := range r.Daily {
		if d.Total() > 0 && (peak < 0 || d.Total() > r.Daily[peak].Total()) {
			peak = i
		}
	}
	if peak >= 0 && s.AvgDaily > 0 && r.Daily[peak].Total() >= 2*s.AvgDaily {
		day := time.Date(r.Year, time.Month(r.Month), r.Daily[peak].Day, 0, 0, 0, 0, time.UTC)
		add(pdfreport.StatusNeutral, "Hari paling boros adalah %s: %s dari %d transaksi.", pdfreport.FormatDayLong(day), pdfreport.FormatRupiah(r.Daily[peak].Total()), dayCount[peak])
	}

	// 7. Weekend vs weekday rhythm.
	var weSum, wdSum int64
	var weN, wdN int
	for _, w := range r.Weekdays {
		if w.Weekday == time.Saturday || w.Weekday == time.Sunday {
			weSum += w.Avg * int64(w.Occurrences)
			weN += w.Occurrences
		} else {
			wdSum += w.Avg * int64(w.Occurrences)
			wdN += w.Occurrences
		}
	}
	if weN > 0 && wdN > 0 && wdSum > 0 {
		ratio := (float64(weSum) / float64(weN)) / (float64(wdSum) / float64(wdN))
		if ratio >= 1.5 {
			add(pdfreport.StatusNeutral, "Rata-rata belanja harian di akhir pekan %s hari kerja.", pdfreport.FormatRatio(ratio))
		}
	}

	// 8. How much is already committed by recurring expenses.
	if s.HasBudget() && r.Recurring.MonthlyTotal > 0 {
		share := float64(r.Recurring.MonthlyTotal) / float64(s.TotalBudget)
		if share >= 0.2 {
			add(pdfreport.StatusNeutral, "Pengeluaran rutin mengikat %s per bulan, atau %s dari budget.", pdfreport.FormatRupiah(r.Recurring.MonthlyTotal), pdfreport.FormatPercent(share))
		}
	}

	if len(out) > snapshotMaxInsights {
		out = out[:snapshotMaxInsights]
	}
	return out
}
