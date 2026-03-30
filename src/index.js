require('dotenv').config();
const express = require('express');
const receiptRouter = require('./routes/receipt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/', receiptRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'struk-reader-api', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Struk Reader API running on http://localhost:${PORT}`);
});
