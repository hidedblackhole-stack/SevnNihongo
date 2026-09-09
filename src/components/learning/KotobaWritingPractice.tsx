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
    <div className="w-full max-w-lg mx-auto flex flex-col items-center space-y-6 animate-fade-in bg-stone-900/40 p-4 sm:p-6 rounded-3xl border border-stone-800">
      
      {/* Top Header: Active Recall Clue */}
      <div className="text-center space-y-3 w-full">
        <div className="flex justify-between items-center w-full">
          <span className="px-3 py-1 rounded-full bg-[#57382A] text-[#FFF9F0] border border-[#57382A] dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Edit3 className="w-3.5 h-3.5 text-[#E6C978] dark:text-amber-400" /> Active Recall
          </span>
          {onCancel && (
            <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 underline underline-offset-2 font-bold">
              Batal
            </button>
          )}
        </div>
        
        <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800/80 shadow-inner">
          <h3 className="text-xl sm:text-2xl font-black text-amber-300 leading-snug">
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
                  ${isDone ? 'bg-[#E9E6D4] border-[#B9BE97] dark:bg-emerald-950/40 dark:border-emerald-500/50 shadow-lg' : 
                    isActive ? 'bg-stone-800 border-amber-500 shadow-lg shadow-amber-900/20 ring-2 ring-amber-500/20' : 
                    'bg-stone-950 border-stone-800/50'}
                `}
              >
                <AnimatePresence>
                  {isDone && (
                    <motion.span
                      key={`span-${i}`}
                      initial={{ opacity: 0, y: 30, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl font-black text-[#6E7A45] dark:text-emerald-400 font-jp"
                    >
                      {char}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !isDone && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-2 h-2 rounded-full bg-amber-500"
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
          <div className="text-xs font-bold text-stone-400 font-mono">
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
          className="w-full p-6 sm:p-8 rounded-3xl bg-[#E9E6D4] border-2 border-[#B9BE97] dark:bg-emerald-950/40 dark:border-emerald-500/30 text-center space-y-4 shadow-xl"
        >
          <div className="w-16 h-16 rounded-full bg-[#6E7A45] text-[#FFF9F0] dark:bg-emerald-500 dark:text-stone-950 flex items-center justify-center mx-auto mb-2 shadow-lg">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-[#6E7A45] dark:text-emerald-400">Kerja Bagus!</h4>
            <p className="text-sm text-[#765F50] dark:text-stone-300">Kosakata berhasil diingat & ditulis.</p>
          </div>
          
          <div className="py-2">
            <p className="text-lg font-mono text-[#6E7A45]/80 dark:text-emerald-300/80 mb-1">{kotoba.reading}</p>
            <p className="text-3xl font-black text-[#442D22] dark:text-stone-100 font-jp tracking-wider drop-shadow-sm">{kotoba.word}</p>
          </div>
          
          <div className="pt-2">
            <button
              onClick={() => {
                onCancel && onCancel();
                playSound('click', soundEnabled);
              }}
              className="px-6 py-2.5 rounded-xl bg-[#57382A] hover:bg-[#442D22] text-[#FFF9F0] dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white font-bold text-sm transition-all shadow-md w-full"
            >
              Selesai & Kembali
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
