import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sliders, Layers, CheckCircle2, AlertCircle, Compass, PenTool, BookOpen, Brain } from 'lucide-react';
import { UserDeck, DeckItemCategory } from '../../types/rpg';
import { CurriculumConfig } from '../../types/curriculum';
import { extractDeckRefs } from '../../utils/curriculumEngine';
import { playSound } from '../../utils/audio';

interface CurriculumConfigModalProps {
  isOpen?: boolean;
  deck: UserDeck | null;
  onClose: () => void;
  onGenerate?: (config: CurriculumConfig) => void;
  onSave?: (config: CurriculumConfig) => void;
  existingConfig?: CurriculumConfig;
  soundEnabled?: boolean;
}

export const CurriculumConfigModal: React.FC<CurriculumConfigModalProps> = ({
  isOpen = true,
  deck,
  onClose,
  onGenerate,
  onSave,
  existingConfig,
  soundEnabled = true,
}) => {
  if (!isOpen || !deck) return null;

  const refs = useMemo(() => extractDeckRefs(deck), [deck]);

  // Stage count slider state (default 3 to 5 based on total items)
  const defaultStageCount = Math.max(1, Math.min(refs.totalCount > 10 ? 5 : 3, 10));
  const [stageCount, setStageCount] = useState<number>(() => existingConfig?.stageCount ?? defaultStageCount);

  // Selected types (default to all available in the deck)
  const [selectedTypes, setSelectedTypes] = useState<DeckItemCategory[]>(() => {
    if (existingConfig?.includeTypes && existingConfig.includeTypes.length > 0) {
      return [...existingConfig.includeTypes];
    }
    return refs.availableTypes.length > 0 ? [...refs.availableTypes] : ['kotoba'];
  });

  // Category specific settings
  const [kanjiFlashcard, setKanjiFlashcard] = useState(() => existingConfig?.kanjiSettings?.flashcard ?? true);
  const [kanjiWriteMode, setKanjiWriteMode] = useState(() => existingConfig?.kanjiSettings?.writeMode ?? true);
  const [canvasRepetitions, setCanvasRepetitions] = useState<number>(() => existingConfig?.kanjiSettings?.canvasPerKanji ?? 3);
  const [kanjiQuiz, setKanjiQuiz] = useState(() => existingConfig?.kanjiSettings?.quiz ?? true);

  const [kotobaFlashcard, setKotobaFlashcard] = useState(() => existingConfig?.kotobaSettings?.flashcard ?? true);
  const [kotobaQuiz, setKotobaQuiz] = useState(() => existingConfig?.kotobaSettings?.quiz ?? true);

  const [bunpouStudy, setBunpouStudy] = useState(() => existingConfig?.polaSettings?.study ?? true);
  const [bunpouQuiz, setBunpouQuiz] = useState(() => existingConfig?.polaSettings?.quiz ?? true);

  // Toggle content type inclusion
  const handleToggleType = (cat: DeckItemCategory) => {
    playSound('click', soundEnabled);
    if (selectedTypes.includes(cat)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(prev => prev.filter(t => t !== cat));
      }
    } else {
      setSelectedTypes(prev => [...prev, cat]);
    }
  };

  // Live preview calculations
  const previewTotalItems = useMemo(() => {
    let count = 0;
    if (selectedTypes.includes('kanji')) count += refs.kanjiIds.length;
    if (selectedTypes.includes('kotoba')) count += refs.kotobaIds.length;
    if (selectedTypes.includes('bunpou')) count += refs.polaIds.length;
    return count;
  }, [selectedTypes, refs]);

  const itemsPerStageAvg = Math.max(1, Math.ceil(previewTotalItems / Math.max(1, stageCount)));
  const willHaveMixedExam = selectedTypes.length > 1 && selectedTypes.filter(t => {
    if (t === 'kanji') return refs.kanjiIds.length > 0;
    if (t === 'kotoba') return refs.kotobaIds.length > 0;
    if (t === 'bunpou') return refs.polaIds.length > 0;
    return false;
  }).length > 1;

  const handleGenerate = () => {
    playSound('victory', soundEnabled);
    const config: CurriculumConfig = {
      stageCount,
      includeTypes: selectedTypes,
      kanjiSettings: {
        writeMode: kanjiWriteMode,
        canvasPerKanji: canvasRepetitions,
        flashcard: kanjiFlashcard,
        quiz: kanjiQuiz,
      },
      kotobaSettings: {
        flashcard: kotobaFlashcard,
        quiz: kotobaQuiz,
      },
      polaSettings: {
        study: bunpouStudy,
        quiz: bunpouQuiz,
      },
    };
    if (onGenerate) onGenerate(config);
    if (onSave) onSave(config);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-surface-card border border-border-subtle rounded-3xl shadow-2xl p-5 sm:p-6 my-auto space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo/15 text-indigo border border-indigo/30 flex items-center justify-center text-2xl shadow-sm">
                {deck.coverIcon || '🗺️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-indigo/15 text-indigo border border-indigo/30">
                    Curriculum Engine
                  </span>
                  <span className="text-xs text-text-secondary font-mono">
                    {refs.totalCount} Total Ref
                  </span>
                </div>
                <h2 className="text-xl font-bold text-text-primary font-heading">
                  Rancang World: {deck.title}
                </h2>
                <p className="text-xs text-text-secondary">
                  Konversi materi deck menjadi kurikulum petualangan stage berstruktur rapi tanpa duplikasi data.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-inset transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {refs.totalCount === 0 ? (
            <div className="p-6 text-center space-y-3 bg-surface-inset rounded-2xl border border-border-subtle">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
              <h3 className="text-base font-bold text-text-primary">Deck Masih Kosong</h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                Tambahkan minimal 1 Kanji, Kosakata (Kotoba), atau Pola Kalimat ke dalam deck ini terlebih dahulu sebelum membuat kurikulum stage.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-xs sm:text-sm">
              {/* SECTION 1: JUMLAH STAGE */}
              <div className="space-y-2.5 panel p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-text-primary flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo" />
                    <span>1. Pembagian Jumlah Stage Pembelajaran</span>
                  </label>
                  <span className="px-3 py-1 bg-indigo text-white font-mono font-bold rounded-xl text-xs shadow-xs">
                    {stageCount} Stage {willHaveMixedExam && '+ 1 Exam'}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  Tentukan berapa checkpoint stage yang ingin dibuat. Materi akan dibagikan secara proporsional.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <input
                    type="range"
                    min={1}
                    max={Math.min(10, Math.max(1, previewTotalItems))}
                    value={stageCount}
                    onChange={(e) => {
                      setStageCount(parseInt(e.target.value, 10));
                      playSound('click', soundEnabled);
                    }}
                    className="w-full accent-indigo cursor-pointer"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-text-secondary pt-1">
                  <span>1 Stage (Intensif)</span>
                  <span>Rata-rata: ~{itemsPerStageAvg} materi/stage</span>
                  <span>{Math.min(10, Math.max(1, previewTotalItems))} Stage (Bertahap)</span>
                </div>
              </div>

              {/* SECTION 2: PILIH KONTEN */}
              <div className="space-y-2.5 panel p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <label className="font-bold text-text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo" />
                  <span>2. Komponen Konten yang Disertakan</span>
                </label>
                <p className="text-[11px] text-text-secondary">
                  Pilih pilar materi yang ingin dilatih di dalam kurikulum ini.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Kanji Option */}
                  <button
                    type="button"
                    disabled={refs.kanjiIds.length === 0}
                    onClick={() => handleToggleType('kanji')}
                    className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      selectedTypes.includes('kanji')
                        ? 'border-indigo bg-indigo/10 text-text-primary shadow-xs'
                        : refs.kanjiIds.length === 0
                        ? 'opacity-40 border-border-subtle bg-surface-card cursor-not-allowed'
                        : 'border-border-subtle bg-surface-card text-text-secondary hover:border-indigo/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>漢 Kanji</span>
                      </div>
                      <span className="text-[11px] text-text-secondary font-mono">
                        {refs.kanjiIds.length} karakter
                      </span>
                    </div>
                    {selectedTypes.includes('kanji') && (
                      <CheckCircle2 className="w-4 h-4 text-indigo shrink-0" />
                    )}
                  </button>

                  {/* Kotoba Option */}
                  <button
                    type="button"
                    disabled={refs.kotobaIds.length === 0}
                    onClick={() => handleToggleType('kotoba')}
                    className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      selectedTypes.includes('kotoba')
                        ? 'border-indigo bg-indigo/10 text-text-primary shadow-xs'
                        : refs.kotobaIds.length === 0
                        ? 'opacity-40 border-border-subtle bg-surface-card cursor-not-allowed'
                        : 'border-border-subtle bg-surface-card text-text-secondary hover:border-indigo/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>言 Kotoba</span>
                      </div>
                      <span className="text-[11px] text-text-secondary font-mono">
                        {refs.kotobaIds.length} kosakata
                      </span>
                    </div>
                    {selectedTypes.includes('kotoba') && (
                      <CheckCircle2 className="w-4 h-4 text-indigo shrink-0" />
                    )}
                  </button>

                  {/* Bunpou Option */}
                  <button
                    type="button"
                    disabled={refs.polaIds.length === 0}
                    onClick={() => handleToggleType('bunpou')}
                    className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all ${
                      selectedTypes.includes('bunpou')
                        ? 'border-indigo bg-indigo/10 text-text-primary shadow-xs'
                        : refs.polaIds.length === 0
                        ? 'opacity-40 border-border-subtle bg-surface-card cursor-not-allowed'
                        : 'border-border-subtle bg-surface-card text-text-secondary hover:border-indigo/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>文 Bunpou</span>
                      </div>
                      <span className="text-[11px] text-text-secondary font-mono">
                        {refs.polaIds.length} pola kalimat
                      </span>
                    </div>
                    {selectedTypes.includes('bunpou') && (
                      <CheckCircle2 className="w-4 h-4 text-indigo shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION 3: AKTIVITAS PEMBELAJARAN */}
              <div className="space-y-3 panel p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <label className="font-bold text-text-primary flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo" />
                  <span>3. Aturan Aktivitas Tiap Stage</span>
                </label>

                <div className="space-y-3 divide-y divide-border-subtle">
                  {/* Kanji Rules */}
                  {selectedTypes.includes('kanji') && (
                    <div className="pt-2 space-y-2">
                      <div className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-gold" />
                        <span>Aktivitas Kanji:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle cursor-pointer hover:bg-surface-elevated">
                          <input
                            type="checkbox"
                            checked={kanjiFlashcard}
                            onChange={(e) => setKanjiFlashcard(e.target.checked)}
                            className="rounded accent-indigo"
                          />
                          <span>Flashcard Pengenalan</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle cursor-pointer hover:bg-surface-elevated">
                          <input
                            type="checkbox"
                            checked={kanjiQuiz}
                            onChange={(e) => setKanjiQuiz(e.target.checked)}
                            className="rounded accent-indigo"
                          />
                          <span>Kuis Bacaan & Arti</span>
                        </label>
                      </div>

                      {/* Canvas Writing Details */}
                      <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={kanjiWriteMode}
                              onChange={(e) => setKanjiWriteMode(e.target.checked)}
                              className="rounded accent-indigo"
                            />
                            <span className="font-medium">Latihan Menulis Kuas (Canvas)</span>
                          </label>
                          {kanjiWriteMode && (
                            <span className="font-mono text-xs font-bold text-gold">
                              {canvasRepetitions}x Tulis / Kanji
                            </span>
                          )}
                        </div>
                        {kanjiWriteMode && (
                          <div className="flex items-center gap-3 pt-1 pl-6">
                            <span className="text-[10px] text-text-secondary shrink-0">Repetisi:</span>
                            <input
                              type="range"
                              min={1}
                              max={5}
                              value={canvasRepetitions}
                              onChange={(e) => setCanvasRepetitions(parseInt(e.target.value, 10))}
                              className="w-full accent-gold cursor-pointer"
                            />
                            <span className="text-[10px] font-mono text-text-secondary shrink-0">
                              (1 - 5x)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Kotoba Rules */}
                  {selectedTypes.includes('kotoba') && (
                    <div className="pt-3 space-y-2">
                      <div className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Aktivitas Kosakata (Kotoba):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle cursor-pointer hover:bg-surface-elevated">
                          <input
                            type="checkbox"
                            checked={kotobaFlashcard}
                            onChange={(e) => setKotobaFlashcard(e.target.checked)}
                            className="rounded accent-indigo"
                          />
                          <span>Flashcard Hafalan & Audio</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle cursor-pointer hover:bg-surface-elevated">
                          <input
                            type="checkbox"
                            checked={kotobaQuiz}
                            onChange={(e) => setKotobaQuiz(e.target.checked)}
                            className="rounded accent-indigo"
                          />
                          <span>Kuis Pilihan Ganda Distraktor</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Bunpou Rules */}
                  {selectedTypes.includes('bunpou') && (
                    <div className="pt-3 space-y-2">
                      <div className="font-bold text-xs text-text-primary flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo" />
                        <span>Aktivitas Pola Kalimat (Bunpou):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle cursor-pointer hover:bg-surface-elevated">
                          <input
                            type="checkbox"
                            checked={bunpouStudy}
                            onChange={(e) => setBunpouStudy(e.target.checked)}
                            className="rounded accent-indigo"
                          />
                          <span>Bedah Rumus & Contoh Kalimat</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle cursor-pointer hover:bg-surface-elevated">
                          <input
                            type="checkbox"
                            checked={bunpouQuiz}
                            onChange={(e) => setBunpouQuiz(e.target.checked)}
                            className="rounded accent-indigo"
                          />
                          <span>Kuis Konteks & Kalimat Bintang</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE SUMMARY BADGE */}
              <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-text-primary">
                    Ringkasan Kurikulum yang Akan Digenerate:
                  </span>
                  <p className="text-[11px] text-text-secondary">
                    Total {previewTotalItems} materi dibagi ke dalam {stageCount} stage reguler.
                  </p>
                </div>
                {willHaveMixedExam ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-gold/15 text-gold border border-gold/30 flex items-center gap-1 shrink-0">
                    <span>⚡ Final Mixed Exam Aktif</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-text-secondary font-mono">
                    Single Focus Module
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-inset transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={refs.totalCount === 0 || previewTotalItems === 0}
              onClick={handleGenerate}
              className="btn-skeuo-indigo text-xs py-2.5 px-5 shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Layers className="w-4 h-4 text-accent shrink-0" />
              <span className="whitespace-nowrap font-bold">Generate Kurikulum & Buka World</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
