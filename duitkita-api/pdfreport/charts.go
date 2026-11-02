package pdfreport

import (
	"math"

	"github.com/go-pdf/fpdf"
)

// niceScale picks a round axis maximum and step for values up to v, aiming
// for at most maxTicks intervals (0 / 5 jt / 10 jt rather than 0 / 3,4 jt).
func niceScale(v float64, maxTicks int) (top, step float64) {
	if v <= 0 {
		return 100_000, 50_000
	}
	rough := v / float64(maxTicks)
	mag := math.Pow(10, math.Floor(math.Log10(rough)))
	n := rough / mag
	var s float64
	switch {
	case n <= 1:
		s = 1
	case n <= 2:
		s = 2
	case n <= 2.5:
		s = 2.5
	case n <= 5:
		s = 5
	default:
		s = 10
	}
	step = s * mag
	top = math.Ceil(v/step) * step
	if top < v {
		top += step
	}
	return top, step
}

// plot is a value→position mapping for one chart area.
type plot struct {
	x, y, w, h float64 // plot rectangle (y is the top)
	top        float64 // value at the top edge
}

func (p plot) base() float64 { return p.y + p.h }

func (p plot) vy(v float64) float64 { return p.base() - (v/p.top)*p.h }

func (p plot) vh(v float64) float64 { return (v / p.top) * p.h }

const (
	axisLabelW = 11.0
	// refGutter is the strip right of a plot where a reference line (the
	// average) gets its label, so the label never sits on top of a mark.
	refGutter = 15.0
)

// refLine draws a reference line across the plot and labels it in the
// right-hand gutter: the name above the line, the value below.
func (d *doc) refLine(p plot, v float64, name string) {
	y := p.vy(v)
	d.hline(p.x, p.x+p.w+1, y, colMuted, 0.25)
	x := p.x + p.w + 2
	d.textAt(x, y-lineH(sizeCaption)-0.1, refGutter-2, name, "L", weightMedium, sizeCaption, colMuted)
	d.textAt(x, y+0.1, refGutter-2, FormatCompact(int64(v)), "L", weightSemiBold, sizeCaption, colInk)
}

// yAxis draws solid hairline gridlines with compact labels to the left.
func (d *doc) yAxis(p plot, step float64) {
	for v := 0.0; v <= p.top+step/2; v += step {
		y := p.vy(v)
		c := colHairline
		if v == 0 {
			c = rgb{200, 214, 234}
		}
		d.hline(p.x, p.x+p.w, y, c, hairline)
		label := FormatCompact(int64(v))
		d.textAt(p.x-axisLabelW, y-lineH(sizeCaption)/2, axisLabelW-1.6, label, "R", weightMedium, sizeCaption, colMuted)
	}
}

// chartTitle sets a small chart heading with an optional legend on the right.
func (d *doc) chartTitle(x, y, w float64, title string, legend []legendItem) {
	d.textAt(x, y, w, title, "L", weightSemiBold, 8.5, colInk)
	if len(legend) > 0 {
		d.legendRight(y+0.3, legend)
	}
}

// --- 6-month trend --------------------------------------------------------

func (d *doc) trendChart() {
	r := d.r
	const titleH, plotH, labelsH = 7.0, 44.0, 9.0
	d.ensureSpace(titleH + plotH + labelsH + 4)
	y0 := d.y()

	legend := d.personLegend()
	d.chartTitle(marginX, y0, 100, "Pengeluaran 6 bulan terakhir", legend)

	extra := 0
	var nextProj *Projection
	if r.Projection != nil && r.Projection.Kind == ProjectionNextMonth {
		nextProj = r.Projection
		extra = 1
	}
	var curProj int64
	if r.Projection != nil && r.Projection.Kind == ProjectionEndOfMonth {
		curProj = r.Projection.Amount
	}

	maxV := 0.0
	for _, t := range r.Trend {
		maxV = math.Max(maxV, float64(t.Total()))
	}
	maxV = math.Max(maxV, float64(curProj))
	if nextProj != nil {
		maxV = math.Max(maxV, float64(nextProj.Amount))
	}
	top, step := niceScale(maxV*1.08, 4)
	p := plot{x: marginX + axisLabelW, y: y0 + titleH + 3, w: contentW - axisLabelW - refGutter, h: plotH, top: top}
	d.yAxis(p, step)

	n := len(r.Trend) + extra
	slot := p.w / float64(n)
	bw := minf(9, slot*0.48)
	last := len(r.Trend) - 1

	// Average of the complete months that have data — the current partial
	// month would drag it down.
	var sum, cnt float64
	for i, t := range r.Trend {
		if t.Total() > 0 && !(i == last && r.Partial) {
			sum += float64(t.Total())
			cnt++
		}
	}

	maxIdx := -1
	for i, t := range r.Trend {
		if i != last && t.Total() > 0 && (maxIdx < 0 || t.Total() > r.Trend[maxIdx].Total()) {
			maxIdx = i
		}
	}

	for i, t := range r.Trend {
		cx := p.x + slot*(float64(i)+0.5)
		x := cx - bw/2
		cur := i == last
		if r.Couple {
			meH := p.vh(float64(t.Me))
			d.column(x, p.base(), bw, meH, colMe)
			if t.Partner > 0 {
				gap := 0.0
				if meH > 0 {
					gap = 0.5
				}
				d.column(x, p.base()-meH-gap, bw, p.vh(float64(t.Partner))-gap, colPartner)
			}
		} else {
			c := colSky
			if cur {
				c = colNavy
			}
			d.column(x, p.base(), bw, p.vh(float64(t.Total())), c)
		}

		if cur && curProj > t.Total() {
			// The rest of the month at the current pace, as a pale ghost
			// stacked on what's been spent so far.
			ghostTop := p.vy(float64(curProj))
			ghostBase := p.vy(float64(t.Total())) - 0.5
			d.columnGhost(x, ghostTop, bw, ghostBase-ghostTop)
		}

		labelV := int64(-1)
		labelWt, labelC := weightSemiBold, colInk
		switch {
		case cur && curProj > t.Total():
			labelV = curProj
			labelWt, labelC = weightMedium, colMuted
		case cur:
			labelV = t.Total()
		case i == maxIdx:
			labelV = t.Total()
			labelWt, labelC = weightMedium, colMuted
		}
		if labelV >= 0 {
			ly := p.vy(float64(labelV)) - lineH(sizeCaption) - 0.6
			d.textAt(cx-12, ly, 24, FormatCompact(labelV), "C", labelWt, sizeCaption, labelC)
		}

		mWt, mC := weightMedium, colMuted
		if cur {
			mWt, mC = weightBold, colInk
		}
		d.textAt(cx-slot/2, p.base()+1.6, slot, MonthShortName(t.Month), "C", mWt, sizeLabel, mC)
		if cur && curProj > t.Total() {
			d.textAt(cx-slot/2, p.base()+5, slot, "+ proyeksi", "C", weightMedium, sizeCaption, colMuted)
		}
	}

	if nextProj != nil {
		cx := p.x + slot*(float64(n-1)+0.5)
		x := cx - bw/2
		gt := p.vy(float64(nextProj.Amount))
		d.columnGhost(x, gt, bw, p.base()-gt)
		d.textAt(cx-12, gt-lineH(sizeCaption)-0.6, 24, FormatCompact(nextProj.Amount), "C", weightMedium, sizeCaption, colMuted)
		d.textAt(cx-slot/2, p.base()+1.6, slot, MonthShortName(nextProj.Month), "C", weightMedium, sizeLabel, colMuted)
		d.textAt(cx-slot/2, p.base()+5, slot, "proyeksi", "C", weightMedium, sizeCaption, colMuted)
	}

	if cnt >= 2 {
		d.refLine(p, sum/cnt, "rata-rata")
	}

	d.setY(p.base() + labelsH + 2)
}

// columnGhost is a projected (not yet real) column: a pale wash, square at
// the foot and rounded at the data end like a real column.
func (d *doc) columnGhost(x, topY, w, h float64) {
	if h <= 0 {
		return
	}
	r := minf(0.8, w/2, h)
	d.fill(colMist)
	d.pdf.RoundedRectExt(x, topY, w, h, r, r, 0, 0, "F")
	d.stroke(colSky, 0.2)
	d.pdf.RoundedRectExt(x, topY, w, h, r, r, 0, 0, "D")
}

// --- daily ----------------------------------------------------------------

func (d *doc) dailyChart() {
	r := d.r
	const titleH, plotH, labelsH = 7.0, 34.0, 6.0
	d.ensureSpace(titleH + plotH + labelsH + 4)
	y0 := d.y()

	legend := append([]legendItem{{color: colMist, label: "Akhir pekan"}}, d.personLegend()...)
	d.chartTitle(marginX, y0, 100, "Pengeluaran harian", legend)

	maxV := 0.0
	var peak = -1
	for i, p := range r.Daily {
		if float64(p.Total()) > maxV {
			maxV = float64(p.Total())
			peak = i
		}
	}
	top, step := niceScale(maxV*1.12, 3)
	p := plot{x: marginX + axisLabelW, y: y0 + titleH + 3, w: contentW - axisLabelW - refGutter, h: plotH, top: top}

	n := len(r.Daily)
	slot := p.w / float64(n)
	bw := minf(3.4, slot*0.62)

	// Weekend bands go under the grid so the gridlines stay continuous.
	for i, day := range r.Daily {
		if day.Weekday == 0 || day.Weekday == 6 {
			d.rect(p.x+slot*float64(i), p.y-1, slot, p.h+1, colMist)
		}
	}
	d.yAxis(p, step)

	for i, day := range r.Daily {
		if day.Future {
			continue
		}
		cx := p.x + slot*(float64(i)+0.5)
		x := cx - bw/2
		if r.Couple {
			meH := p.vh(float64(day.Me))
			d.column(x, p.base(), bw, meH, colMe)
			if day.Partner > 0 {
				gap := 0.0
				if meH > 0 {
					gap = 0.4
				}
				d.column(x, p.base()-meH-gap, bw, p.vh(float64(day.Partner))-gap, colPartner)
			}
		} else {
			d.column(x, p.base(), bw, p.vh(float64(day.Total())), colNavy)
		}
	}

	if r.Summary.AvgDaily > 0 {
		d.refLine(p, float64(r.Summary.AvgDaily), "rata-rata")
	}

	if peak >= 0 && maxV > 0 {
		cx := p.x + slot*(float64(peak)+0.5)
		ly := p.vy(maxV) - lineH(sizeCaption) - 0.5
		d.textAt(cx-12, ly, 24, FormatCompact(int64(maxV)), "C", weightSemiBold, sizeCaption, colInk)
	}

	for _, day := range dayTicks(n, r.AsOfDay) {
		cx := p.x + slot*(float64(day)-0.5)
		wt, c := weightMedium, colMuted
		if r.Partial && day == r.AsOfDay {
			wt, c = weightBold, colInk
		}
		d.textAt(cx-4, p.base()+1.4, 8, itoa(day), "C", wt, sizeCaption, c)
	}
	if r.Partial && r.AsOfDay > 0 && r.AsOfDay < n {
		// Mark where the data stops.
		x := p.x + slot*float64(r.AsOfDay)
		d.vline(x, p.y-1, p.base(), colInkSoft, 0.25)
		d.textAt(x+1, p.y-1, 30, "hari ini", "L", weightMedium, sizeCaption, colMuted)
	}

	d.setY(p.base() + labelsH + 2)
}

// dayTicks picks the day labels for an n-day axis: 1, every 5th, the last
// day and (for a month in progress) today — dropping any regular tick that
// would crowd today or the last day.
func dayTicks(n, today int) []int {
	pinned := map[int]bool{n: true}
	if today > 0 && today <= n {
		pinned[today] = true
	}
	var out []int
	for day := 1; day <= n; day++ {
		if pinned[day] {
			out = append(out, day)
			continue
		}
		if day != 1 && day%5 != 0 {
			continue
		}
		crowded := false
		for p := range pinned {
			if p != day && p-day < 3 && day-p < 3 {
				crowded = true
			}
		}
		if !crowded {
			out = append(out, day)
		}
	}
	return out
}

// --- cumulative vs budget ------------------------------------------------

func (d *doc) cumulativeChart(x, y, w float64) float64 {
	r := d.r
	const titleH, plotH, labelsH = 7.0, 38.0, 6.0
	budget := float64(r.Summary.TotalBudget)

	title := "Kumulatif vs budget"
	legend := []legendItem{{color: colNavy, label: "Terpakai", line: true}}
	if budget <= 0 {
		title = "Pengeluaran kumulatif"
		legend = nil
	} else {
		legend = append(legend, legendItem{color: colSky, label: "Laju budget", line: true})
	}
	d.textAt(x, y, w, title, "L", weightSemiBold, 8.5, colInk)

	// Legend sits under the title here: the chart is only half-width.
	lx := x
	for _, it := range legend {
		lx += d.legendLine(lx, y+5, it.color, 0.6, it.label) + 4
	}

	var cum []float64
	run := 0.0
	for _, day := range r.Daily {
		if day.Future {
			break
		}
		run += float64(day.Total())
		cum = append(cum, run)
	}
	top, step := niceScale(math.Max(run, budget)*1.06, 4)
	p := plot{x: x + axisLabelW, y: y + titleH + 6, w: w - axisLabelW, h: plotH, top: top}
	d.yAxis(p, step)

	n := float64(len(r.Daily))
	px := func(day float64) float64 { return p.x + (day/n)*p.w }

	if budget > 0 {
		d.stroke(colSky, 0.5)
		d.pdf.Line(px(0), p.vy(0), px(n), p.vy(budget))
		by := p.vy(budget)
		d.hline(p.x, p.x+p.w, by, colMuted, 0.2)
		d.textAt(p.x, by-lineH(sizeCaption)-0.3, p.w, "Budget "+FormatCompact(int64(budget)), "L", weightMedium, sizeCaption, colMuted)
	}

	if len(cum) > 0 {
		pts := []fpdf.PointType{{X: px(0), Y: p.vy(0)}}
		for i, v := range cum {
			pts = append(pts, fpdf.PointType{X: px(float64(i + 1)), Y: p.vy(v)})
		}
		d.stroke(colNavy, 0.6)
		d.pdf.SetLineJoinStyle("round")
		d.pdf.SetLineCapStyle("round")
		for i := 1; i < len(pts); i++ {
			d.pdf.Line(pts[i-1].X, pts[i-1].Y, pts[i].X, pts[i].Y)
		}
		d.pdf.SetLineCapStyle("butt")
		end := pts[len(pts)-1]
		d.dot(end.X, end.Y, 1.35, colWhite)
		d.dot(end.X, end.Y, 0.95, colNavy)
		label := FormatCompact(int64(run))
		d.font(weightSemiBold, sizeCaption)
		lw := d.width(label) + 1
		lx := end.X + 1.8
		if lx+lw > p.x+p.w {
			lx = end.X - 1.8 - lw
		}
		d.textAt(lx, end.Y-lineH(sizeCaption)-0.6, lw, label, "L", weightSemiBold, sizeCaption, colInk)
	}

	for _, day := range []int{1, 10, 20, len(r.Daily)} {
		cx := px(float64(day) - 0.5)
		d.textAt(cx-4, p.base()+1.4, 8, itoa(day), "C", weightMedium, sizeCaption, colMuted)
	}
	return p.base() + labelsH - y
}

// --- weekday averages -----------------------------------------------------

func (d *doc) weekdayChart(x, y, w float64) float64 {
	r := d.r
	d.textAt(x, y, w, "Rata-rata per hari", "L", weightSemiBold, 8.5, colInk)
	d.textAt(x, y+5, w, "per hari dalam seminggu", "L", weightMedium, sizeLabel, colMuted)

	maxV := int64(0)
	peak := -1
	for i, s := range r.Weekdays {
		if s.Avg > maxV {
			maxV, peak = s.Avg, i
		}
	}
	const rowH, labelW, valueW = 5.6, 9.0, 15.0
	barMax := w - labelW - valueW
	top := y + 13
	for i, s := range r.Weekdays {
		ry := top + float64(i)*rowH
		wt, c := weightMedium, colMuted
		if i == peak {
			wt, c = weightBold, colInk
		}
		d.textAt(x, ry, labelW, WeekdayShortName(s.Weekday), "L", wt, sizeLabel, c)
		bh := 2.6
		by := ry + (lineH(sizeLabel)-bh)/2
		d.roundRect(x+labelW, by, barMax, bh, bh/2, colTrack)
		if maxV > 0 && s.Avg > 0 {
			bc := colSky
			if i == peak {
				bc = colNavy
			}
			d.roundRect(x+labelW, by, maxf(barMax*float64(s.Avg)/float64(maxV), bh), bh, bh/2, bc)
		}
		d.textAt(x+labelW+barMax, ry, valueW, FormatCompact(s.Avg), "R", weightSemiBold, sizeCaption, colInk)
	}
	return 13 + float64(len(r.Weekdays))*rowH
}

// --- category sparklines --------------------------------------------------

// sparkColumns draws a tiny 6-month column series with the last (current)
// column emphasised, plus month initials underneath.
func (d *doc) sparkColumns(x, y, w, h float64, points []int64, months []int) {
	maxV := int64(0)
	for _, v := range points {
		if v > maxV {
			maxV = v
		}
	}
	n := len(points)
	if n == 0 {
		return
	}
	slot := w / float64(n)
	bw := minf(3.6, slot*0.56)
	base := y + h
	d.hline(x, x+w, base, colHairline, hairline)
	for i, v := range points {
		cx := x + slot*(float64(i)+0.5)
		c := colSky
		if i == n-1 {
			c = colNavy
		}
		if maxV > 0 && v > 0 {
			d.column(cx-bw/2, base, bw, maxf(h*float64(v)/float64(maxV), 0.6), c)
		}
		if i < len(months) {
			wt, tc := weightMedium, colMuted
			if i == n-1 {
				wt, tc = weightSemiBold, colInk
			}
			d.textAt(cx-slot/2, base+0.8, slot, MonthShortName(months[i]), "C", wt, 5.6, tc)
		}
	}
}

// --- couple split ---------------------------------------------------------

func (d *doc) splitBar(x, y, w, h float64, me, partner int64) {
	total := me + partner
	if total <= 0 {
		d.roundRect(x, y, w, h, h/2, colTrack)
		return
	}
	const gap = 0.8
	mw := w * float64(me) / float64(total)
	pw := w - mw
	r := h / 2
	if me > 0 && partner > 0 {
		mw -= gap / 2
		pw -= gap / 2
	}
	if me > 0 {
		d.fill(colMe)
		rr := minf(r, mw)
		if partner > 0 {
			d.pdf.RoundedRectExt(x, y, mw, h, rr, 0, 0, rr, "F")
		} else {
			d.roundRect(x, y, mw, h, r, colMe)
		}
	}
	if partner > 0 {
		d.fill(colPartner)
		px := x + w - pw
		rr := minf(r, pw)
		if me > 0 {
			d.pdf.RoundedRectExt(px, y, pw, h, 0, rr, rr, 0, "F")
		} else {
			d.roundRect(px, y, pw, h, r, colPartner)
		}
	}
}
