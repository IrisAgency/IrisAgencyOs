import React, { useEffect, useState } from 'react';
import { Hexagon, Lock, Mail, Loader, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DottedGlowBackground from './DottedGlowBackground';

const Login: React.FC = () => {
  const { login, signup, allowSignUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!allowSignUp) {
      setIsSignUp(false);
    } else {
      setIsSignUp(true);
    }
  }, [allowSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signup(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      <DottedGlowBackground 
        gap={24} 
        radius={1.5} 
        color="rgba(255, 255, 255, 0.05)" 
        glowColor="rgba(255, 255, 255, 0.2)" 
        speedScale={0.5} 
      />
      
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 mb-6 relative group">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition-all duration-500"></div>
            <img 
              src="/logo.png" 
              onError={(e) => {
                e.currentTarget.src = '/icon.svg';
                e.currentTarget.onerror = null; 
              }}
              alt="IRIS OS Logo" 
              className="w-16 h-16 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" 
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            IRIS OS
          </h1>
          <p className="text-white/40 text-sm font-light tracking-wide uppercase">
            {isSignUp ? 'Initialize Workspace' : 'System Access'}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl ring-1 ring-white/5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && allowSignUp && (
              <div className="group">
                <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                    placeholder="John Doe"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 px-4 bg-white text-black font-semibold rounded-xl hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 group"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {allowSignUp && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-white/40 hover:text-white transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-white/20 font-mono">
            SECURE CONNECTION ESTABLISHED
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;