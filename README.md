# Struk Reader API

Standalone REST API untuk membaca struk belanja dari gambar menggunakan OCR (Tesseract.js) dengan fallback OpenAI Vision.

## Setup

```bash
npm install
cp .env.example .env
# Edit OPENAI_API_KEY di .env (opsional)
npm run dev
```

## Endpoint

### `POST /read-receipt`
- **Content-Type**: `multipart/form-data`
- **Field**: `image` (file gambar: jpg, png, webp)

**Response:**
```json
{
  "source": "ocr",
  "confidence": 87.5,
  "raw_text": "SOLARIA\nJl. Contoh...",
  "extracted": {
    "NAMA_TOKO": "Solaria",
    "GRAND_TOTAL": 125000,
    "NOMOR_INVOICE": "INV/2024/001234",
    "TANGGAL_INVOICE": "2024-03-15 14:30:00"
  }
}
```

### `GET /health`
Cek status server.

## cURL Sample

```bash
curl -X POST http://localhost:3000/read-receipt \
  -F "image=@./sample/struk.png"
```

## Integrasi Plansys PHP

```php
function checkReceiptByStukReader($imagePath) {
    $ch = curl_init('http://localhost:3000/read-receipt');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        'image' => new CURLFile($imagePath)
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    $extracted = $data['extracted'];

    // Validasi bisnis di sini (match tenant, is_mall, status)
    $idOutlet = matchTenant($extracted['NAMA_TOKO']); // query ke XOpenAiConf / tenant table
    $isMall   = checkIsMall($data['raw_text']);        // cari "CIPUTRA WORLD SURABAYA"

    $status = 'FAILED';
    if ($idOutlet !== -1 && $extracted['GRAND_TOTAL'] && $extracted['NOMOR_INVOICE'] && $extracted['TANGGAL_INVOICE'] && $isMall) {
        $status = 'SUCCESS';
    } elseif ($idOutlet !== -1 || $extracted['GRAND_TOTAL'] || $extracted['NOMOR_INVOICE']) {
        $status = 'ERROR';
    }

    return [
        'STATUS'          => $status,
        'ID_OUTLET'       => $idOutlet,
        'GRAND_TOTAL'     => $extracted['GRAND_TOTAL'] ?? '',
        'NOMOR_INVOICE'   => $extracted['NOMOR_INVOICE'] ?? '',
        'TANGGAL_INVOICE' => $extracted['TANGGAL_INVOICE'] ?? '',
        'is_mall'         => $isMall
    ];
}
```
