import { useState } from "react";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
  role: string;
  displayName: string | null;
}

interface ChangePasswordPageProps {
  user: User;
}

interface UserEntry {
  id: number;
  username: string;
  role: string;
  displayName: string | null;
}

export default function ChangePasswordPage({ user }: ChangePasswordPageProps) {
  const [, navigate] = useLocation();

  // Own password change state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [ownStatus, setOwnStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [ownLoading, setOwnLoading] = useState(false);

  // Admin: user list + reset state
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserEntry | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetStatus, setResetStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const fontStyle = { fontFamily: "Cairo, Tajawal, Arial, sans-serif" };

  // ── Change own password ──────────────────────────────────────────────────────
  const handleOwnChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setOwnStatus({ type: "error", msg: "كلمة المرور الجديدة غير متطابقة" });
      return;
    }
    if (newPw.length < 6) {
      setOwnStatus({ type: "error", msg: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    setOwnLoading(true);
    setOwnStatus(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setOwnStatus({ type: "error", msg: data.error ?? "حدث خطأ" });
      } else {
        setOwnStatus({ type: "success", msg: "تم تغيير كلمة المرور بنجاح ✓" });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      }
    } catch {
      setOwnStatus({ type: "error", msg: "فشل الاتصال بالخادم" });
    } finally {
      setOwnLoading(false);
    }
  };

  // ── Admin: load users ────────────────────────────────────────────────────────
  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const data = await res.json() as UserEntry[];
      setUsers(data);
      setUsersLoaded(true);
    } catch {
      setUsersLoaded(true);
    }
  };

  // ── Admin: reset user password ───────────────────────────────────────────────
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPw.length < 6) {
      setResetStatus({ type: "error", msg: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      return;
    }
    setResetLoading(true);
    setResetStatus(null);
    try {
      const res = await fetch(`/api/admin/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPw }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setResetStatus({ type: "error", msg: data.error ?? "حدث خطأ" });
      } else {
        setResetStatus({ type: "success", msg: `تم إعادة تعيين كلمة مرور ${resetTarget.username} بنجاح ✓` });
        setResetPw(""); setResetTarget(null);
      }
    } catch {
      setResetStatus({ type: "error", msg: "فشل الاتصال بالخادم" });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", direction: "rtl" }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)",
            ...fontStyle,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 8H3M9 2l6 6-6 6" />
          </svg>
          العودة للوحة التحكم
        </button>
        <h1 className="text-white font-bold text-lg mr-2" style={fontStyle}>
          إدارة كلمات المرور
        </h1>
      </header>

      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        {/* Change own password */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2" style={fontStyle}>
            <span>🔑</span> تغيير كلمة مرورك
          </h2>
          <form onSubmit={handleOwnChange} className="space-y-4">
            {[
              { label: "كلمة المرور الحالية", val: currentPw, set: setCurrentPw, placeholder: "أدخل كلمة المرور الحالية" },
              { label: "كلمة المرور الجديدة", val: newPw, set: setNewPw, placeholder: "6 أحرف على الأقل" },
              { label: "تأكيد كلمة المرور الجديدة", val: confirmPw, set: setConfirmPw, placeholder: "أعد إدخال كلمة المرور الجديدة" },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="block text-white/70 text-sm mb-1.5" style={fontStyle}>{label}</label>
                <input
                  type="password"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  required
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    ...fontStyle,
                  }}
                />
              </div>
            ))}

            {ownStatus && (
              <div
                className="px-4 py-3 rounded-xl text-sm"
                style={{
                  background: ownStatus.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${ownStatus.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: ownStatus.type === "success" ? "#4ade80" : "#f87171",
                  ...fontStyle,
                }}
              >
                {ownStatus.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={ownLoading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
              style={{
                background: ownLoading ? "rgba(37,99,235,0.4)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                border: "1px solid rgba(59,130,246,0.3)",
                cursor: ownLoading ? "not-allowed" : "pointer",
                ...fontStyle,
              }}
            >
              {ownLoading ? "جاري الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        </div>

        {/* Admin section: reset any user's password */}
        {user.role === "admin" && (
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h2 className="text-white font-bold text-base mb-5 flex items-center gap-2" style={fontStyle}>
              <span>👑</span> إعادة تعيين كلمة مرور موظف (مدير فقط)
            </h2>

            {!usersLoaded ? (
              <button
                onClick={loadUsers}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  cursor: "pointer",
                  ...fontStyle,
                }}
              >
                عرض قائمة المستخدمين
              </button>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setResetTarget(u); setResetPw(""); setResetStatus(null); }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-right"
                      style={{
                        background: resetTarget?.id === u.id ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                        border: resetTarget?.id === u.id ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      <span className="text-sm" style={fontStyle}>
                        {u.displayName ?? u.username}
                        <span className="text-white/40 text-xs mr-2">({u.role === "admin" ? "مدير" : "موظف"})</span>
                      </span>
                      <span className="text-white/40 text-xs" style={fontStyle}>اختر</span>
                    </button>
                  ))}
                </div>

                {resetTarget && (
                  <form onSubmit={handleReset} className="space-y-3">
                    <p className="text-white/60 text-sm" style={fontStyle}>
                      إعادة تعيين كلمة مرور: <span className="text-white font-bold">{resetTarget.username}</span>
                    </p>
                    <input
                      type="password"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                      required
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        ...fontStyle,
                      }}
                    />
                    {resetStatus && (
                      <div
                        className="px-4 py-3 rounded-xl text-sm"
                        style={{
                          background: resetStatus.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          border: `1px solid ${resetStatus.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                          color: resetStatus.type === "success" ? "#4ade80" : "#f87171",
                          ...fontStyle,
                        }}
                      >
                        {resetStatus.msg}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full py-3 rounded-xl text-white font-bold text-sm"
                      style={{
                        background: resetLoading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                        border: "1px solid rgba(139,92,246,0.3)",
                        cursor: resetLoading ? "not-allowed" : "pointer",
                        ...fontStyle,
                      }}
                    >
                      {resetLoading ? "جاري الحفظ..." : "إعادة تعيين كلمة المرور"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
