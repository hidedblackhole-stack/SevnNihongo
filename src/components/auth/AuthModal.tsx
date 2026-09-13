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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md panel bg-surface-card border border-border-primary rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border-subtle bg-surface-card">
          <h2 className="font-bold text-text-primary text-lg font-heading">
            {isLogin ? 'Masuk (Opsional)' : 'Buat Akun (Opsional)'}
          </h2>
          <button 
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="p-2 rounded-full hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
            title="Tutup / Lanjutkan tanpa login"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {error && (
            <div className="flex items-start gap-2 p-3 mb-6 bg-rose-500/15 border border-rose-500/50 rounded-xl text-rose-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <p>{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 p-3 mb-6 bg-emerald-500/15 border border-emerald-500/50 rounded-xl text-emerald-600 dark:text-emerald-300 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary ml-1 font-heading">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-inset border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary focus:ring-1 focus:ring-border-primary transition-all"
                  placeholder="petualang@sevnquest.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-text-secondary ml-1 font-heading">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-inset border border-border-subtle rounded-xl py-3 pl-10 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary focus:ring-1 focus:ring-border-primary transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="rpg-btn rpg-btn-primary w-full py-3.5 text-sm font-heading mt-6 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? 'Login' : 'Sign Up'}
            </button>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="w-full py-2.5 text-xs text-text-muted hover:text-text-primary transition-colors text-center mt-2 font-medium"
            >
              Lanjut Belajar Tanpa Login (Mode Tamu)
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center text-sm text-text-secondary">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                playSound('click', soundEnabled);
              }}
              className="text-gold font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </div>
          
          {!isLogin && (
            <p className="text-[10px] text-text-muted text-center mt-4 px-4">
              Creating an account will securely link your local progress to the cloud Leaderboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
