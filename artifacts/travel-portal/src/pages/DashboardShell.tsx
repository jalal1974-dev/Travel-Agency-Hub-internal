import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useListPages } from "@workspace/api-client-react";

interface User {
  id: number;
  username: string;
  role: string;
  displayName: string | null;
}

interface DashboardShellProps {
  user?: User;
  activePage?: string;
  onLogout?: () => void;
}

// CSS to hide internal/admin fields from all exports
const EXPORT_HIDE_CSS = `
  .settings, .settings-grid, .controls-bar, .controls-inner, .formula,
  .breakdown, .bar,
  .s-box:has(#ticket), .s-box:has(#transport), .s-box:has(#profit),
  .s-box:has(#pct), .s-box:has(#rateUsd), .s-box:has(#rateEur),
  .ctrl-label, .ctrl-input, .divider, .calc-btn,
  .no-print, .admin-note, .note-internal,
  [data-print="hide"], .controls-inner .currency-toggle,
  .aljude-export-toolbar { display:none!important; }
`;

export default function DashboardShell({ activePage }: DashboardShellProps) {
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { data: pages = [] } = useListPages();

  const currentPage = pages.find((p: { slug: string }) => p.slug === activePage) ?? (activePage ? undefined : pages[0]);

  const handlePageClick = (slug: string) => {
    navigate(`/${slug}`);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // ─── Full Page Screenshot ──────────────────────────────────────────────────────
  const handleFullScreenshot = useCallback(async () => {
    if (!currentPage) return;
    setExportLoading("screenshot");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) throw new Error("iframe not ready");
      const doc = iframe.contentDocument;
      const body = doc.body;

      const style = doc.createElement("style");
      style.id = "__export_hide__";
      style.textContent = EXPORT_HIDE_CSS;
      doc.head.appendChild(style);

      const canvas = await html2canvas(body, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        windowWidth: 1280,
        windowHeight: body.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        width: body.scrollWidth,
        height: body.scrollHeight,
        backgroundColor: "#0f172a",
      });

      doc.head.removeChild(style);

      const link = document.createElement("a");
      link.download = `${currentPage.titleAr} - الجود للسياحة والسفر.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
      alert("تعذّر أخذ لقطة الشاشة. يرجى المحاولة مرة أخرى.");
    } finally {
      setExportLoading(null);
    }
  }, [currentPage]);

  // ─── Full Page PDF ─────────────────────────────────────────────────────────────
  const handlePdfDownload = useCallback(() => {
    if (!currentPage) return;
    window.open(`/api/pages/${currentPage.slug}?print=1`, "_blank");
  }, [currentPage]);

  // ─── Full Page PPTX ────────────────────────────────────────────────────────────
  const handlePptxDownload = useCallback(async () => {
    if (!currentPage) return;
    setExportLoading("pptx");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: PptxGenJS } = await import("pptxgenjs");
      const iframe = iframeRef.current;
      if (!iframe?.contentDocument) throw new Error("iframe not ready");
      const doc = iframe.contentDocument;
      const body = doc.body;

      const style = doc.createElement("style");
      style.id = "__export_hide__";
      style.textContent = EXPORT_HIDE_CSS;
      doc.head.appendChild(style);

      const canvas = await html2canvas(body, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        windowWidth: 1280,
        windowHeight: body.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        width: body.scrollWidth,
        height: body.scrollHeight,
        backgroundColor: "#0f172a",
      });

      doc.head.removeChild(style);

      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
      pptx.layout = "WIDE";

      const SLIDE_W = 13.33;
      const SLIDE_H = 7.5;
      const imgAspect = canvas.width / canvas.height;
      const imgHeightInches = SLIDE_W / imgAspect;

      if (imgHeightInches <= SLIDE_H * 1.3) {
        // Single slide
        const slide = pptx.addSlide();
        slide.background = { color: "0f172a" };
        slide.addImage({ data: canvas.toDataURL("image/png"), x: 0, y: 0, w: SLIDE_W, h: Math.min(imgHeightInches, SLIDE_H) });
        slide.addText(`${currentPage.titleAr}  |  الجود للسياحة والسفر`, {
          x: 0, y: SLIDE_H - 0.4, w: SLIDE_W, h: 0.35,
          fontSize: 10, color: "fbbf24", align: "center", fontFace: "Arial", bold: true,
        });
      } else {
        // Multiple slides
        const pixelsPerSlide = Math.floor(canvas.height * (SLIDE_H / imgHeightInches));
        let yOffset = 0;
        let slideIdx = 0;
        while (yOffset < canvas.height) {
          const sliceH = Math.min(pixelsPerSlide, canvas.height - yOffset);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(canvas, 0, -yOffset);
          const slide = pptx.addSlide();
          slide.background = { color: "0f172a" };
          slide.addImage({ data: sliceCanvas.toDataURL("image/png"), x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
          if (slideIdx === 0) {
            slide.addText(`${currentPage.titleAr}`, {
              x: 0, y: 0.1, w: SLIDE_W, h: 0.5,
              fontSize: 20, color: "fbbf24", align: "center", fontFace: "Arial", bold: true,
            });
          }
          slide.addText(`الجود للسياحة والسفر  |  AL JUDE Travel & Tourism  |  +962777066005`, {
            x: 0, y: SLIDE_H - 0.35, w: SLIDE_W, h: 0.3,
            fontSize: 9, color: "fbbf24", align: "center", fontFace: "Arial", bold: true,
          });
          yOffset += sliceH;
          slideIdx++;
        }
      }

      await pptx.writeFile({ fileName: `${currentPage.titleAr} - الجود للسياحة والسفر.pptx` });
    } catch (err) {
      console.error("PPTX failed:", err);
      alert("تعذّر إنشاء ملف PPTX. يرجى المحاولة مرة أخرى.");
    } finally {
      setExportLoading(null);
    }
  }, [currentPage]);

  // ─── WhatsApp share ────────────────────────────────────────────────────────────
  const handleWhatsApp = useCallback(() => {
    if (!currentPage) return;
    const msg = [
      `✈️ عرض سياحي خاص — ${currentPage.titleAr}`,
      ``,
      `نقدم لكم أفضل عروض السفر إلى *${currentPage.titleAr}* (${currentPage.title})`,
      ``,
      `🏨 تشمل العروض: فنادق متنوعة، برامج سياحية، وباقات عائلية`,
      `💰 أسعار تنافسية وخدمة متميزة`,
      ``,
      `للاستفسار والحجز يرجى التواصل معنا`,
      ``,
      `شركة الجود للسياحة والسفر`,
      `AL JUDE Travel & Tourism`,
      `📞 +962777066005`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }, [currentPage]);

  const iframeSrc = currentPage ? `/api/pages/${currentPage.slug}` : "";

  const btnStyle = (color: string, disabled: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    fontFamily: "Cairo, Tajawal, Arial, sans-serif",
    whiteSpace: "nowrap" as const,
    background: disabled ? `${color}33` : color,
    color: "white",
    opacity: disabled ? 0.55 : 1,
    transition: "opacity 0.2s",
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#0f172a" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarOpen ? "260px" : "0px",
          minWidth: sidebarOpen ? "260px" : "0px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          transition: "width 0.3s, min-width 0.3s",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "24px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "8px" }}>✈️</div>
          <div style={{ color: "white", fontWeight: 800, fontSize: "15px", fontFamily: "Cairo, Tajawal, Arial, sans-serif", direction: "rtl" }}>
            الجود للسياحة والسفر
          </div>
          <div style={{ color: "#60a5fa", fontSize: "11px", marginTop: "4px", letterSpacing: "0.05em" }}>
            AL JUDE Travel
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", marginTop: "6px", fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}>
            لوحة الموظفين الداخلية
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {pages.map((page: { slug: string; titleAr: string; title: string; icon: string }) => {
            const isActive = currentPage?.slug === page.slug;
            return (
              <button
                key={page.slug}
                onClick={() => handlePageClick(page.slug)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  marginBottom: "4px",
                  border: isActive ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
                  background: isActive ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.15))" : "transparent",
                  color: isActive ? "white" : "rgba(255,255,255,0.6)",
                  fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                  cursor: "pointer",
                  textAlign: "right" as const,
                  direction: "rtl",
                }}
              >
                <span style={{ fontSize: "18px", flexShrink: 0 }}>{page.icon}</span>
                <span style={{ fontSize: "13px", fontWeight: isActive ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {page.titleAr}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "linear-gradient(90deg, #1e293b 0%, #0f172a 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
            flexWrap: "wrap",
            minHeight: "56px",
          }}
        >
          {/* Toggle sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            style={{
              padding: "7px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="تبديل القائمة الجانبية"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Page title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: "14px", fontFamily: "Cairo, Tajawal, Arial, sans-serif", direction: "rtl", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentPage ? `${currentPage.icon} ${currentPage.titleAr}` : "اختر وجهة"}
            </div>
          </div>

          {/* Export buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>

            {/* PPTX - Highest Priority */}
            <button
              onClick={handlePptxDownload}
              disabled={!currentPage || exportLoading === "pptx"}
              style={btnStyle("linear-gradient(135deg, #ea580c, #c2410c)", !currentPage || exportLoading === "pptx")}
              title="تصدير PowerPoint — أعلى جودة للإرسال للعميل"
            >
              {exportLoading === "pptx" ? (
                <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
                </svg>
              )}
              {exportLoading === "pptx" ? "جاري..." : "⬇ PPTX"}
            </button>

            {/* Screenshot */}
            <button
              onClick={handleFullScreenshot}
              disabled={!currentPage || exportLoading === "screenshot"}
              style={btnStyle("linear-gradient(135deg, #7c3aed, #5b21b6)", !currentPage || exportLoading === "screenshot")}
              title="صورة عالية الجودة للصفحة كاملة"
            >
              {exportLoading === "screenshot" ? (
                <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              )}
              {exportLoading === "screenshot" ? "جاري..." : "⬇ صورة PNG"}
            </button>

            {/* PDF */}
            <button
              onClick={handlePdfDownload}
              disabled={!currentPage || exportLoading === "pdf"}
              style={btnStyle("linear-gradient(135deg, #dc2626, #991b1b)", !currentPage || exportLoading === "pdf")}
              title="تصدير PDF"
            >
              {exportLoading === "pdf" ? (
                <svg style={{ animation: "spin 1s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/>
                </svg>
              )}
              {exportLoading === "pdf" ? "جاري..." : "⬇ PDF"}
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              disabled={!currentPage}
              style={btnStyle("linear-gradient(135deg, #25d366, #128c7e)", !currentPage)}
              title="مشاركة عبر واتساب"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.527 5.845L.057 23.885l6.19-1.623A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.875 9.875 0 0 1-5.034-1.378l-.361-.214-3.735.979.997-3.648-.235-.374A9.86 9.86 0 0 1 2.118 12C2.118 6.535 6.535 2.118 12 2.118S21.882 6.535 21.882 12 17.465 21.882 12 21.882z"/>
              </svg>
              واتساب
            </button>
          </div>
        </header>

        {/* iFrame */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {!currentPage ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>🌍</div>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "18px", fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}>
                  اختر وجهة من القائمة الجانبية
                </p>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              key={currentPage.slug}
              src={iframeSrc}
              title={currentPage.titleAr}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
