package pdfreport

import (
	"bytes"
	"errors"
	"fmt"
)

// Render lays the report out as an A4 PDF.
//
// Section order: masthead and summary, the partner comparison (couple only),
// categories, trends and patterns, the largest expenses, recurring
// commitments and bills, then the full transaction appendix on its own pages.
func Render(r *Report) ([]byte, error) {
	if r == nil {
		return nil, errors.New("pdfreport: nil report")
	}
	if r.Month < 1 || r.Month > 12 {
		return nil, fmt.Errorf("pdfreport: invalid month %d", r.Month)
	}

	d := newDoc(r)
	d.pdf.AddPage()
	d.masthead()
	d.summary()
	if r.Couple {
		d.coupleSection()
	}
	d.categorySection()
	d.trendSection()
	d.topSection()
	d.commitmentsSection()
	d.appendix()

	var buf bytes.Buffer
	if err := d.pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("pdfreport: %w", err)
	}
	return buf.Bytes(), nil
}
