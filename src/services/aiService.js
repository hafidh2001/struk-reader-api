const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * Fallback ke OpenAI Vision jika OCR confidence rendah.
 * Prompt difokuskan HANYA pada ekstraksi data mentah — TIDAK ada logika bisnis.
 * Token lebih hemat dibanding prompt lama di Plansys.
 */
async function extract(imageBuffer, mimetype = 'image/jpeg') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY tidak di-set. Tidak bisa fallback ke AI.');
  }

  const base64 = imageBuffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'system',
        content: `Kamu adalah OCR engine. Baca struk belanja dan ekstrak data berikut.
Kembalikan HANYA JSON, tanpa penjelasan apapun.
Format output:
{
  "NAMA_TOKO": "string atau null",
  "GRAND_TOTAL": number atau null,
  "NOMOR_INVOICE": "string atau null",
  "TANGGAL_INVOICE": "YYYY-MM-DD HH:mm:ss atau null"
}
Jika data tidak terbaca atau blur → isi null.
Jangan menebak. Jangan tambahkan field lain.`
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          { type: 'text', text: 'Ekstrak data dari struk ini.' }
        ]
      }
    ]
  });

  const raw = response.choices[0]?.message?.content || '';

  try {
    // Strip markdown code fences jika ada
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      NAMA_TOKO: parsed.NAMA_TOKO || '',
      GRAND_TOTAL: parsed.GRAND_TOTAL || '',
      NOMOR_INVOICE: parsed.NOMOR_INVOICE || '',
      TANGGAL_INVOICE: parsed.TANGGAL_INVOICE || ''
    };
  } catch {
    // Jika JSON tidak bisa di-parse, kembalikan empty
    return { NAMA_TOKO: '', GRAND_TOTAL: '', NOMOR_INVOICE: '', TANGGAL_INVOICE: '' };
  }
}

module.exports = { extract };
