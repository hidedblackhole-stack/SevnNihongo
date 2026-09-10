import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, UserPlus, Coffee, X } from 'lucide-react';
import { playSound } from '../../utils/audio';

interface WelcomeModalProps {
  isOpen: boolean;
  onSelectPath: (path: 'zero' | 'placement', level?: 'N4' | 'N3' | 'N2' | 'N1') => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onSelectPath }) => {
  const [mode, setMode] = React.useState<'main' | 'placement'>('main');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-sm panel bg-surface-card border border-border-primary rounded-2xl overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="bg-surface-card p-5 text-center relative border-b border-border-subtle">
            <div
              className="absolute top-3 right-3 p-1.5 rounded-full text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </div>
            <div className="w-16 h-16 mx-auto bg-surface-inset rounded-xl border border-border-subtle flex items-center justify-center mb-3 shadow-inner">
              <Swords className="w-8 h-8 text-gold" />
            </div>
            <h2 className="font-bold text-text-primary text-xl font-heading tracking-wide">
              Selamat Datang di Nihongo Quest
            </h2>
            <p className="text-xs text-text-secondary mt-2 max-w-[250px] mx-auto">
              Perjalananmu menaklukkan 5 Alam JLPT (N5 - N1) akan segera dimulai.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {mode === 'main' ? (
              <>
                <div className="bg-surface-inset rounded-xl p-4 border border-border-subtle">
                  <h3 className="text-sm font-bold text-text-primary font-heading mb-2 flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-gold" /> Mulai Petualangan Baru
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                    Apakah kamu pemula yang ingin belajar dari dasar, atau veteran yang ingin melompati level awal?
                  </p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        playSound('click');
                        onSelectPath('zero');
                      }}
                      className="rpg-btn rpg-btn-primary w-full py-2.5 text-xs font-heading"
                    >
                      Mulai dari 0 (Kana & N5)
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        setMode('placement');
                      }}
                      className="rpg-btn rpg-btn-secondary w-full py-2.5 text-xs font-heading"
                    >
                      Ujian Penempatan (Pilih Level)
                    </button>
                  </div>
                </div>

                <div className="bg-surface-inset rounded-xl p-4 border border-border-subtle text-center">
                  <p className="text-[11px] text-text-secondary leading-relaxed mb-3">
                    Progress belajarmu akan disimpan. <strong>Login diwajibkan</strong> setelah memilih jalur untuk mencegah hilangnya data karakter RPG-mu.
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-surface-inset rounded-xl p-4 border border-border-subtle">
                <h3 className="text-sm font-bold text-text-primary font-heading mb-2 flex items-center gap-1.5">
                  <Swords className="w-4 h-4 text-gold" /> Pilih Target Level
                </h3>
                <p className="text-[11px] text-text-secondary leading-relaxed mb-4">
                  Kamu akan mengerjakan 20 soal acak sesuai level yang dipilih. Waktu ujian adalah 10 menit. Minimal nilai kelulusan adalah 75%.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {(['N4', 'N3', 'N2', 'N1'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => {
                        playSound('click');
                        onSelectPath('placement', lvl);
                      }}
                      className="py-2.5 rounded-lg bg-surface-card hover:bg-surface-elevated text-gold border border-border-subtle hover:border-gold font-heading font-bold text-xs transition-colors"
                    >
                      Ujian {lvl}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    playSound('click');
                    setMode('main');
                  }}
                  className="w-full text-[10px] text-text-muted hover:text-text-primary font-medium transition-colors"
                >
                  Kembali
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
