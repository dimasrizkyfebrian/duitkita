package utils

import (
	"bytes"

	"github.com/go-pdf/fpdf"
)

// PDFLine is one row of text rendered in the generated report PDF.
type PDFLine struct {
	Text string
	Bold bool
}

// GenerateSimplePDF renders a title + a list of lines into a PDF byte buffer.
// This is a minimal placeholder for report exports (monthly/couple report);
// replace with a proper templated layout once the report design is final.
func GenerateSimplePDF(title string, lines []PDFLine) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, title)
	pdf.Ln(14)

	for _, line := range lines {
		style := ""
		if line.Bold {
			style = "B"
		}
		pdf.SetFont("Arial", style, 11)
		pdf.MultiCell(0, 7, line.Text, "", "L", false)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// PDFColumn is one side of a two-column PDF section — used for the couple
// report so each partner's breakdown reads as its own block side by side,
// rather than interleaved into a single list.
type PDFColumn struct {
	Heading string
	Lines   []PDFLine
}

// GenerateTwoColumnPDF renders a title, an intro block of lines, then two
// columns laid out side by side starting from the same Y position.
func GenerateTwoColumnPDF(title string, intro []PDFLine, left, right PDFColumn) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, title)
	pdf.Ln(14)

	for _, line := range intro {
		style := ""
		if line.Bold {
			style = "B"
		}
		pdf.SetFont("Arial", style, 11)
		pdf.MultiCell(0, 7, line.Text, "", "L", false)
	}
	pdf.Ln(4)

	pageWidth, _ := pdf.GetPageSize()
	marginLeft, _, marginRight, _ := pdf.GetMargins()
	contentWidth := pageWidth - marginLeft - marginRight
	const gap = 6.0
	colWidth := (contentWidth - gap) / 2

	leftX := marginLeft
	rightX := marginLeft + colWidth + gap
	startY := pdf.GetY()

	renderColumn := func(x float64, col PDFColumn) float64 {
		pdf.SetXY(x, startY)
		pdf.SetFont("Arial", "B", 12)
		pdf.MultiCell(colWidth, 7, col.Heading, "", "L", false)
		for _, line := range col.Lines {
			style := ""
			if line.Bold {
				style = "B"
			}
			pdf.SetX(x)
			pdf.SetFont("Arial", style, 10)
			pdf.MultiCell(colWidth, 6, line.Text, "", "L", false)
		}
		return pdf.GetY()
	}

	leftEndY := renderColumn(leftX, left)
	rightEndY := renderColumn(rightX, right)

	endY := leftEndY
	if rightEndY > endY {
		endY = rightEndY
	}
	pdf.SetY(endY)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
