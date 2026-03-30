/**
 * Cek apakah confidence OCR cukup untuk dipercaya.
 * Threshold diambil dari .env (default 65)
 */
function isConfident(confidence) {
  const threshold = parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '65');
  return confidence >= threshold;
}

module.exports = { isConfident };
