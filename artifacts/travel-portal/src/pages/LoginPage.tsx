import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLogin } from "@workspace/api-client-react";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        onLogin();
      },
      onError: () => {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 10px)",
          }}
        />
      </div>

      {/* Decorative circles */}
      <div
        className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }}
      />
      <div
        className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #1d4ed8, transparent)" }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✈️</div>
          <h1
            className="text-3xl font-bold text-white mb-1"
            style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif", direction: "rtl" }}
          >
            الجود للسياحة والسفر
          </h1>
          <p className="text-blue-300 text-sm tracking-widest uppercase">
            AL JUDE Travel &amp; Tourism
          </p>
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <p
            className="text-white/50 text-sm mt-3"
            style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif", direction: "rtl" }}
          >
            نظام الموظفين الداخلي
          </p>
        </div>

        {/* Login Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <form onSubmit={handleSubmit} dir="rtl">
            <div className="mb-5">
              <label
                className="block text-white/80 text-sm mb-2"
                style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}
              >
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(59,130,246,0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div className="mb-6">
              <label
                className="block text-white/80 text-sm mb-2"
                style={{ fontFamily: "Cairo, Tajawal, Arial, sans-serif" }}
              >
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(59,130,246,0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.15)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div
                className="mb-4 p-3 rounded-xl text-red-300 text-sm text-center"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all"
              style={{
                background: loginMutation.isPending
                  ? "rgba(59,130,246,0.5)"
                  : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                boxShadow: loginMutation.isPending
                  ? "none"
                  : "0 4px 20px rgba(37,99,235,0.4)",
              }}
            >
              {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          للاستخدام الداخلي فقط — Internal Use Only
        </p>
      </div>
    </div>
  );
}
