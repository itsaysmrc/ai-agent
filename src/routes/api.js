// src/routes/api.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const dotenv = require('dotenv');
const { routeMessage, generateFastResponse } = require('../services/aiService');
const { transcribeAudio, synthesizeSpeech } = require('../services/voiceService');
const { AGENTS } = require('../config/agents');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/agents', (req, res) => res.json(AGENTS));

// 1. Yönlendirici
router.post('/route', async (req, res) => {
  try {
    const decision = await routeMessage(req.body.text || '');
    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Sesten Metne (STT - Groq Whisper)
router.post('/stt', upload.single('audio'), async (req, res) => {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
    if (!req.file) return res.status(400).json({ error: 'Ses dosyası bulunamadı.' });
    
    const groqKey = (req.body.userKey && req.body.userKey.startsWith('gsk_'))
      ? req.body.userKey.trim()
      : (process.env.GROQ_API_KEY || '').replace(/["']/g, '').trim();

    const text = await transcribeAudio(req.file.buffer, req.file.mimetype, groqKey);
    res.json({ text });
  } catch (error) {
    console.error('[STT HATA]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 3. Metinden Doğal Sese (TTS - Neural MP3)
router.post('/tts', async (req, res) => {
  try {
    const { text, voice, elevenKey, elevenVoiceId } = req.body;
    const audioBuffer = await synthesizeSpeech({
      text,
      voice: voice || 'tr-TR-AhmetNeural',
      elevenKey,
      elevenVoiceId
    });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (error) {
    console.error('[TTS HATA]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 4. Sohbet ve Görsel Analiz
router.post('/chat', upload.single('image'), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { domain, text, history, depth, profile, userKey, isVoiceMode } = req.body;

    // Canlı ses modundaysa asistanın tıpkı gerçek bir insanla telefonda konuşuyormuş gibi akıcı ve öz konuşmasını sağla
    const voiceHint = isVoiceMode === 'true'
      ? 'Şu an kullanıcıyla birebir canlı sesli sohbettesin. Madde işaretleri veya uzun listeler kullanma; karşında yakın bir arkadaşın varmış gibi doğal, sıcak, akıcı ve 2-3 cümleyi geçmeyecek şekilde konuş.'
      : '';

    const fullReply = await generateFastResponse({
      domain: domain || 'gunluk',
      text: text || '',
      history: history || '',
      depth: isVoiceMode === 'true' ? 'hizli' : (depth || 'dengeli'),
      profile: [profile, voiceHint].filter(Boolean).join(' '),
      imageFile: req.file,
      customUserKey: userKey
    });

    const words = fullReply.split(' ');
    let currentText = '';
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i];
      res.write(`data: ${JSON.stringify({ text: currentText, delta: words[i] })}\n\n`);
      await new Promise(r => setTimeout(r, 14));
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

module.exports = router;