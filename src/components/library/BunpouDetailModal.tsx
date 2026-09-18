import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Volume2,
  HelpCircle,
  GitBranch,
  MapPin,
  Settings2,
  Swords,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { BunpouItem, Question, ItemMasteryRecord } from '../../types/content';
import { FormulaDisplay } from '../learning/FormulaDisplay';
import { GrammarChecklist } from '../learning/GrammarChecklist';
import { GrammarFormulaBox } from '../learning/GrammarFormulaBox';
import { RubyText } from '../learning/RubyText';
import { speakJapanese, playSound } from '../../utils/audio';
import { getCanonicalGrammarTitle } from '../../utils/bunpouTitleUtils';
import { splitSentenceForHighlight } from '../../utils/grammarHighlight';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { UserDeck } from '../../types/rpg';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';

interface BunpouDetailModalProps {
  item: BunpouItem;
  masteryRecord?: ItemMasteryRecord;
  onClose: () => void;
  soundEnabled?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success?: boolean
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

function getRandomGrammarQuestion(item: BunpouItem): Question {
  if (item.questions && item.questions.length > 0) {
    const q = item.questions[Math.floor(Math.random() * item.questions.length)];
    return { ...q };
  }

  // Synthesize a fill-in-the-blanks question from examples
  const patternTitle = item.title.split(/[(（＋／]/)[0].trim();
  const cleanedPattern = patternTitle.replace(/^[〜~]/, '');
  const examples = item.examples && item.examples.length > 0
    ? item.examples
    : [{ japanese: `これは${cleanedPattern}です。`, reading: '', meaningId: item.meaningId }];
  const ex = examples[Math.floor(Math.random() * examples.length)];

  let prompt = ex.japanese.includes(cleanedPattern)
    ? ex.japanese.replace(cleanedPattern, '（　）')
    : `${ex.japanese} ➔ （　）`;

  // Distractors from other grammar titles
  const otherTitles = Object.values(BUNPOU_DATABASE)
    .map(b => b.title.split(/[(（＋／]/)[0].trim().replace(/^[〜~]/, ''))
    .filter(t => t !== cleanedPattern && t.length > 0);
  const shuffledOther = otherTitles.sort(() => 0.5 - Math.random()).slice(0, 3);
  while (shuffledOther.length < 3) {
    shuffledOther.push(`〜${cleanedPattern}ない`);
  }

  const allOptions = [cleanedPattern, ...shuffledOther].sort(() => 0.5 - Math.random());
  const correctIndex = allOptions.indexOf(cleanedPattern);

  return {
    id: `synth_q_${item.id}_${Date.now()}`,
    instruction: '文の（　）に入れるのに最もよいものを、一つえらびなさい。',
    instructionId: `Pilihlah bentuk pola atau kata yang paling tepat untuk melengkapi kalimat berikut:`,
    prompt,
    ruby: ex.reading,
    translation: ex.meaningId,
    options: allOptions,
    correctIndex,
    explanation: `Jawaban yang tepat adalah 「${cleanedPattern}」. Kalimat lengkap: 「${ex.japanese}」 (${ex.meaningId}). Pola ini memiliki makna: ${item.meaningId}.`,
  };
}

const renderClozePrompt = (prompt: string, ruby?: string) => {
  const blankRegex = /（[\s　]*）|\([\s　]*\)/;
  if (!blankRegex.test(prompt)) {
    return <RubyText japanese={prompt} reading={ruby} />;
  }

  const parts = prompt.split(blankRegex);
  return (
    <span className="inline">
      <RubyText japanese={parts[0]} />
      <span className="inline-flex items-center justify-center px-3 py-0.5 mx-1.5 rounded-lg border-2 border-dashed border-indigo/60 bg-surface-card text-indigo font-mono font-bold text-sm select-none align-middle shadow-sm">
        （ ？ ）
      </span>
      {parts.slice(1).map((part, pIdx) => (
        <React.Fragment key={pIdx}>
          <RubyText japanese={part} />
        </React.Fragment>
      ))}
    </span>
  );
};

export const BunpouDetailModal: React.FC<BunpouDetailModalProps> = ({
  item,
  masteryRecord,
  onClose,
  soundEnabled = true,
  isBookmarked = false,
  onToggleBookmark,
  userDecks,
  onToggleDeckItem,
  onRewardPlayer,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);
  const subBranches = item.subFormulas || [];
  const currentSub = subBranches[activeSubIndex] || subBranches[0];

  // Quick Practice Quiz States
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  const handleStartPractice = () => {
    playSound('click', soundEnabled);
    const q = getRandomGrammarQuestion(item);
    setCurrentQuestion(q);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
    setIsQuizMode(true);
  };

  const handleNextPracticeQuestion = () => {
    playSound('click', soundEnabled);
    const q = getRandomGrammarQuestion(item);
    setCurrentQuestion(q);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  };

  const handleSelectAnswer = (idx: number) => {
    if (isAnswerChecked || !currentQuestion) return;
    setSelectedAnswerIndex(idx);
    setIsAnswerChecked(true);

    const isCorrect = idx === currentQuestion.correctIndex;
    if (onRecordInteraction) {
      onRecordInteraction(item.id, 'bunpou', 'quiz', isCorrect);
    }
    if (isCorrect) {
      playSound('correct', soundEnabled);
      if (onRewardPlayer) onRewardPlayer(15, 10);
      if (onCompleteStudyItem) {
        onCompleteStudyItem('bunpou', 15, 10, item.id, 1, 1);
      }
    } else {
      playSound('wrong', soundEnabled);
      if (onCompleteStudyItem) {
        onCompleteStudyItem('bunpou', 0, 0, item.id, 0, 1);
      }
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      key="bunpou-modal-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          onClose();
          playSound('click', soundEnabled);
        }}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 panel w-full max-w-2xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-surface-card"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-start justify-between gap-3 shrink-0 bg-surface-inset">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-xs font-mono font-bold border border-border-subtle shadow-sm">
                {item.baseLevel ? `Fondasi ${item.baseLevel}` : `Level ${item.level}`}
              </span>
              {masteryRecord && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-secondary text-xs font-mono font-bold border border-border-subtle shadow-sm flex items-center gap-1.5">
                  <span title="Berapa kali dilatih via latihan kuis">⚔️ Dilatih: {masteryRecord.quizCount || (masteryRecord.attemptsCount || 0)}x</span>
                  <span className="opacity-40">|</span>
                  <span className="text-gold" title="Mastery">Lv.{masteryRecord.masteryLevel || 1} ({masteryRecord.masteryPercentage || 0}%)</span>
                </span>
              )}
              {isQuizMode && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo/15 text-indigo text-xs font-heading font-bold border border-indigo/30">
                  ⚔️ Coba Latihan 1 Soal
                </span>
              )}
              {!isQuizMode && item.functions && item.functions.map((fn, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-lg bg-surface-card text-text-secondary text-[11px] font-jp font-semibold border border-border-subtle">
                  {fn}
                </span>
              ))}
            </div>
            {isQuizMode ? (
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary font-heading tracking-wide flex items-center gap-2">
                  <span>⚔️ Latihan Pola Kalimat</span>
                  {isAnswerChecked && (
                    <span className="text-xs font-jp px-2 py-0.5 rounded-md bg-indigo/15 text-indigo border border-indigo/30 font-semibold">
                      {getCanonicalGrammarTitle(item)}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-text-secondary font-medium">
                  {isAnswerChecked
                    ? item.meaningId
                    : 'Pilihlah bentuk kata atau partikel yang paling tepat untuk melengkapi kalimat.'}
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
                  {getCanonicalGrammarTitle(item)}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-text-secondary">
                  {item.meaningId}
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <DeckBookmarkPicker
              itemId={item.id}
              category="bunpou"
              userDecks={userDecks}
              onToggleDeckItem={onToggleDeckItem}
              isDefaultBookmarked={isBookmarked}
              onToggleDefaultBookmark={onToggleBookmark}
              soundEnabled={soundEnabled}
            />
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-surface-card hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content: QUIZ MODE vs EXPLANATION MODE */}
        {isQuizMode && currentQuestion ? (
          /* ================= MODE COBA LATIHAN (1 SOAL ACAK) ================= */
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto scrollbar-thin flex-1 animate-fade-in">
            <div className="relative p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-secondary font-medium">
                  {currentQuestion.instructionId || 'Pilihlah bentuk atau partikel yang paling tepat:'}
                </span>
                {currentQuestion.ruby && (
                  <button
                    type="button"
                    onClick={() => speakJapanese(currentQuestion.ruby || '')}
                    className="p-1.5 rounded-xl bg-surface-card hover:bg-surface-elevated text-gold border border-border-subtle transition-colors shrink-0 shadow-sm"
                    title="Dengar suara"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="py-1 text-center sm:text-left">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-text-primary leading-[2.5] font-jp tracking-wide break-words">
                  {renderClozePrompt(currentQuestion.prompt, currentQuestion.ruby)}
                </h3>
              </div>

              {currentQuestion.translation && (
                <div className="pt-2 border-t border-border-subtle/40">
                  <p className="text-xs text-text-muted font-body">
                    {currentQuestion.translation}
                  </p>
                </div>
              )}
            </div>

            {/* 4 Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswerIndex === idx;
                const isCorrect = idx === currentQuestion.correctIndex;

                let btnStyle = 'bg-surface-inset border-border-subtle hover:border-indigo/40 hover:bg-surface-elevated text-text-primary';
                if (isAnswerChecked) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-500/15 border-rose-500 text-rose-400';
                  } else {
                    btnStyle = 'opacity-40 border-border-subtle text-text-muted';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswerChecked}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-surface-card border border-border-subtle flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold font-jp">
                        <RubyText japanese={option} reading={currentQuestion.optionsRuby?.[idx]} />
                      </span>
                    </div>

                    {isAnswerChecked && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswerChecked && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback & Explanation */}
            {isAnswerChecked && (
              <div
                className={`p-4 rounded-2xl border space-y-2 animate-fade-in ${
                  selectedAnswerIndex === currentQuestion.correctIndex
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {selectedAnswerIndex === currentQuestion.correctIndex ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="font-heading font-bold text-xs">
                    {selectedAnswerIndex === currentQuestion.correctIndex
                      ? 'Jawaban Benar! (+15 EXP)'
                      : 'Belum Tepat! Perhatikan penjelasannya:'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {currentQuestion.explanation}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ================= MODE MATERI DETAIL (DEFAULT) ================= */
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto scrollbar-thin flex-1">
            {/* 1. EDUCATIONAL FUNCTION CHECKLIST (Matching slide ✅ points) */}
            <GrammarChecklist item={item} />

            {/* 2. BRACKETED FORMULA BOX (Matching slide green bracket grouping) */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center justify-between">
                <span>📐 Rumus Sambungan Kata (接続)</span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">K. Kerja / Sifat / Benda</span>
              </h4>
              <GrammarFormulaBox item={item} />
            </div>

            {/* Explanation */}
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-heading">
                <HelpCircle className="w-3.5 h-3.5 text-gold" />
                Catatan Penjelasan Detail
              </h4>
              <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                {item.explanation}
              </p>
            </div>

            {/* Nuansa & Kata Terkait */}
            {(item.nuance || (item.relatedKeywords && item.relatedKeywords.length > 0)) && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold font-heading">
                  Nuansa Pemakaian (ニュアンス)
                </h4>
                {item.nuance && (
                  <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                    {item.nuance}
                  </p>
                )}
                {item.relatedKeywords && item.relatedKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-mono text-text-muted">Kata Terkait / Kolokasi Kunci:</span>
                    {item.relatedKeywords.map((kw, kwIdx) => (
                      <span key={kwIdx} className="px-2 py-0.5 rounded-md bg-surface-card border border-border-subtle text-text-secondary text-xs font-jp">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub Formulas */}
            {subBranches.length > 0 && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-heading">
                  <GitBranch className="w-3.5 h-3.5 text-gold" />
                  Cabang Rumus & Kondisi Sambungan
                </h4>

                {subBranches.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {subBranches.map((branch, i) => (
                      <button
                        key={branch.id || i}
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setActiveSubIndex(i);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                          activeSubIndex === i
                            ? 'bg-surface-card text-gold border-gold/40 shadow-xs'
                            : 'bg-surface-inset text-text-secondary border-border-subtle hover:text-text-primary'
                        }`}
                      >
                        {branch.token}
                      </button>
                    ))}
                  </div>
                )}

                {currentSub && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted font-bold font-heading">
                        <MapPin className="w-3.5 h-3.5 text-gold" />
                        <span>Lokasi & Posisi Penggunaan:</span>
                      </div>
                      <p className="text-xs text-text-primary">
                        {currentSub.usageLocation}
                      </p>
                    </div>

                    {currentSub.connectionConditions && currentSub.connectionConditions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-text-muted uppercase flex items-center gap-1 font-heading">
                          <Settings2 className="w-3 h-3 text-gold" />
                          Aturan Perubahan Kata (接続):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentSub.connectionConditions.map((cond, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-surface-card border border-border-subtle flex items-start gap-2">
                              <span className="px-1.5 py-0.5 rounded-md bg-surface-inset text-gold text-[10px] font-mono font-bold shrink-0">
                                {cond.partOfSpeech}
                              </span>
                              <p className="text-xs text-text-primary">
                                {cond.rule}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Comparison Notes */}
            {item.comparisonNotes && item.comparisonNotes.length > 0 && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-heading">
                  <Swords className="w-3.5 h-3.5 text-gold" />
                  Perbandingan dengan Pola Serupa
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {item.comparisonNotes.map((comp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <span className="px-2 py-0.5 rounded-md bg-indigo/15 border border-indigo/30 text-indigo text-xs font-jp font-bold inline-block">
                        VS {comp.targetGrammar}
                      </span>
                      <p className="text-xs sm:text-sm text-text-primary leading-relaxed pt-1">
                        {comp.difference}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading">
                💬 Contoh Kalimat (例文)
              </h4>
              <div className="space-y-2">
                {item.examples.map((example, i) => {
                  const segments = splitSentenceForHighlight(example.japanese, item);
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <p className="text-sm sm:text-base font-bold text-text-primary flex flex-wrap items-baseline gap-1">
                          <span className="text-emerald-500 font-bold select-none mr-0.5">•</span>
                          {segments.map((seg, segIdx) => {
                            if (seg.isHighlight) {
                              return (
                                <span
                                  key={segIdx}
                                  className="formula-highlight text-emerald-400 dark:text-emerald-300 font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 shadow-xs"
                                  title="Pola Rumus Tata Bahasa"
                                >
                                  <RubyText
                                    japanese={seg.text}
                                    showFurigana={true}
                                  />
                                </span>
                              );
                            }
                            return (
                              <RubyText
                                key={segIdx}
                                japanese={seg.text}
                                showFurigana={true}
                              />
                            );
                          })}
                        </p>
                        <p className="text-xs sm:text-sm text-text-secondary font-medium pl-2.5 border-l-2 border-emerald-500/40 mt-1">
                          {example.meaningId}
                        </p>
                      </div>
                      <button
                        onClick={() => speakJapanese(example.japanese)}
                        className="p-2 rounded-xl bg-surface-card hover:bg-surface-elevated text-gold border border-border-subtle transition-colors shrink-0"
                        title="Dengarkan Suara"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle flex items-center justify-between shrink-0 bg-surface-inset">
          {isQuizMode ? (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={() => setIsQuizMode(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-border-subtle bg-surface-card hover:bg-surface-elevated text-text-secondary"
              >
                ← Kembali ke Penjelasan
              </button>

              {isAnswerChecked && (
                <button
                  type="button"
                  onClick={handleNextPracticeQuestion}
                  className="btn-skeuo-indigo px-4 py-2 text-xs shadow-sm active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Soal Latihan Lain</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-2">
              <button
                type="button"
                onClick={handleStartPractice}
                className="btn-skeuo-indigo px-4 py-2.5 text-xs shadow-sm active:scale-95 transition-all"
              >
                <Swords className="w-4 h-4 text-gold shrink-0" />
                <span className="whitespace-nowrap">Coba Latihan (1 Soal)</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="btn-skeuo-indigo px-5 py-2 text-xs shadow-sm active:scale-95 transition-all"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
