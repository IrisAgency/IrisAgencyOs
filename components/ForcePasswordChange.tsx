import React, { useState } from 'react';
import { Lock, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ForcePasswordChange: React.FC = () => {
  const { completePasswordChange, logout, currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      await completePasswordChange(currentPassword, newPassword);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to update password. Please verify your current password and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-8 bg-indigo-600 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Set Your Permanent Password</h1>
          <p className="text-indigo-100 mt-2 text-sm">
            Welcome {currentUser?.name?.split(' ')[0] || ''}! Please create a new password before accessing IRIS.
          </p>
        </div>

        <div className="p-8 space-y-5">
          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">Password updated successfully.</p>
                <p className="text-xs text-emerald-700/80">You can now continue to your workspace.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current (Temporary) Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter the temporary password provided"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Re-enter your new password"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 rounded-lg p-3 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex justify-center items-center"
                disabled={loading}
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Save New Password'}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-slate-400">
            <button
              type="button"
              onClick={logout}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Need to switch accounts? Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
