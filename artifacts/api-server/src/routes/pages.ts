import { Router, type Request, type Response, type NextFunction } from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public/dashboards");
const LOGO_PATH = path.resolve(__dirname, "../public/logo.jfif");

// Cache the logo as base64 once
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

// ─── INTERNAL ELEMENTS HIDDEN IN PRINT AND WORD EXPORT ────────────────────────
const HIDDEN_SELECTORS = `
  .settings, .settings-grid, .controls-bar, .controls-inner, .formula,
  .breakdown, .bar,
  .s-box:has(#ticket), .s-box:has(#transport), .s-box:has(#profit),
  .s-box:has(#pct), .s-box:has(#rate),
  .ctrl-label, .ctrl-input, .divider, .calc-btn,
  .no-print, .admin-note, .note-internal,
  [data-print="hide"], .controls-inner .currency-toggle
`.trim();

// ─── INJECTED INTO EVERY SERVED PAGE (screen + print) ─────────────────────────
function buildPageInject(logoSrc: string): string {
  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="الجود للسياحة والسفر" style="height:60px;max-width:200px;object-fit:contain;">`
    : `<span style="font-family:'Cairo',Arial,sans-serif;font-size:18px;font-weight:700;color:#1e3a5f;">الجود للسياحة والسفر</span>`;

  return `
<style id="aljude-print-control">
/* ── Screen: hide nothing extra ── */

/* ── Print: hide all internal financial data ── */
@media print {
  ${HIDDEN_SELECTORS} {
    display: none !important;
    visibility: hidden !important;
  }
  .aljude-logo-bar { display: flex !important; }
  .card, .hotel-card, .pkg-card { break-inside: avoid; page-break-inside: avoid; }
  body, html { width: 100% !important; max-width: 100% !important; }
  @page { size: A4; margin: 1.5cm; }
}

/* ── Logo bar (visible on screen + print) ── */
.aljude-logo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: #fff;
  border-bottom: 2px solid #1e3a5f;
  margin-bottom: 8px;
}
.aljude-logo-bar .powered {
  font-family: 'Cairo', Arial, sans-serif;
  font-size: 11px;
  color: #6b7280;
  direction: rtl;
}
</style>

<script>
/* AL JUDE — PostMessage print bridge */
window.addEventListener('message', function(e) {
  if (e.data === 'aljude:print') { window.print(); }
});
if (new URLSearchParams(window.location.search).get('print') === '1') {
  window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 800); });
}
</script>

<!-- AL JUDE logo banner — injected by portal -->
<div class="aljude-logo-bar no-print-hide" style="display:flex;">
  ${logoHtml}
  <span class="powered">للاستخدام الداخلي فقط</span>
</div>`;
}

// ─── WORD EXPORT: direct hide (no @media print needed) ────────────────────────
function buildWordExportHtml(rawHtml: string, logoBase64: string, titleAr: string): string {
  const logoSrc = logoBase64
    ? `data:image/jpeg;base64,${logoBase64}`
    : "";

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="الجود للسياحة والسفر" style="height:70px;max-width:220px;object-fit:contain;">`
    : `<span style="font-size:20px;font-weight:700;color:#1e3a5f;">الجود للسياحة والسفر</span>`;

  const hideCss = `
<style id="aljude-word-hide">
/* Word export — internal data hidden directly (no @media print needed) */
${HIDDEN_SELECTORS} { display: none !important; }

/* Logo banner */
.aljude-word-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px 10px 20px;
  border-bottom: 3px solid #1e3a5f;
  margin-bottom: 16px;
  page-break-inside: avoid;
}
.aljude-word-header .doc-title {
  font-family: 'Cairo', Arial, sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #1e3a5f;
  direction: rtl;
}

/* A4 layout */
body { margin: 1cm 1.5cm; }
@page { size: A4; margin: 1.5cm; }

/* Avoid page breaks inside cards */
.card, .hotel-card, .pkg-card, tr { page-break-inside: avoid; break-inside: avoid; }
</style>

<!-- AL JUDE word header -->
<div class="aljude-word-header">
  ${logoHtml}
  <div class="doc-title">${titleAr}</div>
</div>`;

  // Inject after <body> opening tag, or before first content
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

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = req.session as Record<string, unknown>;
  if (!session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// ─── Logo static file ──────────────────────────────────────────────────────────
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
router.get("/pages", requireAuth, (_req, res) => {
  res.json(PAGES.map(({ slug, title, titleAr, icon }) => ({ slug, title, titleAr, icon })));
});

// ─── Serve dashboard page (screen + print) ────────────────────────────────────
router.get("/pages/:slug", requireAuth, async (req, res) => {
  const { slug } = req.params;
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
router.get("/pages/:slug/word", requireAuth, async (req, res) => {
  const { slug } = req.params;
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
