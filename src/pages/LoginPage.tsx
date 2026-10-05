import React, { useState } from 'react';
import { Button, Input, useToast } from '../components/ui';
import {
  Lock, User, Eye, EyeOff, MapPin, Mail, Phone, Globe,
  ShoppingCart, Shirt, Droplet, BarChart3, ArrowRight,
} from 'lucide-react';
import loginBg from '../assets/login.png';
import logo from '../assets/logo.png';

const REMEMBER_KEY = 'alms_remember_username';

const FEATURES = [
  { icon: ShoppingCart, title: 'Point-of-Sale', subtitle: 'Fast & Easy Transactions' },
  { icon: Shirt, title: 'Laundry Operations', subtitle: 'Track Orders & Status' },
  { icon: Droplet, title: 'Water Refilling', subtitle: 'Manage Products & Deliveries' },
  { icon: BarChart3, title: 'Reports', subtitle: 'Sales, Inventory & Insights' },
];

interface LoginPageProps {
  onLogin: (role: 'admin' | 'staff', name: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_KEY); } catch { return false; }
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const toast = useToast();

  const persistRemember = () => {
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, username);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch { /* localStorage unavailable — non-critical */ }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Please enter your credentials.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // slightly faster
    if (username === 'admin' && password === 'admin') {
      persistRemember();
      toast.success('Welcome back, Administrator!');
      onLogin('admin', 'Aedzel Louis M. Sarmiento');
    } else if (username === 'staff' && password === 'staff') {
      persistRemember();
      toast.success('Welcome, Cashier!');
      onLogin('staff', 'Maria Santos');
    } else {
      toast.error('Invalid username or password.');
    }
    setLoading(false);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info('Please contact your system administrator to reset your password.');
  };

  return (
    <div className="w-full lg:h-screen flex flex-col lg:flex-row lg:overflow-hidden font-sans">
      {/* Left hero panel — hidden below lg so mobile/small-tablet shows the form only */}
      <div
        className="hidden lg:flex relative lg:w-[64%] lg:h-full bg-slate-900 bg-cover bg-center flex-col justify-between px-8 xl:px-14 py-8 xl:py-12 overflow-hidden lg:overflow-y-auto"
        style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-blue-950/60 pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-3 mb-5 xl:mb-7">
            <div className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Droplet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-tight leading-none">ALMS</div>
              <div className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">System</div>
            </div>
          </div>

          <h1 className="text-2xl xl:text-4xl font-bold text-white leading-tight mb-3">
            Laundry Shop &amp;
            <br />
            <span className="text-blue-400">Water Refilling</span> Station
          </h1>
          <p className="text-[11px] xl:text-xs font-bold tracking-[0.25em] text-blue-300 uppercase mb-3 xl:mb-4">
            Alkaline • Purified • Mineral
          </p>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mb-4 xl:mb-7">
            A modern Point-of-Sale and management system designed to make daily operations faster, easier, and more organized.
          </p>

          <div className="hidden xl:grid grid-cols-4 gap-3 mb-8">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white/10 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                <f.icon className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-white text-xs font-bold leading-tight">{f.title}</p>
                <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{f.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 xl:space-y-3.5 text-xs xl:text-sm text-slate-300 border-t border-white/10 pt-4 xl:pt-6">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Owner / Administrator</p>
                <p className="text-white font-semibold">Aedzel Louis M. Sarmiento</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="font-medium">Blk 18, Lot 20, Mint St., Countryville Executive Homes, Cabantian, Davao City</p>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <p className="font-medium">(082) 222-4570 &nbsp;|&nbsp; 0932-854-5660</p>
            </div>
            <div className="hidden xl:flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <p className="font-medium text-blue-300">almswaterrefillingstation@gmail.com</p>
            </div>
            <a href="https://web.facebook.com/almswaterrefillingstation" target="_blank" rel="noopener noreferrer" className="hidden xl:flex items-center gap-3 group w-max">
              <Globe className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
              <p className="font-medium group-hover:text-white transition-colors">ALMS Facebook Page</p>
            </a>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-slate-500 font-medium tracking-wide mt-6 xl:mt-8">
          Powered by <span className="text-slate-300 font-bold tracking-widest">NEXORA</span>
        </p>
      </div>

      {/* Right login panel */}
      <div className="w-full min-h-screen lg:min-h-0 lg:h-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4 sm:px-6 py-8 sm:py-10 lg:w-[36%] lg:overflow-y-auto">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-7 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <img src={logo} alt="ALMS logo" className="w-10 h-10 rounded-lg object-cover shadow-sm ring-1 ring-slate-200 flex-shrink-0" />
            <div>
              <div className="text-slate-900 font-bold text-sm tracking-tight leading-none">ALMS</div>
              <div className="text-blue-600 text-[10px] font-bold uppercase tracking-wider mt-0.5">Laundry &amp; Water Refilling</div>
            </div>
          </div>

          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Welcome Back</p>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">System Login</h2>
          <p className="text-slate-500 text-sm mb-7 font-medium">
            Enter your credentials to access the POS and management portal.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              icon={<User className="w-4 h-4" />}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember me
              </label>
              <button type="button" onClick={handleForgotPassword} className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full justify-center mt-2" size="lg" loading={loading}>
              Sign In
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
