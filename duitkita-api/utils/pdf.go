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
