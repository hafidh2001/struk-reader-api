const sharp = require('sharp');

/**
 * Enhance image untuk meningkatkan akurasi OCR:
 * - Resize ke lebar optimal
 * - Grayscale
 * - Tingkatkan kontras & ketajaman
 * - Normalize brightness
 */
async function enhance(buffer) {
  return sharp(buffer)
    .resize({ width: 1400, withoutEnlargement: false }) // resize agar teks cukup besar
    .grayscale()                                         // hitam putih
    .normalize()                                         // auto-normalize brightness
    .sharpen({ sigma: 1.5 })                            // tajamkan tepi teks
    .linear(1.3, -30)                                   // tingkatkan kontras (gain, bias)
    .toBuffer();
}

module.exports = { enhance };
