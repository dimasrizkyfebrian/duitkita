package service_test

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/pdfreport"
	"duitkita-api/repository"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

// snapshotData is what the mocked repositories hand the builder.
type snapshotData struct {
	expenses  []repository.SnapshotExpense
	budgets   []repository.SnapshotCategoryBudget
	history   []repository.SnapshotMonthCategoryTotal
	recurring []repository.SnapshotRecurring
	bills     []domain.BillReminder
	activity  []repository.SnapshotActivityCount
}

const (
	userMe      = "user-1"
	userPartner = "user-2"
)

func newSnapshotBuilder(t *testing.T, now time.Time, couple bool, data snapshotData) service.ReportSnapshotBuilder {
	t.Helper()
	repo := mocks.NewReportSnapshotRepository(t)
	users := mocks.NewUserRepository(t)
	couples := mocks.NewCoupleRepository(t)

	users.EXPECT().FindByID(mock.Anything, userMe).Return(&domain.User{ID: userMe, Name: "Dimas Rizky Febrian"}, nil)
	if couple {
		couples.EXPECT().FindByUserID(mock.Anything, userMe).Return(&domain.Couple{ID: "couple-1", User1ID: userPartner, User2ID: userMe}, nil)
		users.EXPECT().FindByID(mock.Anything, userPartner).Return(&domain.User{ID: userPartner, Name: "Rina Amalia"}, nil)
		repo.EXPECT().ActivityCountsForPeriod(mock.Anything, "couple-1", mock.Anything, mock.Anything).Return(data.activity, nil)
	}
	repo.EXPECT().ExpensesForPeriod(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(data.expenses, nil)
	repo.EXPECT().CategoryBudgetsForPeriod(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(data.budgets, nil)
	repo.EXPECT().MonthlyCategoryTotals(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(data.history, nil)
	repo.EXPECT().ActiveRecurring(mock.Anything, mock.Anything).Return(data.recurring, nil)
	repo.EXPECT().BillsDueBetween(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(data.bills, nil)

	return service.NewReportSnapshotBuilder(repo, users, couples, 180, func() time.Time { return now })
}

func date(y, m, d int) time.Time { return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC) }

func expense(user, cat, catName string, day time.Time, amount int64, note string) repository.SnapshotExpense {
	e := repository.SnapshotExpense{ID: fmt.Sprintf("%s-%s-%d-%d", user, cat, day.Day(), amount), UserID: user, CategoryID: cat, CategoryName: catName, Amount: amount, ExpenseDate: day}
	if note != "" {
		e.Note = &note
	}
	return e
}

// --- derivation -----------------------------------------------------------

// September 2026 starts on a Tuesday; the 5th and 6th are a weekend.
func septemberData() snapshotData {
	billAmount := int64(200_000)
	weeklyNote := "Laundry kiloan"
	return snapshotData{
		budgets: []repository.SnapshotCategoryBudget{
			{UserID: userMe, CategoryID: "food", Name: "Makan", Base: 900_000, Rollover: 100_000, Total: 1_000_000},
			{UserID: userMe, CategoryID: "trans", Name: "Transport", Base: 300_000, Total: 300_000},
			{UserID: userMe, CategoryID: "edu", Name: "Pendidikan", Base: 500_000, Total: 500_000},
			{UserID: userMe, CategoryID: "gift", Name: "Hadiah"},
		},
		expenses: []repository.SnapshotExpense{
			expense(userMe, "trans", "Transport", date(2026, 9, 1), 100_000, "Bensin"),
			expense(userMe, "food", "Makan", date(2026, 9, 5), 600_000, "Makan keluarga"),
			expense(userMe, "food", "Makan", date(2026, 9, 6), 500_000, ""),
			expense(userMe, "trans", "Transport", date(2026, 9, 15), 50_000, "Parkir"),
		},
		history: []repository.SnapshotMonthCategoryTotal{
			{UserID: userMe, CategoryID: "food", Year: 2026, Month: 8, Total: 800_000},
			{UserID: userMe, CategoryID: "trans", Year: 2026, Month: 8, Total: 200_000},
		},
		recurring: []repository.SnapshotRecurring{
			{ID: "r1", UserID: userMe, CategoryName: "Tagihan", Amount: 150_000, ScheduleType: "monthly", ScheduleDay: 5, NextRunAt: date(2026, 11, 5)},
			{ID: "r2", UserID: userMe, CategoryName: "Rumah", Note: &weeklyNote, Amount: 50_000, ScheduleType: "weekly", ScheduleDay: int(time.Monday), NextRunAt: date(2026, 11, 2)},
		},
		bills: []domain.BillReminder{
			{UserID: userMe, Title: "Internet", DueDate: date(2026, 9, 10), Status: domain.BillReminderStatusDone, Amount: &billAmount},
			{UserID: userMe, Title: "Listrik", DueDate: date(2026, 9, 20), Status: domain.BillReminderStatusUpcoming},
		},
	}
}

func TestReportSnapshotBuilder_DerivesPersonalMonth(t *testing.T) {
	now := time.Date(2026, 10, 30, 14, 5, 0, 0, pdfreport.WIB)
	b := newSnapshotBuilder(t, now, false, septemberData())

	r, err := b.Build(context.Background(), userMe, 2026, 9, "personal")
	require.NoError(t, err)

	require.False(t, r.Partial)
	require.Equal(t, 30, r.DaysInMonth)

	s := r.Summary
	require.EqualValues(t, 1_250_000, s.TotalSpent)
	require.EqualValues(t, 1_800_000, s.TotalBudget)
	require.Equal(t, 4, s.TxCount)
	require.Equal(t, 30, s.DaysCounted)
	require.EqualValues(t, 41_666, s.AvgDaily)
	require.Equal(t, 26, s.ZeroSpendDays, "spending on the 1st, 5th, 6th and 15th only")
	require.True(t, s.HasPrev)
	require.EqualValues(t, 1_000_000, s.PrevSpent)
	require.Equal(t, pdfreport.Health{Score: 30, Grade: "A"}, s.Health)

	// Hadiah has neither spend nor budget, so it's left out.
	require.Len(t, r.Categories, 3)
	require.Equal(t, "Makan", r.Categories[0].Name)
	require.EqualValues(t, 100_000, r.Categories[0].Rollover)
	require.Equal(t, pdfreport.StatusDanger, r.Categories[0].Status())
	require.InDelta(t, 0.88, r.Categories[0].Share, 1e-9)
	require.Equal(t, "Transport", r.Categories[1].Name)
	require.Equal(t, "Pendidikan", r.Categories[2].Name)
	require.EqualValues(t, 0, r.Categories[2].Spent)

	require.Equal(t, time.Monday, r.Weekdays[0].Weekday)
	sat := r.Weekdays[5]
	require.Equal(t, time.Saturday, sat.Weekday)
	require.Equal(t, 4, sat.Occurrences)
	require.EqualValues(t, 150_000, sat.Avg)

	require.Len(t, r.Trend, 6)
	require.Equal(t, 4, r.Trend[0].Month)
	require.EqualValues(t, 1_000_000, r.Trend[4].Total())
	require.EqualValues(t, 1_250_000, r.Trend[5].Total())
	require.Equal(t, []int64{0, 0, 0, 0, 800_000, 1_100_000}, r.CategoryTrends[0].Points)

	require.NotNil(t, r.Projection)
	require.Equal(t, pdfreport.ProjectionNextMonth, r.Projection.Kind)
	require.Equal(t, 10, r.Projection.Month)
	require.EqualValues(t, 1_125_000, r.Projection.Amount, "average of the months with data in the last three")

	require.EqualValues(t, 600_000, r.TopExpenses[0].Amount)
	require.Len(t, r.Transactions, 4)
	require.Zero(t, r.TransactionsOmitted)

	require.EqualValues(t, 350_000, r.Recurring.MonthlyTotal)
	require.Equal(t, "Laundry kiloan", r.Recurring.Items[0].Label, "sorted by monthly amount: 4 Mondays × 50.000")
	require.Equal(t, "Tiap Senin · 4×", r.Recurring.Items[0].Schedule)
	require.Equal(t, "Tiap tgl 5", r.Recurring.Items[1].Schedule)

	require.Equal(t, 1, r.Bills.Paid)
	require.Equal(t, 1, r.Bills.Overdue, "a past due date that was never marked done is overdue")
	require.EqualValues(t, 200_000, r.Bills.TotalAmount)

	require.Equal(t, []pdfreport.Insight{
		{Status: pdfreport.StatusDanger, Text: "Budget Makan terlampaui Rp 100.000 (110% dari budget)."},
		{Status: pdfreport.StatusDanger, Text: "Tagihan Listrik sudah lewat jatuh tempo dan belum ditandai lunas."},
		{Status: pdfreport.StatusWarn, Text: "Pengeluaran naik 25% dibanding Agustus, dari Rp 1.000.000 menjadi Rp 1.250.000."},
		{Status: pdfreport.StatusNeutral, Text: "Makan menyerap 88% dari total pengeluaran."},
	}, r.Insights)
}

func TestReportSnapshotBuilder_PartialMonth(t *testing.T) {
	now := time.Date(2026, 10, 30, 14, 5, 0, 0, pdfreport.WIB)
	data := snapshotData{
		budgets: []repository.SnapshotCategoryBudget{{UserID: userMe, CategoryID: "food", Name: "Makan", Total: 3_000_000}},
		expenses: []repository.SnapshotExpense{
			expense(userMe, "food", "Makan", date(2026, 10, 2), 1_500_000, ""),
			expense(userMe, "food", "Makan", date(2026, 10, 29), 1_500_000, ""),
		},
	}
	b := newSnapshotBuilder(t, now, false, data)

	r, err := b.Build(context.Background(), userMe, 2026, 10, "personal")
	require.NoError(t, err)

	require.True(t, r.Partial)
	require.Equal(t, 30, r.AsOfDay)
	require.Equal(t, 30, r.Summary.DaysCounted)
	require.True(t, r.Daily[30].Future)
	require.False(t, r.Daily[29].Future)
	require.EqualValues(t, 100_000, r.Summary.AvgDaily)

	require.Equal(t, pdfreport.ProjectionEndOfMonth, r.Projection.Kind)
	require.EqualValues(t, 3_100_000, r.Projection.Amount, "3.000.000 over 30 days, run out to 31")
	require.Contains(t, r.Insights, pdfreport.Insight{
		Status: pdfreport.StatusWarn,
		Text:   "Dengan laju saat ini, pengeluaran akhir bulan diperkirakan Rp 3.100.000, melewati budget sebesar Rp 100.000.",
	})
}

func TestReportSnapshotBuilder_Couple(t *testing.T) {
	now := time.Date(2026, 10, 30, 14, 5, 0, 0, pdfreport.WIB)
	data := snapshotData{
		budgets: []repository.SnapshotCategoryBudget{
			{UserID: userMe, CategoryID: "food", Name: "Makan", Total: 1_000_000},
			{UserID: userPartner, CategoryID: "skin", Name: "Skincare", Total: 500_000},
		},
		expenses: []repository.SnapshotExpense{
			expense(userMe, "food", "Makan", date(2026, 9, 3), 300_000, ""),
			expense(userPartner, "skin", "Skincare", date(2026, 9, 3), 200_000, ""),
			expense(userPartner, "skin", "Skincare", date(2026, 9, 9), 100_000, ""),
		},
		activity: []repository.SnapshotActivityCount{
			{ActorID: userMe, EntityType: "expense", Action: "created", Count: 1},
			{ActorID: userPartner, EntityType: "expense", Action: "created", Count: 2},
			{ActorID: userPartner, EntityType: "expense", Action: "deleted", Count: 1},
			{ActorID: userPartner, EntityType: "budget", Action: "updated", Count: 3},
		},
	}
	b := newSnapshotBuilder(t, now, true, data)

	r, err := b.Build(context.Background(), userMe, 2026, 9, "couple")
	require.NoError(t, err)

	require.True(t, r.Couple)
	require.Equal(t, "Rina Amalia", r.Partner.Name)
	require.EqualValues(t, 300_000, r.Daily[2].Me)
	require.EqualValues(t, 200_000, r.Daily[2].Partner)
	require.EqualValues(t, 300_000, r.Trend[5].Me)
	require.EqualValues(t, 300_000, r.Trend[5].Partner)

	cs := r.CoupleStats
	require.EqualValues(t, 300_000, cs.Me.Spent)
	require.EqualValues(t, 300_000, cs.Partner.Spent)
	require.EqualValues(t, 500_000, cs.Partner.Budget)
	require.Equal(t, 2, cs.Partner.TxCount)
	require.Equal(t, "Skincare", cs.Partner.TopCategories[0].Name)
	require.True(t, cs.ActivityAvailable)
	require.Equal(t, pdfreport.ActivityStats{ExpensesCreated: 1}, cs.MeActivity)
	require.Equal(t, pdfreport.ActivityStats{ExpensesCreated: 2, ExpensesDeleted: 1, BudgetChanges: 3}, cs.PartnerActivity)

	var skincare pdfreport.CategoryRow
	for _, c := range r.Categories {
		if c.Name == "Skincare" {
			skincare = c
		}
	}
	require.Equal(t, pdfreport.OwnerPartner, skincare.Owner)
}

func TestReportSnapshotBuilder_ActivityOlderThanRetention(t *testing.T) {
	now := time.Date(2026, 10, 30, 14, 5, 0, 0, pdfreport.WIB)
	b := newSnapshotBuilder(t, now, true, snapshotData{})

	r, err := b.Build(context.Background(), userMe, 2026, 1, "couple")
	require.NoError(t, err)
	require.False(t, r.CoupleStats.ActivityAvailable, "January is past the 180-day activity retention")
}

func TestReportSnapshotBuilder_CapsAppendix(t *testing.T) {
	now := time.Date(2026, 10, 30, 14, 5, 0, 0, pdfreport.WIB)
	var data snapshotData
	for i := 0; i < 1005; i++ {
		data.expenses = append(data.expenses, expense(userMe, "food", "Makan", date(2026, 9, 1+i%30), int64(1000+i), ""))
	}
	b := newSnapshotBuilder(t, now, false, data)

	r, err := b.Build(context.Background(), userMe, 2026, 9, "personal")
	require.NoError(t, err)
	require.Len(t, r.Transactions, 1000)
	require.Equal(t, 5, r.TransactionsOmitted)
	require.Equal(t, 1005, r.Summary.TxCount, "the cap only applies to the appendix, not the totals")
	require.Len(t, r.TopExpenses, 10)
	require.EqualValues(t, 2004, r.TopExpenses[0].Amount)
}

func TestReportSnapshotBuilder_Errors(t *testing.T) {
	now := time.Now()

	t.Run("couple scope without a partner", func(t *testing.T) {
		couples := mocks.NewCoupleRepository(t)
		couples.EXPECT().FindByUserID(mock.Anything, userMe).Return(nil, nil)
		b := service.NewReportSnapshotBuilder(mocks.NewReportSnapshotRepository(t), mocks.NewUserRepository(t), couples, 180, func() time.Time { return now })

		_, err := b.Build(context.Background(), userMe, 2026, 9, "couple")
		requireAppError(t, err, http.StatusNotFound, "no linked partner")
	})

	t.Run("a failed read fails the build", func(t *testing.T) {
		repo := mocks.NewReportSnapshotRepository(t)
		users := mocks.NewUserRepository(t)
		users.EXPECT().FindByID(mock.Anything, userMe).Return(&domain.User{ID: userMe}, nil).Maybe()
		repo.EXPECT().ExpensesForPeriod(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, errors.New("db down"))
		repo.EXPECT().CategoryBudgetsForPeriod(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Maybe()
		repo.EXPECT().MonthlyCategoryTotals(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Maybe()
		repo.EXPECT().ActiveRecurring(mock.Anything, mock.Anything).Return(nil, nil).Maybe()
		repo.EXPECT().BillsDueBetween(mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return(nil, nil).Maybe()
		b := service.NewReportSnapshotBuilder(repo, users, mocks.NewCoupleRepository(t), 180, func() time.Time { return now })

		_, err := b.Build(context.Background(), userMe, 2026, 9, "personal")
		requireAppError(t, err, http.StatusInternalServerError, "failed to load report data")
	})
}

// --- rendering ------------------------------------------------------------

// TestReportSnapshot_Render runs realistic fixtures through the builder and
// the renderer. Set PDF_PREVIEW_DIR to keep the PDFs for a visual check.
func TestReportSnapshot_Render(t *testing.T) {
	now := time.Date(2026, 10, 30, 14, 5, 0, 0, pdfreport.WIB)
	cases := []struct {
		name        string
		year, month int
		couple      bool
		data        snapshotData
		maxPages    int
	}{
		{"personal-september", 2026, 9, false, richFixture(1, 2026, 9, false, 30, 1), 12},
		{"couple-september", 2026, 9, true, richFixture(2, 2026, 9, true, 30, 1), 16},
		{"personal-october-partial", 2026, 10, false, richFixture(3, 2026, 10, false, 30, 1), 12},
		{"personal-empty", 2026, 9, false, snapshotData{}, 3},
		{"personal-heavy", 2026, 9, false, richFixture(4, 2026, 9, false, 30, 18), 40},
	}
	dir := os.Getenv("PDF_PREVIEW_DIR")
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			scope := "personal"
			if tc.couple {
				scope = "couple"
			}
			b := newSnapshotBuilder(t, now, tc.couple, tc.data)
			r, err := b.Build(context.Background(), userMe, tc.year, tc.month, scope)
			require.NoError(t, err)

			started := time.Now()
			pdf, err := pdfreport.Render(r)
			elapsed := time.Since(started)
			require.NoError(t, err)
			require.True(t, bytes.HasPrefix(pdf, []byte("%PDF-")))
			pages := bytes.Count(pdf, []byte("/Type /Page\n"))
			require.Positive(t, pages)
			require.LessOrEqual(t, pages, tc.maxPages)
			t.Logf("%s: %d transactions, %d pages, %d KB, rendered in %s", tc.name, r.Summary.TxCount, pages, len(pdf)/1024, elapsed.Round(time.Millisecond))

			if dir != "" {
				require.NoError(t, os.WriteFile(filepath.Join(dir, tc.name+".pdf"), pdf, 0o644))
			}
		})
	}
}

type fixtureCategory struct {
	id, name   string
	budget     int64
	rollover   int64
	min, max   int64
	perWeek    float64
	notes      []string
	weekendMul float64
}

var meCategories = []fixtureCategory{
	{"c-food", "Makan & Minum", 2_850_000, 150_000, 18_000, 120_000, 7, []string{"Nasi padang", "Makan siang kantor", "Bakso Pak Kumis", "Sate ayam", "", "Makan malam bersama tim di restoran seafood Jimbaran setelah rapat kuartal"}, 1.6},
	{"c-coffee", "Kopi ☕", 400_000, 0, 22_000, 58_000, 2.6, []string{"Kopi susu gula aren", "Americano", "Kopi Kenangan"}, 1},
	{"c-trans", "Transportasi", 1_200_000, 0, 15_000, 120_000, 4, []string{"Bensin Pertalite", "Grab ke kantor", "Parkir mal", "Tol dalam kota"}, 0.8},
	{"c-groc", "Belanja Bulanan", 2_000_000, 0, 60_000, 400_000, 1.3, []string{"Indomaret", "Superindo", "Pasar pagi", ""}, 1.4},
	{"c-bill", "Tagihan & Utilitas", 1_500_000, 0, 150_000, 400_000, 0.7, []string{"Token listrik", "Internet IndiHome", "Air PAM"}, 1},
	{"c-fun", "Hiburan", 600_000, 0, 45_000, 260_000, 1.1, []string{"Bioskop XXI 🎬", "Netflix", "Karaoke", "Konser"}, 2.2},
	{"c-health", "Kesehatan", 500_000, 0, 35_000, 180_000, 0.5, []string{"Apotek", "Vitamin", "Klinik gigi"}, 1},
	{"c-edu", "Pendidikan", 750_000, 0, 0, 0, 0, nil, 1},
	{"c-gift", "Hadiah", 0, 0, 120_000, 350_000, 0.3, []string{"Kado ulang tahun"}, 1},
}

var partnerCategories = []fixtureCategory{
	{"p-food", "Makan Siang", 1_500_000, 0, 20_000, 90_000, 5, []string{"Warteg", "Gado-gado", "Salad", ""}, 1},
	{"p-skin", "Skincare", 700_000, 100_000, 85_000, 340_000, 0.9, []string{"Sunscreen", "Toner", "Serum vitamin C"}, 1},
	{"p-ride", "Transport Online", 800_000, 0, 18_000, 75_000, 4, []string{"Gojek", "Grab", "Maxim"}, 0.7},
	{"p-shop", "Belanja Online", 1_000_000, 0, 50_000, 420_000, 1.1, []string{"Shopee - kabel data", "Tokopedia", "Lazada"}, 1.5},
}

// richFixture generates a believable month (plus five months of history)
// from a fixed seed. scale multiplies the transaction rate for load tests.
func richFixture(seed uint64, year, month int, couple bool, lastDay int, scale float64) snapshotData {
	rng := rand.New(rand.NewPCG(seed, seed*7+1))
	var data snapshotData
	start := date(year, month, 1)
	days := start.AddDate(0, 1, -1).Day()
	if lastDay > days {
		lastDay = days
	}

	people := []struct {
		id   string
		cats []fixtureCategory
	}{{userMe, meCategories}}
	if couple {
		people = append(people, struct {
			id   string
			cats []fixtureCategory
		}{userPartner, partnerCategories})
	}

	for _, p := range people {
		for _, c := range p.cats {
			data.budgets = append(data.budgets, repository.SnapshotCategoryBudget{
				UserID: p.id, CategoryID: c.id, Name: c.name,
				Base: c.budget - c.rollover, Rollover: c.rollover, Total: c.budget,
			})
			if c.perWeek == 0 {
				continue
			}
			for d := 1; d <= lastDay; d++ {
				day := date(year, month, d)
				rate := c.perWeek / 7 * scale
				if wd := day.Weekday(); wd == time.Saturday || wd == time.Sunday {
					rate *= c.weekendMul
				}
				for n := poisson(rng, rate); n > 0; n-- {
					amount := (c.min + rng.Int64N(c.max-c.min+1)) / 500 * 500
					note := c.notes[rng.IntN(len(c.notes))]
					data.expenses = append(data.expenses, expense(p.id, c.id, c.name, day, amount, note))
				}
			}
			// History: the same category, a bit lower or higher each month.
			expected := float64(c.min+c.max) / 2 * c.perWeek * 30 / 7
			for back := 1; back <= 5; back++ {
				m := start.AddDate(0, -back, 0)
				total := int64(expected*(0.7+rng.Float64()*0.5)) / 1000 * 1000
				data.history = append(data.history, repository.SnapshotMonthCategoryTotal{UserID: p.id, CategoryID: c.id, Year: m.Year(), Month: int(m.Month()), Total: total})
			}
		}
	}
	// Expenses come back ordered by date from the real query.
	sortExpenses(data.expenses)

	gym := "Membership gym"
	data.recurring = []repository.SnapshotRecurring{
		{ID: "r1", UserID: userMe, CategoryName: "Tagihan & Utilitas", Note: strPtr("Internet IndiHome"), Amount: 385_000, ScheduleType: "monthly", ScheduleDay: 5, NextRunAt: date(2026, 11, 5)},
		{ID: "r2", UserID: userMe, CategoryName: "Hiburan", Note: strPtr("Spotify Duo"), Amount: 86_900, ScheduleType: "monthly", ScheduleDay: 12, NextRunAt: date(2026, 11, 12)},
		{ID: "r3", UserID: userMe, CategoryName: "Kesehatan", Note: &gym, Amount: 75_000, ScheduleType: "weekly", ScheduleDay: int(time.Monday), NextRunAt: date(2026, 11, 2)},
		{ID: "r4", UserID: userMe, CategoryName: "Transportasi", Amount: 250_000, ScheduleType: "monthly", ScheduleDay: 25, NextRunAt: date(2026, 11, 25)},
	}
	amount := func(v int64) *int64 { return &v }
	data.bills = []domain.BillReminder{
		{UserID: userMe, Title: "Cicilan motor", DueDate: date(year, month, 3), Status: domain.BillReminderStatusDone, Amount: amount(1_250_000)},
		{UserID: userMe, Title: "Kartu kredit BCA", DueDate: date(year, month, 12), Status: domain.BillReminderStatusDone, Amount: amount(2_340_000)},
		{UserID: userMe, Title: "BPJS Kesehatan", DueDate: date(year, month, 10), Status: domain.BillReminderStatusUpcoming, Amount: amount(150_000)},
		{UserID: userMe, Title: "Iuran lingkungan", DueDate: date(year, month, 28), Status: domain.BillReminderStatusUpcoming},
		{UserID: userMe, Title: "Asuransi jiwa", DueDate: date(year, month, days), Status: domain.BillReminderStatusUpcoming, Amount: amount(450_000)},
	}
	if couple {
		data.recurring = append(data.recurring, repository.SnapshotRecurring{ID: "r5", UserID: userPartner, CategoryName: "Skincare", Note: strPtr("Langganan facial"), Amount: 275_000, ScheduleType: "monthly", ScheduleDay: 18, NextRunAt: date(2026, 11, 18)})
		data.bills = append(data.bills, domain.BillReminder{UserID: userPartner, Title: "Arisan keluarga", DueDate: date(year, month, 15), Status: domain.BillReminderStatusDone, Amount: amount(500_000)})
		data.activity = []repository.SnapshotActivityCount{
			{ActorID: userMe, EntityType: "expense", Action: "created", Count: 74},
			{ActorID: userMe, EntityType: "expense", Action: "updated", Count: 6},
			{ActorID: userMe, EntityType: "expense", Action: "deleted", Count: 2},
			{ActorID: userMe, EntityType: "budget", Action: "updated", Count: 3},
			{ActorID: userPartner, EntityType: "expense", Action: "created", Count: 51},
			{ActorID: userPartner, EntityType: "expense", Action: "updated", Count: 4},
			{ActorID: userPartner, EntityType: "budget", Action: "created", Count: 1},
		}
	}
	return data
}

func poisson(rng *rand.Rand, lambda float64) int {
	// Knuth's method; lambda stays small here.
	l := math.Exp(-lambda)
	k, p := 0, 1.0
	for {
		p *= rng.Float64()
		if p <= l {
			return k
		}
		k++
	}
}

func sortExpenses(es []repository.SnapshotExpense) {
	sort.SliceStable(es, func(i, j int) bool { return es[i].ExpenseDate.Before(es[j].ExpenseDate) })
}
