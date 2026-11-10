// src/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { AGENTS } = require('./config/agents');
const apiRoutes = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// API Rotalarını Bağla (/api/route, /api/chat, /api/agents)
app.use('/api', apiRoutes);

// Sağlık Kontrolü
app.get('/api/health', (req, res) => {
  res.json({
    status: 'AKTİF',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'buraya_key_gelecek'),
    activeAgents: Object.keys(AGENTS).map(key => ({
      id: key,
      short: AGENTS[key].short,
      label: AGENTS[key].label
    }))
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 KARAR KÜRESİ BACKEND v2 (AI MOTORU AKTİF)`);
  console.log(`📡 Sunucu Adresi : http://localhost:${PORT}`);
  console.log(`🩺 Sağlık Testi  : http://localhost:${PORT}/api/health`);
  console.log('==================================================');
});