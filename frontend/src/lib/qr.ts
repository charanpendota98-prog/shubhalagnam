/**
 * 🔒 Contact QR — renders a short-lived single-use contact token as an SVG QR.
 * The QR encodes ONLY a resolve URL on this site; it never contains a phone
 * number or any member data. The bundled `qrcode` package builds the SVG
 * client-side (no network, no external service).
 */
import QRCode from "qrcode";

export async function contactQrSvg(text: string, width = 220): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width,
    color: { dark: "#1c1917", light: "#ffffff" },
  });
}
