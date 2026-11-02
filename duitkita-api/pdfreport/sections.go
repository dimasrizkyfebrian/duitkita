package pdfreport

import (
	"fmt"
	"math"
	"time"

	"github.com/go-pdf/fpdf"
)

// --- masthead (page 1 only) ----------------------------------------------

func (d *doc) masthead() {
	r := d.r
	// The document's one gradient: ink in the lower left lifting to the
	// brand navy in the upper right, echoing the app icon's lighting.
	d.pdf.LinearGradient(0, 0, pageW, mastheadH,
		colInk.r, colInk.g, colInk.b, colNavy.r, colNavy.g, colNavy.b,
		0, 0, 1, 1)

	d.pdf.ImageOptions(logoImage, marginX, 11, 11, 11, false, fpdf.ImageOptions{ImageType: "PNG"}, 0, "")
	d.textAt(marginX+14, 11.4, 60, "DuitKita", "L", weightBold, 10.5, colWhite)
	kind := "Laporan keuangan bulanan"
	if r.Couple {
		kind = "Laporan keuangan bersama"
	}
	d.textAt(marginX+14, 16.4, 80, kind, "L", weightMedium, sizeLabel, colOnDarkSoft)

	d.textAt(pageW-marginX-90, 11.4, 90, "Dibuat", "R", weightMedium, sizeCaption, colOnDarkMuted)
	d.textAt(pageW-marginX-90, 15.4, 90, FormatDateTime(r.GeneratedAt), "R", weightSemiBold, sizeLabel, colWhite)

	d.textAt(marginX, 26.5, 140, FormatPeriod(r.Year, r.Month), "L", weightExtraBold, sizeMasthead, colWhite)

	who := "Disiapkan untuk " + SanitizeText(r.Owner.Name)
	if r.Couple && r.Partner != nil {
		who = "Untuk " + SanitizeText(r.Owner.Name) + " dan " + SanitizeText(r.Partner.Name)
	}
	d.fitText(marginX, 38.2, 120, who, "L", weightMedium, sizeBody, colOnDarkSoft)

	if r.Partial {
		chip := fmt.Sprintf("Data sementara · s.d. %d %s", r.AsOfDay, MonthShortName(r.Month))
		d.font(weightSemiBold, sizeLabel)
		cw := d.width(chip) + 7
		cx := pageW - marginX - cw
		d.pdf.SetAlpha(0.14, "Normal")
		d.roundRect(cx, 37.2, cw, 6, 3, colWhite)
		d.pdf.SetAlpha(1, "Normal")
		d.dot(cx+3, 40.2, 0.8, colOnDarkSoft)
		d.textAt(cx+4.6, 37.2+(6-lineH(sizeLabel))/2, cw-5, chip, "L", weightSemiBold, sizeLabel, colWhite)
	}
	d.setY(mastheadH + 10)
}

// --- summary --------------------------------------------------------------

func (d *doc) summary() {
	s := d.r.Summary
	d.section = "Ringkasan"
	y0 := d.y()

	// Hero: the one number the report leads with.
	d.textAt(marginX, y0, 100, "Total pengeluaran", "L", weightMedium, sizeSubtitle, colMuted)
	base := y0 + 17
	rpW := d.textBaseline(marginX, base, "Rp", weightSemiBold, 15, colInk)
	d.textBaseline(marginX+rpW+1.6, base, FormatNumber(s.TotalSpent), weightExtraBold, sizeHero, colInk)
	d.deltaLine(marginX, base+4.2)

	d.budgetCard(122, y0-1, pageW-marginX-122, 36)

	d.statRow(y0 + 42)
	d.insights()
}

// deltaLine compares with the previous month. A partial month compares the
// daily rate rather than the total, which would be meaningless mid-month.
func (d *doc) deltaLine(x, y float64) {
	r, s := d.r, d.r.Summary
	prevMonth, prevYear := r.Month-1, r.Year
	if prevMonth == 0 {
		prevMonth, prevYear = 12, r.Year-1
	}
	prevName := MonthName(prevMonth)
	if !s.HasPrev || s.PrevSpent <= 0 {
		d.textAt(x, y, 100, "Belum ada data "+prevName+" untuk dibandingkan", "L", weightMedium, sizeSubtitle, colMuted)
		return
	}

	cur, prev := float64(s.TotalSpent), float64(s.PrevSpent)
	subject := ""
	reference := FormatRupiah(s.PrevSpent)
	if r.Partial {
		days := s.DaysCounted
		if days < 1 {
			days = 1
		}
		cur /= float64(days)
		prev /= float64(daysIn(prevYear, prevMonth))
		subject = "Rata-rata harian "
		reference = FormatRupiah(int64(math.Round(prev))) + "/hari"
	}
	change := (cur - prev) / prev
	if math.Abs(change) < 0.005 {
		d.textAt(x, y, 110, subject+"sama dengan "+prevName, "L", weightMedium, sizeSubtitle, colInk)
		return
	}
	up := change > 0
	word := "lebih rendah"
	st := StatusGood
	if up {
		word, st = "lebih tinggi", StatusDanger
	}
	d.triangle(x+1.3, y+lineH(sizeSubtitle)/2, 2.4, up, statusColor(st))
	main := fmt.Sprintf("%s%s %s dari %s", subject, FormatPercent(math.Abs(change)), word, prevName)
	if subject == "" {
		main = fmt.Sprintf("%s %s dari %s", FormatPercent(math.Abs(change)), word, prevName)
	}
	d.font(weightSemiBold, sizeSubtitle)
	mw := d.width(main)
	d.textAt(x+3.6, y, mw+1, main, "L", weightSemiBold, sizeSubtitle, colInk)
	d.textAt(x+3.6+mw+1.2, y, 60, "· "+reference, "L", weightMedium, sizeSubtitle, colMuted)
}

func (d *doc) budgetCard(x, y, w, h float64) {
	r, s := d.r, d.r.Summary
	d.roundRect(x, y, w, h, 2.4, colMist)
	const pad = 5.0
	ix, iw := x+pad, w-2*pad

	if !s.HasBudget() {
		d.textAt(ix, y+pad, iw, "Budget bulan ini", "L", weightMedium, sizeLabel, colMuted)
		d.textAt(ix, y+pad+5, iw, "Belum diatur", "L", weightBold, 12, colInk)
		d.paragraph(ix, y+pad+12.5, iw, "Atur budget per kategori di aplikasi untuk melihat sisa dan pemakaiannya di sini.", weightRegular, sizeLabel, colMuted, 1.45)
		return
	}

	usage := float64(s.TotalSpent) / float64(s.TotalBudget)
	st := UsageStatus(usage)
	d.textAt(ix, y+pad, iw, "Budget bulan ini", "L", weightMedium, sizeLabel, colMuted)
	d.textAt(ix, y+pad+4.4, iw, FormatRupiah(s.TotalBudget), "L", weightBold, 12.5, colInk)

	my := y + pad + 13
	const mh = 2.8
	d.meter(ix, my, iw, mh, usage, st)
	if r.Partial && r.DaysInMonth > 0 {
		px := ix + iw*float64(r.AsOfDay)/float64(r.DaysInMonth)
		d.vline(px, my-1.3, my+mh+1.3, colInk, 0.35)
	}

	ty := my + mh + 2
	d.textAt(ix, ty, iw/2, FormatPercent(usage)+" terpakai", "L", weightSemiBold, sizeLabel, colInk)
	remaining := s.TotalBudget - s.TotalSpent
	if remaining >= 0 {
		d.textAt(ix+iw/2, ty, iw/2, "Sisa "+FormatRupiah(remaining), "R", weightMedium, sizeLabel, colMuted)
	} else {
		label := "Lewat " + FormatRupiah(-remaining)
		d.font(weightSemiBold, sizeLabel)
		lw := d.width(label)
		d.dot(ix+iw-lw-2.4, ty+lineH(sizeLabel)/2, 0.9, colDanger)
		d.textAt(ix+iw/2, ty, iw/2, label, "R", weightSemiBold, sizeLabel, colInk)
	}
	if r.Partial {
		d.textAt(ix, ty+4.4, iw, fmt.Sprintf("Garis tegak: laju wajar s.d. %d %s", r.AsOfDay, MonthShortName(r.Month)), "L", weightRegular, sizeCaption, colMuted)
	}
}

func (d *doc) statRow(y float64) {
	s := d.r.Summary
	const h = 23.0
	colW := contentW / 4
	d.hline(marginX, marginX+contentW, y, colHairline, hairline)
	d.hline(marginX, marginX+contentW, y+h, colHairline, hairline)

	days := s.DaysCounted
	type stat struct{ label, value, sub string }
	avgTx := int64(0)
	if s.TxCount > 0 {
		avgTx = s.TotalSpent / int64(s.TxCount)
	}
	stats := []stat{
		{"Rata-rata harian", FormatRupiah(s.AvgDaily), fmt.Sprintf("dihitung dari %d hari", days)},
		{"Transaksi", FormatNumber(int64(s.TxCount)), "rata-rata " + FormatRupiah(avgTx)},
		{"Hari tanpa belanja", fmt.Sprintf("%d hari", s.ZeroSpendDays), fmt.Sprintf("dari %d hari", days)},
	}
	for i, st := range stats {
		x := marginX + float64(i)*colW
		if i > 0 {
			x += 4
			d.vline(marginX+float64(i)*colW, y+4, y+h-4, colHairline, hairline)
		}
		w := colW - 6
		d.textAt(x, y+4, w, st.label, "L", weightMedium, sizeLabel, colMuted)
		d.fitText(x, y+8.6, w, st.value, "L", weightBold, sizeStat, colInk)
		d.fitText(x, y+15.4, w, st.sub, "L", weightRegular, sizeCaption, colMuted)
	}

	// Health score: the grade as a small status disc, then its meaning.
	x := marginX + 3*colW + 4
	d.vline(marginX+3*colW, y+4, y+h-4, colHairline, hairline)
	d.textAt(x, y+4, colW-6, "Kesehatan budget", "L", weightMedium, sizeLabel, colMuted)
	if s.Health.Grade == "" {
		d.textAt(x, y+8.6, colW-6, "—", "L", weightBold, sizeStat, colInk)
		d.textAt(x, y+15.4, colW-6, "butuh budget untuk dinilai", "L", weightRegular, sizeCaption, colMuted)
	} else {
		st, label := gradeMeaning(s.Health.Grade)
		cy := y + 8.6 + lineH(sizeStat)/2
		d.dot(x+3, cy, 3, statusColor(st))
		d.textAt(x, cy-lineH(9)/2, 6, s.Health.Grade, "C", weightBold, 9, colWhite)
		d.fitText(x+7.6, y+8.6, colW-14, label, "L", weightBold, sizeStat, colInk)
		// The app's score is the share of budget left, so a "Baik" with a low
		// number reads as a contradiction; state the usage it's graded on.
		usage := float64(s.TotalSpent) / float64(s.TotalBudget)
		d.textAt(x, y+15.4, colW-6, "dari pemakaian "+FormatPercent(usage)+" budget", "L", weightRegular, sizeCaption, colMuted)
	}
	d.setY(y + h + 7)
}

func gradeMeaning(grade string) (Status, string) {
	switch grade {
	case "A":
		return StatusGood, "Sangat baik"
	case "B":
		return StatusGood, "Baik"
	case "C":
		return StatusWarn, "Waspada"
	default:
		return StatusDanger, "Kritis"
	}
}

func (d *doc) insights() {
	items := d.r.Insights
	if len(items) == 0 {
		return
	}
	d.ensureSpace(20)
	d.textAt(marginX, d.y(), contentW, "Catatan bulan ini", "L", weightSemiBold, 9.5, colInk)
	d.gap(7)
	for _, it := range items {
		d.font(weightRegular, sizeBody)
		lines := d.pdf.SplitText(it.Text, contentW-6)
		h := float64(len(lines)) * sizeBody * ptToMM * 1.5
		d.ensureSpace(h + 2)
		y := d.y()
		d.dot(marginX+1.2, y+sizeBody*ptToMM*0.75, 1.1, statusColor(it.Status))
		used := d.paragraph(marginX+5, y, contentW-5, it.Text, weightRegular, sizeBody, colInk, 1.5)
		d.setY(y + used + 1.6)
	}
	d.gap(2)
}

// --- couple ---------------------------------------------------------------

func (d *doc) coupleSection() {
	r := d.r
	c := r.CoupleStats
	if c == nil || r.Partner == nil {
		return
	}
	meName, pName := FirstName(SanitizeText(r.Owner.Name)), FirstName(SanitizeText(r.Partner.Name))
	d.sectionHeader(meName+" & "+pName, "Perbandingan pengeluaran masing-masing bulan ini.", 30)

	total := c.Me.Spent + c.Partner.Spent
	share := func(v int64) string {
		if total == 0 {
			return "0%"
		}
		return FormatPercent(float64(v) / float64(total))
	}
	y := d.y()
	d.splitLabel(marginX, y, "L", colMe, meName, FormatRupiah(c.Me.Spent)+" · "+share(c.Me.Spent))
	d.splitLabel(pageW-marginX, y, "R", colPartner, pName, FormatRupiah(c.Partner.Spent)+" · "+share(c.Partner.Spent))
	d.splitBar(marginX, y+6.5, contentW, 5, c.Me.Spent, c.Partner.Spent)
	d.setY(y + 18)

	t := d.newTable([]column{
		{title: "", w: 64, align: "L"},
		{title: meName, w: 55, align: "R"},
		{title: pName, w: 55, align: "R"},
	})
	t.header()
	// Owner keys on the name headers.
	hy := d.y() - 7 + 1.2 + lineH(sizeLabel)/2
	for i, col := range []rgb{colMe, colPartner} {
		x, w := t.cell(i + 1)
		d.font(weightSemiBold, sizeLabel)
		name := []string{meName, pName}[i]
		d.roundRect(x+w-d.width(d.fit(name, w))-3.6, hy-1.2, 2.4, 2.4, 0.5, col)
	}

	usage := func(p PersonStats) string {
		if p.Budget <= 0 {
			return "—"
		}
		return FormatPercent(float64(p.Spent) / float64(p.Budget))
	}
	top := func(p PersonStats) string {
		if len(p.TopCategories) == 0 {
			return "—"
		}
		return SanitizeText(p.TopCategories[0].Name)
	}
	budget := func(p PersonStats) string {
		if p.Budget <= 0 {
			return "Belum diatur"
		}
		return FormatRupiah(p.Budget)
	}
	rows := [][3]string{
		{"Total pengeluaran", FormatRupiah(c.Me.Spent), FormatRupiah(c.Partner.Spent)},
		{"Budget", budget(c.Me), budget(c.Partner)},
		{"Pemakaian budget", usage(c.Me), usage(c.Partner)},
		{"Jumlah transaksi", FormatNumber(int64(c.Me.TxCount)), FormatNumber(int64(c.Partner.TxCount))},
		{"Rata-rata harian", FormatRupiah(c.Me.AvgDaily), FormatRupiah(c.Partner.AvgDaily)},
		{"Kategori terbesar", top(c.Me), top(c.Partner)},
	}
	for _, row := range rows {
		t.row(7.4, true, func(y float64) {
			t.text(0, y, 7.4, row[0], weightMedium, sizeTable, colMuted)
			t.text(1, y, 7.4, row[1], weightSemiBold, sizeTable, colInk)
			t.text(2, y, 7.4, row[2], weightSemiBold, sizeTable, colInk)
		})
	}
	d.gap(7)

	d.subHeader("Aktivitas pencatatan", "dari log aktivitas bersama", 18)
	if !c.ActivityAvailable {
		d.emptyNote(fmt.Sprintf("Riwayat aktivitas hanya disimpan %d hari, jadi tidak tersedia untuk periode ini.", c.RetentionDays))
		return
	}
	at := d.newTable([]column{
		{title: "", w: 54, align: "L"},
		{title: "Transaksi baru", w: 30, align: "R"},
		{title: "Diubah", w: 30, align: "R"},
		{title: "Dihapus", w: 30, align: "R"},
		{title: "Ubah budget", w: 30, align: "R"},
	})
	at.header()
	for i, a := range []ActivityStats{c.MeActivity, c.PartnerActivity} {
		name := []string{meName, pName}[i]
		col := []rgb{colMe, colPartner}[i]
		at.row(7.4, true, func(y float64) {
			d.roundRect(marginX, y+(7.4-2.4)/2, 2.4, 2.4, 0.5, col)
			x, w := at.cell(0)
			d.fitText(x+4, y+(7.4-lineH(sizeTable))/2, w-4, name, "L", weightSemiBold, sizeTable, colInk)
			for j, v := range []int{a.ExpensesCreated, a.ExpensesUpdated, a.ExpensesDeleted, a.BudgetChanges} {
				at.text(j+1, y, 7.4, itoa(v), weightMedium, sizeTable, colInk)
			}
		})
	}
	d.gap(2)
}

func (d *doc) splitLabel(x, y float64, align string, c rgb, name, value string) {
	d.font(weightSemiBold, sizeBody)
	nw := d.width(name)
	d.font(weightMedium, sizeBody)
	vw := d.width(value)
	total := 3.6 + nw + 2 + vw
	if align == "R" {
		x -= total
	}
	lh := lineH(sizeBody)
	d.roundRect(x, y+(lh-2.4)/2, 2.4, 2.4, 0.5, c)
	d.textAt(x+3.6, y, nw+1, name, "L", weightSemiBold, sizeBody, colInk)
	d.textAt(x+3.6+nw+2, y, vw+1, value, "L", weightMedium, sizeBody, colMuted)
}

// --- categories -----------------------------------------------------------

func (d *doc) categorySection() {
	r := d.r
	d.sectionHeader("Kategori", "Pemakaian budget per kategori, diurutkan dari pengeluaran terbesar.", 30)
	if len(r.Categories) == 0 {
		d.emptyNote("Belum ada kategori dengan pengeluaran atau budget di periode ini.")
		return
	}
	if r.Couple {
		// On the subtitle's line, right-aligned.
		d.legendRight(d.y()-9.6, d.personLegend())
	}

	t := d.newTable([]column{
		{title: "Kategori", w: 52, align: "L"},
		{title: "Terpakai", w: 26, align: "R"},
		{title: "Budget", w: 26, align: "R"},
		{title: "Sisa", w: 27, align: "R"},
		{title: "Pemakaian", w: 31, align: "L"},
		{title: "Porsi", w: 12, align: "R"},
	})
	t.header()
	rowH := func(c CategoryRow) float64 {
		if c.Rollover != 0 {
			return 11.4
		}
		return 8.4
	}
	heights := make([]float64, 0, len(r.Categories)+1)
	for _, c := range r.Categories {
		heights = append(heights, rowH(c))
	}
	t.keepTail(append(heights, 9), 3)

	var spent, budget int64
	for _, c := range r.Categories {
		spent += c.Spent
		budget += c.Budget
		h := rowH(c)
		t.row(h, true, func(y float64) {
			x, w := t.cell(0)
			if r.Couple {
				d.dot(x+1.1, y+h/2, 1.1, ownerColor(c.Owner))
				x, w = x+4, w-4
			}
			d.fitText(x, y+(h-lineH(sizeTable))/2, w, SanitizeText(c.Name), "L", weightSemiBold, sizeTable, colInk)
			t.text(1, y, h, FormatNumber(c.Spent), weightSemiBold, sizeTable, colInk)

			if c.Budget > 0 {
				if c.Rollover != 0 {
					bx, bw := t.cell(2)
					d.textAt(bx, y+1.6, bw, FormatNumber(c.Budget), "R", weightMedium, sizeTable, colInk)
					d.fitText(bx-6, y+5.8, bw+6, "rollover "+FormatCompact(c.Rollover), "R", weightRegular, sizeCaption, colMuted)
				} else {
					t.text(2, y, h, FormatNumber(c.Budget), weightMedium, sizeTable, colInk)
				}
				rem := c.Remaining()
				if rem < 0 {
					t.text(3, y, h, FormatNumber(rem), weightSemiBold, sizeTable, colDanger)
				} else {
					t.text(3, y, h, FormatNumber(rem), weightMedium, sizeTable, colInk)
				}
				mx, _ := t.cell(4)
				const mw, mh = 17.0, 2.2
				d.meter(mx, y+(h-mh)/2, mw, mh, c.Usage(), c.Status())
				d.textAt(mx+mw+1.4, y+(h-lineH(sizeLabel))/2, 10, FormatPercent(c.Usage()), "L", weightSemiBold, sizeLabel, colInk)
			} else {
				t.text(2, y, h, "—", weightMedium, sizeTable, colMuted)
				t.text(3, y, h, "—", weightMedium, sizeTable, colMuted)
				t.text(4, y, h, "tanpa budget", weightRegular, sizeLabel, colMuted)
			}
			t.text(5, y, h, FormatPercent(c.Share), weightMedium, sizeLabel, colMuted)
		})
	}

	// Total row: a heavier rule above, bold figures, no closing hairline.
	t.row(9, false, func(y float64) {
		d.hline(marginX, marginX+contentW, y, colInkSoft, 0.3)
		t.text(0, y, 9, "Total", weightBold, sizeTable, colInk)
		t.text(1, y, 9, FormatNumber(spent), weightBold, sizeTable, colInk)
		if budget > 0 {
			t.text(2, y, 9, FormatNumber(budget), weightBold, sizeTable, colInk)
			rem := budget - spent
			c := colInk
			if rem < 0 {
				c = colDanger
			}
			t.text(3, y, 9, FormatNumber(rem), weightBold, sizeTable, c)
			usage := float64(spent) / float64(budget)
			mx, _ := t.cell(4)
			const mw, mh = 17.0, 2.2
			d.meter(mx, y+(9-mh)/2, mw, mh, usage, UsageStatus(usage))
			d.textAt(mx+mw+1.4, y+(9-lineH(sizeLabel))/2, 10, FormatPercent(usage), "L", weightBold, sizeLabel, colInk)
		}
		t.text(5, y, 9, "100%", weightSemiBold, sizeLabel, colMuted)
	})
	d.textAt(marginX, d.y()+0.6, contentW, "Nominal dalam Rupiah.", "L", weightRegular, sizeCaption, colMuted)
	d.gap(8)

	d.categoryTrends()
}

func (d *doc) categoryTrends() {
	r := d.r
	if len(r.CategoryTrends) == 0 {
		return
	}
	const cellH = 38.0
	d.subHeader("Kategori terbesar, 6 bulan terakhir", "", cellH)
	y := d.y()
	const gap = 6.0
	n := 4
	cw := (contentW - gap*float64(n-1)) / float64(n)
	months := make([]int, len(r.Trend))
	for i, t := range r.Trend {
		months[i] = t.Month
	}
	for i, ct := range r.CategoryTrends {
		if i >= n {
			break
		}
		x := marginX + float64(i)*(cw+gap)
		d.hline(x, x+cw, y, colInkSoft, 0.25)
		nx, nw := x, cw
		if r.Couple {
			d.dot(x+1, y+2.6+lineH(sizeTable)/2, 1, ownerColor(ct.Owner))
			nx, nw = x+3.4, cw-3.4
		}
		d.fitText(nx, y+2.6, nw, SanitizeText(ct.Name), "L", weightSemiBold, sizeTable, colInk)
		cur := ct.Points[len(ct.Points)-1]
		d.textAt(x, y+7.4, cw, FormatRupiahCompact(cur), "L", weightBold, 11, colInk)

		if len(ct.Points) >= 2 {
			prev := ct.Points[len(ct.Points)-2]
			dy := y + 13.2
			if prev > 0 {
				ch := float64(cur-prev) / float64(prev)
				st := StatusGood
				if ch > 0 {
					st = StatusDanger
				}
				if math.Abs(ch) >= 0.005 {
					d.triangle(x+1.1, dy+lineH(sizeCaption)/2, 2, ch > 0, statusColor(st))
					d.textAt(x+3, dy, cw-3, FormatPercent(math.Abs(ch))+" vs "+MonthShortName(prevMonthOf(r.Month)), "L", weightMedium, sizeCaption, colMuted)
				} else {
					d.textAt(x, dy, cw, "sama dengan "+MonthShortName(prevMonthOf(r.Month)), "L", weightMedium, sizeCaption, colMuted)
				}
			} else {
				d.textAt(x, dy, cw, "baru bulan ini", "L", weightMedium, sizeCaption, colMuted)
			}
		}
		d.sparkColumns(x, y+19, cw, 12, ct.Points, months)
	}
	d.setY(y + cellH)
}

// --- trends & patterns ----------------------------------------------------

func (d *doc) trendSection() {
	r := d.r
	hasHistory := false
	for _, t := range r.Trend {
		hasHistory = hasHistory || t.Total() > 0
	}
	if !hasHistory {
		d.sectionHeader("Tren & pola", "Pergerakan dari bulan ke bulan, dan sebaran sepanjang "+MonthName(r.Month)+".", 10)
		d.emptyNote("Belum ada pengeluaran dalam 6 bulan terakhir untuk digambarkan.")
		return
	}
	d.sectionHeader("Tren & pola", "Pergerakan dari bulan ke bulan, dan sebaran sepanjang "+MonthName(r.Month)+".", 64)
	d.trendChart()
	d.gap(6)
	if r.Summary.TxCount == 0 {
		return
	}
	d.dailyChart()
	d.gap(8)

	const rowH = 64.0
	d.ensureSpace(rowH)
	y := d.y()
	leftW := 100.0
	h1 := d.cumulativeChart(marginX, y, leftW)
	rx := marginX + leftW + 10
	h2 := d.weekdayChart(rx, y, pageW-marginX-rx)
	d.setY(y + maxf(h1, h2) + 4)
}

// --- top expenses ---------------------------------------------------------

func (d *doc) topSection() {
	r := d.r
	if len(r.TopExpenses) == 0 {
		return
	}
	d.sectionHeader("Pengeluaran terbesar", fmt.Sprintf("%d transaksi dengan nominal tertinggi bulan ini.", len(r.TopExpenses)), 24)

	cols := []column{
		{title: "#", w: 7, align: "L"},
		{title: "Tanggal", w: 17, align: "L"},
		{title: "Kategori", w: 34, align: "L"},
		{title: "Catatan", w: 58, align: "L"},
		{title: "", w: 30, align: "L"},
		{title: "Jumlah", w: 28, align: "R"},
	}
	if r.Couple {
		cols[3].w = 42
		cols = append(cols[:4], append([]column{{title: "Oleh", w: 16, align: "L"}}, cols[4:]...)...)
	}
	t := d.newTable(cols)
	t.header()
	t.keepTail(uniformHeights(len(r.TopExpenses), 7.6), 3)
	maxV := r.TopExpenses[0].Amount
	barCol := len(cols) - 2
	for i, e := range r.TopExpenses {
		const h = 7.6
		t.row(h, true, func(y float64) {
			t.text(0, y, h, itoa(i+1), weightSemiBold, sizeLabel, colMuted)
			t.text(1, y, h, FormatDateShort(e.Date), weightMedium, sizeTable, colInk)
			t.text(2, y, h, SanitizeText(e.Category), weightSemiBold, sizeTable, colInk)
			note := SanitizeText(e.Note)
			if note == "" {
				t.text(3, y, h, "—", weightRegular, sizeTable, colMuted)
			} else {
				t.text(3, y, h, note, weightRegular, sizeTable, colInk)
			}
			if r.Couple {
				x, w := t.cell(4)
				d.dot(x+1, y+h/2, 1, ownerColor(e.Owner))
				d.fitText(x+3, y+(h-lineH(sizeLabel))/2, w-3, d.ownerName(e.Owner), "L", weightMedium, sizeLabel, colMuted)
			}
			bx, bw := t.cell(barCol)
			if maxV > 0 {
				d.roundRect(bx, y+(h-2)/2, maxf(bw*float64(e.Amount)/float64(maxV), 2), 2, 1, colSky)
			}
			t.text(len(cols)-1, y, h, FormatRupiah(e.Amount), weightSemiBold, sizeTable, colInk)
		})
	}
	d.gap(2)
}

// --- recurring & bills ----------------------------------------------------

func (d *doc) commitmentsSection() {
	r := d.r
	d.sectionHeader("Rutin & tagihan", "Komitmen yang berulang tiap bulan dan tagihan yang jatuh tempo di periode ini.", 28)

	rec := r.Recurring
	note := ""
	if len(rec.Items) > 0 {
		note = FormatRupiah(rec.MonthlyTotal) + " per bulan"
		if r.Summary.TotalBudget > 0 {
			note += " · " + FormatPercent(float64(rec.MonthlyTotal)/float64(r.Summary.TotalBudget)) + " dari budget"
		}
	}
	d.subHeader("Pengeluaran rutin aktif", note, 16)
	if len(rec.Items) == 0 {
		d.emptyNote("Belum ada pengeluaran rutin yang aktif.")
	} else {
		t := d.newTable([]column{
			{title: "Catatan", w: 52, align: "L"},
			{title: "Kategori", w: 34, align: "L"},
			{title: "Jadwal", w: 30, align: "L"},
			{title: "Berikutnya", w: 22, align: "L"},
			{title: "Per bulan", w: 36, align: "R"},
		})
		t.header()
		t.keepTail(uniformHeights(len(rec.Items), 7.6), 3)
		for _, it := range rec.Items {
			const h = 7.6
			t.row(h, true, func(y float64) {
				x, w := t.cell(0)
				if r.Couple {
					d.dot(x+1, y+h/2, 1, ownerColor(it.Owner))
					x, w = x+3.4, w-3.4
				}
				d.fitText(x, y+(h-lineH(sizeTable))/2, w, SanitizeText(it.Label), "L", weightSemiBold, sizeTable, colInk)
				t.text(1, y, h, SanitizeText(it.Category), weightRegular, sizeTable, colInk)
				t.text(2, y, h, it.Schedule, weightRegular, sizeTable, colMuted)
				t.text(3, y, h, FormatDateShort(it.NextRun), weightRegular, sizeTable, colMuted)
				t.text(4, y, h, FormatRupiah(it.MonthlyAmount), weightSemiBold, sizeTable, colInk)
			})
		}
	}
	d.gap(8)

	b := r.Bills
	bnote := ""
	if len(b.Items) > 0 {
		bnote = fmt.Sprintf("%d dari %d lunas", b.Paid, len(b.Items))
		if b.Overdue > 0 {
			bnote += fmt.Sprintf(" · %d terlambat", b.Overdue)
		}
		if b.TotalAmount > 0 {
			bnote += " · total " + FormatRupiah(b.TotalAmount)
		}
	}
	d.subHeader("Tagihan jatuh tempo bulan ini", bnote, 16)
	if len(b.Items) == 0 {
		d.emptyNote("Tidak ada tagihan yang jatuh tempo di periode ini.")
		return
	}
	t := d.newTable([]column{
		{title: "Tagihan", w: 70, align: "L"},
		{title: "Jatuh tempo", w: 34, align: "L"},
		{title: "Status", w: 34, align: "L"},
		{title: "Jumlah", w: 36, align: "R"},
	})
	t.header()
	t.keepTail(uniformHeights(len(b.Items), 7.6), 3)
	for _, it := range b.Items {
		const h = 7.6
		t.row(h, true, func(y float64) {
			x, w := t.cell(0)
			if r.Couple {
				d.dot(x+1, y+h/2, 1, ownerColor(it.Owner))
				x, w = x+3.4, w-3.4
			}
			d.fitText(x, y+(h-lineH(sizeTable))/2, w, SanitizeText(it.Title), "L", weightSemiBold, sizeTable, colInk)
			t.text(1, y, h, FormatDayLong(it.DueDate), weightRegular, sizeTable, colInk)
			st, label := billMeaning(it.State)
			sx, _ := t.cell(2)
			d.dot(sx+1, y+h/2, 1, statusColor(st))
			d.textAt(sx+3.4, y+(h-lineH(sizeTable))/2, 30, label, "L", weightMedium, sizeTable, colInk)
			if it.Amount != nil {
				t.text(3, y, h, FormatRupiah(*it.Amount), weightSemiBold, sizeTable, colInk)
			} else {
				t.text(3, y, h, "—", weightRegular, sizeTable, colMuted)
			}
		})
	}
	d.gap(2)
}

func billMeaning(s BillState) (Status, string) {
	switch s {
	case BillPaid:
		return StatusGood, "Lunas"
	case BillOverdue:
		return StatusDanger, "Terlambat"
	default:
		return StatusNeutral, "Akan datang"
	}
}

// --- appendix -------------------------------------------------------------

func (d *doc) appendix() {
	r := d.r
	if len(r.Transactions) == 0 {
		return
	}
	d.section = "Lampiran"
	d.newPage()
	total := len(r.Transactions) + r.TransactionsOmitted
	d.sectionHeader("Lampiran: semua transaksi", fmt.Sprintf("%s transaksi di %s, dikelompokkan per tanggal.", FormatNumber(int64(total)), FormatPeriod(r.Year, r.Month)), 20)

	cols := []column{
		{title: "Kategori", w: 46, align: "L"},
		{title: "Catatan", w: 96, align: "L"},
		{title: "Jumlah", w: 32, align: "R"},
	}
	if r.Couple {
		cols = []column{
			{title: "Kategori", w: 44, align: "L"},
			{title: "Catatan", w: 78, align: "L"},
			{title: "Oleh", w: 20, align: "L"},
			{title: "Jumlah", w: 32, align: "R"},
		}
	}
	t := d.newTable(cols)
	t.header()
	last := len(cols) - 1

	// Per-day totals for the group rows, computed once up front.
	type dayAgg struct {
		count int
		sum   int64
	}
	days := map[string]*dayAgg{}
	for _, e := range r.Transactions {
		k := e.Date.Format("2006-01-02")
		if days[k] == nil {
			days[k] = &dayAgg{}
		}
		days[k].count++
		days[k].sum += e.Amount
	}

	var current time.Time
	groupRow := func(date time.Time, cont bool) {
		agg := days[date.Format("2006-01-02")]
		y := d.y()
		const h = 7.0
		d.rect(marginX, y+0.6, contentW, h-1.2, colZebra)
		label := FormatDayLong(date)
		if cont {
			label += " (lanjutan)"
		}
		d.textAt(marginX+2, y+(h-lineH(sizeTable))/2, 100, label, "L", weightSemiBold, sizeTable, colInk)
		d.textAt(pageW-marginX-82, y+(h-lineH(sizeLabel))/2, 80, fmt.Sprintf("%d transaksi · %s", agg.count, FormatRupiah(agg.sum)), "R", weightMedium, sizeLabel, colMuted)
		d.setY(y + h)
	}
	t.onBreak = func() { groupRow(current, true) }

	const rowH = 6.2
	for _, e := range r.Transactions {
		if !sameDay(e.Date, current) {
			t.onBreak = nil
			if d.ensureSpace(7 + rowH) {
				t.header()
			}
			current = e.Date
			groupRow(current, false)
			t.onBreak = func() { groupRow(current, true) }
		}
		t.row(rowH, true, func(y float64) {
			t.text(0, y, rowH, SanitizeText(e.Category), weightMedium, sizeTable, colInk)
			note := SanitizeText(e.Note)
			if note == "" {
				t.text(1, y, rowH, "—", weightRegular, sizeTable, colMuted)
			} else {
				t.text(1, y, rowH, note, weightRegular, sizeTable, colInk)
			}
			if r.Couple {
				x, w := t.cell(2)
				d.dot(x+1, y+rowH/2, 0.9, ownerColor(e.Owner))
				d.fitText(x+3, y+(rowH-lineH(sizeLabel))/2, w-3, d.ownerName(e.Owner), "L", weightMedium, sizeLabel, colMuted)
			}
			t.text(last, y, rowH, FormatNumber(e.Amount), weightMedium, sizeTable, colInk)
		})
	}

	if r.TransactionsOmitted > 0 {
		t.onBreak = nil
		d.gap(3)
		d.emptyNote(fmt.Sprintf("Dan %s transaksi lainnya tidak dimuat agar dokumen tetap ringkas. Daftar lengkapnya ada di aplikasi DuitKita.", FormatNumber(int64(r.TransactionsOmitted))))
	}
}

func uniformHeights(n int, h float64) []float64 {
	out := make([]float64, n)
	for i := range out {
		out[i] = h
	}
	return out
}

func sameDay(a, b time.Time) bool {
	return a.Year() == b.Year() && a.YearDay() == b.YearDay()
}

func prevMonthOf(month int) int {
	if month == 1 {
		return 12
	}
	return month - 1
}

func daysIn(year, month int) int {
	return time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}
