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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-sm bg-stone-900 border-2 border-amber-500/50 rounded-2xl overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="bg-gradient-to-b from-amber-900/40 to-stone-900 p-5 text-center relative border-b border-amber-900/30">
            <div
              className="absolute top-3 right-3 p-1.5 rounded-full text-stone-600"
            >
              <X className="w-4 h-4" />
            </div>
            <div className="w-16 h-16 mx-auto bg-stone-950 rounded-xl border border-amber-500/30 flex items-center justify-center mb-3 shadow-inner shadow-amber-900/20">
              <Swords className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="font-bold text-amber-100 text-xl font-medieval tracking-wide">
              Selamat Datang di Nihongo Quest
            </h2>
            <p className="text-xs text-stone-400 mt-2 max-w-[250px] mx-auto">
              Perjalananmu menaklukkan 5 Alam JLPT (N5 - N1) akan segera dimulai.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {mode === 'main' ? (
              <>
                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                  <h3 className="text-sm font-bold text-amber-300 font-medieval mb-2 flex items-center gap-1.5">
                    <Swords className="w-4 h-4" /> Mulai Petualangan Baru
                  </h3>
                  <p className="text-[11px] text-stone-400 leading-relaxed mb-4">
                    Apakah kamu pemula yang ingin belajar dari dasar, atau veteran yang ingin melompati level awal?
                  </p>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        playSound('click');
                        onSelectPath('zero');
                      }}
                      className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center transition-transform active:scale-95"
                    >
                      Mulai dari 0 (Kana & N5)
                    </button>
                    <button
                      onClick={() => {
                        playSound('click');
                        setMode('placement');
                      }}
                      className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 border border-amber-600/30 font-bold text-xs flex items-center justify-center transition-transform active:scale-95"
                    >
                      Ujian Penempatan (Pilih Level)
                    </button>
                  </div>
                </div>

                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 text-center">
                  <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                    Progress belajarmu akan disimpan. <strong>Login diwajibkan</strong> setelah memilih jalur untuk mencegah hilangnya data karakter RPG-mu.
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                <h3 className="text-sm font-bold text-amber-300 font-medieval mb-2 flex items-center gap-1.5">
                  <Swords className="w-4 h-4" /> Pilih Target Level
                </h3>
                <p className="text-[11px] text-stone-400 leading-relaxed mb-4">
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
                      className="py-2.5 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-amber-400 border border-stone-700 hover:border-amber-500 font-bold text-xs transition-colors"
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
                  className="w-full text-[10px] text-stone-500 hover:text-stone-300 font-medium transition-colors"
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
