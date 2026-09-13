import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, ShieldAlert, Settings, BookOpen, User, LogOut, Coffee, MessageCircle, Sun, Moon, RefreshCw, Cloud, Check, Sparkles } from 'lucide-react';
import { PlayerStats } from '../../types/rpg';
import { speakJapanese, playSound } from '../../utils/audio';
import { signOut } from '../../lib/supabase';

interface SettingsViewProps {
  stats: PlayerStats;
  onUpdateSettings: (newSettings: Partial<PlayerStats>) => void;
  onResetData: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  onSaveBeforeLogout?: () => Promise<void>;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string | null;
  onUpdateName?: (newName: string) => void;
  onReplayTutorial?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  stats,
  onUpdateSettings,
  onResetData,
  isAuthenticated,
  onOpenAuth,
  onSaveBeforeLogout,
  syncStatus = 'idle',
  lastSyncedAt,
  onUpdateName,
  onReplayTutorial,
}) => {
  const [playerNameInput, setPlayerNameInput] = useState(stats.playerName || '');
  const [isNameSaved, setIsNameSaved] = useState(false);

  useEffect(() => {
    if (stats.playerName) {
      setPlayerNameInput(stats.playerName);
    }
  }, [stats.playerName]);

  const handleSaveName = () => {
    const trimmed = playerNameInput.trim();
    if (!trimmed) return;
    if (onUpdateName) {
      onUpdateName(trimmed);
    } else {
      onUpdateSettings({ playerName: trimmed });
    }
    playSound('correct', stats.soundEnabled);
    setIsNameSaved(true);
    setTimeout(() => setIsNameSaved(false), 2500);
  };

  const handleTestJapaneseVoice = () => {
    speakJapanese('こんにちは！日本語クエストRPGへようこそ。今日も一緒に日本語を勉強しましょう！');
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 pb-6">
      {/* Header */}
      <div className="panel p-4 flex items-center justify-between gap-3 shadow-md mb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-indigo">
            <Settings className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-heading text-text-primary flex items-center gap-2">
              Pengaturan & Akun
            </h2>
            <p className="text-xs text-text-secondary">
              Kelola akun, pengaturan audio, dan preferensi belajar
            </p>
          </div>
        </div>
      </div>

      {/* Account Section */}
      <div className="panel p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <User className="w-4 h-4 text-indigo" /> Akun N3Quest
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {isAuthenticated ? (
            <>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle text-indigo font-bold text-[10px] flex items-center gap-1.5">
                    <Cloud className="w-3 h-3" /> Terhubung ke Cloud
                    {syncStatus === 'syncing' && (
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo ml-1" />
                    )}
                  </span>
                  {lastSyncedAt && (
                    <span className="text-[10px] text-text-muted">
                      Sinkron: {lastSyncedAt}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    playSound('click', true);
                    if (window.confirm('Keluar dari akun? Progres lokal akan disetel ulang (progres cloud aman).')) {
                      if (onSaveBeforeLogout) {
                        await onSaveBeforeLogout();
                      }
                      await signOut();
                      localStorage.removeItem('nihongo_quest_player_stats_v2');
                      localStorage.removeItem('nihongo_quest_stage_progress_v2');
                      localStorage.removeItem('nihongo_quest_daily_missions_v2');
                      localStorage.removeItem('nihongo_quest_weekly_missions_v2');
                      localStorage.removeItem('n3quest_last_cloud_sync');
                      window.location.reload();
                    }
                  }}
                  className="btn btn-pill text-xs gap-2 text-wine-accent border-wine-accent/40 hover:bg-wine-accent/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-wine text-[10px] gap-1.5">
                    Mode Tamu (Guest)
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading mt-1.5">
                  Progres hanya tersimpan di perangkat ini
                </h4>
                <p className="text-xs text-text-secondary mt-1 max-w-sm">
                  Login dengan email untuk mengaktifkan Cloud Save otomatis agar level dan misimu tersinkronisasi di 2 HP atau perangkat lain!
                </p>
              </div>

              <button
                onClick={() => {
                  playSound('click', true);
                  onOpenAuth();
                }}
                className="btn btn-pill text-xs gap-2 shrink-0 text-indigo border-indigo/40 hover:bg-indigo/10"
              >
                <User className="w-4 h-4" />
                Login / Daftar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile & Avatar Section */}
      <div className="panel p-4 sm:p-5 space-y-5 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <User className="w-4 h-4 text-indigo" /> Profil Pemain
        </h3>
        
        {/* 1. Nama Pemain / Panggilan */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-text-primary font-heading flex items-center justify-between">
            <span>Nama Petualang</span>
            <span className="text-[10px] text-text-muted font-mono font-normal">
              {playerNameInput.length}/20 Karakter
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value.slice(0, 20))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                }}
                placeholder="Masukkan nama petualang..."
                className="w-full bg-surface-inset border border-border-subtle focus:border-wine-accent rounded-xl px-3.5 py-2.5 text-sm font-bold font-heading text-text-primary outline-none transition-colors shadow-inner"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveName}
              disabled={!playerNameInput.trim() || playerNameInput.trim() === stats.playerName}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm select-none active:scale-95 shrink-0 ${
                isNameSaved
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : playerNameInput.trim() && playerNameInput.trim() !== stats.playerName
                  ? 'bg-wine-accent hover:opacity-95 text-white font-black shadow-md'
                  : 'bg-surface-inset text-text-muted border border-border-subtle cursor-not-allowed opacity-60'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isNameSaved ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          </div>
          <p className="text-[10px] text-text-secondary">
            *Nama ini akan tampil di Kartu Status Profil dan Peringkat Leaderboard.
          </p>
        </div>

        {/* 2. Avatar Picker */}
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <label className="text-xs sm:text-sm font-bold text-text-primary font-heading block">
            Pilih Avatar (Tampil di Leaderboard)
          </label>
          <div className="flex flex-wrap gap-2">
            {['🦊', '🐉', '⛩️', '👹', '🥷', '🌸', '⚔️', '👺', '🐼'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  playSound('click', true);
                  onUpdateSettings({ avatar: emoji });
                }}
                className={`w-12 h-12 flex items-center justify-center text-2xl rounded-xl border-2 transition-all ${
                  stats.avatar === emoji || (!stats.avatar && emoji === '🦊')
                    ? 'bg-surface-elevated border-indigo scale-110 shadow-md ring-2 ring-indigo/30'
                    : 'bg-surface-inset border-border-subtle hover:border-indigo/50 opacity-60 hover:opacity-100'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-text-secondary">
            *Avatar akan tersinkronisasi saat progress tersimpan ke cloud (saat EXP bertambah).
          </p>
        </div>
      </div>

      {/* Audio & Sound Effects Section */}
      <div className="panel p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <Volume2 className="w-4 h-4 text-indigo" /> Audio & Mantra Suara
        </h3>

        {/* Sound FX Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Efek Suara Game (SFX)</h4>
            <p className="text-xs text-text-secondary">Suara ketuk kayu, tebasan bambu, genta zen, tetesan air & lonceng angin</p>
          </div>
          <button
            onClick={() => {
              const newSetting = !stats.soundEnabled;
              onUpdateSettings({ soundEnabled: newSetting });
              if (newSetting) playSound('click', true);
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              stats.soundEnabled
                ? 'bg-surface-elevated text-indigo border-indigo/40 shadow-sm'
                : 'bg-surface-inset text-text-muted border-border-subtle'
            }`}
          >
            {stats.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* SFX Tester Pills */}
        {stats.soundEnabled && (
          <div className="pt-2 border-t border-border-subtle">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-2 font-mono">
              Pratinjau Efek Suara Organik:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => playSound('click', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 hover:border-indigo/50"
              >
                🪵 Ketuk Kayu
              </button>
              <button
                type="button"
                onClick={() => playSound('correct', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
              >
                🔔 Genta Zen (Benar)
              </button>
              <button
                type="button"
                onClick={() => playSound('wrong', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 hover:border-rose-500/50 text-rose-600 dark:text-rose-400"
              >
                🥁 Ketuk Lembut (Salah)
              </button>
              <button
                type="button"
                onClick={() => playSound('coin', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 hover:border-gold/50 text-gold"
              >
                💧 Suikinkutsu (Koin)
              </button>
              <button
                type="button"
                onClick={() => playSound('attack', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 hover:border-wine-accent/50 text-wine-accent"
              >
                🎋 Tebasan Bambu
              </button>
              <button
                type="button"
                onClick={() => playSound('levelup', true)}
                className="btn btn-pill text-[11px] py-1 px-2.5 hover:border-indigo/50 text-indigo"
              >
                🎐 Fūrin (Level Up)
              </button>
            </div>
          </div>
        )}

        {/* Japanese TTS Voice Tester */}
        <div className="pt-3 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Uji Resonansi Suara Jepang (TTS)</h4>
            <p className="text-xs text-text-secondary">Menggunakan Web Speech Synthesis Native Browser</p>
          </div>
          <button
            onClick={handleTestJapaneseVoice}
            className="btn btn-pill text-xs gap-2 self-start sm:self-auto text-indigo border-indigo/40 hover:bg-indigo/10"
          >
            <Volume2 className="w-4 h-4" />
            <span>Uji Suara 「こんにちは」</span>
          </button>
        </div>
      </div>

      {/* Learning Preferences */}
      <div className="panel p-4 sm:p-5 space-y-3.5 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <BookOpen className="w-4 h-4 text-indigo" /> Pengaturan Belajar
        </h3>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Tema Visual</h4>
            <p className="text-xs text-text-secondary">Pilih Mode Gelap (Indigo Malam) atau Terang (Washi Hangat)</p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-inset border border-border-subtle">
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({ theme: 'dark' });
                playSound('click', stats.soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                stats.theme !== 'light'
                  ? 'bg-surface-elevated text-indigo border border-indigo/40 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Gelap
            </button>
            <button
              type="button"
              onClick={() => {
                onUpdateSettings({ theme: 'light' });
                playSound('click', stats.soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                stats.theme === 'light'
                  ? 'bg-surface-elevated text-indigo border border-indigo/40 shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Terang
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Bantuan Furigana & Kanji</h4>
            <p className="text-xs text-text-secondary">Bantuan cara baca Hiragana di atas kanji</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-state-success/15 border border-state-success/30 text-state-success font-bold text-xs">
            Aktif
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Kurikulum Nihongo Soumatome</h4>
            <p className="text-xs text-text-secondary">Struktur materi 6 Map / 6 Minggu</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-inset border border-border-subtle text-text-secondary font-mono text-xs">
            N3 Comprehensive
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span>Panduan Awal (Tutorial)</span>
            </h4>
            <p className="text-xs text-text-secondary">Ulangi tur panduan spotlight interaktif</p>
          </div>
          <button
            type="button"
            onClick={() => {
              playSound('click', stats.soundEnabled);
              if (onReplayTutorial) onReplayTutorial();
            }}
            className="btn btn-pill text-xs gap-1.5 text-gold border-gold/40 hover:bg-gold/10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ulangi Tur</span>
          </button>
        </div>
      </div>

      {/* Support & Community Section */}
      <div className="panel p-4 sm:p-5 space-y-4 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
          <MessageCircle className="w-4 h-4 text-indigo" /> Dukungan & Komunitas
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://teer.id/sevnsoul"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('click')}
            className="flex-1 py-3 px-4 rounded-xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle hover:border-gold flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
          >
            <Coffee className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-xs font-bold text-text-primary font-heading">Dukung Developer</div>
              <div className="text-[10px] text-text-muted">via Trakteer (teer.id)</div>
            </div>
          </a>

          <a
            href="https://ngl.link/sevnsouls"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound('click')}
            className="flex-1 py-3 px-4 rounded-xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle hover:border-indigo flex flex-col items-center justify-center gap-2 transition-all group shadow-sm"
          >
            <MessageCircle className="w-5 h-5 text-indigo group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <div className="text-xs font-bold text-text-primary font-heading">Call Center / Lapor Bug</div>
              <div className="text-[10px] text-text-muted">via NGL Link (ngl.link/sevnsouls)</div>
            </div>
          </a>
        </div>
      </div>

      {/* Reset Progress Section */}
      <div className="panel p-4 sm:p-5 space-y-3 border border-wine-accent/40 shadow-md">
        <div className="flex items-center gap-2 text-wine-accent font-bold text-xs sm:text-sm font-heading">
          <ShieldAlert className="w-4 h-4" />
          <span>Zona Riset Data</span>
        </div>
        <p className="text-xs text-text-secondary">
          Mereset EXP, level, gold, dan kemajuan stage kembali ke Tier 1 (Villager).
        </p>
        <button
          onClick={() => {
            if (window.confirm('Yakin ingin mereset seluruh progres petualangan?')) {
              onResetData();
            }
          }}
          className="btn btn-pill text-xs gap-1.5 text-wine-accent border-wine-accent/40 hover:bg-wine-accent/10"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Progres Petualangan</span>
        </button>
      </div>
    </div>
  );
};
