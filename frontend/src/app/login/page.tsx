"use client";
/**
 * 🔑 Member Login Page — Shubhalagnam Mana Vivaha
 * ==============================================================
 * • Password Login & SMS/WhatsApp OTP Login
 * • Forgot Password with instant OTP Reset flow
 * • Quick Demo 1-Click Access for instant evaluation
 * • Resend OTP countdown timer & crisp error messages
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { useRouter } from "next/navigation";
import { rememberSession, sendOtp, verifyOtp } from "@/lib/auth";
import { apiPost } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";

  const [tab, setTab] = useState<"password" | "otp">("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"err" | "ok" | "info">("info");
  const [devCode, setDevCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [keep, setKeep] = useState(true);

  // Forgot password state
  const [forgot, setForgot] = useState(false);
  const [fStage, setFStage] = useState<"phone" | "reset">("phone");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // Resend OTP countdown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const digits = () => phone.replace(/\D/g, "");

  const showFeedback = (text: string, type: "err" | "ok" | "info" = "info") => {
    setMsg(text);
    setMsgType(type);
  };

  const go = (tsapId: string, token: string, hasAccount: boolean) => {
    rememberSession(tsapId, token, keep);
    setTimeout(() => {
      router.push(hasAccount ? "/requests" : "/register?phone=" + digits());
    }, 600);
  };

  async function onPasswordLogin() {
    const p = digits();
    if (p.length !== 10) {
      showFeedback(te ? "⚠️ దయచేసి 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి" : "⚠️ Please enter a valid 10-digit mobile number", "err");
      return;
    }
    if (!password) {
      showFeedback(te ? "⚠️ దయచేసి మీ పాస్‌వర్డ్ ఎంటర్ చేయండి (లేదా OTP లాగిన్ వాడండి)" : "⚠️ Please enter your password (or use OTP login)", "err");
      return;
    }
    setBusy(true);
    showFeedback("");
    const { ok, data, errorTelugu } = await apiPost<{ auth_token?: string; tsap_id?: string; message_telugu?: string }>(
      "/api/auth/login-password", { phone: p, password }
    );
    setBusy(false);
    if (!ok) {
      showFeedback(errorTelugu || (te ? "లాగిన్ విఫలమైంది. పాస్‌వర్డ్ సరిచూసుకోండి." : "Login failed. Check credentials."), "err");
      return;
    }
    showFeedback(data?.message_telugu || (te ? "✅ లాగిన్ విజయవంతమైంది! మీ ఖాతాలోకి వెళ్తున్నారు..." : "✅ Login successful! Redirecting..."), "ok");
    go(String(data?.tsap_id || ""), String(data?.auth_token || ""), true);
  }

  async function onSend() {
    const p = digits();
    if (p.length !== 10) {
      showFeedback(te ? "⚠️ 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి (6/7/8/9 తో ప్రారంభం)" : "⚠️ Enter 10-digit mobile number (starts 6/7/8/9)", "err");
      return;
    }
    setBusy(true);
    showFeedback("");
    const { ok, data, errorTelugu } = await sendOtp(p);
    setBusy(false);
    if (!ok) {
      showFeedback(errorTelugu || (te ? "OTP పంపడంలో సమస్య ఏర్పడింది." : "Failed to send OTP."), "err");
      return;
    }
    const d = (data || {}) as { dev_code?: string; message_telugu?: string };
    setStage("otp");
    setDevCode(d.dev_code || "");
    setCountdown(30);
    showFeedback(d.message_telugu || (te ? "📱 OTP పంపించాం — మీ SMS/WhatsApp తనిఖీ చేయండి" : "📱 OTP sent — please check your SMS/WhatsApp"), "ok");
  }

  async function onVerify() {
    const c = code.trim();
    if (!c || c.length < 4) {
      showFeedback(te ? "⚠️ దయచేసి OTP కోడ్ నమోదు చేయండి" : "⚠️ Please enter the OTP code", "err");
      return;
    }
    setBusy(true);
    showFeedback("");
    const { ok, data, errorTelugu } = await verifyOtp(digits(), c);
    setBusy(false);
    if (!ok) {
      showFeedback(errorTelugu || (te ? "తప్పుడు OTP. మళ్లీ ప్రయత్నించండి." : "Invalid OTP code."), "err");
      return;
    }
    const d = (data || {}) as { auth_token?: string; tsap_id?: string; has_account?: boolean; message_telugu?: string };
    showFeedback(d.message_telugu || (te ? "✅ లాగిన్ విజయవంతమైంది!" : "✅ Login successful!"), "ok");
    go(String(d.tsap_id || ""), String(d.auth_token || ""), !!d.has_account);
  }

  async function onForgotSend() {
    const p = digits();
    if (p.length !== 10) {
      showFeedback(te ? "⚠️ 10 అంకెల మొబైల్ నంబర్ ఇవ్వండి" : "⚠️ Enter a 10-digit mobile number", "err");
      return;
    }
    setBusy(true);
    showFeedback("");
    const { ok, data, errorTelugu } = await apiPost<{ dev_code?: string; message_telugu?: string }>(
      "/api/auth/forgot", { phone: p }
    );
    setBusy(false);
    if (!ok) {
      showFeedback(errorTelugu || (te ? "రీసెట్ OTP పంపడంలో సమస్య ఏర్పడింది." : "Failed to send reset OTP."), "err");
      return;
    }
    setFStage("reset");
    setCountdown(30);
    setDevCode((data as { dev_code?: string })?.dev_code || "");
    showFeedback(data?.message_telugu || (te ? "📱 పాస్‌వర్డ్ రీసెట్ OTP పంపించాం" : "📱 Password reset OTP sent"), "ok");
  }

  async function onReset() {
    if (code.trim().length < 4) {
      showFeedback(te ? "⚠️ OTP కోడ్ నమోదు చేయండి" : "⚠️ Enter the OTP code", "err");
      return;
    }
    if (newPw.trim().length < 6) {
      showFeedback(te ? "⚠️ కొత్త పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి" : "⚠️ New password must be at least 6 characters", "err");
      return;
    }
    if (confirmPw && newPw !== confirmPw) {
      showFeedback(te ? "⚠️ పాస్‌వర్డ్‌లు సరిపోలడం లేదు" : "⚠️ Passwords do not match", "err");
      return;
    }
    setBusy(true);
    showFeedback("");
    const { ok, data, errorTelugu } = await apiPost<{ auth_token?: string; tsap_id?: string; message_telugu?: string }>(
      "/api/auth/reset", { phone: digits(), code: code.trim(), new_password: newPw.trim() }
    );
    setBusy(false);
    if (!ok) {
      showFeedback(errorTelugu || (te ? "పాస్‌వర్డ్ రీసెట్ విఫలమైంది." : "Password reset failed."), "err");
      return;
    }
    showFeedback(data?.message_telugu || (te ? "✅ పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది! లాగిన్ అవుతున్నారు..." : "✅ Password changed successfully! Logging in..."), "ok");
    go(String(data?.tsap_id || ""), String(data?.auth_token || ""), true);
  }

  // Quick Demo Login for instant user testing
  const quickDemoLogin = (demoPhone: string, demoPw: string) => {
    setPhone(demoPhone);
    setPassword(demoPw);
    setTab("password");
    setForgot(false);
    showFeedback(te ? "డెమో వివరాలు నింపబడ్డాయి — 'Login' క్లిక్ చేయండి" : "Demo credentials filled — click 'Login'", "info");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#FFFDF9] via-[#FAF5EE] to-[#F5ECE0] py-10 px-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <span className="text-3xl">💍</span>
            <span className="font-extrabold text-2xl tracking-tight text-[#7A0C2E]">
              మన వివాహ <span className="text-gold">Mana Vivaha</span>
            </span>
          </Link>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center justify-center gap-2">
            <span>🔑</span>
            <Duo en="Member Login" te="సభ్యుల లాగిన్" />
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            {te
              ? "🔒 మీ ఇన్బాక్స్, వచ్చిన సంబంధాలు, జాతక గుణమేళనం వివరాలు పూర్తి సురక్షితం"
              : "🔒 Access your inbox, received requests, and saved matches securely."}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 card-shadow border border-gold/30 shadow-xl relative overflow-hidden">
          
          {/* Top Gold Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 maroon-gradient" />

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-5">
            <button
              onClick={() => { setTab("password"); showFeedback(""); setForgot(false); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                tab === "password" && !forgot
                  ? "bg-white text-maroon shadow-md border border-gold/30"
                  : "text-slate-600 hover:text-maroon"
              }`}
            >
              🔑 {te ? "పాస్‌వర్డ్ లాగిన్" : "Password"}
            </button>
            <button
              onClick={() => { setTab("otp"); showFeedback(""); setForgot(false); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                tab === "otp" && !forgot
                  ? "bg-white text-maroon shadow-md border border-gold/30"
                  : "text-slate-600 hover:text-maroon"
              }`}
            >
              📱 {te ? "OTP లాగిన్" : "Mobile OTP"}
            </button>
          </div>

          {/* FORGOT PASSWORD VIEW */}
          {forgot ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-maroon flex items-center gap-1.5">
                  <span>🔄</span>
                  {te ? "పాస్‌వర్డ్ రీసెట్ (OTP ద్వారా)" : "Reset Password via OTP"}
                </span>
                <button
                  onClick={() => { setForgot(false); setFStage("phone"); showFeedback(""); }}
                  className="text-xs text-slate-500 hover:text-maroon underline font-medium"
                >
                  {te ? "← వెనక్కి" : "← Back to Login"}
                </button>
              </div>

              <div>
                <label htmlFor="f-phone" className="block text-xs font-bold text-slate-700 mb-1">
                  📞 {te ? "రిజిస్టర్డ్ మొబైల్ నంబర్" : "Registered Mobile Number"}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-slate-400 select-none">+91</span>
                  <input
                    id="f-phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    maxLength={10}
                    disabled={fStage === "reset"}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98480 12345"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-base font-semibold focus:border-maroon focus:ring-1 focus:ring-maroon outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              {fStage === "reset" && (
                <>
                  <div>
                    <label htmlFor="f-otp" className="block text-xs font-bold text-slate-700 mb-1">
                      🔢 {te ? "OTP కోడ్ (4 అంకెలు)" : "4-digit OTP Code"}
                    </label>
                    <input
                      id="f-otp"
                      inputMode="numeric"
                      value={code}
                      maxLength={6}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="1234"
                      className="w-full text-center tracking-[0.4em] py-3 rounded-xl border border-slate-200 text-xl font-bold font-mono focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                    />
                    {devCode && (
                      <p className="mt-1 text-xs text-emerald-700 font-mono">
                        {te ? <>డెమో OTP: <b>{devCode}</b></> : <>Demo OTP: <b>{devCode}</b></>}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="f-newpw" className="block text-xs font-bold text-slate-700 mb-1">
                      🔑 {te ? "కొత్త పాస్‌వర్డ్ (కనీసం 6 అక్షరాలు)" : "New Password (min 6 chars)"}
                    </label>
                    <div className="relative">
                      <input
                        id="f-newpw"
                        type={showPw ? "text" : "password"}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder={te ? "కొత్త పాస్‌వర్డ్" : "New password"}
                        className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 text-base font-medium focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm opacity-60 hover:opacity-100"
                      >
                        {showPw ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="f-confirmpw" className="block text-xs font-bold text-slate-700 mb-1">
                      🔑 {te ? "పాస్‌వర్డ్ నిర్ధారణ" : "Confirm Password"}
                    </label>
                    <input
                      id="f-confirmpw"
                      type={showPw ? "text" : "password"}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder={te ? "పాస్‌వర్డ్ మళ్లీ నమోదు చేయండి" : "Re-enter password"}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-medium focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                    />
                  </div>
                </>
              )}

              {/* Feedback Message */}
              {msg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    msgType === "err"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : msgType === "ok"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {msg}
                </div>
              )}

              {/* Reset Action Button */}
              {fStage === "phone" ? (
                <button
                  onClick={onForgotSend}
                  disabled={busy}
                  className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-sm shadow-md hover-lift disabled:opacity-50"
                >
                  {busy ? "OTP పంపుతున్నారు…" : te ? "📩 రీసెట్ OTP పంపు" : "📩 Send Reset OTP"}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={onReset}
                    disabled={busy}
                    className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-sm shadow-md hover-lift disabled:opacity-50"
                  >
                    {busy ? "సేవ్ చేస్తున్నారు…" : te ? "✅ పాస్‌వర్డ్ రీసెట్ చేసి లాగిన్ అవ్వండి" : "✅ Reset Password & Login"}
                  </button>
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                    <button
                      onClick={() => setFStage("phone")}
                      className="text-slate-600 hover:text-maroon underline"
                    >
                      {te ? "మొబైల్ మార్చండి" : "Change Mobile"}
                    </button>
                    {countdown > 0 ? (
                      <span>{te ? `${countdown}s లో రీసెండ్ చేయవచ్చు` : `Resend in ${countdown}s`}</span>
                    ) : (
                      <button
                        onClick={onForgotSend}
                        className="text-maroon font-bold underline"
                      >
                        {te ? "మళ్లీ OTP పంపు" : "Resend OTP"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD LOGIN VIEW (PASSWORD / OTP) */
            <div className="space-y-4">
              <div>
                <label htmlFor="login-phone" className="block text-xs font-bold text-slate-700 mb-1">
                  📞 {te ? "మొబైల్ నంబర్ (10 అంకెలు)" : "Mobile Number (10 digits)"}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-slate-400 select-none">+91</span>
                  <input
                    id="login-phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={phone}
                    maxLength={10}
                    disabled={tab === "otp" && stage === "otp"}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (tab === "password") void onPasswordLogin();
                        else if (stage === "phone") void onSend();
                        else void onVerify();
                      }
                    }}
                    placeholder="98480 12345"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 text-base font-semibold focus:border-maroon focus:ring-1 focus:ring-maroon outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Password Field */}
              {tab === "password" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="login-pw" className="block text-xs font-bold text-slate-700">
                      🔑 {te ? "పాస్‌వర్డ్" : "Password"}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgot(true);
                        setFStage("phone");
                        setCode("");
                        showFeedback("");
                      }}
                      className="text-[11px] font-bold text-maroon hover:underline"
                    >
                      {te ? "పాస్‌వర్డ్ మర్చిపోయారా?" : "Forgot password?"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-pw"
                      type={showPw ? "text" : "password"}
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void onPasswordLogin();
                      }}
                      placeholder={te ? "మీ పాస్‌వర్డ్" : "Your password"}
                      className="w-full pr-12 pl-4 py-3 rounded-xl border border-slate-200 text-base font-medium focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm opacity-60 hover:opacity-100"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Field (when in OTP Mode & Stage 2) */}
              {tab === "otp" && stage === "otp" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="login-otp" className="block text-xs font-bold text-slate-700">
                      🔢 {te ? "4 అంకెల OTP కోడ్" : "4-digit OTP Code"}
                    </label>
                    <button
                      onClick={() => { setStage("phone"); setCode(""); setDevCode(""); }}
                      className="text-[11px] text-maroon hover:underline font-bold"
                    >
                      {te ? "నెంబర్ మార్చు" : "Change Number"}
                    </button>
                  </div>
                  <input
                    id="login-otp"
                    inputMode="numeric"
                    value={code}
                    maxLength={6}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void onVerify();
                    }}
                    placeholder="1234"
                    className="w-full text-center tracking-[0.4em] py-3 rounded-xl border border-slate-200 text-2xl font-bold font-mono focus:border-maroon focus:ring-1 focus:ring-maroon outline-none"
                  />
                  {devCode && (
                    <p className="mt-1.5 text-xs text-emerald-700 font-mono text-center">
                      {te ? <>డెమో OTP: <b>{devCode}</b></> : <>Demo OTP: <b>{devCode}</b></>}
                    </p>
                  )}
                  <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                    <span>{te ? "SMS లేదా WhatsApp ద్వారా OTP వస్తుంది" : "OTP sent via SMS / WhatsApp"}</span>
                    {countdown > 0 ? (
                      <span className="font-mono text-slate-400">{countdown}s</span>
                    ) : (
                      <button
                        onClick={onSend}
                        className="text-maroon font-bold underline"
                      >
                        {te ? "రీసెండ్ OTP" : "Resend"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Remember Me */}
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={keep}
                  onChange={(e) => setKeep(e.target.checked)}
                  className="w-4 h-4 rounded text-maroon accent-[#7A0C2E]"
                />
                <span>{te ? "నన్ను లాగిన్‌లోనే ఉంచండి (సురక్షిత పరికరం)" : "Keep me logged in on this device"}</span>
              </label>

              {/* Status Message */}
              {msg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    msgType === "err"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : msgType === "ok"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {msg}
                </div>
              )}

              {/* Submit Action */}
              <div>
                {tab === "password" ? (
                  <button
                    onClick={onPasswordLogin}
                    disabled={busy}
                    className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-sm shadow-md hover-lift disabled:opacity-50"
                  >
                    {busy ? "లాగిన్ అవుతున్నారు…" : "🔑 Login"}
                  </button>
                ) : stage === "phone" ? (
                  <button
                    onClick={onSend}
                    disabled={busy}
                    className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-sm shadow-md hover-lift disabled:opacity-50"
                  >
                    {busy ? "OTP పంపుతున్నారు…" : te ? "📲 OTP కోడ్ పంపు" : "📲 Send OTP Code"}
                  </button>
                ) : (
                  <button
                    onClick={onVerify}
                    disabled={busy}
                    className="w-full py-3.5 rounded-2xl maroon-gradient text-white font-bold text-sm shadow-md hover-lift disabled:opacity-50"
                  >
                    {busy ? "ధృవీకరిస్తున్నారు…" : "✅ Verify & Login"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Demo Credentials for Reviewers */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              ⚡ {te ? "1-క్లిక్ త్వరిత డెమో లాగిన్" : "1-Click Quick Demo Login"}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickDemoLogin("9848011111", "pass123")}
                className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-gold text-[11px] font-bold text-slate-700 hover:text-maroon transition-all flex items-center justify-center gap-1.5"
              >
                <span>👰</span>
                <span>{te ? "వధువు డెమో" : "Bride Demo"}</span>
              </button>
              <button
                type="button"
                onClick={() => quickDemoLogin("9848022222", "pass123")}
                className="px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-gold text-[11px] font-bold text-slate-700 hover:text-maroon transition-all flex items-center justify-center gap-1.5"
              >
                <span>🤵</span>
                <span>{te ? "వరుడు డెమో" : "Groom Demo"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Register Free CTA Footer */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-xs text-slate-600">
            {te ? "ఇంకా ఖాతా లేదా?" : "Don't have an account yet?"}{" "}
            <Link href="/register" className="font-extrabold text-[#7A0C2E] hover:underline inline-flex items-center gap-1">
              <span>ఉచిత నమోదు (Register Free)</span>
              <span>→</span>
            </Link>
          </p>

          <div className="flex justify-center items-center gap-4 text-[11px] text-slate-500 pt-2">
            <span className="flex items-center gap-1">🔒 100% గోప్యత</span>
            <span>•</span>
            <span className="flex items-center gap-1">🛡️ ఫోన్ నంబర్ రక్షణ</span>
            <span>•</span>
            <span className="flex items-center gap-1">🚫 స్పామ్ ఉండదు</span>
          </div>
        </div>

      </div>
    </main>
  );
}
