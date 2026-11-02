package pdfreport_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/pdfreport"
)

func TestFormatRupiah(t *testing.T) {
	cases := map[int64]string{
		0:          "Rp 0",
		999:        "Rp 999",
		1_000:      "Rp 1.000",
		1_500_000:  "Rp 1.500.000",
		-420_000:   "−Rp 420.000",
		12_345_678: "Rp 12.345.678",
	}
	for in, want := range cases {
		require.Equal(t, want, pdfreport.FormatRupiah(in), "FormatRupiah(%d)", in)
	}
}

func TestFormatCompact(t *testing.T) {
	cases := map[int64]string{
		0:             "0",
		850:           "850",
		850_000:       "850 rb",
		1_000_000:     "1 jt",
		1_500_000:     "1,5 jt",
		1_549_000:     "1,5 jt",
		10_192_000:    "10,2 jt",
		125_000_000:   "125 jt",
		1_200_000_000: "1,2 M",
		-2_500_000:    "−2,5 jt",
	}
	for in, want := range cases {
		require.Equal(t, want, pdfreport.FormatCompact(in), "FormatCompact(%d)", in)
	}
	require.Equal(t, "Rp 1,5 jt", pdfreport.FormatRupiahCompact(1_500_000))
}

func TestFormatPercentAndRatio(t *testing.T) {
	require.Equal(t, "0%", pdfreport.FormatPercent(0))
	require.Equal(t, "<1%", pdfreport.FormatPercent(0.004))
	require.Equal(t, "38%", pdfreport.FormatPercent(0.384))
	require.Equal(t, "110%", pdfreport.FormatPercent(1.1))
	require.Equal(t, "1,8×", pdfreport.FormatRatio(1.83))
}

func TestFormatDates(t *testing.T) {
	d := time.Date(2026, 9, 12, 0, 0, 0, 0, time.UTC)
	require.Equal(t, "Sabtu, 12 September", pdfreport.FormatDayLong(d))
	require.Equal(t, "12 Sep", pdfreport.FormatDateShort(d))
	require.Equal(t, "September 2026", pdfreport.FormatPeriod(2026, 9))
	require.Equal(t, "30 Okt 2026, 14.05 WIB", pdfreport.FormatDateTime(time.Date(2026, 10, 30, 7, 5, 0, 0, time.UTC)), "converted to WIB")
	require.Equal(t, "", pdfreport.MonthName(13))
}

func TestJoinList(t *testing.T) {
	require.Equal(t, "", pdfreport.JoinList(nil, 3))
	require.Equal(t, "A", pdfreport.JoinList([]string{"A"}, 3))
	require.Equal(t, "A dan B", pdfreport.JoinList([]string{"A", "B"}, 3))
	require.Equal(t, "A, B, dan C", pdfreport.JoinList([]string{"A", "B", "C"}, 3))
	require.Equal(t, "A, B, dan 2 lainnya", pdfreport.JoinList([]string{"A", "B", "C", "D"}, 2))
}

func TestSanitizeText(t *testing.T) {
	require.Equal(t, "Kopi", pdfreport.SanitizeText("Kopi ☕"))
	require.Equal(t, "Bioskop XXI", pdfreport.SanitizeText("Bioskop  XXI 🎬"))
	require.Equal(t, "Café – “spesial”…", pdfreport.SanitizeText("Café – “spesial”…"))
	require.Equal(t, "", pdfreport.SanitizeText("🎉🎉"))
	require.Equal(t, "Makan siang", pdfreport.SanitizeText("  Makan\n\tsiang  "))
}

func TestUsageStatus(t *testing.T) {
	require.Equal(t, pdfreport.StatusNeutral, pdfreport.UsageStatus(-1))
	require.Equal(t, pdfreport.StatusGood, pdfreport.UsageStatus(0.79))
	require.Equal(t, pdfreport.StatusWarn, pdfreport.UsageStatus(0.8))
	require.Equal(t, pdfreport.StatusWarn, pdfreport.UsageStatus(1))
	require.Equal(t, pdfreport.StatusDanger, pdfreport.UsageStatus(1.01))
}

func TestRenderRejectsInvalidInput(t *testing.T) {
	_, err := pdfreport.Render(nil)
	require.Error(t, err)
	_, err = pdfreport.Render(&pdfreport.Report{Year: 2026, Month: 13})
	require.Error(t, err)
}
