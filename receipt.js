const express = require('express');
const multer = require('multer');
const router = express.Router();
const preprocessor = require('../services/preprocessor');
const ocrService = require('../services/ocrService');
const aiService = require('../services/aiService');
const parser = require('../services/parser');
const { isConfident } = require('../utils/confidence');

// Multer: terima image dari memory (tidak simpan ke disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // max 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * POST /read-receipt
 * Field: image (multipart/form-data)
 * Returns: extracted receipt data (raw, sebelum validasi bisnis di Plansys)
 */
router.post('/read-receipt', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded. Use field name: image' });
  }

  try {
    // Step 1: Pre-process image (grayscale, contrast, resize)
    const processedBuffer = await preprocessor.enhance(req.file.buffer);

    // Step 2: OCR
    const ocrResult = await ocrService.extract(processedBuffer);

    let source = 'ocr';
    let extracted;

    // Step 3: Cek confidence, fallback ke AI jika rendah
    if (isConfident(ocrResult.confidence)) {
      extracted = parser.parse(ocrResult.text);
    } else {
      console.log(`⚠️  OCR confidence rendah (${ocrResult.confidence.toFixed(1)}%), fallback ke AI...`);
      extracted = await aiService.extract(req.file.buffer, req.file.mimetype);
      source = 'ai_fallback';
    }

    return res.json({
      source,
      confidence: parseFloat(ocrResult.confidence.toFixed(1)),
      raw_text: ocrResult.text,
      extracted
    });

  } catch (err) {
    console.error('Error reading receipt:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
