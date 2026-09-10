import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Edit3 } from 'lucide-react';
import { KotobaItem } from '../../types/content';
import { KanjiWritingCanvas, preloadStrokeData } from './KanjiWritingCanvas';
import { playSound, speakJapanese } from '../../utils/audio';

interface KotobaWritingPracticeProps {
  kotoba: KotobaItem;
  onFinishWord: (score: number) => void;
  onCancel?: () => void;
  soundEnabled?: boolean;
}

export const KotobaWritingPractice: React.FC<KotobaWritingPracticeProps> = ({
  kotoba,
  onFinishWord,
  onCancel,
  soundEnabled = true,
}) => {
  const characters = useMemo(() => Array.from(kotoba.word), [kotoba.word]);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [completedChars, setCompletedChars] = useState<number[]>([]);
  const [totalMistakes, setTotalMistakes] = useState(0);

  // Reset state when kotoba changes
  useEffect(() => {
    setCurrentCharIndex(0);
    setCompletedChars([]);
    setTotalMistakes(0);
    // Preload all stroke data in the background!
    preloadStrokeData(kotoba.word);
  }, [kotoba.word]);

  const currentChar = characters[currentCharIndex];
  const isWordFinished = completedChars.length === characters.length;

  const handleFinishChar = () => {
    setCompletedChars(prev => [...prev, currentCharIndex]);
    
    if (currentCharIndex < characters.length - 1) {
      setTimeout(() => {
        setCurrentCharIndex(prev => prev + 1);
      }, 600); // Small delay before next char
    } else {
      // Final character completed
      playSound('fanfare', soundEnabled);
      speakJapanese(kotoba.word);
      setTimeout(() => {
        onFinishWord(Math.max(0, 100 - (totalMistakes * 10))); // Calculate final exp
      }, 800); // Wait for the "naik ke atas" animation
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center space-y-6 animate-fade-in panel p-4 sm:p-6 rounded-3xl border border-border-subtle bg-surface-card">
      
      {/* Top Header: Active Recall Clue */}
      <div className="text-center space-y-3 w-full">
        <div className="flex justify-between items-center w-full">
          <span className="px-3 py-1 rounded-full bg-gold/15 text-gold border border-gold/30 text-xs font-bold flex items-center gap-1.5 shadow-sm font-heading">
            <Edit3 className="w-3.5 h-3.5 text-gold" /> Active Recall
          </span>
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2 font-bold">
              Batal
            </button>
          )}
        </div>
        
        <div className="bg-surface-inset p-4 rounded-2xl border border-border-subtle shadow-inner">
          <h3 className="text-xl sm:text-2xl font-black text-text-primary leading-snug font-heading">
            {kotoba.meaningId}
          </h3>
        </div>
      </div>

      {/* Target Slots */}
      <div className="flex items-end justify-center gap-2 sm:gap-3 py-4 min-h-[80px]">
        {characters.map((char, i) => {
          const isDone = completedChars.includes(i);
          const isActive = i === currentCharIndex;
          
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div 
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border-2 transition-all relative
                  ${isDone ? 'bg-emerald-500/15 border-emerald-500/50 shadow-md' : 
                    isActive ? 'bg-surface-elevated border-gold ring-2 ring-gold/20 shadow-md' : 
                    'bg-surface-inset border-border-subtle'}
                `}
              >
                <AnimatePresence>
                  {isDone && (
                    <motion.span
                      key={`span-${i}`}
                      initial={{ opacity: 0, y: 30, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-jp"
                    >
                      {char}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !isDone && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-2 h-2 rounded-full bg-gold"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Writing Canvas for the Current Character */}
      {!isWordFinished ? (
        <div className="w-full flex flex-col items-center gap-3">
          <div className="text-xs font-bold text-text-secondary font-mono">
            Tulis karakter ke-{currentCharIndex + 1}
          </div>
          <div className="w-full flex justify-center" key={`canvas-${currentCharIndex}-${currentChar}`}>
            <KanjiWritingCanvas
              kanjiChar={currentChar}
              totalSheets={1} // Reduced to 1 sheet for active recall flow speed
              soundEnabled={soundEnabled}
              autoAdvance={true}
              onCompleteSheet={(sheet, sheetScore) => {
                if (sheetScore < 100) {
                   setTotalMistakes(prev => prev + 1);
                }
              }}
              onFinish={handleFinishChar}
            />
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", delay: 0.3 }}
          className="w-full p-6 sm:p-8 rounded-3xl panel bg-surface-card border-2 border-emerald-500/40 text-center space-y-4 shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-surface-base flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-heading">Kerja Bagus!</h4>
            <p className="text-sm text-text-secondary">Kosakata berhasil diingat & ditulis.</p>
          </div>
          
          <div className="py-2">
            <p className="text-lg font-mono text-emerald-600 dark:text-emerald-400 mb-1">{kotoba.reading}</p>
            <p className="text-3xl font-black text-text-primary font-jp tracking-wider drop-shadow-sm">{kotoba.word}</p>
          </div>
          
          <div className="pt-2">
            <button
              onClick={() => {
                onCancel && onCancel();
                playSound('click', soundEnabled);
              }}
              className="rpg-btn rpg-btn-primary w-full py-3 text-sm font-heading"
            >
              Selesai & Kembali
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
