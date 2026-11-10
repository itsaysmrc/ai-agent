// src/services/searchService.js
// Sıfır maliyetli Canlı Web Araştırması (Wikipedia TR/EN + DuckDuckGo Instant Answer + Opsiyonel n8n Webhook)

async function performWebResearch(query) {
  const cleanQuery = (query || '').replace(/[?.,!]/g, '').trim();
  if (cleanQuery.length < 4) return '';

  const results = [];

  // 1. Türkçe Wikipedia Canlı Bilgi Araması (Ödev, kavram, tarih, bilim ve genel kültür için)
  try {
    const wikiUrl = `https://tr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&srlimit=2`;
    const res = await fetch(wikiUrl, { headers: { 'User-Agent': 'KararKuresiAI/2.0' } });
    if (res.ok) {
      const data = await res.json();
      const items = data?.query?.search || [];
      items.forEach(item => {
        const snippet = item.snippet.replace(/<\/?[^>]+(>|$)/g, '');
        results.push(`[Kaynak: Wikipedia - ${item.title}]: ${snippet}`);
      });
    }
  } catch (err) {
    // Sessizce geç
  }

  // 2. DuckDuckGo Anlık Bilgi Motoru
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1`;
    const res = await fetch(ddgUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.AbstractText) {
        results.push(`[Kaynak: ${data.AbstractSource || 'Web'}]: ${data.AbstractText}`);
      }
    }
  } catch (err) {
    // Sessizce geç
  }

  // 3. Eğer .env içinde N8N_WEBHOOK_URL tanımlıysa dış otomasyon görevini tetikle
  if (process.env.N8N_WEBHOOK_URL) {
    try {
      const n8nRes = await fetch(process.env.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanQuery, timestamp: new Date().toISOString() })
      });
      if (n8nRes.ok) {
        const n8nText = await n8nRes.text();
        results.push(`[n8n Otomasyon Çıktısı]: ${n8nText.slice(0, 500)}`);
      }
    } catch (err) {
      console.warn('[n8n Uyarı]: Webhook yanıt vermedi.');
    }
  }

  return results.length > 0
    ? `\n\n--- CANLI ARAŞTIRMA BULGULARI (Yanıtında bu güncel bilgileri kullan) ---\n${results.join('\n')}\n----------------------------------------------------------------------\n`
    : '';
}

module.exports = { performWebResearch };