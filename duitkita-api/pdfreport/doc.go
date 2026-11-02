package pdfreport

import (
	"strings"

	"github.com/go-pdf/fpdf"
)

// doc wraps fpdf with the handful of primitives every section uses, so the
// sections read as layout decisions rather than fpdf state juggling.
type doc struct {
	pdf     *fpdf.Fpdf
	r       *Report
	section string // shown in the running header of the pages that follow
	ordinal int    // section counter for the "01", "02" eyebrows
}

const pageAlias = "{nb}"

func newDoc(r *Report) *doc {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(marginX, contentTop, marginX)
	// Page breaks are placed explicitly (ensureSpace) so charts, table rows
	// and their headers are never split by fpdf mid-draw.
	pdf.SetAutoPageBreak(false, 0)
	// fpdf pads every cell by 1mm by default; the layout grid accounts for
	// spacing itself, so text sits exactly where it's placed.
	pdf.SetCellMargin(0)
	pdf.SetCompression(true)
	pdf.AliasNbPages(pageAlias)
	pdf.SetTitle("Laporan DuitKita "+FormatPeriod(r.Year, r.Month), true)
	pdf.SetAuthor("DuitKita", true)
	pdf.SetCreator("DuitKita", true)
	pdf.SetCreationDate(r.GeneratedAt)
	registerAssets(pdf)

	d := &doc{pdf: pdf, r: r}
	pdf.SetHeaderFuncMode(d.runningHeader, false)
	pdf.SetFooterFunc(d.footer)
	return d
}

// --- drawing state helpers ---------------------------------------------

func (d *doc) font(w weight, size float64) { d.pdf.SetFont(string(w), "", size) }
func (d *doc) text(c rgb)                  { d.pdf.SetTextColor(c.r, c.g, c.b) }
func (d *doc) fill(c rgb)                  { d.pdf.SetFillColor(c.r, c.g, c.b) }
func (d *doc) stroke(c rgb, width float64) {
	d.pdf.SetDrawColor(c.r, c.g, c.b)
	d.pdf.SetLineWidth(width)
}

func (d *doc) y() float64 { return d.pdf.GetY() }

func (d *doc) setY(y float64) { d.pdf.SetY(y) }

func (d *doc) gap(h float64) { d.pdf.SetY(d.pdf.GetY() + h) }

func (d *doc) width(s string) float64 { return d.pdf.GetStringWidth(s) }

// lineH converts a font size to a comfortable single-line box height.
func lineH(size float64) float64 { return size * ptToMM * 1.35 }

// textAt draws one line of text with its box's top-left at (x, y).
// align is "L", "C" or "R" within w. It leaves the layout cursor where it
// was: only setY/gap move the flow, never drawing a label.
func (d *doc) textAt(x, y, w float64, s, align string, wt weight, size float64, c rgb) {
	cx, cy := d.pdf.GetXY()
	d.font(wt, size)
	d.text(c)
	d.pdf.SetXY(x, y)
	d.pdf.CellFormat(w, lineH(size), s, "", 0, align+"M", false, 0, "")
	d.pdf.SetXY(cx, cy)
}

// fit truncates s with an ellipsis so it fits in w at the current font.
func (d *doc) fit(s string, w float64) string {
	if d.width(s) <= w {
		return s
	}
	const ell = "…"
	runes := []rune(s)
	for len(runes) > 0 {
		runes = runes[:len(runes)-1]
		candidate := strings.TrimRight(string(runes), " ,.-") + ell
		if d.width(candidate) <= w {
			return candidate
		}
	}
	return ell
}

// fitText is textAt with truncation.
func (d *doc) fitText(x, y, w float64, s, align string, wt weight, size float64, c rgb) {
	d.font(wt, size)
	d.textAt(x, y, w, d.fit(s, w), align, wt, size, c)
}

// paragraph wraps text into w and returns the height used.
func (d *doc) paragraph(x, y, w float64, s string, wt weight, size float64, c rgb, leading float64) float64 {
	d.font(wt, size)
	d.text(c)
	lines := d.pdf.SplitText(s, w)
	lh := size * ptToMM * leading
	cx, cy := d.pdf.GetXY()
	for i, line := range lines {
		d.pdf.SetXY(x, y+float64(i)*lh)
		d.pdf.CellFormat(w, lh, line, "", 0, "LM", false, 0, "")
	}
	d.pdf.SetXY(cx, cy)
	return float64(len(lines)) * lh
}

func (d *doc) hline(x1, x2, y float64, c rgb, width float64) {
	d.stroke(c, width)
	d.pdf.Line(x1, y, x2, y)
}

func (d *doc) vline(x, y1, y2 float64, c rgb, width float64) {
	d.stroke(c, width)
	d.pdf.Line(x, y1, x, y2)
}

func (d *doc) rect(x, y, w, h float64, c rgb) {
	if w <= 0 || h <= 0 {
		return
	}
	d.fill(c)
	d.pdf.Rect(x, y, w, h, "F")
}

func (d *doc) roundRect(x, y, w, h, r float64, c rgb) {
	if w <= 0 || h <= 0 {
		return
	}
	if r > w/2 {
		r = w / 2
	}
	if r > h/2 {
		r = h / 2
	}
	d.fill(c)
	d.pdf.RoundedRect(x, y, w, h, r, "1234", "F")
}

// column draws a bar growing up from baseY with a rounded data end and a
// square foot, per the dataviz mark spec.
func (d *doc) column(x, baseY, w, h float64, c rgb) {
	if h <= 0 {
		return
	}
	r := minf(0.8, w/2, h)
	d.fill(c)
	d.pdf.RoundedRectExt(x, baseY-h, w, h, r, r, 0, 0, "F")
}

// bar draws a horizontal bar from x with a rounded data end on the right.
func (d *doc) bar(x, y, w, h float64, c rgb) {
	if w <= 0 {
		return
	}
	r := minf(0.8, h/2, w)
	d.fill(c)
	d.pdf.RoundedRectExt(x, y, w, h, 0, r, r, 0, "F")
}

func (d *doc) dot(x, y, r float64, c rgb) {
	d.fill(c)
	d.pdf.Circle(x, y, r, "F")
}

// triangle draws a small direction marker centred on (cx, cy).
func (d *doc) triangle(cx, cy, size float64, up bool, c rgb) {
	h := size * 0.86
	var pts []fpdf.PointType
	if up {
		pts = []fpdf.PointType{{X: cx - size/2, Y: cy + h/2}, {X: cx + size/2, Y: cy + h/2}, {X: cx, Y: cy - h/2}}
	} else {
		pts = []fpdf.PointType{{X: cx - size/2, Y: cy - h/2}, {X: cx + size/2, Y: cy - h/2}, {X: cx, Y: cy + h/2}}
	}
	d.fill(c)
	d.pdf.Polygon(pts, "F")
}

// --- pagination ----------------------------------------------------------

// ensureSpace starts a new page when h won't fit above the footer. It
// reports whether it did, so tables can repeat their header row.
func (d *doc) ensureSpace(h float64) bool {
	if d.y()+h <= contentBottom {
		return false
	}
	d.pdf.AddPage()
	return true
}

func (d *doc) newPage() {
	d.pdf.AddPage()
}

func (d *doc) runningHeader() {
	if d.pdf.PageNo() == 1 {
		return
	}
	const top = 11.0
	d.pdf.ImageOptions(logoImage, marginX, top-0.6, 6, 6, false, fpdf.ImageOptions{ImageType: "PNG"}, 0, "")
	title := "Laporan " + FormatPeriod(d.r.Year, d.r.Month)
	if d.r.Couple {
		title = "Laporan bersama · " + FormatPeriod(d.r.Year, d.r.Month)
	}
	d.textAt(marginX+8, top, 100, title, "L", weightSemiBold, sizeLabel, colInk)
	d.textAt(pageW-marginX-80, top, 80, d.section, "R", weightMedium, sizeLabel, colMuted)
	d.hline(marginX, pageW-marginX, top+8, colHairline, hairline)
	d.setY(contentTop)
}

func (d *doc) footer() {
	const y = 283.0
	d.hline(marginX, pageW-marginX, y-2.5, colHairline, hairline)
	d.textAt(marginX, y, 100, "DuitKita · Laporan "+FormatPeriod(d.r.Year, d.r.Month), "L", weightMedium, sizeCaption, colMuted)

	// fpdf only learns the page count at Output, and the "{nb}" alias is
	// wider than the digits it becomes — so the number sits left-aligned in
	// a two-digit slot rather than being right-aligned on the alias.
	d.font(weightSemiBold, sizeCaption)
	slot := d.width("00")
	right := pageW - marginX
	prefix := "Halaman " + itoa(d.pdf.PageNo()) + " dari "
	d.textAt(right-slot-60, y, 60, prefix, "R", weightMedium, sizeCaption, colMuted)
	d.textAt(right-slot, y, slot+2, pageAlias, "L", weightSemiBold, sizeCaption, colInk)
}

func minf(vals ...float64) float64 {
	m := vals[0]
	for _, v := range vals[1:] {
		if v < m {
			m = v
		}
	}
	return m
}

func maxf(vals ...float64) float64 {
	m := vals[0]
	for _, v := range vals[1:] {
		if v > m {
			m = v
		}
	}
	return m
}
