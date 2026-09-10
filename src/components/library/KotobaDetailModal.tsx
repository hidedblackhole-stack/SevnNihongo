import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Volume2, Layers, Link as LinkIcon, Network, Edit3 } from 'lucide-react';
import { BookIcon } from '../ui/EngravingIcons';
import { KotobaItem } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KotobaWritingPractice } from '../learning/KotobaWritingPractice';

interface KotobaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: KotobaItem | null;
  soundEnabled?: boolean;
}

export const KotobaDetailModal: React.FC<KotobaDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  soundEnabled = true,
}) => {
  const [isWritingMode, setIsWritingMode] = useState(false);

  useEffect(() => {
    setIsWritingMode(false);
  }, [item?.id]);

  // Dynamically compute related words based on shared Kanji components
  const dynamicRelatedWords = useMemo(() => {
    if (!item || !item.kanjiComponents || item.kanjiComponents.length === 0) return [];
    
    // Find up to 5 other words that share at least one kanji
    const allItems = Object.values(KOTOBA_DATABASE);
    const related = allItems.filter(other => 
      other.id !== item.id && 
      other.kanjiComponents &&
      other.kanjiComponents.some(kanji => item.kanjiComponents!.includes(kanji))
    );
    
    // Shuffle and pick 5
    return related.sort(() => 0.5 - Math.random()).slice(0, 5);
  }, [item]);

  if (!isOpen || !item) return null;

  const relatedWords = item.relatedWords || dynamicRelatedWords.map(rw => rw.word);
  const collocations = item.collocations || [];

  return (
    <motion.div key="modal-container" className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6 sm:p-6" exit={{ opacity: 0 }}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            onClose();
            playSound('click', soundEnabled);
          }}
          className="absolute inset-0 bg-surface-ground/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="panel relative w-full max-w-lg border border-border-subtle rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle bg-surface-inset">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-heading">
              <BookIcon className="w-4 h-4 text-gold" />
              Detail Kosakata
            </h3>
            <button
              onClick={() => {
                onClose();
                playSound('click', soundEnabled);
              }}
              className="p-1.5 rounded-xl bg-surface-card border border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
            
            {isWritingMode ? (
              <KotobaWritingPractice
                kotoba={item}
                soundEnabled={soundEnabled}
                onFinishWord={() => {}}
                onCancel={() => setIsWritingMode(false)}
              />
            ) : (
              <>
                {/* Top Area: Word, Reading, Meaning, Badges */}
                <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex gap-2 justify-center flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-surface-inset text-text-primary text-xs font-mono font-bold border border-border-subtle shadow-sm">
                  JLPT {item.jlpt}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-surface-inset text-text-secondary border border-border-subtle shadow-sm">
                  {(item.id.match(/\d+$/) ? parseInt(item.id.match(/\d+$/)![0], 10) % 10 : 0) < 5
                    ? 'Essential (Core)'
                    : (item.id.match(/\d+$/) ? parseInt(item.id.match(/\d+$/)![0], 10) % 10 : 0) < 8
                    ? 'Important (High Frequency)'
                    : 'Supplementary (Lanjutan)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-surface-inset text-text-muted text-xs font-mono border border-border-subtle uppercase font-bold shadow-sm">
                  {item.wordType}
                </span>
              </div>
              
              <div className="space-y-1">
                <h1 className="text-5xl font-black text-text-primary font-jp tracking-wider">
                  <RubyText japanese={item.word} reading={item.reading} showFurigana={true} />
                </h1>
                <button
                  onClick={() => speakJapanese(item.word)}
                  className="mx-auto mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors text-xs font-bold border border-border-subtle"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Dengarkan
                </button>
              </div>

              <div className="space-y-1 bg-surface-inset p-4 rounded-2xl w-full border border-border-subtle">
                <h2 className="text-xl font-black text-text-primary font-heading leading-snug">
                  {item.meaningId}
                </h2>
                <p className="text-xs text-text-muted italic">
                  Makna JP: {item.meaningJa}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsWritingMode(true);
                  playSound('click', soundEnabled);
                }}
                className="btn-cta mt-2 w-full max-w-xs mx-auto py-3 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 font-heading"
              >
                <Edit3 className="w-4 h-4" />
                <span>Latih dengan Menulis (Active Recall)</span>
              </button>
            </div>

            {/* Kanji Breakdown */}
            {item.kanjiComponents && item.kanjiComponents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Komponen Kanji
                </h4>
                <div className="flex flex-wrap gap-2">
                  {item.kanjiComponents.map((k, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-xl bg-surface-inset text-text-primary border border-border-subtle text-sm font-jp font-bold">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Example Sentences */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider">Contoh Kalimat</h4>
              {item.exampleSentence ? (
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                  <p className="text-sm font-jp text-text-primary leading-relaxed font-bold">
                    <RubyText 
                      japanese={item.exampleSentence.japanese} 
                      reading={item.exampleSentence.reading} 
                      showFurigana={true} 
                    />
                  </p>
                  <p className="text-xs text-text-secondary font-medium">
                    {item.exampleSentence.meaningId}
                  </p>
                  <button
                    onClick={() => speakJapanese(item.exampleSentence!.japanese)}
                    className="flex items-center gap-1.5 text-[10px] text-gold hover:underline font-bold uppercase tracking-wider mt-2"
                  >
                    <Volume2 className="w-3 h-3" /> Putar Audio
                  </button>
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">Belum ada contoh kalimat.</p>
              )}
            </div>

            {/* Related Words & Collocations Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Related Words */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Kata Terkait
                </h4>
                {relatedWords.length > 0 ? (
                  <ul className="space-y-1.5">
                    {relatedWords.map((word, i) => (
                      <li key={i} className="text-sm text-text-primary font-jp bg-surface-inset px-2.5 py-1.5 rounded-lg border border-border-subtle">
                        {word}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-text-muted italic">Tidak ada referensi kata terkait.</p>
                )}
              </div>

              {/* Collocations */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5" /> Kolokasi (Frasa)
                </h4>
                {collocations.length > 0 ? (
                  <ul className="space-y-1.5">
                    {collocations.map((colloc, i) => (
                      <li key={i} className="text-sm text-text-primary font-jp bg-surface-inset px-2.5 py-1.5 rounded-lg border border-border-subtle">
                        {colloc}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-border-subtle bg-surface-inset">
                    <p className="text-[10px] text-text-muted text-center leading-relaxed">
                      Kolokasi (penggabungan kata lazim) belum tersedia untuk kosakata ini.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </>
            )}

          </div>
        </motion.div>
      </motion.div>
  );
};
