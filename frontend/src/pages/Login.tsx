import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle2,
  HardHat,
  Users,
  Briefcase,
  Building2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

const DEMO_ROLES = [
  {
    role: 'Administrator',
    email: 'admin@constructsafe.com',
    password: 'Admin@123456',
    icon: Shield,
    desc: 'System & User Admin',
  },
  {
    role: 'Project Manager',
    email: 'pm@constructsafe.com',
    password: 'Manager@123456',
    icon: Briefcase,
    desc: 'Jobsite & Workforce Lead',
  },
  {
    role: 'Safety Inspector',
    email: 'inspector@constructsafe.com',
    password: 'Inspector@123456',
    icon: HardHat,
    desc: 'Hazard Audits & AI Vision',
  },
  {
    role: 'Site Worker',
    email: 'worker@constructsafe.com',
    password: 'Worker@123456',
    icon: Users,
    desc: 'Profile & Safety Tasks',
  },
  {
    role: 'Client Oversight',
    email: 'client@constructsafe.com',
    password: 'Client@123456',
    icon: Building2,
    desc: 'Executive Safety Scorecards',
  },
];

const IS_DEMO_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'false';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(IS_DEMO_ENABLED ? 'admin@constructsafe.com' : '');
  const [password, setPassword] = useState(IS_DEMO_ENABLED ? 'Admin@123456' : '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || 'Invalid email or password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDemoRole = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-[#666666] hover:text-[#121926] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="text-xs text-[#666666]">
          Secure Sign In Portal
        </div>
      </div>

      {/* Main Centered Login Card */}
      <div className="w-full max-w-md mx-auto my-8">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-12 h-12 rounded-2xl bg-[#121926] flex items-center justify-center text-[#FFDD00] shadow-sm transition-transform group-hover:scale-105">
              <Shield className="w-7 h-7 stroke-[2.5]" />
            </div>
          </Link>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-[#121926] mt-3">
            ConstructSafe <span className="text-[#E6C700]">AI</span>
          </h1>
          <p className="mt-1 text-xs text-[#666666]">
            Enterprise Construction Safety Management Platform
          </p>
        </div>

        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-[#EAEAEA] shadow-sm">
          <div className="mb-5 pb-3 border-b border-[#EAEAEA]">
            <h2 className="font-heading text-base font-bold text-[#121926]">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-[#666666] mt-0.5">
              Enter your credentials to access your safety dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Authentication Notice</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#121926] mb-1.5">
                Corporate Email Address
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666666]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@constructsafe.com"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-[#040404] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#FFDD00] focus:border-[#FFDD00] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#121926]">
                  Password
                </label>
              </div>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#666666]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#FBFBFB] border border-[#EAEAEA] rounded-xl text-[#040404] placeholder-[#666666] focus:outline-none focus:ring-2 focus:ring-[#FFDD00] focus:border-[#FFDD00] focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-3 text-sm"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#121926] border-t-transparent rounded-full animate-spin"></span>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Sign In <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Role Picker for Rapid Dev Testing */}
          {IS_DEMO_ENABLED && (
            <div className="mt-6 pt-5 border-t border-[#EAEAEA]">
              <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider block mb-2.5">
                Quick Role Selector (Development Mode)
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {DEMO_ROLES.map((r) => {
                  const Icon = r.icon;
                  const isSelected = email === r.email;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => selectDemoRole(r.email, r.password)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all text-xs ${
                        isSelected
                          ? 'border-[#121926] bg-[#FFDD00]/15 font-bold text-[#121926]'
                          : 'border-[#EAEAEA] bg-white hover:bg-[#FBFBFB] text-[#666666]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#121926] text-[#FFDD00] flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="block font-semibold text-[#121926] leading-tight">
                            {r.role}
                          </span>
                          <span className="text-[10px] text-[#666666]">{r.desc}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-[#666666]">
                        {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-[#121926]" /> : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Security Footnote */}
        <div className="mt-5 text-center text-xs text-[#666666]">
          Protected by <strong className="text-[#121926]">Argon2id</strong> • <strong className="text-[#121926]">JWT Rotation</strong> • <strong className="text-[#121926]">MongoDB RBAC</strong>
        </div>
      </div>

      {/* Bottom info */}
      <div className="max-w-7xl mx-auto w-full text-center text-xs text-[#666666]">
        © 2026 ConstructSafe AI. Visionex Astro Design System.
      </div>
    </div>
  );
};

export default Login;
