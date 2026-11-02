package pdfreport

import (
	"bytes"
	_ "embed"

	"github.com/go-pdf/fpdf"
)

// Plus Jakarta Sans is the web app's typeface; the static instances come from
// the upstream tokotype/PlusJakartaSans repo (SIL OFL 1.1, see
// assets/fonts/OFL.txt). fpdf can't read variable fonts, and only knows the
// "", "B", "I", "BI" styles, so each weight is registered as its own family.

//go:embed assets/fonts/PlusJakartaSans-Regular.ttf
var fontRegular []byte

//go:embed assets/fonts/PlusJakartaSans-Medium.ttf
var fontMedium []byte

//go:embed assets/fonts/PlusJakartaSans-SemiBold.ttf
var fontSemiBold []byte

//go:embed assets/fonts/PlusJakartaSans-Bold.ttf
var fontBold []byte

//go:embed assets/fonts/PlusJakartaSans-ExtraBold.ttf
var fontExtraBold []byte

//go:embed assets/logo.png
var logoPNG []byte

const logoImage = "duitkita-logo"

func registerAssets(pdf *fpdf.Fpdf) {
	pdf.AddUTF8FontFromBytes(string(weightRegular), "", fontRegular)
	pdf.AddUTF8FontFromBytes(string(weightMedium), "", fontMedium)
	pdf.AddUTF8FontFromBytes(string(weightSemiBold), "", fontSemiBold)
	pdf.AddUTF8FontFromBytes(string(weightBold), "", fontBold)
	pdf.AddUTF8FontFromBytes(string(weightExtraBold), "", fontExtraBold)
	pdf.RegisterImageOptionsReader(logoImage, fpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(logoPNG))
}
