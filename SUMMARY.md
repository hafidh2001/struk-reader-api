# 🧾 STRUK READER API — SUMMARY

## 🎯 TUJUAN UTAMA
Membuat **standalone REST API** terpisah dari Plansys PHP yang bertugas sebagai **image reader terfokus pada struk belanja (receipt)**.  
API ini memisahkan tanggung jawab:
1. **Struk Reader API** → ekstrak raw data dari gambar struk (OCR-first, AI-second)
2. **Plansys PHP** → menerima data terstruktur, lakukan validasi bisnis (cek tenant, is_mall, dsb), dan kembalikan output JSON final

---

## 🧩 ARSITEKTUR OVERVIEW

```
[Plansys PHP]
     │
     │  POST /read-receipt (multipart image)
     ▼
[Struk Reader API - Node.js/Python]
     │
     ├─ Step 1: Pre-process image (Jimp/Pillow)
     ├─ Step 2: OCR via Tesseract.js / pytesseract
     ├─ Step 3: Fallback → OpenAI Vision (jika OCR gagal/confidence rendah)
     ├─ Step 4: Parse & extract fields dari raw text
     └─ Return JSON terstruktur (raw extracted data)
     │
     ▼
[Plansys PHP] → validasi tenant, is_mall, status logic
     │
     ▼
[Final Output JSON ke Client]
```

---

## 📦 TECH STACK

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | **Node.js (Express)** | Cepat, ecosystem OCR bagus |
| OCR Engine | **Tesseract.js** | Open-source, no API cost, support bahasa Indonesia |
| Image Pre-process | **Sharp** | Resize, grayscale, contrast sebelum OCR |
| AI Fallback | **OpenAI GPT-4o mini** | Lebih murah dari GPT-4V, hanya dipakai jika OCR kurang |
| Confidence Check | Rule-based parser | Regex untuk total, invoice, tanggal |

---

## 📁 STRUKTUR PROJECT

```
struk-reader-api/
├── src/
│   ├── index.js              # Entry point Express server
│   ├── routes/
│   │   └── receipt.js        # POST /read-receipt
│   ├── services/
│   │   ├── preprocessor.js   # Image enhancement (Sharp)
│   │   ├── ocrService.js     # Tesseract OCR
│   │   ├── aiService.js      # OpenAI fallback
│   │   └── parser.js         # Extract fields dari raw text
│   └── utils/
│       └── confidence.js     # Hitung confidence score OCR result
├── sample/
│   └── struk.png             # Sample struk untuk testing
├── .env                      # OPENAI_API_KEY, PORT, OCR_CONFIDENCE_THRESHOLD
├── .env.example
├── package.json
└── README.md
```

---

## 🔄 FLOW DETAIL

```
POST /read-receipt
│
├─ [1] Terima image (multipart/form-data, field: "image")
│
├─ [2] Preprocessor (Sharp):
│       - Convert ke grayscale
│       - Tingkatkan contrast & sharpness
│       - Resize ke lebar optimal (1200px)
│
├─ [3] OCR (Tesseract.js):
│       - Lang: eng+ind
│       - Ekstrak raw text
│       - Hitung confidence score
│
├─ [4] Parser (Regex-based):
│       - NAMA_TOKO    → cari keyword umum toko
│       - GRAND_TOTAL  → pola: "TOTAL", "GRAND TOTAL", angka terakhir besar
│       - NOMOR_INV    → pola: "INV/", "NO.", alphanumeric dengan separator
│       - TANGGAL      → berbagai format tanggal, normalize ke Y-m-d H:i:s
│
├─ [5] Confidence Check:
│       - Jika confidence OCR >= threshold (misal 70%) → pakai hasil OCR
│       - Jika < threshold → fallback ke OpenAI Vision (hemat token)
│
└─ [6] Return Response:
{
  "source": "ocr" | "ai_fallback",
  "confidence": 85.3,
  "raw_text": "...",
  "extracted": {
    "NAMA_TOKO": "Solaria",
    "GRAND_TOTAL": 125000,
    "NOMOR_INVOICE": "INV/2024/001234",
    "TANGGAL_INVOICE": "2024-03-15 14:30:00"
  }
}
```

---

## 📤 OUTPUT JSON (dari Struk Reader API ke Plansys)

```json
{
  "source": "ocr",
  "confidence": 87.5,
  "raw_text": "SOLARIA\nJl. Contoh No.1\n...",
  "extracted": {
    "NAMA_TOKO": "Solaria",
    "GRAND_TOTAL": 125000,
    "NOMOR_INVOICE": "INV/2024/001234",
    "TANGGAL_INVOICE": "2024-03-15 14:30:00"
  }
}
```

Plansys PHP kemudian:
1. Match `NAMA_TOKO` ke table tenant → dapat `ID_OUTLET`
2. Cek apakah struk mengandung "CIPUTRA WORLD SURABAYA" → `IS_MALL`
3. Apply status rules (`SUCCESS` / `ERROR` / `FAILED`)
4. Return final JSON ke client

---

## 🚀 SETUP & RUN

```bash
# Install dependencies
npm install

# Copy env
cp .env.example .env
# → Edit OPENAI_API_KEY di .env (opsional, hanya untuk fallback)

# Run dev server
npm run dev

# Run production
npm start
```

Server berjalan di: `http://localhost:3000`

---

## 🧪 CONTOH cURL

### Basic (image dari file lokal)
```bash
curl -X POST http://localhost:3000/read-receipt \
  -F "image=@./sample/struk.png"
```

### Dengan verbose output
```bash
curl -X POST http://localhost:3000/read-receipt \
  -F "image=@./sample/struk.png" \
  -H "Accept: application/json" \
  -v
```

### Test health check
```bash
curl http://localhost:3000/health
```

---

## 📋 CHECKLIST PROGRESS

| Step | Status | Keterangan |
|---|---|---|
| [x] | ✅ DONE | SUMMARY.MD & arsitektur dirancang |
| [ ] | ⬜ TODO | Inisialisasi project Node.js (package.json) |
| [ ] | ⬜ TODO | Setup Express server (index.js) |
| [ ] | ⬜ TODO | Implementasi preprocessor.js (Sharp) |
| [ ] | ⬜ TODO | Implementasi ocrService.js (Tesseract.js) |
| [ ] | ⬜ TODO | Implementasi parser.js (regex extractor) |
| [ ] | ⬜ TODO | Implementasi confidence.js |
| [ ] | ⬜ TODO | Implementasi aiService.js (OpenAI fallback) |
| [ ] | ⬜ TODO | Implementasi route receipt.js |
| [ ] | ⬜ TODO | Buat .env.example |
| [ ] | ⬜ TODO | Testing dengan sample/struk.png |
| [ ] | ⬜ TODO | Dokumentasi integrasi ke Plansys PHP |

---

## 💡 PROMPT LANJUTAN (Copy-paste untuk melanjutkan)

```
Lanjutkan project struk-reader-api dari SUMMARY.MD.
Step berikutnya: [sebutkan step yang ingin dikerjakan, contoh: "implementasi ocrService.js"]
Context: Node.js Express, Tesseract.js untuk OCR, Sharp untuk preprocessing, OpenAI sebagai fallback.
```

---

*Last updated: 2026-03-30*
