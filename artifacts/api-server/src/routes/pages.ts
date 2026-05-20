import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/dashboards");
const LOGO_PATH = path.resolve(__dirname, "../public/logo.jfif");

let logoBase64Cache: string | null = null;
async function getLogoBase64(): Promise<string> {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const buf = await fs.readFile(LOGO_PATH);
    logoBase64Cache = buf.toString("base64");
    return logoBase64Cache;
  } catch {
    return "";
  }
}

const HIDDEN_SELECTORS = `
  .settings, .settings-grid, .controls-bar, .controls-inner, .formula,
  .breakdown, .bar,
  .s-box:has(#ticket), .s-box:has(#transport), .s-box:has(#profit),
  .s-box:has(#pct), .s-box:has(#rate), .s-box:has(#rateUsd), .s-box:has(#rateEur),
  .ctrl-label, .ctrl-input, .divider, .calc-btn,
  .no-print, .admin-note, .note-internal,
  [data-print="hide"], .controls-inner .currency-toggle,
  .aljude-export-toolbar
`.trim();

function buildPageInject(logoSrc: string): string {
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="الجود للسياحة والسفر" style="height:55px;max-width:180px;object-fit:contain;">`
    : `<span style="font-family:'Cairo',Arial,sans-serif;font-size:16px;font-weight:700;color:#1e3a5f;">الجود للسياحة والسفر</span>`;

  return `
<style id="aljude-inject-styles">
/* ── Print: hide all internal financial data ── */
@media print {
  ${HIDDEN_SELECTORS} { display: none !important; visibility: hidden !important; }
  .aljude-logo-bar { display: flex !important; }
  .card, .hotel-card, .pkg-card, .dcard { break-inside: avoid; page-break-inside: avoid; }
  body, html { width: 100% !important; max-width: 100% !important; }
  @page { size: A4; margin: 1.5cm; }
}

/* ── Logo bar ── */
.aljude-logo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #fff;
  border-bottom: 2px solid #1e3a5f;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.aljude-logo-bar .powered {
  font-family: 'Cairo', Arial, sans-serif;
  font-size: 11px;
  color: #6b7280;
  direction: rtl;
}

/* ── Per-card export toolbar ── */
.aljude-export-toolbar {
  display: flex;
  gap: 6px;
  padding: 7px 12px 9px;
  background: rgba(0,0,0,0.12);
  border-top: 1px solid rgba(255,255,255,0.07);
  flex-wrap: wrap;
  align-items: center;
}
.aljude-export-toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-family: 'Cairo', Tajawal, Arial, sans-serif;
  white-space: nowrap;
  transition: opacity 0.15s, transform 0.1s;
  line-height: 1.3;
}
.aljude-export-toolbar button:hover { opacity: 0.85; transform: translateY(-1px); }
.aljude-export-toolbar button:active { opacity: 0.7; transform: translateY(0); }
.aljude-export-toolbar button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.aljude-btn-shot { background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; }
.aljude-btn-pptx { background: linear-gradient(135deg, #ea580c, #c2410c); color: white; }

/* ── Georgia detail panel export toolbar ── */
.aljude-georgia-toolbar {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(0,0,0,0.15);
  border-top: 1px solid rgba(255,255,255,0.1);
  flex-wrap: wrap;
  align-items: center;
}
.aljude-georgia-toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  font-family: 'Cairo', Tajawal, Arial, sans-serif;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.aljude-georgia-toolbar button:hover { opacity: 0.85; }
.aljude-georgia-toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
.aljude-georgia-btn-shot { background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; }
.aljude-georgia-btn-pptx { background: linear-gradient(135deg, #ea580c, #c2410c); color: white; }
.aljude-georgia-btn-pdf  { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; }

/* ── JOD price spacing fix — prevents currency from overlapping numbers ── */
.p-full, .p-hotel, .child-box-price, .price-val, .price-num,
.pkg-price, .final-price, .total-price, .p-price, .p-val,
.price-box .price, .p-sng, .p-dbl, .p-trp {
  letter-spacing: 0.03em !important;
  word-spacing: 3px !important;
}
/* Ensure price boxes have enough width */
.p-box { min-width: 0; overflow: visible !important; }
.price-boxes { overflow: visible !important; }
</style>

<script id="aljude-export-engine">
(function() {
  /* PostMessage print bridge */
  window.addEventListener('message', function(e) {
    if (e.data === 'aljude:print') { window.print(); }
  });
  if (new URLSearchParams(window.location.search).get('print') === '1') {
    window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 800); });
  }

  /* ── CDN loaders ── */
  var _h2cLoaded = false, _h2cCallbacks = [];
  function loadHtml2Canvas(cb) {
    if (window.html2canvas) { cb(window.html2canvas); return; }
    _h2cCallbacks.push(cb);
    if (_h2cLoaded) return;
    _h2cLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = function() {
      _h2cCallbacks.forEach(function(fn) { fn(window.html2canvas); });
      _h2cCallbacks = [];
    };
    s.onerror = function() { alert('تعذّر تحميل مكتبة التصوير. تحقق من الاتصال بالإنترنت.'); };
    document.head.appendChild(s);
  }

  var _pptxLoaded = false, _pptxCallbacks = [];
  function loadPptxGen(cb) {
    if (window.PptxGenJS) { cb(window.PptxGenJS); return; }
    _pptxCallbacks.push(cb);
    if (_pptxLoaded) return;
    _pptxLoaded = true;
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/3.12.0/pptxgen.bundle.js';
    s.onload = function() {
      _pptxCallbacks.forEach(function(fn) { fn(window.PptxGenJS); });
      _pptxCallbacks = [];
    };
    s.onerror = function() { alert('تعذّر تحميل مكتبة PPTX. تحقق من الاتصال بالإنترنت.'); };
    document.head.appendChild(s);
  }

  /* ── Screenshot a card element ── */
  window.aljudeScreenshotCard = function(btn, label) {
    var card = btn.closest('.card') || btn.closest('.hotel-card') || btn.closest('.pkg-card') || btn.closest('.dcard') || btn.closest('[data-export-card]');
    if (!card) { alert('لم يتم العثور على البطاقة'); return; }
    btn.textContent = '⏳ جاري...';
    btn.disabled = true;
    loadHtml2Canvas(function(h2c) {
      h2c(card, { useCORS: true, allowTaint: true, scale: 2.5, backgroundColor: null, logging: false })
        .then(function(canvas) {
          var a = document.createElement('a');
          a.download = (label || 'hotel') + ' - الجود للسياحة والسفر.png';
          a.href = canvas.toDataURL('image/png');
          a.click();
          btn.textContent = '📷 صورة';
          btn.disabled = false;
        })
        .catch(function(e) {
          console.error(e);
          alert('تعذّر أخذ لقطة الشاشة');
          btn.textContent = '📷 صورة';
          btn.disabled = false;
        });
    });
  };

  /* ── PPTX for a card ── */
  window.aljudePptxCard = function(btn, label) {
    var card = btn.closest('.card') || btn.closest('.hotel-card') || btn.closest('.pkg-card') || btn.closest('.dcard') || btn.closest('[data-export-card]');
    if (!card) { alert('لم يتم العثور على البطاقة'); return; }
    btn.textContent = '⏳ جاري...';
    btn.disabled = true;
    loadHtml2Canvas(function(h2c) {
      h2c(card, { useCORS: true, allowTaint: true, scale: 2.5, backgroundColor: null, logging: false })
        .then(function(canvas) {
          loadPptxGen(function(PptxGenJS) {
            var pptx = new PptxGenJS();
            pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
            pptx.layout = 'WIDE';
            var W = 13.33, H = 7.5;
            var aspect = canvas.width / canvas.height;
            var imgH = W / aspect;
            var slide = pptx.addSlide();
            slide.background = { color: '0f172a' };
            slide.addImage({
              data: canvas.toDataURL('image/png'),
              x: 0,
              y: Math.max(0, (H - Math.min(imgH, H - 0.4)) / 2),
              w: W,
              h: Math.min(imgH, H - 0.4),
            });
            slide.addText('\u0627\u0644\u062c\u0648\u062f \u0644\u0644\u0633\u064a\u0627\u062d\u0629 \u0648\u0627\u0644\u0633\u0641\u0631  |  AL JUDE Travel  |  +962777066005', {
              x: 0, y: H - 0.35, w: W, h: 0.3,
              fontSize: 9, color: 'fbbf24', align: 'center', fontFace: 'Arial', bold: true,
            });
            pptx.writeFile({ fileName: (label || 'hotel') + ' - \u0627\u0644\u062c\u0648\u062f.pptx' });
            btn.textContent = '📊 PPTX';
            btn.disabled = false;
          });
        })
        .catch(function(e) {
          console.error(e);
          alert('تعذّر إنشاء ملف PPTX');
          btn.textContent = '📊 PPTX';
          btn.disabled = false;
        });
    });
  };

  /* ── Screenshot Georgia detail panel ── */
  window.aljudeScreenshotGeorgia = function(btn) {
    var panel = document.getElementById('detailPanel');
    if (!panel || panel.style.display === 'none') {
      alert('يرجى فتح برنامج أولاً ثم التصوير');
      return;
    }
    btn.textContent = '⏳ جاري...';
    btn.disabled = true;
    // Temporarily hide the toolbar itself
    var toolbars = panel.querySelectorAll('.aljude-georgia-toolbar');
    toolbars.forEach(function(t) { t.style.display = 'none'; });
    loadHtml2Canvas(function(h2c) {
      h2c(panel, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#0f172a', logging: false })
        .then(function(canvas) {
          toolbars.forEach(function(t) { t.style.display = ''; });
          var a = document.createElement('a');
          a.download = 'برنامج جورجيا - الجود للسياحة والسفر.png';
          a.href = canvas.toDataURL('image/png');
          a.click();
          btn.textContent = '📷 صورة البرنامج';
          btn.disabled = false;
        })
        .catch(function(e) {
          toolbars.forEach(function(t) { t.style.display = ''; });
          console.error(e);
          alert('تعذّر أخذ لقطة الشاشة');
          btn.textContent = '📷 صورة البرنامج';
          btn.disabled = false;
        });
    });
  };

  /* ── PPTX Georgia detail panel ── */
  window.aljudePptxGeorgia = function(btn) {
    var panel = document.getElementById('detailPanel');
    if (!panel || panel.style.display === 'none') {
      alert('يرجى فتح برنامج أولاً ثم التصدير');
      return;
    }
    btn.textContent = '⏳ جاري...';
    btn.disabled = true;
    var toolbars = panel.querySelectorAll('.aljude-georgia-toolbar');
    toolbars.forEach(function(t) { t.style.display = 'none'; });
    loadHtml2Canvas(function(h2c) {
      h2c(panel, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#0f172a', logging: false })
        .then(function(canvas) {
          toolbars.forEach(function(t) { t.style.display = ''; });
          loadPptxGen(function(PptxGenJS) {
            var pptx = new PptxGenJS();
            pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
            pptx.layout = 'WIDE';
            var W = 13.33, H = 7.5;
            var aspect = canvas.width / canvas.height;
            var imgH = W / aspect;
            if (imgH <= H * 1.3) {
              var slide = pptx.addSlide();
              slide.background = { color: '0f172a' };
              slide.addImage({ data: canvas.toDataURL('image/png'), x: 0, y: 0, w: W, h: Math.min(imgH, H - 0.4) });
              slide.addText('\u0627\u0644\u062c\u0648\u062f \u0644\u0644\u0633\u064a\u0627\u062d\u0629 \u0648\u0627\u0644\u0633\u0641\u0631  |  AL JUDE Travel  |  +962777066005', {
                x: 0, y: H - 0.35, w: W, h: 0.3,
                fontSize: 9, color: 'fbbf24', align: 'center', fontFace: 'Arial', bold: true,
              });
            } else {
              var pixPerSlide = Math.floor(canvas.height * (H / imgH));
              var yOff = 0, idx = 0;
              while (yOff < canvas.height) {
                var sliceH = Math.min(pixPerSlide, canvas.height - yOff);
                var sc = document.createElement('canvas');
                sc.width = canvas.width; sc.height = sliceH;
                var ctx = sc.getContext('2d');
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, sc.width, sc.height);
                ctx.drawImage(canvas, 0, -yOff);
                var slide = pptx.addSlide();
                slide.background = { color: '0f172a' };
                slide.addImage({ data: sc.toDataURL('image/png'), x: 0, y: 0, w: W, h: H });
                slide.addText('\u0627\u0644\u062c\u0648\u062f \u0644\u0644\u0633\u064a\u0627\u062d\u0629 \u0648\u0627\u0644\u0633\u0641\u0631  |  AL JUDE Travel  |  +962777066005', {
                  x: 0, y: H - 0.35, w: W, h: 0.3,
                  fontSize: 9, color: 'fbbf24', align: 'center', fontFace: 'Arial', bold: true,
                });
                yOff += sliceH; idx++;
              }
            }
            pptx.writeFile({ fileName: '\u0628\u0631\u0646\u0627\u0645\u062c \u062c\u0648\u0631\u062c\u064a\u0627 - \u0627\u0644\u062c\u0648\u062f.pptx' });
            btn.textContent = '📊 PPTX البرنامج';
            btn.disabled = false;
          });
        })
        .catch(function(e) {
          toolbars.forEach(function(t) { t.style.display = ''; });
          console.error(e);
          alert('تعذّر إنشاء ملف PPTX');
          btn.textContent = '📊 PPTX البرنامج';
          btn.disabled = false;
        });
    });
  };

  /* ── Inject export toolbars into hotel/package cards ── */
  function injectCardToolbars() {
    var cards = document.querySelectorAll('.card, .hotel-card, .pkg-card, .dcard, [data-export-card]');
    cards.forEach(function(card) {
      if (card.querySelector('.aljude-export-toolbar')) return;
      var nameEl = card.querySelector('.card-name, .hotel-name, .pkg-name, .pkg-title, .card-top h3, h3, h4, .dcard-dest, .dest-name');
      var label = nameEl ? nameEl.textContent.trim().substring(0, 50).replace(/'/g, '') : 'hotel';
      var toolbar = document.createElement('div');
      toolbar.className = 'aljude-export-toolbar';
      toolbar.innerHTML =
        '<button class="aljude-btn-shot" onclick="aljudeScreenshotCard(this, \\'' + label + '\\')">📷 صورة</button>' +
        '<button class="aljude-btn-pptx" onclick="aljudePptxCard(this, \\'' + label + '\\')">📊 PPTX</button>';
      card.appendChild(toolbar);
    });
  }

  /* ── Inject Georgia detail panel export toolbar ── */
  function injectGeorgiaToolbar() {
    var panel = document.getElementById('detailPanel');
    if (!panel) return;
    if (panel.querySelector('.aljude-georgia-toolbar')) return;
    if (panel.style.display === 'none' || !panel.innerHTML.trim()) return;
    var toolbar = document.createElement('div');
    toolbar.className = 'aljude-georgia-toolbar';
    toolbar.innerHTML =
      '<span style="color:rgba(255,255,255,0.5);font-size:11px;font-family:Cairo,Arial,sans-serif;">تصدير هذا البرنامج:</span>' +
      '<button class="aljude-georgia-btn-shot" onclick="aljudeScreenshotGeorgia(this)">📷 صورة البرنامج</button>' +
      '<button class="aljude-georgia-btn-pptx" onclick="aljudePptxGeorgia(this)">📊 PPTX البرنامج</button>';
    panel.appendChild(toolbar);
  }

  /* Run after page loads */
  function runAll() {
    injectCardToolbars();
    injectGeorgiaToolbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(runAll, 600);
      setTimeout(runAll, 1800);
      setTimeout(runAll, 4000);
    });
  } else {
    setTimeout(runAll, 600);
    setTimeout(runAll, 1800);
    setTimeout(runAll, 4000);
  }

  /* Observe DOM mutations for dynamically rendered cards */
  var observer = new MutationObserver(function() {
    setTimeout(runAll, 300);
  });
  var target = document.body || document.documentElement;
  observer.observe(target, { childList: true, subtree: true });
})();
</script>

<!-- AL JUDE logo banner -->
<div class="aljude-logo-bar" style="display:flex;">
  ${logoHtml}
  <span class="powered">للاستخدام الداخلي فقط — الجود للسياحة والسفر</span>
</div>`;
}

function buildWordExportHtml(rawHtml: string, logoBase64: string, titleAr: string): string {
  const logoSrc = logoBase64 ? `data:image/jpeg;base64,${logoBase64}` : "";
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="الجود للسياحة والسفر" style="height:70px;max-width:220px;object-fit:contain;">`
    : `<span style="font-size:20px;font-weight:700;color:#1e3a5f;">الجود للسياحة والسفر</span>`;

  const hideCss = `
<style id="aljude-word-hide">
${HIDDEN_SELECTORS} { display: none !important; }
.aljude-word-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 20px; border-bottom: 3px solid #1e3a5f; margin-bottom: 16px;
  page-break-inside: avoid;
}
.aljude-word-header .doc-title {
  font-family: 'Cairo', Arial, sans-serif; font-size: 16px; font-weight: 700;
  color: #1e3a5f; direction: rtl;
}
body { margin: 1cm 1.5cm; }
@page { size: A4; margin: 1.5cm; }
.card, .hotel-card, .pkg-card, tr { page-break-inside: avoid; break-inside: avoid; }
</style>
<div class="aljude-word-header">
  ${logoHtml}
  <div class="doc-title">${titleAr}</div>
</div>`;

  if (rawHtml.includes("<body")) {
    return rawHtml.replace(/(<body[^>]*>)/, `$1\n${hideCss}\n`);
  }
  return hideCss + rawHtml;
}

const PAGES = [
  { slug: "sharm", title: "Sharm El Sheikh", titleAr: "شرم الشيخ", icon: "🏖️", file: "sharm_pricing_dashboard1_1779235360135.html" },
  { slug: "istanbul", title: "Istanbul", titleAr: "إسطنبول", icon: "🕌", file: "istanbul_pricing_dashboard_(1)111111111_1779235360139.html" },
  { slug: "georgia", title: "Georgia", titleAr: "جورجيا", icon: "🏔️", file: "georgia-dashboard_1779235360138.html" },
  { slug: "antalya", title: "Antalya", titleAr: "أنطاليا", icon: "🌊", file: "antalya_pricing_dashboard_(1)11111_1779235360138.html" },
  { slug: "aqaba", title: "Aqaba", titleAr: "العقبة", icon: "🐟", file: "aqaba_pricing_dashboard_(1)_1779235360139.html" },
  { slug: "charter", title: "Charter Flights", titleAr: "رحلات شارتر", icon: "✈️", file: "charter_dashboard_fixed_1779235360139.html" },
  { slug: "indonesia-bali", title: "Indonesia / Bali", titleAr: "إندونيسيا - بالي", icon: "🌴", file: "indonesia_bali_packages_dashboard_(2)_1779235366195.html" },
  { slug: "malaysia", title: "Malaysia", titleAr: "ماليزيا", icon: "🦁", file: "malaysia_packages_dashboard_bilingual_1779235360132.html" },
  { slug: "maldives", title: "Maldives", titleAr: "المالديف", icon: "🌺", file: "maldives_packages_bilingual_1779235360134.html" },
  { slug: "singapore", title: "Singapore", titleAr: "سنغافورة", icon: "🦁", file: "singapore_packages_dashboard_(1)_1779235360135.html" },
  { slug: "srilanka", title: "Sri Lanka", titleAr: "سريلانكا", icon: "🍵", file: "srilanka_packages_dashboard_(2)_1779235360136.html" },
  { slug: "thailand", title: "Thailand", titleAr: "تايلاند", icon: "🐘", file: "thailand_packages_bilingual_1779235360137.html" },
  { slug: "trabzon", title: "Trabzon", titleAr: "طرابزون", icon: "🌿", file: "trabzon_pricing_dashboard111111111_1779235360140.html" },
  { slug: "vietnam", title: "Vietnam", titleAr: "فيتنام", icon: "🌾", file: "vietnam_packages_dashboard_1779235360137.html" },
  { slug: "contact", title: "Contact", titleAr: "اتصل بنا", icon: "📞", file: "contact_1779235360140.html" },
];

const PAGE_MAP = new Map(PAGES.map((p) => [p.slug, p]));
const router = Router();

// ─── Logo ──────────────────────────────────────────────────────────────────────
router.get("/logo", async (_req, res) => {
  try {
    const buf = await fs.readFile(LOGO_PATH);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch {
    res.status(404).send("Logo not found");
  }
});

// ─── List pages ───────────────────────────────────────────────────────────────
router.get("/pages", (_req, res) => {
  res.json(PAGES.map(({ slug, title, titleAr, icon }) => ({ slug, title, titleAr, icon })));
});

// ─── Serve dashboard page ─────────────────────────────────────────────────────
router.get("/pages/:slug", async (req, res) => {
  const slug = String(req.params["slug"]);
  const page = PAGE_MAP.get(slug);
  if (!page) { res.status(404).send("Page not found"); return; }

  try {
    let html = await fs.readFile(path.join(PUBLIC_DIR, page.file), "utf-8");
    const inject = buildPageInject("/api/logo");

    if (html.includes("</head>")) {
      html = html.replace("</head>", `${inject}\n</head>`);
    } else if (html.includes("<body")) {
      html = html.replace(/(<body[^>]*>)/, `$1\n${inject}\n`);
    } else {
      html = inject + html;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (err) {
    req.log.error({ err, slug }, "Error serving dashboard page");
    res.status(500).send("Error loading dashboard");
  }
});

// ─── Word document export ─────────────────────────────────────────────────────
router.get("/pages/:slug/word", async (req, res) => {
  const slug = String(req.params["slug"]);
  const page = PAGE_MAP.get(slug);
  if (!page) { res.status(404).send("Page not found"); return; }

  try {
    const [rawHtml, logoBase64] = await Promise.all([
      fs.readFile(path.join(PUBLIC_DIR, page.file), "utf-8"),
      getLogoBase64(),
    ]);

    const wordHtml = buildWordExportHtml(rawHtml, logoBase64, page.titleAr);
    const filename = encodeURIComponent(`${page.title} - الجود للسياحة والسفر.doc`);

    res.setHeader("Content-Type", "application/msword");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
    res.setHeader("Cache-Control", "no-store");
    res.send(wordHtml);
  } catch (err) {
    req.log.error({ err, slug }, "Error generating Word export");
    res.status(500).send("Error generating document");
  }
});

export { PAGES };
export default router;
