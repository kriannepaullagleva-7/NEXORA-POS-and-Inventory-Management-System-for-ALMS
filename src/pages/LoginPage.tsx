import React, { useId, useRef, useState } from 'react';
import { useToast } from '../components/ui';
import {
  Lock, Mail, Eye, EyeOff, MapPin, Phone, Globe, User,
  ShoppingCart, Shirt, Droplet, BarChart3, ArrowRight, Loader2,
} from 'lucide-react';
import loginBg from '../assets/login-bg.jpg';
import logo from '../assets/logo-mark.jpg';
import { useAuth } from '../context/AuthContext';

const REMEMBER_KEY = 'alms_remember_email';

const FEATURES = [
  { icon: ShoppingCart, title: 'Point-of-Sale', subtitle: 'Fast & Easy Transactions' },
  { icon: Shirt, title: 'Laundry Operations', subtitle: 'Track Orders & Status' },
  { icon: Droplet, title: 'Water Refilling', subtitle: 'Manage Products & Deliveries' },
  { icon: BarChart3, title: 'Reports', subtitle: 'Sales, Inventory & Insights' },
];

const BUSINESS = {
  owner: 'Aedzel Louis M. Sarmiento',
  address: 'Blk 18, Lot 20, Mint St., Countryville Executive Homes, Cabantian, Davao City',
  phones: ['(082) 222-4570', '0932-854-5660'],
  email: 'almswaterrefillingstation@gmail.com',
  facebook: 'https://web.facebook.com/almswaterrefillingstation',
};

// ─── Brand lockup ─────────────────────────────────────────────────────────────
function BrandMark({ tone, className = '' }: { tone: 'dark' | 'light'; className?: string }) {
  const dark = tone === 'dark';
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* The logo file is a landscape business card; a 4:3 box crops it to the "Alms" wordmark. */}
      <img
        src={logo}
        alt=""
        width={240}
        height={156}
        className={`aspect-[4/3] h-11 w-auto shrink-0 rounded object-cover sm:h-12 ${dark ? 'ring-1 ring-white/30' : 'ring-1 ring-slate-200'}`}
      />
      <div className="min-w-0">
        <div className={`text-[0.95rem] font-bold leading-tight tracking-tight sm:text-base ${dark ? 'text-white' : 'text-slate-900'}`}>
          ALMS POINT OF SALE &amp;
        </div>
        <div className={`mt-0.5 text-[0.6875rem] font-semibold uppercase leading-tight tracking-[0.14em] ${dark ? 'text-blue-300' : 'text-blue-600'}`}>
          Inventory Management System
        </div>
      </div>
    </div>
  );
}

// ─── Contact details (dark panel on desktop, light block when stacked) ────────
function BusinessInfo({ tone }: { tone: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  const icon = `mt-0.5 size-5 shrink-0 ${dark ? 'text-white/90' : 'text-blue-600'}`;
  const text = dark ? 'text-white/90' : 'text-slate-600';
  const link = `rounded-sm outline-none hover:underline focus-visible:ring-2 ${dark ? 'focus-visible:ring-blue-300' : 'focus-visible:ring-blue-500'}`;
  return (
    <ul className={`grid gap-3 text-sm leading-snug ${dark ? 'lg:gap-[clamp(0.5rem,1.6vh,0.9rem)] lg:text-[0.9375rem]' : 'sm:grid-cols-2 sm:gap-x-6'}`}>
      <li className="flex items-start gap-3">
        <User className={icon} aria-hidden="true" />
        <div>
          <p className={`text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${dark ? 'text-blue-300' : 'text-blue-600'}`}>
            Owner / Administrator
          </p>
          <p className={`font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>{BUSINESS.owner}</p>
        </div>
      </li>
      <li className="flex items-start gap-3">
        <MapPin className={icon} aria-hidden="true" />
        <p className={`min-w-0 ${text}`}>{BUSINESS.address}</p>
      </li>
      <li className="flex items-start gap-3">
        <Phone className={icon} aria-hidden="true" />
        <p className={`min-w-0 ${text}`}>
          {BUSINESS.phones[0]}
          <span className="mx-2 opacity-50" aria-hidden="true">|</span>
          {BUSINESS.phones[1]}
        </p>
      </li>
      <li className="flex items-start gap-3">
        <Mail className={icon} aria-hidden="true" />
        <a href={`mailto:${BUSINESS.email}`} className={`min-w-0 break-all ${text} ${link}`}>{BUSINESS.email}</a>
      </li>
      <li className="flex items-start gap-3">
        <Globe className={icon} aria-hidden="true" />
        <a
          href={BUSINESS.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className={`min-w-0 font-semibold ${dark ? 'text-white' : 'text-slate-900'} ${link}`}
        >
          ALMS Facebook Page
        </a>
      </li>
    </ul>
  );
}

function PoweredBy({ tone }: { tone: 'dark' | 'light' }) {
  const dark = tone === 'dark';
  return (
    <p className={`text-center text-xs font-medium tracking-wide ${dark ? 'text-blue-100/80' : 'text-slate-500'}`}>
      Powered by{' '}
      <span className={`font-bold tracking-[0.18em] ${dark ? 'text-white' : 'text-slate-800'}`}>NEXORA</span>
    </p>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
// Local rather than the shared <Input>: the reference uses a filled, borderless
// field with a trailing action, and the global touch rule in index.css forces
// `padding: .75rem !important` on every input — which would push the leading icon
// under the text. The `!` modifiers below keep the icon gutter on tablets.
const fieldBase =
  'peer h-12 w-full rounded-lg border bg-[#eaf1fe] pl-11! pr-3! text-[0.9375rem] text-slate-900 placeholder:text-slate-500 outline-none transition-colors motion-reduce:transition-none focus:bg-white focus:ring-2 disabled:opacity-60';
const fieldOk = 'border-transparent hover:border-blue-200 focus:border-blue-500 focus:ring-blue-500/25';
const fieldBad = 'border-red-400 focus:border-red-500 focus:ring-red-500/25';

export default function LoginPage() {
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_KEY); } catch { return false; }
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched] = useState(false);
  const submitting = useRef(false);
  const toast = useToast();
  const { signIn } = useAuth();

  const emailId = useId();
  const passId = useId();
  const emailErr = touched && !username.trim() ? 'Enter your email address.' : '';
  const passErr = touched && !password ? 'Enter your password.' : '';

  const persistRemember = () => {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, username);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* localStorage unavailable — non-critical */ }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setTouched(true);
    if (!username.trim() || !password) { toast.error('Please enter your credentials.'); return; }
    submitting.current = true;
    setLoading(true);
    try {
      await signIn(username, password);
      persistRemember();
      toast.success('Signed in successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info('Please contact your system administrator to reset your password.');
  };

  return (
    <div
      className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1.78fr)_minmax(26rem,1fr)] lg:grid-rows-1"
      style={{ '--login-bg': `url(${loginBg})` } as React.CSSProperties}
    >
      {/* ── Branding panel ─────────────────────────────────────────────── */}
      <section
        aria-label="ALMS Laundry Shop and Water Refilling Station"
        className="relative isolate flex flex-col overflow-hidden bg-[#041b5c] bg-linear-to-br from-[#031447] via-[#06257a] to-[#0a3aa8] px-5 py-4 text-white sm:px-8 sm:py-6 lg:bg-(image:--login-bg) lg:bg-cover lg:bg-[position:85%_100%] lg:bg-no-repeat lg:px-[clamp(2rem,7%,6rem)] lg:py-[clamp(1.25rem,4.5vh,3.25rem)]"
      >
        {/* Left-side scrim keeps text legible over the artwork at every panel size. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden bg-linear-to-r from-[#021240]/55 via-[#021240]/15 to-transparent lg:block" />

        <BrandMark tone="dark" />

        <div className="lg:mt-[clamp(1.5rem,7vh,4.5rem)] lg:max-w-[66%]">
          <h1 className="mt-4 max-w-xl text-[1.25rem] font-bold leading-[1.1] tracking-tight max-sm:sr-only sm:text-[1.75rem] lg:mt-0 lg:text-[clamp(1.75rem,3.15vw,3.75rem)] lg:leading-[1.08]">
            Laundry Shop &amp;
            <span className="max-lg:hidden"><br /></span>{' '}
            <span className="text-[#3b8cff]">Water Refilling</span> Station
          </h1>
          <p className="mt-2 text-[0.6875rem] font-bold uppercase tracking-[0.3em] text-[#4d97ff] max-sm:hidden lg:mt-[clamp(0.6rem,1.8vh,1.1rem)] lg:text-[clamp(0.7rem,0.85vw,0.85rem)] lg:tracking-[0.34em]">
            Alkaline • Purified • Mineral
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-50/85 max-lg:hidden lg:mt-[clamp(0.75rem,2vh,1.25rem)] lg:text-[clamp(0.875rem,1.05vw,1.0625rem)]">
            A modern Point-of-Sale and Inventory Management System designed to make daily operations faster, easier, and more organized.
          </p>
        </div>

        {/* Feature cards — desktop only; the stacked layout repeats them under the form. */}
        <ul className="mt-[clamp(1.25rem,4vh,2.5rem)] hidden gap-2.5 lg:grid lg:max-w-[66%] lg:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map(f => (
            <li key={f.title} className="rounded-xl border border-white/15 bg-white/[0.07] p-3.5 backdrop-blur-sm">
              <f.icon className="mb-2.5 size-7 text-[#3b8cff]" strokeWidth={1.75} aria-hidden="true" />
              <p className="text-[0.9rem] font-bold leading-tight">{f.title}</p>
              <p className="mt-1 text-xs leading-snug text-blue-100/75">{f.subtitle}</p>
            </li>
          ))}
        </ul>

        <div className="mt-[clamp(1rem,3.2vh,2rem)] hidden border-t border-[#3b8cff]/40 pt-[clamp(0.9rem,2.6vh,1.5rem)] lg:block lg:max-w-[48%]">
          <BusinessInfo tone="dark" />
        </div>

        <div className="mt-auto hidden pt-[clamp(1rem,3vh,2rem)] lg:block">
          <PoweredBy tone="dark" />
        </div>
      </section>

      {/* ── Login panel ────────────────────────────────────────────────── */}
      <main className="flex flex-col items-center justify-center gap-8 bg-linear-to-b from-slate-50 to-white px-4 py-6 sm:px-8 sm:py-10 lg:px-[clamp(1.5rem,4vw,4.5rem)] lg:py-10">
        <div className="w-full max-w-[30rem] rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.18)] sm:p-8">
          <BrandMark tone="light" className="mb-6 max-lg:hidden" />

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Welcome Back</p>
          <h2 className="mb-2 text-[1.75rem]! font-extrabold leading-tight! tracking-tight text-slate-950 sm:text-[2rem]!">
            System Login
          </h2>
          <p className="mb-6 text-[0.9375rem] leading-relaxed text-slate-500">
            Enter your credentials to access the POS and Inventory Management System.
          </p>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label htmlFor={emailId} className="mb-1.5 block text-sm font-semibold text-slate-900">Email</label>
              <div className="relative">
                <input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="Enter your email"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                  aria-invalid={!!emailErr}
                  aria-describedby={emailErr ? `${emailId}-err` : undefined}
                  className={`${fieldBase} ${emailErr ? fieldBad : fieldOk}`}
                />
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-500 peer-focus:text-blue-600" aria-hidden="true" />
              </div>
              {emailErr && <p id={`${emailId}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{emailErr}</p>}
            </div>

            <div>
              <label htmlFor={passId} className="mb-1.5 block text-sm font-semibold text-slate-900">Password</label>
              <div className="relative">
                <input
                  id={passId}
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  aria-invalid={!!passErr}
                  aria-describedby={passErr ? `${passId}-err` : undefined}
                  className={`${fieldBase} pr-12! ${passErr ? fieldBad : fieldOk}`}
                />
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-500 peer-focus:text-blue-600" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  aria-pressed={showPass}
                  className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md p-0! text-slate-500 outline-none hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showPass ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                </button>
              </div>
              {passErr && <p id={`${passId}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{passErr}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
              <label className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="size-5! min-h-0! shrink-0 cursor-pointer rounded border-slate-300 p-0! accent-[#0a5cff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="cursor-pointer rounded-sm p-0! font-semibold text-[#0a5cff] outline-none hover:text-blue-800 hover:underline focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="mt-1 flex h-[3.25rem] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0a5cff] p-0! text-base font-semibold text-white shadow-[0_6px_16px_-6px_rgba(10,92,255,0.7)] outline-none transition-colors hover:bg-[#074ed6] focus-visible:ring-4 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="size-5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Stacked layout (below lg): features, contact details and credit move under the form. */}
        <div className="w-full max-w-[30rem] space-y-5 lg:hidden sm:max-w-2xl">
          <ul className="hidden gap-2.5 sm:grid sm:grid-cols-4">
            {FEATURES.map(f => (
              <li key={f.title} className="rounded-xl border border-slate-200 bg-white p-3">
                <f.icon className="mb-2 size-6 text-blue-600" strokeWidth={1.75} aria-hidden="true" />
                <p className="text-[0.8125rem] font-bold leading-tight text-slate-900">{f.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500">{f.subtitle}</p>
              </li>
            ))}
          </ul>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <BusinessInfo tone="light" />
          </div>
          <PoweredBy tone="light" />
        </div>
      </main>
    </div>
  );
}
