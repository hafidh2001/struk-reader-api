const Tesseract = require('tesseract.js');

/**
 * Jalankan OCR pada image buffer.
 * Mengembalikan { text, confidence }
 * confidence: 0-100 (rata-rata confidence per karakter dari Tesseract)
 */
async function extract(imageBuffer) {
  const { data } = await Tesseract.recognize(imageBuffer, 'eng+ind', {
    // Kurangi logging Tesseract di console
    logger: () => {}
  });

  return {
    text: data.text || '',
    confidence: data.confidence || 0
  };
}

module.exports = { extract };
