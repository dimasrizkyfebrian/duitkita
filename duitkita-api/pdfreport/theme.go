package pdfreport

// Colors are the web app's design tokens (duitkita-web/src/assets/main.css)
// so the PDF reads as the same product. Text only ever wears ink or muted —
// data colors are for marks, never for words.

type rgb struct{ r, g, b int }

var (
	colInk      = rgb{7, 28, 60}     // --color-ink
	colInkSoft  = rgb{15, 44, 86}    // --color-ink-soft
	colNavy     = rgb{13, 71, 161}   // --color-navy: primary data mark
	colAzure    = rgb{33, 150, 243}  // --color-azure: brand accent
	colSky      = rgb{144, 202, 249} // --color-sky: context / de-emphasised marks
	colMist     = rgb{227, 242, 253} // --color-mist: tinted surfaces
	colMuted    = rgb{91, 107, 133}  // --color-muted
	colHairline = rgb{219, 230, 245} // --color-hairline
	colWhite    = rgb{255, 255, 255}

	// colTrack is the unfilled part of a meter: a neutral one step off the
	// page, so a green/amber/red fill reads against it without competing.
	colTrack = rgb{233, 239, 247}
	// colZebra tints the appendix date rows.
	colZebra = rgb{244, 248, 254}

	colGood   = rgb{30, 158, 106} // --color-success
	colWarn   = rgb{201, 138, 0}  // amber, new: the web palette has no warning step
	colDanger = rgb{214, 69, 69}  // --color-danger

	// Couple series: the same hue at two lightness steps, so the pair stays
	// distinct under every color-vision deficiency and in grayscale print.
	colMe      = colNavy
	colPartner = rgb{100, 181, 246}

	// Masthead-only tints for text set on the dark gradient.
	colOnDarkSoft  = rgb{185, 220, 251}
	colOnDarkMuted = rgb{143, 179, 224}
)

func statusColor(s Status) rgb {
	switch s {
	case StatusGood:
		return colGood
	case StatusWarn:
		return colWarn
	case StatusDanger:
		return colDanger
	default:
		return colAzure
	}
}

func ownerColor(o Owner) rgb {
	if o == OwnerPartner {
		return colPartner
	}
	return colMe
}

// Font weights, each registered as its own fpdf family (see assets.go).
type weight string

const (
	weightRegular   weight = "pjs"
	weightMedium    weight = "pjs-medium"
	weightSemiBold  weight = "pjs-semibold"
	weightBold      weight = "pjs-bold"
	weightExtraBold weight = "pjs-extrabold"
)

// Type scale, in points.
const (
	sizeHero     = 30.0
	sizeMasthead = 24.0
	sizeTitle    = 13.0
	sizeStat     = 13.0
	sizeBody     = 9.0
	sizeSubtitle = 8.5
	sizeTable    = 8.0
	sizeLabel    = 7.5
	sizeCaption  = 6.8
)

// Page geometry, in millimetres. A4 portrait with an 18mm side margin leaves
// a 174mm measure; everything snaps to 2mm steps.
const (
	pageW         = 210.0
	pageH         = 297.0
	marginX       = 18.0
	contentW      = pageW - 2*marginX
	contentTop    = 26.0  // first content line on pages after the masthead
	contentBottom = 276.0 // nothing but the footer goes below this
	mastheadH     = 50.0

	hairline = 0.2
	ptToMM   = 0.3528
)
