package pdfreport

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// WIB is the zone every date in the report is read in. Indonesia has no DST,
// so a fixed offset is exact and doesn't depend on tzdata being installed.
var WIB = time.FixedZone("WIB", 7*60*60)

var monthNames = [...]string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
var monthShortNames = [...]string{"", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"}
var weekdayNames = [...]string{"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"}
var weekdayShortNames = [...]string{"Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"}

func MonthName(month int) string {
	if month < 1 || month > 12 {
		return ""
	}
	return monthNames[month]
}

func MonthShortName(month int) string {
	if month < 1 || month > 12 {
		return ""
	}
	return monthShortNames[month]
}

func WeekdayName(d time.Weekday) string      { return weekdayNames[d] }
func WeekdayShortName(d time.Weekday) string { return weekdayShortNames[d] }

// FormatPeriod renders "Oktober 2026".
func FormatPeriod(year, month int) string {
	return fmt.Sprintf("%s %d", MonthName(month), year)
}

// FormatDayLong renders "Sabtu, 12 Oktober".
func FormatDayLong(t time.Time) string {
	return fmt.Sprintf("%s, %d %s", WeekdayName(t.Weekday()), t.Day(), MonthName(int(t.Month())))
}

// FormatDateShort renders "12 Okt".
func FormatDateShort(t time.Time) string {
	return fmt.Sprintf("%d %s", t.Day(), MonthShortName(int(t.Month())))
}

// FormatDateTime renders "30 Okt 2026, 14.05 WIB" — Indonesian uses a dot
// as the hour separator.
func FormatDateTime(t time.Time) string {
	t = t.In(WIB)
	return fmt.Sprintf("%d %s %d, %02d.%02d WIB", t.Day(), MonthShortName(int(t.Month())), t.Year(), t.Hour(), t.Minute())
}

// FormatNumber groups thousands with dots: 1500000 → "1.500.000".
func FormatNumber(n int64) string {
	neg := n < 0
	if neg {
		n = -n
	}
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	pre := len(s) % 3
	if pre > 0 {
		b.WriteString(s[:pre])
	}
	for i := pre; i < len(s); i += 3 {
		if b.Len() > 0 {
			b.WriteByte('.')
		}
		b.WriteString(s[i : i+3])
	}
	if neg {
		return "−" + b.String()
	}
	return b.String()
}

// FormatRupiah renders "Rp 1.500.000", with a true minus sign for negatives.
func FormatRupiah(n int64) string {
	if n < 0 {
		return "−Rp " + FormatNumber(-n)
	}
	return "Rp " + FormatNumber(n)
}

// FormatCompact abbreviates for axes and tight labels: 850, 850 rb, 1,5 jt,
// 1,2 M. One decimal at most, dropped when it would be ",0".
func FormatCompact(n int64) string {
	neg := n < 0
	if neg {
		n = -n
	}
	var out string
	switch {
	case n >= 1_000_000_000:
		out = compactUnit(float64(n)/1e9) + " M"
	case n >= 1_000_000:
		out = compactUnit(float64(n)/1e6) + " jt"
	case n >= 1_000:
		out = compactUnit(float64(n)/1e3) + " rb"
	default:
		out = strconv.FormatInt(n, 10)
	}
	if neg {
		return "−" + out
	}
	return out
}

// FormatRupiahCompact renders "Rp 1,5 jt".
func FormatRupiahCompact(n int64) string {
	if n < 0 {
		return "−Rp " + FormatCompact(-n)
	}
	return "Rp " + FormatCompact(n)
}

func compactUnit(v float64) string {
	if v >= 100 {
		return strconv.FormatFloat(math.Round(v), 'f', 0, 64)
	}
	r := math.Round(v*10) / 10
	if r == math.Trunc(r) {
		return strconv.FormatFloat(r, 'f', 0, 64)
	}
	return strings.Replace(strconv.FormatFloat(r, 'f', 1, 64), ".", ",", 1)
}

// FormatPercent renders a 0..1 (or larger) ratio as a whole percent, keeping
// tiny non-zero shares from rounding to a misleading "0%".
func FormatPercent(ratio float64) string {
	p := ratio * 100
	if p > 0 && p < 1 {
		return "<1%"
	}
	return strconv.FormatFloat(math.Round(p), 'f', 0, 64) + "%"
}

// FormatRatio renders a multiplier with a decimal comma: 1.83 → "1,8×".
func FormatRatio(r float64) string {
	return strings.Replace(strconv.FormatFloat(math.Round(r*10)/10, 'f', 1, 64), ".", ",", 1) + "×"
}

// JoinList joins names the Indonesian way: "A", "A dan B", "A, B, dan C",
// and folds anything past max into "dan N lainnya".
func JoinList(items []string, max int) string {
	if max > 0 && len(items) > max {
		rest := len(items) - max
		return strings.Join(items[:max], ", ") + fmt.Sprintf(", dan %d lainnya", rest)
	}
	switch len(items) {
	case 0:
		return ""
	case 1:
		return items[0]
	case 2:
		return items[0] + " dan " + items[1]
	default:
		return strings.Join(items[:len(items)-1], ", ") + ", dan " + items[len(items)-1]
	}
}

// FirstName is used where a full name won't fit (legends, table headers).
func FirstName(name string) string {
	fields := strings.Fields(name)
	if len(fields) == 0 {
		return name
	}
	return fields[0]
}

// SanitizeText keeps only what the embedded font can draw: Latin (incl.
// extended), general punctuation and currency symbols. User-entered notes and
// category names routinely carry emoji, which would otherwise render as
// blanks or boxes. Whitespace runs collapse to one space.
func SanitizeText(s string) string {
	var b strings.Builder
	space := false
	for _, r := range s {
		if unicode.IsSpace(r) {
			space = b.Len() > 0
			continue
		}
		if !drawable(r) {
			continue
		}
		if space {
			b.WriteByte(' ')
			space = false
		}
		b.WriteRune(r)
	}
	return b.String()
}

func drawable(r rune) bool {
	switch {
	case r < 0x20:
		return false
	case r <= 0x024F: // Basic Latin through Latin Extended-B
		return true
	case r >= 0x2010 && r <= 0x2044: // dashes, quotes, bullets, ellipsis
		return true
	case r >= 0x20A0 && r <= 0x20BF: // currency symbols
		return true
	case r == 0x2212 || r == 0x00D7: // minus, multiplication
		return true
	default:
		return false
	}
}
