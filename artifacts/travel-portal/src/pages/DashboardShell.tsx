import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLogout, useListPages } from "@workspace/api-client-react";

interface User {
  id: number;
  username: string;
  role: string;
  displayName: string | null;
}

interface DashboardShellProps {
  user: User;
  activePage?: string;
  onLogout: () => void;
}

export default function DashboardShell({ user, activePage, onLogout }: DashboardShellProps) {
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const queryClient = useQueryClient();

  const { data: pages = [] } = useListPages();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        onLogout();
      },
    },
  });

  const currentPage = pages.find((p) => p.slug === activePage) ?? pages[0];

  const handlePageClick = (slug: string) => {
    navigate(`/${slug}`);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    setPrinting(true);
    try {
      iframe.contentWindow?.postMessage("aljude:print", "*");
    } catch {
      const src = iframe.src;
      if (src) window.open(src + (src.includes("?") ? "&" : "?") + "print=1", "_blank");
    }
    setTimeout(() => setPrinting(false), 2000);
  }, []);

  const handleWordDownload = useCallback(async () => {
    if (!currentPage || !iframeRef.current) return;

    const HIDE_CSS = `
      .settings,.settings-grid,.controls-bar,.controls-inner,.formula,
      .breakdown,.bar,
      .s-box:has(#ticket),.s-box:has(#transport),.s-box:has(#profit),
      .s-box:has(#pct),.s-box:has(#rate),
      .ctrl-label,.ctrl-input,.divider,.calc-btn,
      .no-print,.admin-note,.note-internal,
      [data-print="hide"],.controls-inner .currency-toggle { display:none!important; }
    `;

    const iframeDoc = iframeRef.current.contentDocument;
    let hideEl: HTMLStyleElement | null = null;

    try {
      if (!iframeDoc) throw new Error("Cannot access dashboard");

      hideEl = iframeDoc.createElement("style");
      hideEl.id = "aljude-word-hide";
      hideEl.textContent = HIDE_CSS;
      iframeDoc.head.appendChild(hideEl);

      const [
        { default: html2canvas },
        { Document, Paragraph, ImageRun, TextRun, AlignmentType, HeadingLevel, Packer },
        { saveAs },
        logoRes,
      ] = await Promise.all([
        import("html2canvas"),
        import("docx"),
        import("file-saver"),
        fetch("/api/logo", { credentials: "include" }).catch(() => null),
      ]);

      // Capture full dashboard
      const body = iframeDoc.body;
      const canvas = await html2canvas(body, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
        windowWidth: Math.max(body.scrollWidth, 1200),
        windowHeight: body.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        width: body.scrollWidth,
        height: body.scrollHeight,
      });
      const dashImgBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas blob failed"))), "image/jpeg", 0.92);
      });
      const dashImgBuf = await dashImgBlob.arrayBuffer();

      // A4 at 96 dpi: 794 × 1123 px — we use EMU (914400 EMU = 1 inch, A4 usable width ≈ 6.27 inch)
      const A4_WIDTH_EMU = 5748_300; // ~6.27 inches in EMU
      const aspectRatio = canvas.height / canvas.width;
      const dashImgHeight = Math.round(A4_WIDTH_EMU * aspectRatio);

      const children: InstanceType<typeof Paragraph>[] = [];

      // ── Logo header ──
      if (logoRes?.ok) {
        const logoBuf = await logoRes.arrayBuffer();
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new ImageRun({
                data: logoBuf,
                transformation: { width: 120, height: 120 },
                type: "jpg",
              }),
            ],
          })
        );
      }

      // ── Company name ──
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "الجود للسياحة والسفر", bold: true, size: 40, color: "1e3a5f" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "AL JUDE Travel & Tourism", size: 24, color: "6b7280" })],
        }),

        // ── Destination title ──
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({ text: `${currentPage.titleAr}  —  ${currentPage.title}`, bold: true, size: 32, color: "1e3a5f" }),
          ],
        }),

        // ── Dashboard image ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 500 },
          children: [
            new ImageRun({
              data: dashImgBuf,
              transformation: { width: Math.round(A4_WIDTH_EMU / 9525), height: Math.round(dashImgHeight / 9525) },
              type: "jpg",
            }),
          ],
        }),

        // ── Editable notes section ──
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 400, after: 200 },
          children: [new TextRun({ text: "ملاحظات الموظف / Employee Notes", bold: true, size: 28, color: "374151" })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "يمكنك تعديل هذا القسم وإضافة ملاحظاتك هنا..." , color: "9ca3af", italics: true })],
        }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ children: [new TextRun("")] }),
        new Paragraph({ children: [new TextRun("")] }),

        // ── Footer ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 },
          children: [
            new TextRun({
              text: `وثيقة داخلية — الجود للسياحة والسفر — ${new Date().toLocaleDateString("ar-SA")}`,
              size: 18,
              color: "9ca3af",
              italics: true,
            }),
          ],
        }),
      );

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 720, bottom: 720, left: 900, right: 900 },
              },
            },
            children,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${currentPage.titleAr} - الجود للسياحة والسفر.docx`);
    } catch (err) {
      console.error("Word download failed:", err);
      alert("تعذّر إنشاء ملف Word. يرجى المحاولة مرة أخرى.");
    } finally {
      if (hideEl) hideEl.remove();
    }
  }, [currentPage]);

  const handlePdfDownload = useCallback(async () => {
    if (!currentPage || !iframeRef.current) return;
    setPdfLoading(true);

    const HIDE_CSS = `
      .settings,.settings-grid,.controls-bar,.controls-inner,.formula,
      .breakdown,.bar,
      .s-box:has(#ticket),.s-box:has(#transport),.s-box:has(#profit),
      .s-box:has(#pct),.s-box:has(#rate),
      .ctrl-label,.ctrl-input,.divider,.calc-btn,
      .no-print,.admin-note,.note-internal,
      [data-print="hide"],.controls-inner .currency-toggle { display:none!important; }
    `;

    const iframeDoc = iframeRef.current.contentDocument;
    let hideEl: HTMLStyleElement | null = null;

    try {
      if (!iframeDoc) throw new Error("Cannot access dashboard content");

      hideEl = iframeDoc.createElement("style");
      hideEl.id = "aljude-pdf-hide";
      hideEl.textContent = HIDE_CSS;
      iframeDoc.head.appendChild(hideEl);

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const body = iframeDoc.body;
      const fullHeight = body.scrollHeight;
      const fullWidth = body.scrollWidth;

      const canvas = await html2canvas(body, {
        useCORS: true,
        allowTaint: true,
        scale: 1.5,
        windowWidth: Math.max(fullWidth, 1200),
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0,
        width: fullWidth,
        height: fullHeight,
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL("image/jpeg", 0.93);
      const imgTotalH = (canvas.height * pageW) / canvas.width;

      let remainingH = imgTotalH;
      let pageIdx = 0;
      while (remainingH > 0) {
        if (pageIdx > 0) pdf.addPage();
        const srcY = pageIdx * pageH;
        pdf.addImage(imgData, "JPEG", 0, -srcY, pageW, imgTotalH);
        remainingH -= pageH;
        pageIdx++;
      }

      pdf.save(`${currentPage.titleAr} - الجود للسياحة والسفر.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("تعذّر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    } finally {
      if (hideEl) hideEl.remove();
      setPdfLoading(false);
    }
  }, [currentPage]);

  const iframeSrc = currentPage ? `/api/pages/${currentPage.slug}` : "";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0f172a" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 overflow-hidden flex-shrink-0"
        style={{
          width: sidebarOpen ? "260px" : "0px",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Sidebar Header */}
        <div
          className="flex flex-col items-center py-6 px-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="text-4xl mb-2">✈️</div>
          <h1
            className="text-white font-bold text-base text-center leading-tight"
            style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif", direction: "rtl" }}
          >
            الجود للسياحة والسفر
          </h1>
          <p className="text-blue-400/70 text-xs mt-1 tracking-wider">AL JUDE Travel</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p
            className="text-white/30 text-xs uppercase tracking-widest mb-3 px-2"
            style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}
          >
            الوجهات السياحية
          </p>
          {pages.map((page) => {
            const isActive = page.slug === currentPage?.slug;
            return (
              <button
                key={page.slug}
                onClick={() => handlePageClick(page.slug)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-right transition-all"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(37,99,235,0.3), rgba(29,78,216,0.2))"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(59,130,246,0.3)"
                    : "1px solid transparent",
                  color: isActive ? "#93c5fd" : "rgba(255,255,255,0.6)",
                  fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                  }
                }}
              >
                <span className="text-lg flex-shrink-0">{page.icon}</span>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium leading-tight">{page.titleAr}</span>
                  <span className="text-xs opacity-60 leading-tight">{page.title}</span>
                </div>
                {isActive && (
                  <div
                    className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0"
                    style={{ background: "#3b82f6" }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info / Logout */}
        <div
          className="p-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              {(user.displayName ?? user.username)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p
                className="text-white/90 text-sm font-medium truncate"
                style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}
              >
                {user.displayName ?? user.username}
              </p>
              <p className="text-white/40 text-xs">
                {user.role === "admin" ? "مدير" : "موظف"}
              </p>
            </div>
          </div>
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full py-2 rounded-xl text-sm transition-all"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "rgba(239,68,68,0.8)",
              fontFamily: "Cairo, Tajawal, Arial, sans-serif",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.2)";
              e.currentTarget.style.color = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.1)";
              e.currentTarget.style.color = "rgba(239,68,68,0.8)";
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Bar */}
        <header
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{
            background: "rgba(15,23,42,0.95)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
            }}
            title="تبديل القائمة الجانبية"
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="15" y2="6" />
              <line x1="3" y1="10" x2="15" y2="10" />
              <line x1="3" y1="14" x2="15" y2="14" />
            </svg>
          </button>

          {/* Page Title */}
          {currentPage && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xl">{currentPage.icon}</span>
              <div className="min-w-0">
                <h2
                  className="text-white font-semibold text-sm leading-tight truncate"
                  style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}
                >
                  {currentPage.titleAr}
                </h2>
                <p className="text-white/40 text-xs">{currentPage.title}</p>
              </div>
            </div>
          )}

          {/* Print / Export Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Print / PDF */}
            <button
              onClick={handlePrint}
              disabled={printing || !currentPage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: printing
                  ? "rgba(37,99,235,0.3)"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "white",
                fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: printing ? "none" : "0 2px 10px rgba(37,99,235,0.3)",
                cursor: printing || !currentPage ? "not-allowed" : "pointer",
                opacity: printing || !currentPage ? 0.7 : 1,
              }}
              title="طباعة / تصدير PDF — البيانات الداخلية مخفية تلقائياً"
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9H4.5a2 2 0 0 1-2-2V3h15v4a2 2 0 0 1-2 2H14" />
                <rect x="6" y="11" width="8" height="5" rx="1" />
                <path d="M6 3V1h8v2" />
              </svg>
              {printing ? "..." : "طباعة / PDF"}
            </button>

            {/* PDF download */}
            <button
              onClick={handlePdfDownload}
              disabled={pdfLoading || !currentPage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: pdfLoading || !currentPage
                  ? "rgba(220,38,38,0.2)"
                  : "linear-gradient(135deg, #dc2626, #b91c1c)",
                color: "white",
                fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                border: "1px solid rgba(239,68,68,0.3)",
                boxShadow: pdfLoading || !currentPage ? "none" : "0 2px 10px rgba(220,38,38,0.3)",
                cursor: pdfLoading || !currentPage ? "not-allowed" : "pointer",
                opacity: pdfLoading || !currentPage ? 0.6 : 1,
                minWidth: "110px",
              }}
              title="تحميل كملف PDF — البيانات الداخلية مخفية والشعار مضمّن"
            >
              {pdfLoading ? (
                <>
                  <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  <span>جاري الإنشاء...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9,15 12,18 15,15"/>
                  </svg>
                  <span>تحميل PDF</span>
                </>
              )}
            </button>

            {/* Word download */}
            <button
              onClick={handleWordDownload}
              disabled={!currentPage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: !currentPage
                  ? "rgba(21,128,61,0.2)"
                  : "linear-gradient(135deg, #15803d, #166534)",
                color: "white",
                fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                border: "1px solid rgba(34,197,94,0.3)",
                boxShadow: !currentPage ? "none" : "0 2px 10px rgba(21,128,61,0.3)",
                cursor: !currentPage ? "not-allowed" : "pointer",
                opacity: !currentPage ? 0.6 : 1,
              }}
              title="تحميل كملف Word — البيانات الداخلية مخفية والشعار مضمّن"
            >
              {/* W icon */}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 12l1.5 6 1.5-4.5 1.5 4.5L14 12" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
              تحميل Word
            </button>

            {/* Security badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "rgba(34,197,94,0.8)",
                fontFamily: "Cairo, Tajawal, Arial, sans-serif",
              }}
              title="البيانات المالية الداخلية مخفية تلقائياً في الطباعة والتصدير"
            >
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0 1 10 0v2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zm8-2v2H7V7a3 3 0 0 1 6 0z" clipRule="evenodd" />
              </svg>
              <span>مؤمّن</span>
            </div>
          </div>
        </header>

        {/* iFrame Content */}
        <div className="flex-1 overflow-hidden relative">
          {!currentPage ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-5xl mb-4">🌍</div>
                <p
                  className="text-white/50"
                  style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}
                >
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
              className="w-full h-full border-0"
              style={{ display: "block" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          )}
        </div>
      </div>
    </div>
  );
}
