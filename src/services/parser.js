/**
 * parser.js
 * Ekstrak field-field struk dari raw OCR text menggunakan regex.
 * Output: { NAMA_TOKO, GRAND_TOTAL, NOMOR_INVOICE, TANGGAL_INVOICE }
 *
 * Catatan: parser ini menghasilkan data MENTAH.
 * Validasi bisnis (tenant match, is_mall, status) dilakukan di Plansys PHP.
 */

/**
 * Normalisasi tanggal ke format Y-m-d H:i:s
 * Mendukung berbagai format umum struk Indonesia
 */
function parseDate(text) {
  const lines = text.split('\n');

  // Pola-pola tanggal yang umum di struk Indonesia
  const patterns = [
    // 2024-03-15 14:30:00
    {
      re: /(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/,
      build: (m) => `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`
    },
    // 15-03-2024 14:30
    {
      re: /(\d{2})[\/\-](\d{2})[\/\-](\d{4})[\s,]+(\d{2}):(\d{2})(?::(\d{2}))?/,
      build: (m) => `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}:${m[6] || '00'}`
    },
    // 15/03/2024
    {
      re: /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
      build: (m) => `${m[3]}-${m[2]}-${m[1]} 00:00:00`
    },
    // 15-Mar-2024
    {
      re: /(\d{1,2})[\-\s](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\-\s](\d{4})/i,
      build: (m) => {
        const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                         jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
        const mm = months[m[2].toLowerCase()];
        const dd = m[1].padStart(2, '0');
        return `${m[3]}-${mm}-${dd} 00:00:00`;
      }
    },
    // Mar-15-2024
    {
      re: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\-\s\/](\d{1,2})[\-\s\/](\d{4})/i,
      build: (m) => {
        const months = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',
                         jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };
        const mm = months[m[1].toLowerCase()];
        const dd = m[2].padStart(2, '0');
        return `${m[3]}-${mm}-${dd} 00:00:00`;
      }
    }
  ];

  for (const line of lines) {
    for (const { re, build } of patterns) {
      const m = line.match(re);
      if (m) return build(m);
    }
  }

  return '';
}

/**
 * Ekstrak GRAND TOTAL
 * Cari baris yang mengandung keyword total/grand total, ambil angka terbesar di sana
 */
function parseGrandTotal(text) {
  const lines = text.split('\n');

  const totalKeywords = /grand\s*total|total\s*bayar|total\s*transaksi|total\s*pembayaran|jumlah\s*bayar|total\s*harga|amount\s*due|^total/i;

  for (const line of lines) {
    if (totalKeywords.test(line)) {
      // Ambil semua angka di baris ini (bisa ada titik/koma sebagai pemisah ribuan)
      const numbers = line.match(/[\d]{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?/g);
      if (numbers && numbers.length > 0) {
        // Ambil angka terbesar
        const parsed = numbers
          .map(n => parseFloat(n.replace(/[.,\s]/g, '')))
          .filter(n => !isNaN(n) && n > 0);
        if (parsed.length > 0) return Math.max(...parsed);
      }
    }
  }

  // Fallback: ambil angka terbesar dari seluruh struk (kemungkinan besar adalah total)
  const allNumbers = (text.match(/\b\d{4,}\b/g) || []).map(Number).filter(n => n > 0);
  return allNumbers.length > 0 ? Math.max(...allNumbers) : '';
}

/**
 * Ekstrak NOMOR INVOICE
 * Pola umum: INV/xxx, NO.xxx, RECEIPT#xxx, TRX-xxx, dll
 */
function parseInvoice(text) {
  const patterns = [
    /(?:no\.?\s*(?:invoice|inv|struk|receipt|faktur|transaksi|nota)|invoice\s*no\.?|receipt\s*(?:no\.?|#)|trx[\s\-]?no\.?|nomor\s*(?:nota|struk|invoice))\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/\.]+)/i,
    /\b(INV[\/\-][A-Z0-9\-\/\.]+)/i,
    /\b(TRX[\/\-\s][A-Z0-9\-\/\.]+)/i,
    /\b(RCP[\/\-][A-Z0-9\-\/\.]+)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }

  return '';
}

/**
 * Ekstrak NAMA TOKO
 * Biasanya ada di baris pertama/kedua struk, sebelum alamat
 * Kembalikan beberapa kandidat, biarkan Plansys PHP yang match ke daftar tenant
 */
function parseNamaToko(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Skip baris yang jelas bukan nama toko
  const skipPatterns = /^\d|tel|phone|fax|http|www|jl\.|jalan|no\.|invoice|struk|receipt|tanggal|date|kasir|cashier|customer|pelanggan/i;

  // Ambil 5 baris pertama sebagai kandidat nama toko
  const candidates = lines.slice(0, 5).filter(l => l.length > 2 && !skipPatterns.test(l));

  return candidates[0] || '';
}

/**
 * Main parse function
 */
function parse(rawText) {
  return {
    NAMA_TOKO: parseNamaToko(rawText),
    GRAND_TOTAL: parseGrandTotal(rawText),
    NOMOR_INVOICE: parseInvoice(rawText),
    TANGGAL_INVOICE: parseDate(rawText)
  };
}

module.exports = { parse };
