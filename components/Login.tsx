import React, { useEffect, useState } from 'react';
import { Hexagon, Lock, Mail, Loader, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { seedDatabase } from '../utils/seedData';

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

  const handleSeed = async () => {
    if (confirm('Are you sure you want to seed the database? This will overwrite existing data.')) {
      try {
        await seedDatabase();
        alert('Database seeded successfully!');
      } catch (error) {
        console.error(error);
        alert('Error seeding database. Check console.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative">
      <button onClick={handleSeed} className="absolute top-4 right-4 text-xs text-slate-500 hover:text-white">
        Seed DB
      </button>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="p-8 bg-indigo-600 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Hexagon className="w-10 h-10 text-white fill-current" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">IRIS Agency OS</h1>
          <p className="text-indigo-200 mt-2 text-sm">
            {isSignUp ? 'Create your workspace account' : 'Enter your workspace credentials'}
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && allowSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="John Doe"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-lg text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {loading ? <Loader className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In to IRIS')}
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-slate-400">
            {allowSignUp ? (
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            ) : (
              <span>Need access? Contact your IRIS administrator.</span>
            )}
          </div>
          
          <div className="mt-6 text-center text-xs text-slate-400">
            Protected by enterprise-grade security
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;