// src/services/voiceService.js
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

// 1. GROQ WHISPER İLE SESTEN METNE (STT - Mobil & Masaüstü %100 Uyumlu)
async function transcribeAudio(audioBuffer, mimeType, groqKey) {
  if (!groqKey || !groqKey.startsWith('gsk_')) {
    throw new Error('Ses tanıma için geçerli bir GROQ_API_KEY gerekiyor.');
  }

  const formData = new FormData();
  const ext = mimeType && mimeType.includes('mp4') ? 'm4a' : 'webm';
  const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
  
  formData.append('file', blob, `voice.${ext}`);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('temperature', '0');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}` },
    body: formData
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper Hatası: ${err.slice(0, 120)}`);
  }

  const data = await response.json();
  return (data.text || '').trim();
}

// 2. DOĞAL NÖRAL SES ÜRETİMİ (Edge Neural TTS + Opsiyonel ElevenLabs)
async function synthesizeSpeech({ text, voice = 'tr-TR-AhmetNeural', elevenKey, elevenVoiceId }) {
  // Markdown ve kod bloklarını temizle ki asistan doğal okusun
  const cleanText = (text || '')
    .replace(/```[\s\S]*?```/g, ' Kod bloğu ekranda yer alıyor. ')
    .replace(/[*#`_~>|]/g, '')
    .replace(/https?:\/\/\S+/g, ' bağlantı ')
    .trim();

  if (!cleanText) throw new Error('Seslendirilecek metin boş.');

  // A. Eğer ElevenLabs anahtarı tanımlıysa ultra gerçekçi özel sesi kullan
  const elKey = elevenKey || process.env.ELEVENLABS_API_KEY;
  const elVoice = elevenVoiceId || process.env.ELEVENLABS_VOICE_ID || 'dn9HtxgDwCH96MVX9iAO';

  if (elKey && elKey.length > 15) {
    try {
      const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elKey.trim(),
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText.slice(0, 1000),
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 }
        })
      });
      if (elRes.ok) {
        const arrayBuf = await elRes.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (e) {
      console.warn('[SES UYARI]: ElevenLabs atlandı, ücretsiz Nöral Sese geçiliyor...');
    }
  }

  // B. Ücretsiz, Kotasız Microsoft Edge Neural TTS (Ahmet / Emel)
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(cleanText.slice(0, 1800));

  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on('data', chunk => chunks.push(chunk));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', err => reject(err));
  });
}

module.exports = { transcribeAudio, synthesizeSpeech };