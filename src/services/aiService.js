// src/services/aiService.js
const path = require('path');
const dotenv = require('dotenv');
const { AGENTS, COMMON_PROMPT } = require('../config/agents');
const { performWebResearch } = require('./searchService');

let cachedGroqTextModels = null;
let cachedGroqVisionModels = null;

// 1. ANLIK YÖNLENDİRİCİ (0 ms Gecikme + Çoklu Dil ve Görev Algılama)
async function routeMessage(text) {
  const startTime = Date.now();
  const t = (text || '').toLowerCase();

  let result = { domain: 'gunluk', confidence: 0.88, alt: 'proje', risk: 'düşük', reason: 'Genel sohbet ve kişisel asistan' };

  if (/siber|güvenlik|hack|ctf|port|şifre|zafiyet|exploit|osint|ağ|wifi|wi-fi|firewall|log|saldırı|kriptografi|cyber|security/.test(t)) {
    result = { domain: 'siber', confidence: 0.94, alt: 'yazilim', risk: 'düşük', reason: 'Siber güvenlik ve ağ analizi odağı' };
  } else if (/kod|python|javascript|node|react|html|css|java|c#|hata|bug|api|sql|docker|git|yazılım|algoritma|fonksiyon|code|script/.test(t)) {
    result = { domain: 'yazilim', confidence: 0.95, alt: 'proje', risk: 'düşük', reason: 'Yazılım geliştirme ve mimari talebi' };
  } else if (/ödev|ders|sınav|matematik|denklem|laplace|integral|türev|fizik|kimya|makale|tez|çeviri|ingilizce|almanca|fransızca|öğrenci|soru|araştır|nedir|kimdir/.test(t)) {
    result = { domain: 'akademi', confidence: 0.93, alt: 'proje', risk: 'düşük', reason: 'Akademik eğitim, dil ve araştırma' };
  } else if (/proje|plan|görev|staj|rapor|sunum|takvim|aşama|yönetim|iş akışı|hedef|strateji|analiz|tablo/.test(t)) {
    result = { domain: 'proje', confidence: 0.91, alt: 'gunluk', risk: 'düşük', reason: 'Proje planlama ve görev analizi' };
  }

  result.latency = Math.max(1, Date.now() - startTime);
  return result;
}

// GROQ AÇIK MODELLERİ OTOMATİK KEŞFET
async function discoverGroqModels(groqKey) {
  if (cachedGroqTextModels && cachedGroqTextModels.length > 0) {
    return { textModels: cachedGroqTextModels, visionModels: cachedGroqVisionModels };
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${groqKey}` }
    });
    const data = await res.json();
    const allIds = (data.data || [])
      .map(m => m.id)
      .filter(id => !/whisper|tts|playai|guard|prompt-guard|embed|orpheus/i.test(id));

    console.log('🔍 [GROQ KEŞİF] Aktif sohbet modelleri:', allIds);

    cachedGroqVisionModels = allIds.filter(id => /vision|scout|maverick|pixtral|llava/i.test(id));
    if (cachedGroqVisionModels.length === 0) cachedGroqVisionModels = allIds;

    cachedGroqTextModels = allIds.sort((a, b) => {
      const score = id => (/qwen|llama|deepseek|gemma/i.test(id) ? 10 : 0) + (/70b|32b|27b|90b|120b/i.test(id) ? 5 : 0);
      return score(b) - score(a);
    });

    return { textModels: cachedGroqTextModels, visionModels: cachedGroqVisionModels };
  } catch (err) {
    return { textModels: [], visionModels: [] };
  }
}

async function callGroq({ systemInstruction, userPrompt, imageFile, groqKey }) {
  const { textModels, visionModels } = await discoverGroqModels(groqKey);
  const modelsToTry = (imageFile ? visionModels : textModels).slice(0, 4);

  for (const model of modelsToTry) {
    try {
      console.log(`[GROQ İSTEK] Denenen Model: ${model}`);
      let userContent = userPrompt;

      if (imageFile && imageFile.buffer) {
        const base64Image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
        userContent = [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: base64Image } }
        ];
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userContent }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!response.ok) continue;

      const data = await response.json();
      let reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        console.log(`⚡ [GROQ BAŞARILI] ${model} ışık hızında yanıt verdi!`);
        return reply;
      }
    } catch (err) {
      console.warn(`[GROQ HATA] ${model}: ${err.message}`);
    }
  }
  return null;
}

async function callGemini({ systemInstruction, userPrompt, imageFile, geminiKey }) {
  const models = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-flash-latest'];
  const parts = [];
  if (imageFile && imageFile.buffer) {
    parts.push({
      inline_data: { mime_type: imageFile.mimetype, data: imageFile.buffer.toString('base64') }
    });
  }
  parts.push({ text: `${systemInstruction}\n\n${userPrompt}` });

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7 } })
      });
      if (!response.ok) continue;
      const data = await response.json();
      const candidateParts = data?.candidates?.[0]?.content?.parts || [];
      const reply = candidateParts.map(p => p.text || '').join('').trim();
      if (reply) return reply;
    } catch (err) {}
  }
  return null;
}

// 2. ANA YANIT MOTORU (Web Araştırması + Görsel + Çoklu Dil)
async function generateFastResponse({ domain, text, history, depth, profile, imageFile, customUserKey }) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

  const agent = AGENTS[domain] || AGENTS.gunluk;
  const depthHints = {
    hizli: 'Çok kısa ve net cevap ver (1-3 cümle).',
    dengeli: 'Doğal, samimi, düzenli ve dengeli uzunlukta cevap ver.',
    derin: 'Konuyu adım adım, akademik/teknik derinlikle, başlıklar ve örneklerle detaylıca açıkla.'
  };

  // Eğer kullanıcı "araştır, nedir, kimdir, analiz et" dediyse veya Akademi ajanındaysa canlı web araması yap
  let webContext = '';
  if (domain === 'akademi' || /araştır|nedir|kimdir|tarihi|hakkında bilgi|analiz et/i.test(text || '')) {
    webContext = await performWebResearch(text);
  }

  const systemInstruction = [
    agent.sys,
    COMMON_PROMPT,
    depthHints[depth] || depthHints.dengeli,
    profile ? `Kullanıcı Notu: ${profile}` : ''
  ].filter(Boolean).join(' ');

  const userPrompt = `${history ? `Önceki Konuşma:\n${history}\n\n` : ''}${webContext}Kullanıcı: ${text || 'Bu görseli detaylıca analiz et ve açıkla.'}`;

  const clean = val => (val || '').replace(/["']/g, '').trim();
  const groqKey = (customUserKey && customUserKey.startsWith('gsk_')) ? clean(customUserKey) : clean(process.env.GROQ_API_KEY);
  const geminiKey = (customUserKey && !customUserKey.startsWith('gsk_')) ? clean(customUserKey) : clean((process.env.GEMINI_API_KEY || '').split(',')[0]);

  // Eğer fotoğraf yüklendiyse ve Gemini varsa önce Gemini'yi, yoksa Groq Vision'ı kullan; metinde ise direkt Groq!
  if (groqKey && groqKey.startsWith('gsk_')) {
    const groqReply = await callGroq({ systemInstruction, userPrompt, imageFile, groqKey });
    if (groqReply) return groqReply;
  }

  if (geminiKey && geminiKey.length > 20 && !geminiKey.includes('buraya')) {
    const geminiReply = await callGemini({ systemInstruction, userPrompt, imageFile, geminiKey });
    if (geminiReply) return geminiReply;
  }

  throw new Error('Yanıt alınamadı.');
}

module.exports = { routeMessage, generateFastResponse };