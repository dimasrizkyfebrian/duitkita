package pdfreport

import (
	"fmt"
	"strconv"
)

func itoa(n int) string { return strconv.Itoa(n) }

// textBaseline draws left-aligned text whose baseline sits on baseY. Used to
// set mixed sizes on one line (the small "Rp" before the hero figure).
// fpdf's "M" alignment puts the baseline at boxTop + h/2 + 0.3·fontSize.
func (d *doc) textBaseline(x, baseY float64, s string, wt weight, size float64, c rgb) float64 {
	d.font(wt, size)
	w := d.width(s)
	h := lineH(size)
	top := baseY - h/2 - 0.3*size*ptToMM
	d.textAt(x, top, w+0.5, s, "L", wt, size, c)
	return w
}

// sectionHeader starts a numbered section: "01  Kategori" over a one-line
// description of what the section shows. minBody is the space the first
// block after the header needs, so a header is never orphaned at the foot
// of a page.
func (d *doc) sectionHeader(title, subtitle string, minBody float64) {
	d.section = title
	const headerH = 16.0
	if !d.ensureSpace(headerH + minBody) {
		if d.y() > contentTop+1 {
			d.gap(8)
		}
		d.ensureSpace(headerH + minBody)
	}
	d.ordinal++
	y := d.y()
	num := fmt.Sprintf("%02d", d.ordinal)
	d.font(weightSemiBold, sizeTitle)
	nw := d.width(num)
	d.textAt(marginX, y, nw+1, num, "L", weightSemiBold, sizeTitle, colAzure)
	d.textAt(marginX+nw+3, y, contentW-nw-3, title, "L", weightBold, sizeTitle, colInk)
	if subtitle != "" {
		d.fitText(marginX+nw+3, y+6.4, contentW-nw-3, subtitle, "L", weightRegular, sizeSubtitle, colMuted)
	}
	d.setY(y + headerH)
}

// subHeader is a smaller heading inside a section, with optional right-hand
// note (a summary figure or a legend line). Returns nothing; advances Y.
func (d *doc) subHeader(title, note string, minBody float64) {
	d.ensureSpace(7 + minBody)
	y := d.y()
	d.textAt(marginX, y, contentW, title, "L", weightSemiBold, 9.5, colInk)
	if note != "" {
		d.fitText(marginX+70, y+0.4, contentW-70, note, "R", weightMedium, sizeLabel, colMuted)
	}
	d.setY(y + 7)
}

// meter is a ratio bar: track in the neutral step, fill in the status color,
// capped at the track's end (overflow is said in words next to it).
func (d *doc) meter(x, y, w, h, usage float64, s Status) {
	d.roundRect(x, y, w, h, h/2, colTrack)
	if usage <= 0 {
		return
	}
	fw := w * minf(usage, 1)
	d.roundRect(x, y, maxf(fw, h), h, h/2, statusColor(s))
}

// legendSwatch draws a small rounded square key and its label, returning
// the total width used.
func (d *doc) legendSwatch(x, y float64, c rgb, label string) float64 {
	const size = 2.4
	lh := lineH(sizeLabel)
	d.roundRect(x, y+(lh-size)/2, size, size, 0.5, c)
	d.font(weightMedium, sizeLabel)
	tw := d.width(label)
	d.textAt(x+size+1.4, y, tw+1, label, "L", weightMedium, sizeLabel, colMuted)
	return size + 1.4 + tw
}

// legendLine is the key for a line series.
func (d *doc) legendLine(x, y float64, c rgb, width float64, label string) float64 {
	lh := lineH(sizeLabel)
	d.hline(x, x+4, y+lh/2, c, width)
	d.font(weightMedium, sizeLabel)
	tw := d.width(label)
	d.textAt(x+5.4, y, tw+1, label, "L", weightMedium, sizeLabel, colMuted)
	return 5.4 + tw
}

type legendItem struct {
	color rgb
	label string
	line  bool
}

// legendRight lays legend items out right-aligned to the content edge.
func (d *doc) legendRight(y float64, items []legendItem) {
	const gap = 4.5
	d.font(weightMedium, sizeLabel)
	total := 0.0
	for i, it := range items {
		if it.line {
			total += 5.4 + d.width(it.label)
		} else {
			total += 3.8 + d.width(it.label)
		}
		if i > 0 {
			total += gap
		}
	}
	x := pageW - marginX - total
	for _, it := range items {
		if it.line {
			x += d.legendLine(x, y, it.color, 0.6, it.label) + gap
		} else {
			x += d.legendSwatch(x, y, it.color, it.label) + gap
		}
	}
}

func (d *doc) personLegend() []legendItem {
	if !d.r.Couple || d.r.Partner == nil {
		return nil
	}
	return []legendItem{
		{color: colMe, label: FirstName(d.r.Owner.Name)},
		{color: colPartner, label: FirstName(d.r.Partner.Name)},
	}
}

func (d *doc) ownerName(o Owner) string {
	if o == OwnerPartner && d.r.Partner != nil {
		return FirstName(d.r.Partner.Name)
	}
	return FirstName(d.r.Owner.Name)
}

// --- tables --------------------------------------------------------------

type column struct {
	title string
	w     float64
	align string
}

// table lays out rows on a fixed column grid, breaking pages between rows
// and repeating the header row on each new page.
type table struct {
	d       *doc
	cols    []column
	xs      []float64
	onBreak func() // extra rows to redraw after the header (e.g. a group label)

	rows       int // rows drawn so far
	breakAtRow int // forced page break before this row, or -1
}

const cellPad = 1.6

func (d *doc) newTable(cols []column) *table {
	t := &table{d: d, cols: cols, breakAtRow: -1}
	x := marginX
	for _, c := range cols {
		t.xs = append(t.xs, x)
		x += c.w
	}
	return t
}

// cell returns the text box of column i with inner padding, keeping the
// first and last columns flush with the table edges.
func (t *table) cell(i int) (x, w float64) {
	x, w = t.xs[i], t.cols[i].w
	if i > 0 {
		x += cellPad
		w -= cellPad
	}
	if i < len(t.cols)-1 {
		w -= cellPad
	}
	return x, w
}

func (t *table) header() {
	d := t.d
	const h = 7.0
	y := d.y()
	for i, c := range t.cols {
		x, w := t.cell(i)
		d.fitText(x, y+1.2, w, c.title, c.align, weightSemiBold, sizeLabel, colMuted)
	}
	d.hline(marginX, marginX+contentW, y+h, colInkSoft, 0.25)
	d.setY(y + h)
}

// row reserves h, breaking the page first if needed, then hands the row's
// top Y to draw. A hairline closes the row unless rule is false.
func (t *table) row(h float64, rule bool, draw func(y float64)) {
	d := t.d
	broke := false
	if t.rows == t.breakAtRow {
		d.newPage()
		broke = true
	} else {
		broke = d.ensureSpace(h)
	}
	if broke {
		t.header()
		if t.onBreak != nil {
			t.onBreak()
		}
	}
	t.rows++
	y := d.y()
	draw(y)
	if rule {
		d.hline(marginX, marginX+contentW, y+h, colHairline, hairline)
	}
	d.setY(y + h)
}

// keepTail plans the first page break of a table whose row heights are
// known up front: if fewer than minTail rows would spill onto the next page,
// it breaks earlier so they carry over together (a lone row — or a lone
// total — at the top of a page reads as an accident). Call after header().
func (t *table) keepTail(heights []float64, minTail int) {
	y := t.d.y()
	for i, h := range heights {
		if y+h <= contentBottom {
			y += h
			continue
		}
		if tail := len(heights) - i; tail < minTail {
			if at := len(heights) - minTail; at >= minTail {
				t.breakAtRow = at
			}
		}
		return
	}
}

// text draws one cell's text vertically centred in a row of height h.
func (t *table) text(i int, y, h float64, s string, wt weight, size float64, c rgb) {
	x, w := t.cell(i)
	lh := lineH(size)
	t.d.fitText(x, y+(h-lh)/2, w, s, t.cols[i].align, wt, size, c)
}

// emptyNote is the muted one-liner a section shows instead of an empty
// table or chart.
func (d *doc) emptyNote(s string) {
	d.ensureSpace(10)
	y := d.y()
	d.roundRect(marginX, y, contentW, 10, 1.6, colZebra)
	d.textAt(marginX+4, y+(10-lineH(sizeBody))/2, contentW-8, s, "L", weightMedium, sizeBody, colMuted)
	d.setY(y + 10)
}
