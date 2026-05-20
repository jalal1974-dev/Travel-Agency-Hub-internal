import { Router, type Request, type Response, type NextFunction } from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../../public/dashboards");

const PRINT_CSS = `
<style id="aljude-print-control">
/* ===== AL JUDE Print Security CSS — hides all internal financial data ===== */
@media print {
  /* Internal settings panels */
  .settings,
  .settings-grid,
  .controls-bar,
  .controls-inner,
  .formula,
  /* Cost breakdown sections */
  .breakdown,
  /* Bottom info bar showing internal costs */
  .bar,
  /* Individual cost input boxes containing ticket/transport/profit */
  .s-box:has(#ticket),
  .s-box:has(#transport),
  .s-box:has(#profit),
  .s-box:has(#pct),
  .s-box:has(#rate),
  /* Georgia-style controls */
  .ctrl-label,
  .ctrl-input,
  .divider,
  /* Recalculate button */
  .calc-btn,
  /* Any element explicitly marked no-print */
  .no-print,
  /* Admin notes */
  .admin-note,
  .note-internal,
  /* Print hide utilities */
  [data-print="hide"],
  /* Currency toggle within controls (not the public ones) */
  .controls-inner .currency-toggle {
    display: none !important;
    visibility: hidden !important;
  }

  /* Ensure proper page breaks */
  .card, .hotel-card, .pkg-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Full width on print */
  body, html {
    width: 100% !important;
    max-width: 100% !important;
  }

  /* A4 optimization */
  @page {
    size: A4;
    margin: 1.5cm;
  }
}
</style>
`;

const PAGES = [
  {
    slug: "sharm",
    title: "Sharm El Sheikh",
    titleAr: "شرم الشيخ",
    icon: "🏖️",
    file: "sharm_pricing_dashboard1_1779235360135.html",
  },
  {
    slug: "istanbul",
    title: "Istanbul",
    titleAr: "إسطنبول",
    icon: "🕌",
    file: "istanbul_pricing_dashboard_(1)111111111_1779235360139.html",
  },
  {
    slug: "georgia",
    title: "Georgia",
    titleAr: "جورجيا",
    icon: "🏔️",
    file: "georgia-dashboard_1779235360138.html",
  },
  {
    slug: "antalya",
    title: "Antalya",
    titleAr: "أنطاليا",
    icon: "🌊",
    file: "antalya_pricing_dashboard_(1)11111_1779235360138.html",
  },
  {
    slug: "aqaba",
    title: "Aqaba",
    titleAr: "العقبة",
    icon: "🐟",
    file: "aqaba_pricing_dashboard_(1)_1779235360139.html",
  },
  {
    slug: "charter",
    title: "Charter Flights",
    titleAr: "رحلات شارتر",
    icon: "✈️",
    file: "charter_dashboard_fixed_1779235360139.html",
  },
  {
    slug: "indonesia-bali",
    title: "Indonesia / Bali",
    titleAr: "إندونيسيا - بالي",
    icon: "🌴",
    file: "indonesia_bali_packages_dashboard_(2)_1779235366195.html",
  },
  {
    slug: "malaysia",
    title: "Malaysia",
    titleAr: "ماليزيا",
    icon: "🦁",
    file: "malaysia_packages_dashboard_bilingual_1779235360132.html",
  },
  {
    slug: "maldives",
    title: "Maldives",
    titleAr: "المالديف",
    icon: "🌺",
    file: "maldives_packages_bilingual_1779235360134.html",
  },
  {
    slug: "singapore",
    title: "Singapore",
    titleAr: "سنغافورة",
    icon: "🦁",
    file: "singapore_packages_dashboard_(1)_1779235360135.html",
  },
  {
    slug: "srilanka",
    title: "Sri Lanka",
    titleAr: "سريلانكا",
    icon: "🍵",
    file: "srilanka_packages_dashboard_(2)_1779235360136.html",
  },
  {
    slug: "thailand",
    title: "Thailand",
    titleAr: "تايلاند",
    icon: "🐘",
    file: "thailand_packages_bilingual_1779235360137.html",
  },
  {
    slug: "trabzon",
    title: "Trabzon",
    titleAr: "طرابزون",
    icon: "🌿",
    file: "trabzon_pricing_dashboard111111111_1779235360140.html",
  },
  {
    slug: "vietnam",
    title: "Vietnam",
    titleAr: "فيتنام",
    icon: "🌾",
    file: "vietnam_packages_dashboard_1779235360137.html",
  },
  {
    slug: "contact",
    title: "Contact",
    titleAr: "اتصل بنا",
    icon: "📞",
    file: "contact_1779235360140.html",
  },
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

router.get("/pages", requireAuth, (_req, res) => {
  res.json(
    PAGES.map(({ slug, title, titleAr, icon }) => ({
      slug,
      title,
      titleAr,
      icon,
    })),
  );
});

router.get("/pages/:slug", requireAuth, async (req, res) => {
  const { slug } = req.params;
  const page = PAGE_MAP.get(slug);

  if (!page) {
    res.status(404).send("Page not found");
    return;
  }

  try {
    let html = await fs.readFile(path.join(PUBLIC_DIR, page.file), "utf-8");

    // Inject print CSS before </head>
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${PRINT_CSS}\n</head>`);
    } else {
      html = PRINT_CSS + html;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    req.log.error({ err, slug }, "Error serving dashboard page");
    res.status(500).send("Error loading dashboard");
  }
});

export { PAGES };
export default router;
