import React, { useState } from 'react';
import { Button, Input, useToast } from '../components/ui';
import { Lock, User, Eye, EyeOff, MapPin, Mail, Phone, Droplet, Store, Globe } from 'lucide-react';

interface LoginPageProps {
  onLogin: (role: 'admin' | 'staff', name: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Please enter your credentials.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600)); // slightly faster
    if (username === 'admin' && password === 'admin') {
      toast.success('Welcome back, Administrator!');
      onLogin('admin', 'Aedzel Louis M. Sarmiento');
    } else if (username === 'staff' && password === 'staff') {
      toast.success('Welcome, Cashier!');
      onLogin('staff', 'Maria Santos');
    } else {
      toast.error('Invalid username or password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      {/* Left branding panel - Clean & Minimal */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-slate-900 border-r border-slate-800 relative overflow-hidden">

        {/* Subtle background element */}
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none rounded-full blur-3xl opacity-50"></div>

        <div className="max-w-md mx-auto w-full text-slate-300 z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
              <Droplet className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-3xl tracking-tight leading-none">ALMS</div>
              <div className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">System</div>
            </div>
          </div>

          <h1 className="text-4xl font-light text-white leading-tight mb-3">
            Laundry Shop &
            <br />
            Water Refilling Station
          </h1>
          <p className="text-sm font-bold tracking-[0.2em] text-blue-400 mb-12 uppercase">
            Alkaline • Purified • Mineral
          </p>

          <div className="space-y-6 text-sm text-slate-400 border-t border-slate-800 pt-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Owner / Administrator</p>
              <p className="text-white font-bold text-base tracking-tight">Aedzel Louis M. Sarmiento</p>
            </div>

            <div className="flex items-start gap-4 pt-2">
              <MapPin className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="font-medium">
                <p className="text-white">Blk 18, Lot 20, Mint St.</p>
                <p>Countryville Executive Homes</p>
                <p>Cabantian, Davao City</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <p className="font-medium">(082) 222-4570 &nbsp;<span className="text-slate-600">|</span>&nbsp; 0932-854-5660</p>
            </div>

            <div className="flex items-center gap-4">
              <Mail className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <p className="font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">almswaterrefillingstation@gmail.com</p>
            </div>

            <a href="https://web.facebook.com/almswaterrefillingstation" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group w-max">
              <Globe className="w-5 h-5 text-slate-500 group-hover:text-blue-500 transition-colors flex-shrink-0" />
              <p className="font-medium group-hover:text-white transition-colors">ALMS Facebook Page</p>
            </a>
          </div>
        </div>

        <div className="text-center z-10 w-full mt-auto pt-10">
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            Powered by <span className="text-slate-300 font-bold tracking-widest">NEXORA</span>
          </p>
        </div>
      </div>

      {/* Right login form - Professional */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile branding */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm mb-4">
              <Droplet className="w-6 h-6 text-white" />
            </div>
            <div className="text-slate-900 font-bold text-2xl tracking-tight leading-none mb-1">ALMS</div>
            <div className="text-blue-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">System</div>
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Laundry & Water</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">System Login</h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Enter your credentials to access the POS and management portal.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Username"
              type="text"
              placeholder="Enter username"
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
                  placeholder="Enter password"
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

            <Button type="submit" className="w-full justify-center mt-4" size="lg" loading={loading}>
              Secure Sign In
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">System Access Keys</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 text-xs font-mono text-slate-600">
              <div className="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-center flex-1 font-semibold">
                <span className="text-blue-600 mr-2 font-bold uppercase tracking-wider text-[10px]">Admin:</span>admin / admin
              </div>
              <div className="bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-center flex-1 font-semibold">
                <span className="text-blue-600 mr-2 font-bold uppercase tracking-wider text-[10px]">Staff:</span>staff / staff
              </div>
            </div>
          </div>

          <div className="lg:hidden text-center mt-12">
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Powered by <span className="text-slate-500 font-bold tracking-widest">NEXORA</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
