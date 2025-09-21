/* ...existing code... */
// Minimal dependency-free metadata tester

function q(sel, ctx=document) { return ctx.querySelector(sel) }
function qa(sel, ctx=document) { return Array.from(ctx.querySelectorAll(sel)) }

function snapshotMeta() {
  const out = [];
  const head = document.head;
  out.push({key: 'title', value: document.title});
  qa('meta').forEach(m => {
    const name = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('itemprop') || '(meta)';
    const content = m.getAttribute('content') || m.getAttribute('value') || '';
    out.push({key: `meta:${name}`, value: content, node: m});
  });
  qa('link').forEach(l => {
    const rel = l.getAttribute('rel') || 'link';
    const href = l.getAttribute('href') || '';
    out.push({key:`link:${rel}`, value: href, node: l});
  });
  // JSON-LD
  qa('script[type="application/ld+json"]').forEach(s => {
    out.push({key:'json-ld', value: s.textContent.trim().slice(0,120) + (s.textContent.length>120? '…':''), node: s});
  });
  return out;
}

function renderSnapshot() {
  const list = q('#meta-list');
  list.innerHTML = '';
  const items = snapshotMeta();
  items.forEach(it => {
    const el = document.createElement('div');
    el.className = 'meta-item';
    const k = document.createElement('div');
    k.innerHTML = `<b>${escapeHtml(it.key)}</b><div class="muted">${escapeHtml(it.value)}</div>`;
    el.appendChild(k);
    list.appendChild(el);
  });
}

function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function ensureMeta(attrName, attrValue) {
  // attrName may be "name:description" or "property:og:title" or "title"
  if (attrName === 'title') { document.title = attrValue; return; }
  const [type, key] = attrName.split(':');
  const selector = `${type === 'meta' ? 'meta' : type}[${type === 'meta' ? 'name' : 'rel'}="${key}"]`;
  // Try meta by property/name first
  if (type === 'meta') {
    let m = document.querySelector(`meta[name="${key}"]`) || document.querySelector(`meta[property="${key}"]`);
    if (!m) {
      m = document.createElement('meta');
      if (key.startsWith('og:') || key.startsWith('twitter:')) m.setAttribute('property', key);
      else m.setAttribute('name', key);
      document.head.appendChild(m);
    }
    m.setAttribute('content', attrValue);
    return;
  }
  if (type === 'link') {
    let l = document.querySelector(`link[rel="${key}"]`);
    if (!l) {
      l = document.createElement('link');
      l.setAttribute('rel', key);
      document.head.appendChild(l);
    }
    l.setAttribute('href', attrValue);
    return;
  }
  // fallback
  const m = document.createElement('meta');
  m.setAttribute('name', attrName);
  m.setAttribute('content', attrValue);
  document.head.appendChild(m);
}

function updateJsonLd(data) {
  let s = document.querySelector('script[type="application/ld+json"]');
  const obj = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": data.title || document.title,
    "url": document.querySelector('link[rel="canonical"]')?.href || location.href,
    "description": data.description || document.querySelector('meta[name="description"]')?.content || ''
  };
  if (!s) {
    s = document.createElement('script');
    s.type = 'application/ld+json';
    document.head.appendChild(s);
  }
  s.textContent = JSON.stringify(obj, null, 2);
}

function runDiagnostics() {
  const diag = q('#diag');
  diag.innerHTML = '';
  const checks = [
    {name:'has charset', ok: !!document.querySelector('meta[charset]') || !!document.charset},
    {name:'has viewport', ok: !!document.querySelector('meta[name="viewport"]')},
    {name:'has description', ok: !!document.querySelector('meta[name="description"]')},
    {name:'has canonical', ok: !!document.querySelector('link[rel="canonical"]')},
    {name:'has og:title', ok: !!document.querySelector('meta[property="og:title"]')},
    {name:'has og:image', ok: !!document.querySelector('meta[property="og:image"]')},
    {name:'has twitter:card', ok: !!document.querySelector('meta[name="twitter:card"]')},
    {name:'has theme-color', ok: !!document.querySelector('meta[name="theme-color"]')},
    {name:'has json-ld', ok: !!document.querySelector('script[type="application/ld+json"]')}
  ];
  checks.forEach(c => {
    const li = document.createElement('li');
    li.textContent = `${c.name} — ${c.ok ? '✓' : '✕'}`;
    diag.appendChild(li);
  });
}

function readForm(form) {
  const fm = new FormData(form);
  return {
    title: fm.get('title') || '',
    description: fm.get('description') || '',
    ogTitle: fm.get('og:title') || fm.get('og\\:title') || fm.get('og:title'),
    ogDescription: fm.get('og:description') || '',
    ogImage: fm.get('og:image') || ''
  };
}

document.addEventListener('DOMContentLoaded', () => {
  renderSnapshot();
  runDiagnostics();

  q('#refreshBtn').addEventListener('click', () => {
    renderSnapshot();
    runDiagnostics();
  });

  const form = q('#metaForm');
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = readForm(form);
    if (data.title) ensureMeta('title', data.title);
    if (data.description) ensureMeta('meta:description', data.description);
    if (data.ogTitle) ensureMeta('meta:og:title', data.ogTitle);
    if (data.ogDescription) ensureMeta('meta:og:description', data.ogDescription);
    if (data.ogImage) {
      ensureMeta('meta:og:image', data.ogImage);
      ensureMeta('link:icon', data.ogImage);
      ensureMeta('link:image_src', data.ogImage);
    }
    updateJsonLd({title: data.title, description: data.description});
    renderSnapshot();
    runDiagnostics();
  });

  q('#resetBtn').addEventListener('click', () => {
    // reload page to reset to original static metadata
    location.reload();
  });
});
/* ...existing code... */

