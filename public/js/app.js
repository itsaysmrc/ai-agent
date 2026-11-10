// public/js/app.js
(function() {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = document.documentElement;

  const D = {
    siber:   { label: 'Siber Güvenlik', short: 'SİBER',   lon: 0,   desc: 'Savunma, CTF, ağ ve güvenlik analizi', sug: 'Evdeki Wi-Fi ağımın güvenliğini nasıl test ederim?' },
    yazilim: { label: 'Yazılım & Mimari', short: 'YAZILIM', lon: 72,  desc: 'Kodlama, hata ayıklama, sistem mimarisi', sug: 'Node.js ile WebSocket sunucusu nasıl kurulur?' },
    akademi: { label: 'Akademi & Ödev', short: 'AKADEMİ', lon: 144, desc: 'Ders, ödev, araştırma, makale, yabancı dil', sug: 'Diferansiyel denklemlerde Laplace dönüşümünü örneklerle anlat' },
    proje:   { label: 'Proje & Görev',  short: 'PROJE',   lon: 216, desc: 'Planlama, iş bölümü, rapor ve sunum', sug: 'Bitirme projem için 4 haftalık çalışma ve görev tablosu çıkar' },
    gunluk:  { label: 'Günlük Hayat',   short: 'GÜNLÜK',  lon: 288, desc: 'Organizasyon, pratik analiz, genel sohbet', sug: 'Verimli çalışmak ve odaklanmak için günlük rutin oluştur' }
  };
  const KEYS = Object.keys(D);
  const DEPTH = { hizli: 'Hızlı', dengeli: 'Dengeli', derin: 'Derin' };
  const NAME = { siber: 'Siber', yazilim: 'Yazılım', akademi: 'Akademi', proje: 'Proje', gunluk: 'Günlük' };

  /* ---------- AJAN TEMALARI (küre renkleri; arayüz renkleri style.css'te) ---------- */
  const PAL = {
    oto:     { acc: [191,233,220], alt: [150,135,205], pale: [214,226,232], lacc: [69,110,98] },
    siber:   { acc: [138,180,248], alt: [60,100,190],  pale: [190,215,255], lacc: [47,102,201] },
    yazilim: { acc: [255,92,106],  alt: [160,40,60],   pale: [255,205,208], lacc: [192,40,58] },
    akademi: { acc: [180,167,255], alt: [110,95,200],  pale: [225,220,255], lacc: [91,70,214] },
    proje:   { acc: [230,240,77],  alt: [150,160,40],  pale: [245,248,190], lacc: [125,125,8] },
    gunluk:  { acc: [255,185,138], alt: [200,120,90],  pale: [255,230,215], lacc: [181,98,42] }
  };
  const THEME_BG = { oto: '#07090c', siber: '#03060a', yazilim: '#0a0506', akademi: '#080913', proje: '#080804', gunluk: '#0b0807' };
  const PLACEHOLDER = {
    oto: 'Bir şey sor, düşüncelerini paylaş veya konuş...',
    siber: 'root@karar:~$ komut, ağ veya güvenlik sorusu yaz...',
    yazilim: 'Kod yaz, hata yapıştır veya mimari sor...',
    akademi: 'Ders, ödev veya araştırma sorusu yaz...',
    proje: 'Plan, görev tablosu veya rapor iste...',
    gunluk: 'Günlük hayat, organizasyon veya sohbet...'
  };
  const col = { a: [191,233,220], v: [150,135,205], p: [214,226,232] };
  const SEND_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  const STOP_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>';

  const cfg = { gate: 0.80, depth: 'dengeli', profile: '', userKey: '', voice: 'tr-TR-AhmetNeural', lock: null, telemetry: false };
  const state = { cur: null, busy: false, streaming: false, ctl: null, msgs: [], decs: [], imageFile: null, liveVoice: false, audioEnergy: 0 };

  $('tabs').innerHTML = KEYS.map(k => `<span class="tab" data-k="${k}">${D[k].short}</span>`).join('');
  $('agents').innerHTML = KEYS.map(k => `
    <button class="ag" type="button" data-k="${k}">
      <span class="dot"></span><b>${D[k].short}</b><span class="lk">OTO</span>
      <small>${D[k].desc}</small>
    </button>`).join('');
  $('segR').innerHTML =
    `<button type="button" data-r=""><i class="dot" style="--c:191,233,220"></i><span><b>Otomatik</b><small>Yönlendirici konuya göre seçer</small></span><em class="ck">✓</em></button>` +
    KEYS.map(k => `<button type="button" data-r="${k}"><i class="dot" style="--c:${PAL[k].acc.join(',')}"></i><span><b>${NAME[k]}</b><small>${D[k].desc}</small></span><em class="ck">✓</em></button>`).join('');
  $('segD').innerHTML = Object.keys(DEPTH).map(k => `<button type="button" data-d="${k}">${DEPTH[k]}</button>`).join('');

  function toast(t) {
    const d = document.createElement('div'); d.className = 'toast'; d.textContent = t;
    $('toasts').appendChild(d); setTimeout(() => d.remove(), 2800);
  }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ---------- MARKDOWN + KOD BLOĞU ŞABLONU ---------- */
  const RUNNABLE = { js: 1, javascript: 1, html: 1, python: 1, py: 1 };

  function codeBlock(b) {
    const lang = b.lang || 'metin';
    const run = !b.open && RUNNABLE[b.lang]
      ? '<button type="button" class="run" data-cb="run">▶ Çalıştır</button>' : '';
    return `<div class="cb${b.open ? ' open' : ''}" data-lang="${esc(b.lang)}">
      <div class="cb-h"><span class="cb-lang">${esc(lang)}</span><span class="cb-sp"></span>
        <button type="button" data-cb="copy">Kopyala</button>
        <button type="button" data-cb="dl">İndir</button>${run}
      </div>
      <pre><code>${esc(b.code)}</code></pre>
      <div class="cb-out" hidden></div>
    </div>`;
  }

  function md(src) {
    const blocks = [];
    // Kod bloklarını önce ayır (akış sırasında kapanmamış blok da çalışır)
    let s = String(src).replace(/```([\w+#-]*)[ \t]*\n?([\s\S]*?)(```|$)/g, (m, lang, code, end) => {
      blocks.push({ lang: (lang || '').toLowerCase(), code: code.replace(/\n$/, ''), open: end !== '```' });
      return `\u0000B${blocks.length - 1}\u0000`;
    });
    s = esc(s);

    const inline = t => t
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    let html = '', list = null, para = [];
    const flushP = () => { if (para.length) { html += `<p>${inline(para.join('<br>'))}</p>`; para = []; } };
    const closeL = () => { if (list) { html += `</${list}>`; list = null; } };
    const openL = tag => { if (list !== tag) { closeL(); html += `<${tag}>`; list = tag; } };

    for (const raw of s.split('\n')) {
      const line = raw.trimEnd(); let m;
      if (!line.trim()) { flushP(); closeL(); continue; }
      if ((m = line.match(/^\u0000B(\d+)\u0000$/))) { flushP(); closeL(); html += codeBlock(blocks[+m[1]]); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.+)$/))) { flushP(); closeL(); const n = m[1].length + 1; html += `<h${n}>${inline(m[2])}</h${n}>`; continue; }
      if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flushP(); closeL(); html += '<hr>'; continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.+)$/))) { flushP(); openL('ul'); html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.+)$/))) { flushP(); openL('ol'); html += `<li>${inline(m[1])}</li>`; continue; }
      if ((m = line.match(/^&gt;\s?(.*)$/))) { flushP(); closeL(); html += `<blockquote>${inline(m[1])}</blockquote>`; continue; }
      closeL(); para.push(line);
    }
    flushP(); closeL();
    return html.replace(/\u0000B(\d+)\u0000/g, (_, i) => codeBlock(blocks[+i]));
  }

  // Sesli okumada kod bloklarını ve markdown işaretlerini atla
  function speakable(t) {
    return String(t)
      .replace(/```[\s\S]*?(```|$)/g, ' Kod ekranda. ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#>_]+/g, '')
      .replace(/\n{2,}/g, '. ')
      .trim();
  }

  function hms() { return new Date().toTimeString().slice(0, 8); }
  const STEPS = $('pipe').children;
  function pipeReset() { for (let i=0; i<5; i++) { STEPS[i].className=''; STEPS[i].querySelector('em').textContent='—'; } }
  function pipe(i, st, txt) { STEPS[i].className = st; if (txt != null) STEPS[i].querySelector('em').textContent = txt; }
  function setStatus(t, k) { $('statusT').textContent = t; $('status').className = 'pill ' + (k||''); }

  /* ---------- 3D KÜRE VE GERÇEK ZAMANLI SES FREKANS MOTORU ---------- */
  const cv = $('globe'), g = cv.getContext('2d');
  let GW = 0, GH = 0, DPR = 1, yaw = 0, pitch = 0.36, roll = 0, userZoom = 1, cam = 1, camT = 1, focus = null, activity = 0, yawKick = 0;
  const DEG = Math.PI / 180, TAU = Math.PI * 2, PI = Math.PI;
  function gsize() {
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    GW = r.width; GH = r.height;
    cv.width = Math.round(GW * DPR);
    cv.height = Math.round(GH * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', gsize);
  // Panel boyutu değişince de küre tuvali yeniden boyutlanmalı
  if ('ResizeObserver' in window) {
    const orbResizeObserver = new ResizeObserver(() => requestAnimationFrame(gsize));
    orbResizeObserver.observe($('stage'));
  }
  function setConversationLayout(active) {
    $('appRoot').classList.toggle('has-chat', !!active);
    requestAnimationFrame(() => requestAnimationFrame(gsize));
  }

  function ll(lat, lon) { const la = lat * DEG, lo = lon * DEG; return [Math.cos(la)*Math.sin(lo), Math.sin(la), Math.cos(la)*Math.cos(lo)]; }
  function nrm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0]/l, v[1]/l, v[2]/l]; }

  const NODES = [], WEBS = [], BARS = [], PK = [], SW = [], CALL = [];
  for (let i=0; i<85; i++) NODES.push({ v: ll((Math.random()*130)-65, D[KEYS[i%5]].lon + (Math.random()*64-32)), dom: i%5, heat: 0 });
  for (let i=0; i<160; i++) {
    const wa = ll((Math.random()*140)-70, Math.random()*360);
    const wb = nrm([wa[0]+(Math.random()-.5)*1.3, wa[1]+(Math.random()-.5)*1.3, wa[2]+(Math.random()-.5)*1.3]);
    const pts = [];
    for (let s=0; s<=6; s++) {
      const u = s/6, p = nrm([wa[0]*(1-u)+wb[0]*u, wa[1]*(1-u)+wb[1]*u, wa[2]*(1-u)+wb[2]*u]);
      pts.push(p);
    }
    WEBS.push({ pts, ph: Math.random()*6.3, dom: i%5 });
  }
  for (let bl=0; bl<360; bl+=9) {
    const b0 = Math.random()*90 - 45;
    BARS.push({ lon: bl, a: b0, b: b0 + 16 + Math.random()*40, ph: Math.random()*6.3, dom: Math.floor(bl/72)%5 });
  }

  function spawnBurst(n) {
    for (let i=0; i<n; i++) {
      if (PK.length > 180) break;
      const a = NODES[Math.floor(Math.random()*NODES.length)].v;
      const b = Math.random() < 0.25 ? [0,0,0] : NODES[Math.floor(Math.random()*NODES.length)].v;
      PK.push({ a, b, arc: Math.random() < 0.6, t0: performance.now(), dur: 700 + Math.random()*900 });
    }
  }
  function triggerDecisionWave(domKey, word) {
    const idx = KEYS.indexOf(domKey);
    const cand = NODES.filter(n => n.dom === idx);
    const nd = cand[Math.floor(Math.random()*cand.length)] || NODES[0];
    nd.heat = 1;
    SW.push({ n: nd, born: performance.now() });
    CALL.push({ n: nd, txt: (word || D[domKey].short).toUpperCase().slice(0, 16), dom: domKey, born: performance.now(), life: 3200 });
    spawnBurst(22);
    yawKick += (Math.random() < 0.5 ? -1 : 1) * 1.8;
  }

  let cy=1, sy=0, cp=1, sp=0, cr=1, sr=0, PX=0, PY=0, PZ=0, RR=100, CX=0, CY=0;
  function pr(x, y, z) {
    const x1 = x*cy + z*sy, z1 = -x*sy + z*cy;
    const y1 = y*cp - z1*sp, z2 = y*sp + z1*cp;
    const x2 = x1*cr - y1*sr, y2 = x1*sr + y1*cr;
    const f = 1 + z2 * 0.11;
    PX = CX + x2 * RR * f; PY = CY - y2 * RR * f; PZ = z2;
  }

  let lastT = performance.now(), t0 = lastT;
  function frame(now) {
    const dt = Math.min(80, now - lastT); lastT = now;
    const t = (now - t0) / 1000;
    if (GW > 10 && GH > 10) {
      const light = root.dataset.mode === 'light';
      const tg = PAL[root.dataset.agent] || PAL.oto;
      const gA = light ? tg.lacc : tg.acc, gV = light ? [110,90,130] : tg.alt, gP = light ? [23,19,16] : tg.pale;
      for (let i = 0; i < 3; i++) { // tema değişince küre renkleri yumuşakça geçer
        col.a[i] += (gA[i] - col.a[i]) * 0.08;
        col.v[i] += (gV[i] - col.v[i]) * 0.08;
        col.p[i] += (gP[i] - col.p[i]) * 0.08;
      }
      const cMint = col.a.map(Math.round).join(',');
      const cViolet = col.v.map(Math.round).join(',');
      const cPale = col.p.map(Math.round).join(',');
      const actIdx = state.cur ? KEYS.indexOf(state.cur) : -1;

      const voiceBoost = state.audioEnergy * 0.35; // Konuşurken küre sesle nabız gibi atar
      activity += ((state.busy || state.audioEnergy > 0.05 ? 1 : 0) - activity) * 0.1;
      cam += (camT - cam) * 0.08;
      if (focus === null) yaw += (0.14 + yawKick + voiceBoost * 1.2) * dt / 1000;
      else {
        const d = Math.atan2(Math.sin(-focus*DEG - yaw), Math.cos(-focus*DEG - yaw));
        yaw += d * 0.05 + (0.04 + yawKick + voiceBoost) * dt / 1000;
      }
      yawKick *= 0.92;
      roll = 0.06 * Math.sin(t * 0.25);
      cy = Math.cos(yaw); sy = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch); cr = Math.cos(roll); sr = Math.sin(roll);
      CX = GW / 2; CY = GH / 2;
      RR = Math.min(GW, GH) * 0.36 * cam * userZoom * (1 + voiceBoost);

      g.clearRect(0, 0, GW, GH);

      g.lineWidth = 0.7;
      for (let i=0; i<WEBS.length; i++) {
        const w = WEBS[i], on = w.dom === actIdx;
        g.strokeStyle = `rgba(${on ? cMint : cViolet}, ${on ? 0.35 + voiceBoost : 0.12})`;
        g.beginPath();
        for (let k=0; k<w.pts.length; k++) {
          pr(w.pts[k][0], w.pts[k][1], w.pts[k][2]);
          if (k === 0) g.moveTo(PX, PY); else g.lineTo(PX, PY);
        }
        g.stroke();
      }

      for (let rg=0; rg<3; rg++) {
        const ta = rg * 1.05 + t * (0.28 + 0.14 * rg), ct = Math.cos(ta), st = Math.sin(ta), rr = 0.58 + 0.12 * rg;
        g.strokeStyle = `rgba(${rg === 1 ? cMint : cViolet}, 0.28)`;
        g.lineWidth = 1; g.beginPath();
        for (let th=0; th<=40; th++) {
          const aa = (th/40)*TAU, rx = Math.cos(aa)*rr, ry = Math.sin(aa)*rr;
          pr(rx, ry*ct, ry*st);
          if (th === 0) g.moveTo(PX, PY); else g.lineTo(PX, PY);
        }
        g.stroke();
      }

      for (let i=0; i<BARS.length; i++) {
        const br = BARS[i], on = br.dom === actIdx;
        const pulse = 0.5 + 0.5 * Math.sin(t * (on ? 4 : 1.5) + br.ph) + voiceBoost;
        g.strokeStyle = `rgba(${on ? cMint : cPale}, ${Math.min(1, (on ? 0.55 : 0.2) * pulse)})`;
        g.lineWidth = on ? 2.4 : 1.2; g.beginPath();
        for (let s=0; s<=3; s++) {
          const q = ll(br.a + (br.b - br.a)*(s/3), br.lon);
          const lift = 1 + (on ? voiceBoost * 0.4 : 0);
          pr(q[0]*lift, q[1]*lift, q[2]*lift);
          if (s === 0) g.moveTo(PX, PY); else g.lineTo(PX, PY);
        }
        g.stroke();
      }

      for (let i=0; i<NODES.length; i++) {
        const nd = NODES[i]; nd.heat *= 0.96; pr(nd.v[0], nd.v[1], nd.v[2]);
        const al = 0.25 + 0.75 * (PZ + 1) / 2;
        g.fillStyle = `rgba(${cPale}, ${Math.min(1, (0.4 + nd.heat) * al)})`;
        g.beginPath(); g.arc(PX, PY, 1.5 + nd.heat * 3.5, 0, TAU); g.fill();
      }
      for (let i=SW.length-1; i>=0; i--) {
        const sw = SW[i], age = (now - sw.born) / 1000;
        if (age > 1.8) { SW.splice(i, 1); continue; }
        pr(sw.n.v[0], sw.n.v[1], sw.n.v[2]);
        g.strokeStyle = `rgba(${cMint}, ${(1 - age/1.8) * 0.8})`;
        g.lineWidth = 1.6; g.beginPath(); g.arc(PX, PY, 6 + age * 48, 0, TAU); g.stroke();
      }

      if (Math.random() < 0.18 + activity * 0.5) spawnBurst(1);
      for (let i=PK.length-1; i>=0; i--) {
        const pk = PK[i], u = (now - pk.t0) / pk.dur;
        if (u > 1) { PK.splice(i, 1); continue; }
        let x = pk.a[0]*(1-u) + pk.b[0]*u, y = pk.a[1]*(1-u) + pk.b[1]*u, z = pk.a[2]*(1-u) + pk.b[2]*u;
        if (pk.arc) { const l = Math.hypot(x,y,z)||1, lf = (1 + 0.22 * Math.sin(PI*u)) / l; x*=lf; y*=lf; z*=lf; }
        pr(x, y, z);
        g.fillStyle = `rgba(${cMint}, ${1-u})`;
        g.beginPath(); g.arc(PX, PY, 2.4, 0, TAU); g.fill();
      }

      g.font = '11px "JetBrains Mono", monospace';
      for (let i=CALL.length-1; i>=0; i--) {
        const c = CALL[i], age = (now - c.born) / 1000, life = c.life / 1000;
        if (age > life) { CALL.splice(i, 1); continue; }
        pr(c.n.v[0], c.n.v[1], c.n.v[2]);
        if (PZ < -0.2) continue;
        const env = Math.min(1, age/0.15) * Math.min(1, (life - age)/0.4);
        g.strokeStyle = `rgba(${cMint}, ${env})`; g.fillStyle = `rgba(${cMint}, ${env})`;
        g.beginPath(); g.moveTo(PX + 8, PY - 8); g.lineTo(PX + 24, PY - 22); g.lineTo(PX + 130, PY - 22); g.stroke();
        g.fillText(`▸ ${c.txt} → ${D[c.dom].short}`, PX + 26, PY - 26);
      }

      const gr = g.createRadialGradient(CX, CY, 0, CX, CY, RR * (0.38 + activity * 0.2 + voiceBoost));
      gr.addColorStop(0, `rgba(${cMint}, ${0.48 + activity * 0.3})`);
      gr.addColorStop(1, `rgba(${cMint}, 0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(CX, CY, RR * 0.55, 0, TAU); g.fill();

      $('tele').textContent = `PAKET  ${String(PK.length).padStart(2,'0')}\nKAMERA ×${(cam*userZoom).toFixed(2)}\nHAT    ${state.cur ? D[state.cur].short : 'OTOMATİK'}\nSES    ${state.liveVoice ? 'CANLI (NÖRAL)' : 'HAZIR'}`;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- SOHBET VE RENDER ---------- */
  const MS = $('msgs');
  function showStart() {
    setConversationLayout(false);
    MS.innerHTML = `<div class="start" id="start">
      <h2>Merhaba. Bugün neye odaklanıyoruz?</h2>
      <p style="margin:0;color:var(--dim);font-size:12px">Düşüncelerini paylaş, bir konu araştır, plan yap veya sadece sohbet et. Buradayım.</p>
      <div class="sg">${KEYS.map(k => `<button type="button" data-sug="${k}" title="${esc(D[k].sug)}"><span>${D[k].short}</span><em>${esc(D[k].sug)}</em></button>`).join('')}</div>
    </div>`;
  }

  function addMsg(role, text, meta = {}) {
    setConversationLayout(true);
    const st = $('start'); if (st) st.remove();
    const el = document.createElement('div');
    el.className = `m ${role}`;
    const who = role === 'user' ? 'SEN' : role === 'agent' ? `AJAN · ${D[meta.dom || 'gunluk'].short}` : 'SİSTEM';
    const badge = meta.dom ? `<span class="bd">→ ${D[meta.dom].short} ${(meta.conf || 1).toFixed(2)}</span>` : '';
    const actions = role === 'agent' ? `<div class="mf"><button type="button" data-act="copy">Tümünü Kopyala</button><button type="button" data-act="speak">Doğal Sesle Oku 🔊</button></div>` : '';
    el.innerHTML = `<div class="mh"><span class="who">${who}</span>${badge}<span class="tm">${hms().slice(0,5)}</span></div><div class="mb">${md(text)}</div>${actions}`;
    MS.appendChild(el);
    MS.scrollTop = MS.scrollHeight;
    return el;
  }

  function render() {
    $('sCount').textContent = state.decs.length;
    const last = state.decs[state.decs.length - 1];
    if (last) {
      $('sLat').textContent = last.latency || 1;
      $('sConf').textContent = last.confidence.toFixed(2);
      $('sResp').textContent = last.respSec || '—';
      $('insp').innerHTML = `<h3><span>KARAR KARTI · #${state.decs.length}</span><span>${hms().slice(0,5)}</span></h3>
        <div class="meter"><u style="width:${last.confidence*100}%"></u></div>
        <dl><dt>Atanan Ajan</dt><dd>${D[last.domain].label}</dd><dt>Güven Skoru</dt><dd>${last.confidence.toFixed(2)}</dd><dt>Gerekçe</dt><dd>${esc(last.reason)}</dd></dl>`;
    } else {
      $('insp').innerHTML = `<h3><span>KARAR KARTI</span></h3><div style="color:var(--dim)">Mesaj gönderdiğinizde yönlendirici kararı burada incelenir.</div>`;
    }
    Array.from($('tabs').children).forEach(t => t.classList.toggle('on', t.dataset.k === state.cur));
    Array.from($('agents').children).forEach(a => {
      const k = a.dataset.k;
      a.classList.toggle('on', state.cur === k);
      a.classList.toggle('lock', cfg.lock === k);
      a.querySelector('.lk').textContent = cfg.lock === k ? 'KİLİTLİ' : 'OTO';
    });
    Array.from($('segR').children).forEach(b => b.classList.toggle('on', (b.dataset.r || null) === cfg.lock));
    Array.from($('segD').children).forEach(b => b.classList.toggle('on', b.dataset.d === cfg.depth));
    $('agentName').textContent = 'ajan: ' + (cfg.lock ? D[cfg.lock].short + ' (Kilitli)' : (state.cur ? D[state.cur].short : 'otomatik'));
    $('send').innerHTML = state.streaming ? STOP_SVG : SEND_SVG;
    $('send').classList.toggle('stop', state.streaming);
    $('send').setAttribute('aria-label', state.streaming ? 'Durdur' : 'Gönder');
    updateSendVis();
    $('agentLbl').textContent = cfg.lock ? NAME[cfg.lock] : (state.cur ? 'Oto · ' + NAME[state.cur] : 'Otomatik');
    applyTheme();
  }

  /* ---------- DOĞAL NÖRAL SES OYNATICI & WEB AUDIO FREKANS ANALİZÖRÜ ---------- */
  let currentAudio = null;
  let audioCtx = null;

  async function playNeuralSpeech(rawText, onDone) {
    stopSpeaking();
    const text = speakable(rawText);
    if (!text) { if (onDone) onDone(); return; }
    try {
      if (state.liveVoice) {
        $('vState').textContent = 'CANLI SOHBET · ASİSTAN KONUŞUYOR';
        $('vSub').textContent = text;
      }
      setStatus('KONUŞUYOR', 'run');

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: cfg.voice })
      });
      if (!res.ok) throw new Error('TTS yanıt vermedi');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;

      // Ses frekansını küreye bağla (gerçek ses reaktivitesi)
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);

      const freqTimer = setInterval(() => {
        if (!currentAudio || currentAudio.paused) {
          state.audioEnergy = 0;
          clearInterval(freqTimer);
          return;
        }
        analyser.getByteFrequencyData(dataArr);
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
        state.audioEnergy = (sum / dataArr.length) / 255;
        if (state.audioEnergy > 0.15) spawnBurst(2);
      }, 45);

      audio.onended = () => {
        state.audioEnergy = 0;
        currentAudio = null;
        URL.revokeObjectURL(url);
        if (onDone) onDone();
      };
      await audio.play();
    } catch (err) {
      state.audioEnergy = 0;
      if (onDone) onDone();
    }
  }

  function stopSpeaking() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    state.audioEnergy = 0;
  }

  /* ---------- CANLI SES DÖNGÜSÜ (MOBİL + MASAÜSTÜ) ---------- */
  let mediaRecorder = null;
  let micStream = null;
  let vadInterval = null;

  async function startLiveVoiceSession() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      return toast('Mikrofon izni verilmedi.');
    }

    state.liveVoice = true;
    $('bMic').classList.add('voice-on');
    $('sVoice').textContent = 'CANLI';
    $('voiceHud').hidden = false;
    $('appRoot').classList.add('voice-live');
    camT = 1.25;
    listenUserVoiceTurn();
  }

  function stopLiveVoiceSession() {
    state.liveVoice = false;
    stopSpeaking();
    if (vadInterval) clearInterval(vadInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    $('bMic').classList.remove('voice-on');
    $('sVoice').textContent = 'KAPALI';
    $('voiceHud').hidden = true;
    $('appRoot').classList.remove('voice-live');
    camT = 1;
    setStatus('BOŞTA');
  }

  function listenUserVoiceTurn() {
    if (!state.liveVoice || !micStream) return;
    stopSpeaking();

    $('vState').textContent = 'CANLI SOHBET · SENİ DİNLİYOR';
    $('vSub').textContent = 'Konuşmaya başlayabilirsin... (Durduğunda otomatik gönderilir)';
    setStatus('DİNLİYOR', 'run');

    const chunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
    mediaRecorder = new MediaRecorder(micStream, { mimeType: mime });

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    // Mikrofon ses yüksekliğini analiz et (kullanıcı konuştu mu, sustu mu?)
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const micSource = audioCtx.createMediaStreamSource(micStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    micSource.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    let spoke = false;
    let silenceStart = performance.now();
    const recordStart = performance.now();

    if (vadInterval) clearInterval(vadInterval);
    vadInterval = setInterval(() => {
      if (!state.liveVoice || mediaRecorder.state !== 'recording') return;
      analyser.getByteFrequencyData(data);
      let avg = 0;
      for (let i = 0; i < data.length; i++) avg += data[i];
      avg /= data.length;
      state.audioEnergy = (avg / 255) * 0.7;

      if (avg > 22) { // Kullanıcı konuşuyor
        spoke = true;
        silenceStart = performance.now();
        $('vState').textContent = 'SES ALGILANIYOR...';
      } else if (spoke && (performance.now() - silenceStart > 1250)) {
        // Kullanıcı konuştu ve 1.25 sn sustu -> kaydı bitirip gönder
        clearInterval(vadInterval);
        state.audioEnergy = 0;
        mediaRecorder.stop();
      } else if (!spoke && (performance.now() - recordStart > 12000)) {
        // 12 sn hiç konuşulmadıysa döngüyü tazele
        clearInterval(vadInterval);
        mediaRecorder.stop();
      }
    }, 60);

    mediaRecorder.onstop = async () => {
      if (!state.liveVoice) return;
      if (!spoke || chunks.length === 0) {
        if (state.liveVoice && !state.busy) listenUserVoiceTurn();
        return;
      }

      $('vState').textContent = 'DÜŞÜNÜYOR...';
      $('vSub').textContent = 'Sesin analiz ediliyor...';

      const blob = new Blob(chunks, { type: mime });
      const fd = new FormData();
      fd.append('audio', blob);
      fd.append('userKey', cfg.userKey);

      try {
        const sttRes = await fetch('/api/stt', { method: 'POST', body: fd });
        const sttData = await sttRes.json();
        const userText = (sttData.text || '').trim();

        if (userText.length > 1) {
          $('vSub').textContent = `“${userText}”`;
          await send(userText, true);
        } else {
          listenUserVoiceTurn();
        }
      } catch (e) {
        toast('Ses çözümlenemedi.');
        listenUserVoiceTurn();
      }
    };

    mediaRecorder.start();
  }

  $('bMic').addEventListener('click', () => {
    if (state.liveVoice) stopLiveVoiceSession();
    else startLiveVoiceSession();
  });
  $('vClose').addEventListener('click', stopLiveVoiceSession);
  $('vInterrupt').addEventListener('click', () => {
    stopSpeaking();
    if (state.liveVoice) listenUserVoiceTurn();
  });

  /* ---------- ANA GÖNDERİM VE STREAM AKIŞI ---------- */
  async function send(rawText, fromVoice = false) {
    let text = (rawText || '').trim();
    if ((!text && !state.imageFile) || state.busy) return;
    if (text === '/temizle') { $('inp').value = ''; state.msgs = []; showStart(); return; }

    stopSpeaking();
    let forced = cfg.lock;
    const sl = text.match(/^\/(siber|yazilim|akademi|proje|gunluk)\s+([\s\S]+)/i);
    if (sl) { forced = sl[1].toLowerCase(); text = sl[2].trim(); }

    $('inp').value = ''; $('inp').style.height = 'auto';
    state.busy = true; pipeReset(); pipe(0, 'done', hms()); setStatus('YÖNLENDİRİYOR', 'route');
    spawnBurst(15); render();

    const history = state.msgs.slice(-8).map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.text}`).join('\n');
    addMsg('user', text || '[Görsel Analizi]');
    state.msgs.push({ role: 'user', text: text || '[Görsel]' });

    let dec = { domain: forced || 'gunluk', confidence: 1, reason: 'Kilitli/Komutla seçildi', latency: 1 };
    if (!forced) {
      pipe(1, 'active', 'analiz...');
      try {
        const r = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text || 'Görsel analizi', history })
        });
        dec = await r.json();
        pipe(1, 'done', `${dec.latency} ms`);
      } catch (e) { pipe(1, 'err', 'yerel'); }
    } else { pipe(1, 'done', 'kilitli'); }

    const firstWord = (text.match(/[A-Za-zÇĞİÖŞÜçğıöşü]{4,}/) || [D[dec.domain].short])[0];
    state.cur = dec.domain; focus = D[dec.domain].lon;
    triggerDecisionWave(dec.domain, firstWord);
    state.decs.push(dec);
    pipe(2, 'done', `${dec.confidence.toFixed(2)} ✓`);
    $('caseT').textContent = `Vaka #${state.decs.length} · ${D[dec.domain].label}`;
    $('caseR').textContent = `Güven ${dec.confidence.toFixed(2)} · ${dec.reason}`;
    render();

    pipe(3, 'active', D[dec.domain].short); setStatus('ÇALIŞIYOR', 'run'); camT = 1.28;
    const agentEl = addMsg('agent', '', { dom: dec.domain, conf: dec.confidence });
    const bodyEl = agentEl.querySelector('.mb'); bodyEl.classList.add('typing');

    const formData = new FormData();
    formData.append('domain', dec.domain);
    formData.append('text', text);
    formData.append('history', history);
    formData.append('depth', cfg.depth);
    formData.append('profile', cfg.profile);
    formData.append('userKey', cfg.userKey);
    formData.append('isVoiceMode', String(state.liveVoice || fromVoice));
    if (state.imageFile) {
      formData.append('image', state.imageFile);
      state.imageFile = null; $('imgPreview').hidden = true;
    }

    const ctl = new AbortController(); state.ctl = ctl; state.streaming = true; render();
    const t0 = performance.now();
    let fullReply = '';

    try {
      const res = await fetch('/api/chat', { method: 'POST', body: formData, signal: ctl.signal });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      pipe(3, 'done', 'hazır'); pipe(4, 'active', 'akıyor...');

      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // yarım kalan satırı sonraki parçaya bırak
        for (const line of lines) {
          if (!line.startsWith('data: ') || line.trim() === 'data: [DONE]') continue;
          let data; try { data = JSON.parse(line.slice(6)); } catch { continue; }
          if (data.error) throw new Error(data.error);
          fullReply = data.text;
          bodyEl.innerHTML = md(fullReply);
          MS.scrollTop = MS.scrollHeight;
          spawnBurst(1);
        }
      }
      dec.respSec = ((performance.now() - t0) / 1000).toFixed(1);
      pipe(4, 'done', `${dec.respSec} sn`);
      agentEl.dataset.raw = fullReply;
      state.msgs.push({ role: 'agent', dom: dec.domain, text: fullReply });
    } catch (err) {
      bodyEl.innerHTML = md(fullReply || `⚠️ Uyarı: ${err.message}`);
      agentEl.dataset.raw = fullReply;
      pipe(4, 'err', 'durdu');
    }

    bodyEl.classList.remove('typing');
    bodyEl.innerHTML = md(fullReply || bodyEl.textContent); // açık kalan kod bloklarını kapat/çalıştırılabilir yap
    state.busy = false; state.streaming = false; state.ctl = null; camT = state.liveVoice ? 1.25 : 1;
    render();

    // Canlı ses açıksa yanıtı nöral sesle oku, bitince tekrar dinlemeye geç
    if ((state.liveVoice || fromVoice) && fullReply) {
      await playNeuralSpeech(fullReply, () => {
        if (state.liveVoice) listenUserVoiceTurn();
        else setStatus('BOŞTA');
      });
    } else {
      setStatus('BOŞTA');
    }
  }

  /* ---------- FOTOĞRAF VE DİĞER ETKİLEŞİMLER ---------- */
  function attachImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    state.imageFile = file;
    $('imgThumb').src = URL.createObjectURL(file);
    $('imgName').textContent = file.name || 'gorsel.png';
    $('imgPreview').hidden = false;
    toast('Fotoğraf analize hazır!');
    updateSendVis();
  }
  $('bImg').addEventListener('click', () => { closeMenus(); $('fileInp').click(); });
  $('fileInp').addEventListener('change', e => { if (e.target.files[0]) attachImage(e.target.files[0]); });
  $('imgRemove').addEventListener('click', () => { state.imageFile = null; $('imgPreview').hidden = true; updateSendVis(); });
  window.addEventListener('paste', e => {
    const items = (e.clipboardData || {}).items || [];
    for (const item of items) if (item.type.startsWith('image/')) attachImage(item.getAsFile());
  });

  MS.addEventListener('click', e => {
    const s = e.target.closest('[data-sug]');
    if (s) { send(D[s.dataset.sug].sug); return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const msgEl = act.closest('.m');
    const raw = msgEl.dataset.raw || msgEl.querySelector('.mb').innerText;
    if (act.dataset.act === 'copy') {
      navigator.clipboard.writeText(raw).then(() => toast('Kopyalandı!'));
    } else if (act.dataset.act === 'speak') {
      playNeuralSpeech(raw, () => setStatus('BOŞTA'));
    }
  });

  /* ---------- KOD BLOĞU: KOPYALA / İNDİR / ÇALIŞTIR ---------- */
  const EXT = { python:'py', py:'py', javascript:'js', js:'js', typescript:'ts', ts:'ts', html:'html', css:'css',
    json:'json', bash:'sh', sh:'sh', powershell:'ps1', ps1:'ps1', sql:'sql', java:'java', cpp:'cpp', c:'c', md:'md', markdown:'md' };
  const runs = new Map();

  window.addEventListener('message', e => {
    const d = e.data; if (!d || !runs.has(d.id)) return;
    addLine(runs.get(d.id), d.t, d.m);
  });
  function addLine(out, type, text) {
    const l = document.createElement('div');
    l.className = 'ln ' + type; l.textContent = text;
    out.appendChild(l); out.scrollTop = out.scrollHeight;
  }
  function sandboxFrame(html) {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.srcdoc = html;
    return f;
  }
  function runJS(code, out) {
    const id = 'r' + Date.now() + Math.random().toString(36).slice(2);
    runs.set(id, out);
    const hook = `const __s=(t,a)=>parent.postMessage({id:'${id}',t,m:a.map(x=>{try{return typeof x==='object'?JSON.stringify(x,null,2):String(x)}catch(e){return String(x)}}).join(' ')},'*');
console.log=(...a)=>__s('log',a);console.info=console.log;console.warn=(...a)=>__s('warn',a);console.error=(...a)=>__s('err',a);
window.onerror=(m,u,l)=>{__s('err',[m+(l?' (satır '+l+')':'')])};
window.onunhandledrejection=e=>__s('err',[String(e.reason)]);`;
    const f = sandboxFrame(`<script>${hook}<\/script><script>${code.replace(/<\/script>/gi, '<\\/script>')}<\/script>`);
    f.style.display = 'none'; out.appendChild(f);
    setTimeout(() => { f.remove(); runs.delete(id); }, 20000);
  }
  let pyReady = null;
  function loadPy() {
    if (!pyReady) pyReady = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      s.onload = () => loadPyodide().then(res, rej);
      s.onerror = () => rej(new Error('Pyodide yüklenemedi (internet?)'));
      document.head.appendChild(s);
    }).catch(err => { pyReady = null; throw err; });
    return pyReady;
  }
  async function runPy(code, out) {
    addLine(out, 'warn', 'Python motoru hazırlanıyor (ilk seferde birkaç sn sürer)...');
    try {
      const py = await loadPy();
      out.innerHTML = '<div class="ttl">Çıktı · Python</div>';
      py.setStdout({ batched: s => addLine(out, 'log', s) });
      py.setStderr({ batched: s => addLine(out, 'err', s) });
      await py.runPythonAsync(code);
      if (!out.querySelector('.ln')) addLine(out, 'warn', '(çıktı yok)');
    } catch (err) { addLine(out, 'err', String(err.message || err)); }
  }

  MS.addEventListener('click', async e => {
    const btn = e.target.closest('[data-cb]'); if (!btn) return;
    const box = btn.closest('.cb');
    const code = box.querySelector('code').textContent;
    const lang = box.dataset.lang, out = box.querySelector('.cb-out'), act = btn.dataset.cb;

    if (act === 'copy') {
      try { await navigator.clipboard.writeText(code); } catch { return toast('Kopyalanamadı'); }
      const old = btn.textContent; btn.textContent = 'Kopyalandı ✓'; setTimeout(() => btn.textContent = old, 1500);
    } else if (act === 'dl') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
      a.download = `kod-${Date.now().toString().slice(-4)}.${EXT[lang] || 'txt'}`;
      a.click(); toast('Dosya indirildi');
    } else if (act === 'run') {
      out.hidden = false;
      out.innerHTML = `<div class="ttl">Çıktı · ${esc(lang)}</div>`;
      if (lang === 'html') out.appendChild(sandboxFrame(code));
      else if (lang === 'js' || lang === 'javascript') runJS(code, out);
      else runPy(code, out);
    }
  });

  $('bExp').addEventListener('click', () => {
    if (!state.msgs.length) return toast('İndirilecek sohbet yok.');
    const mdContent = `# Karar Küresi Raporu (${new Date().toLocaleDateString('tr-TR')})\n\n` +
      state.msgs.map(m => `### ${m.role === 'user' ? '👤 Kullanıcı' : '🤖 Ajan (' + (m.dom || 'Asistan').toUpperCase() + ')'}\n${m.text}`).join('\n\n---\n\n');
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `karar-kuresi-rapor-${Date.now().toString().slice(-4)}.md`;
    a.click();
    toast('Rapor (.md) indirildi!');
  });

  $('form').addEventListener('submit', e => {
    e.preventDefault();
    if (state.streaming && state.ctl) { state.ctl.abort(); return; }
    send($('inp').value);
  });
  // Dokunmatik cihazlarda Enter yeni satır ekler, gönderme butonu ile gönderilir
  const isTouch = window.matchMedia('(pointer:coarse)').matches;
  $('inp').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !isTouch) { e.preventDefault(); send($('inp').value); }
  });
  // Yazı alanı içeriğe göre büyür
  function growInput() {
    const el = $('inp'); el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }
  $('inp').addEventListener('input', () => { growInput(); updateSendVis(); });
  $('form').addEventListener('submit', () => setTimeout(growInput, 0));
  $('agents').addEventListener('click', e => {
    const a = e.target.closest('.ag'); if (!a) return;
    cfg.lock = cfg.lock === a.dataset.k ? null : a.dataset.k; render();
  });
  $('tabs').addEventListener('click', e => {
    const t = e.target.closest('.tab'); if (!t) return;
    state.cur = t.dataset.k; focus = D[state.cur].lon; render();
  });
  $('segR').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cfg.lock = b.dataset.r || null;
    if (cfg.lock) { state.cur = cfg.lock; focus = D[cfg.lock].lon; spawnBurst(18); }
    closeMenus(); render();
  });
  $('segD').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    cfg.depth = b.dataset.d; render(); toast('Derinlik: ' + DEPTH[cfg.depth]);
  });

  /* ---------- AÇILIR MENÜLER (+ ve ajan seçici) ---------- */
  function closeMenus() { $('plusMenu').hidden = true; $('agentMenu').hidden = true; }
  function toggleMenu(id) { const wasHidden = $(id).hidden; closeMenus(); $(id).hidden = !wasHidden; }
  $('bPlus').addEventListener('click', e => { e.stopPropagation(); toggleMenu('plusMenu'); });
  $('bAgent').addEventListener('click', e => { e.stopPropagation(); toggleMenu('agentMenu'); });
  document.addEventListener('click', e => { if (!e.target.closest('.menu')) closeMenus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

  /* ---------- TEMA MOTORU: seçilen/atanan ajana göre arayüz paleti ---------- */
  function themeKey() { return cfg.lock || state.cur || 'oto'; }
  function applyTheme() {
    const k = themeKey();
    if (root.dataset.agent === k) return;
    root.dataset.agent = k;
    const app = $('appRoot'); app.classList.remove('theme-pop'); void app.offsetWidth; app.classList.add('theme-pop');
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = THEME_BG[k] || THEME_BG.oto;
    $('inp').placeholder = PLACEHOLDER[k] || PLACEHOLDER.oto;
  }
  // Gönder düğmesi: yazı/görsel varken veya yanıt akarken görünür, aksi halde mikrofon tek başına kalır
  function updateSendVis() {
    const has = $('inp').value.trim().length > 0 || !!state.imageFile;
    $('send').hidden = !(state.streaming || has);
  }
  $('bTele').addEventListener('click', function() {
    cfg.telemetry = !cfg.telemetry;
    $('appRoot').classList.toggle('show-telemetry', cfg.telemetry);
    this.classList.toggle('active', cfg.telemetry);
    this.textContent = `Telemetri: ${cfg.telemetry ? 'Açık' : 'Kapalı'}`;
    setTimeout(gsize, 50);
  });
  function toggleTheme() {
    root.dataset.mode = root.dataset.mode === 'light' ? 'dark' : 'light';
    $('phase').textContent = `FAZ · ${root.dataset.mode === 'light' ? 'MONO' : 'HAYALET'}`;
  }
  $('phase').addEventListener('click', toggleTheme);
  $('bPhaseTop').addEventListener('click', toggleTheme);
  $('bNew').addEventListener('click', () => { state.msgs = []; state.cur = null; showStart(); render(); toast('Sohbet temizlendi'); });
  $('bSet').addEventListener('click', () => $('drawer').hidden = false);
  $('dClose').addEventListener('click', () => $('drawer').hidden = true);
  $('voiceSel').addEventListener('change', function() { cfg.voice = this.value; toast('Ses tonu güncellendi!'); });
  $('gate').addEventListener('input', function() { cfg.gate = +this.value; $('gv').textContent = cfg.gate.toFixed(2); $('sGate').textContent = cfg.gate.toFixed(2); });
  $('prof').addEventListener('input', function() { cfg.profile = this.value; });
  $('userKey').addEventListener('input', function() { cfg.userKey = this.value; });

  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; focus = null; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    yaw += (e.clientX - drag.x) * 0.007;
    pitch = Math.max(-0.9, Math.min(0.9, pitch + (e.clientY - drag.y) * 0.005));
    drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointerup', () => drag = null);
  cv.addEventListener('wheel', e => { e.preventDefault(); userZoom = Math.max(0.6, Math.min(2.2, userZoom * (e.deltaY < 0 ? 1.1 : 0.9))); }, { passive: false });
  $('zin').addEventListener('click', () => userZoom = Math.min(2.2, userZoom * 1.2));
  $('zout').addEventListener('click', () => userZoom = Math.max(0.6, userZoom / 1.2));
  $('zrst').addEventListener('click', () => { userZoom = 1; pitch = 0.36; });

  // Mobil klavye açılınca yükseklik görünür alana uyar
  function fitViewport() {
    const h = (window.visualViewport ? window.visualViewport.height : window.innerHeight);
    root.style.setProperty('--app-h', Math.round(h) + 'px');
    window.scrollTo(0, 0);
    requestAnimationFrame(gsize);
  }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitViewport);
  window.addEventListener('orientationchange', () => setTimeout(fitViewport, 250));
  fitViewport();

  setInterval(() => $('clock').textContent = hms(), 1000);
  gsize(); showStart(); render(); requestAnimationFrame(frame);
})();
