import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, Loader2, X, AlertCircle } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  soundEnabled?: boolean;
  isMandatory?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, soundEnabled = true, isMandatory = false }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);
    playSound('click', soundEnabled);

    try {
      const cleanEmail = email.trim();
      if (!isLogin && !cleanEmail.toLowerCase().endsWith('@gmail.com')) {
        throw new Error('Pendaftaran saat ini hanya diizinkan menggunakan akun @gmail.com');
      }

      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      } else {
        result = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
      }

      if (result.error) {
        throw result.error;
      }

      if (!isLogin && result.data?.user?.identities?.length === 0) {
        // Supabase returns this if the email is already registered during signup
        throw new Error('Email sudah terdaftar. Silakan beralih ke tab Login.');
      }

      if (!isLogin && !result.data?.session && result.data?.user) {
        // Confirmation email was sent by Supabase
        playSound('fanfare', soundEnabled);
        setSuccessMessage('Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi email lalu masuk (Login).');
        setIsLogin(true);
        return;
      }

      playSound('fanfare', soundEnabled);
      onSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || err.name === 'TypeError') {
        setError('Gagal terhubung ke server (Failed to fetch). Jika menggunakan Brave atau AdBlocker, mohon matikan Shields/AdBlock untuk situs ini.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Email atau password salah. Silakan periksa kembali.');
      } else if (msg.includes('already registered') || msg.includes('User already registered')) {
        setError('Email sudah terdaftar. Silakan beralih ke tab Login.');
      } else if (msg.includes('Password should be at least')) {
        setError('Password minimal harus 6 karakter.');
      } else if (msg.includes('Invalid API key') || msg.includes('apikey')) {
        setError('Koneksi server sedang disegarkan. Mohon refresh halaman browser (Ctrl+F5) lalu coba lagi.');
      } else {
        setError(msg || 'Terjadi kesalahan saat proses autentikasi.');
      }
      playSound('wrong', soundEnabled);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200 stitched-border">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-stone-800 bg-stone-900/50">
          <h2 className="font-bold text-amber-50 text-lg">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          {!isMandatory && (
            <button 
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-stone-800 text-stone-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="flex items-start gap-2 p-3 mb-6 bg-red-950/50 border border-red-500/50 rounded-xl text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 mb-6 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-200 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3 pl-10 pr-4 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="scholar@n3quest.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-400 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl py-3 pl-10 pr-4 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-xl mt-6 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-900/20 active:scale-[0.98] stitched-border"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm text-stone-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                playSound('click', soundEnabled);
              }}
              className="text-amber-400 font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </div>
          
          {!isLogin && (
            <p className="text-[10px] text-stone-500 text-center mt-4 px-4">
              Creating an account will securely link your local progress to the cloud Leaderboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
