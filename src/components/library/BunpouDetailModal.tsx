import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Volume2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowDown,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { BunpouItem, Question, ItemMasteryRecord } from '../../types/content';
import { RubyText } from '../learning/RubyText';
import { speakJapanese, playSound } from '../../utils/audio';
import { getCanonicalGrammarTitle } from '../../utils/bunpouTitleUtils';
import { UserDeck } from '../../types/rpg';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';
import { getGrammarSkillNodes, getBunpouCategoryTags } from '../../utils/bunpouSkillAdapter';
import { useBackButton } from '../../hooks/useBackButton';

interface BunpouDetailModalProps {
  item: BunpouItem;
  masteryRecord?: ItemMasteryRecord;
  onClose: () => void;
  soundEnabled?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
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

/**
 * Strips redundant trailing English in parentheses or bracket notes
 */
const cleanSummary = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/\s*\([A-Za-z0-9\s/,'’._\-—]{4,}\)\.?\s*$/g, '')
    .trim();
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
  onUpdateDecks,
  onRewardPlayer,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  // Hardware & Mobile Back Button Support
  useBackButton(true, () => {
    onClose();
  }, 'bunpou_detail_modal');

  // Extract human-centered learning flow
  const skillNodes = getGrammarSkillNodes(item);
  const patternTitle = getCanonicalGrammarTitle(item);
  const categoryTags = getBunpouCategoryTags(item);
  const levelLabel = item.baseLevel ? `Level ${item.baseLevel}` : `Level ${item.level}`;

  // Section references for quick-jump navigation
  const node1Ref = useRef<HTMLDivElement>(null);
  const node2Ref = useRef<HTMLDivElement>(null);
  const node3Ref = useRef<HTMLDivElement>(null);
  const node4Ref = useRef<HTMLDivElement>(null);
  const node5Ref = useRef<HTMLDivElement>(null);
  const node6Ref = useRef<HTMLDivElement>(null);
  const node7Ref = useRef<HTMLDivElement>(null);

  const nodeRefs = [node1Ref, node2Ref, node3Ref, node4Ref, node5Ref, node6Ref, node7Ref];
  const stepItems = [
    { label: '① Inti', essential: true },
    { label: '② Fungsi', essential: true },
    { label: '③ Rumus', essential: true },
    { label: '④ Kata Cocok', essential: false },
    { label: '⑤ Perbedaan', essential: false },
    { label: '⑥ Contoh', essential: true },
    { label: '⑦ Kuis', essential: true },
  ];

  const scrollToNode = (index: number) => {
    playSound('click', soundEnabled);
    const target = nodeRefs[index]?.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Node 7: Training Quiz States
  const questions = skillNodes.trainingQuestions || [];
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const activeQuestion: Question | undefined = questions[currentQuestionIdx] || questions[0];
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const handleSelectAnswer = (idx: number) => {
    if (isAnswerChecked || !activeQuestion) return;
    setSelectedAnswerIndex(idx);
    setIsAnswerChecked(true);

    const isCorrect = idx === activeQuestion.correctIndex;
    if (onRecordInteraction) {
      onRecordInteraction(item.id, 'bunpou', 'quiz', isCorrect);
    }

    if (isCorrect) {
      playSound('correct', soundEnabled);
      if (!rewardClaimed) {
        setRewardClaimed(true);
        if (onRewardPlayer) onRewardPlayer(15, 10);
        if (onCompleteStudyItem) {
          onCompleteStudyItem('bunpou', 15, 10, item.id, 1, 1);
        }
      }
    } else {
      playSound('wrong', soundEnabled);
      if (onCompleteStudyItem) {
        onCompleteStudyItem('bunpou', 0, 0, item.id, 0, 1);
      }
    }
  };

  const handleNextQuestion = () => {
    playSound('click', soundEnabled);
    if (questions.length > 1) {
      setCurrentQuestionIdx((prev) => (prev + 1) % questions.length);
    }
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  };

  const handleRetryQuestion = () => {
    playSound('click', soundEnabled);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      key="grammar-skill-modal-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
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
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 panel w-full max-w-3xl border border-border-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] bg-surface-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* HEADER IDENTITY: BERSIH & RAMAH PEMULA                   */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-6 border-b border-border-subtle shrink-0 bg-surface-elevated/95 relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo/15 text-indigo text-xs font-mono font-bold border border-indigo/30 shadow-xs">
                  {levelLabel}
                </span>

                {categoryTags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded-lg bg-surface-card text-text-secondary text-[11px] font-mono font-semibold border border-border-subtle"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Pattern Title */}
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide font-jp truncate">
                  {patternTitle}
                </h1>

                <button
                  type="button"
                  onClick={() => speakJapanese(patternTitle.replace(/^[〜~]/, ''))}
                  className="p-1.5 sm:p-2 rounded-xl bg-surface-card hover:bg-surface-inset text-indigo hover:text-indigo-light transition-all border border-border-subtle cursor-pointer shrink-0 shadow-xs active:scale-95"
                  title="Dengarkan pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Plain Meaning */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-xl font-normal">
                {cleanSummary(item.meaningId || (item as any).meaning)}
              </p>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <DeckBookmarkPicker
                itemId={item.id}
                category="bunpou"
                itemTitle={item.title}
                itemSubtitle={item.meaningId || (item as any).meaning}
                userDecks={userDecks}
                onToggleDeckItem={onToggleDeckItem}
                isDefaultBookmarked={isBookmarked}
                onToggleDefaultBookmark={onToggleBookmark}
                onUpdateDecks={onUpdateDecks}
                soundEnabled={soundEnabled}
              />

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-2xl bg-surface-card hover:bg-surface-inset text-text-muted hover:text-text-primary transition-colors border border-border-subtle cursor-pointer shadow-xs"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Flow Stepper */}
          <div className="pt-3 mt-1.5 border-t border-border-subtle/70 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {stepItems.map((step, sIdx) => (
              <button
                key={sIdx}
                type="button"
                onClick={() => scrollToNode(sIdx)}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold font-sans transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                  step.essential
                    ? 'bg-surface-card hover:bg-surface-inset border border-border-subtle text-text-primary hover:text-indigo'
                    : 'bg-surface-inset/60 hover:bg-surface-card border border-border-subtle/60 text-text-muted hover:text-text-secondary'
                }`}
              >
                <span>{step.label}</span>
                {step.essential && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" title="Wajib Paham" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* LEARNING FLOW: 7 KARTU BELAJAR MANUSIAWI                 */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 scrollbar-thin">

          {/* ------------------------------------------------------ */}
          {/* CARD 1: INTI POLA — "Apa maksudnya?" (WAJIB PAHAM)     */}
          {/* ------------------------------------------------------ */}
          <div ref={node1Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-heading">
                <Lightbulb className="w-4 h-4 text-indigo" />
                <span>① Inti Pola: "Apa maksudnya?"</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo/10 text-indigo border border-indigo/20">
                Wajib Paham ★★★★★
              </span>
            </div>

            {/* Direct Essence Statement */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-3">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-indigo/10 text-indigo text-[11px] font-mono font-semibold border border-indigo/20 inline-block">
                  Inti Makna
                </span>
                <p className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
                  {cleanSummary(skillNodes.concept.summary)}
                </p>
              </div>

              {/* Status Before -> After (Clean Balanced Sub-cards) */}
              {(skillNodes.concept.beforeState || skillNodes.concept.afterState) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-border-subtle/60 text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-card/70 border border-border-subtle/70">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">
                      Tanpa Pola (Fakta Biasa)
                    </span>
                    <p className="text-xs text-text-secondary leading-normal">
                      {skillNodes.concept.beforeState?.replace(/^(Dulu:\s*|Tanpa Pola:\s*|Tanpa Pola Ini:\s*|Kalimat Netral:\s*|Kalimat Biasa:\s*|Bentuk Standar:\s*)/i, '').replace(/[❌📜💬]/g, '').trim() || 'Kalimat fakta netral biasa.'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo/5 border border-indigo/20">
                    <span className="text-[10px] font-bold text-indigo uppercase tracking-wider block mb-0.5">
                      Dengan Pola Ini (Nuansa Khusus)
                    </span>
                    <p className="text-xs text-text-primary font-medium leading-normal">
                      {skillNodes.concept.afterState?.replace(/^(Sekarang:\s*|Dengan Pola:\s*|Dengan Pola Ini:\s*|Pasif Kerugian:\s*|Pola Pasif Repot:\s*|Ragam Lisan:\s*)/i, '').replace(/[✅💬🎯🛡️🤝💡]/g, '').trim() || 'Mengandung nuansa dan maksud pembicara yang spesifik.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Instant Concrete Example */}
            {skillNodes.concept.starterExample && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted font-heading">
                    Contoh Penggunaan Langsung
                  </span>

                  <button
                    type="button"
                    onClick={() => speakJapanese(skillNodes.concept.starterExample!.japanese)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-indigo hover:bg-surface-card transition-colors cursor-pointer"
                    title="Dengarkan pelafalan"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm sm:text-base font-semibold text-text-primary font-jp leading-relaxed">
                  <RubyText
                    japanese={skillNodes.concept.starterExample.japanese}
                    reading={skillNodes.concept.starterExample.reading}
                    showFurigana={true}
                  />
                </p>

                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal">
                  {cleanSummary(skillNodes.concept.starterExample.meaningId)}
                </p>

                {skillNodes.concept.starterExample.contrastNote &&
                  !skillNodes.concept.starterExample.contrastNote.includes('Penerapan langsung') && (
                  <p className="text-xs text-indigo/90 font-medium border-t border-border-subtle/50 pt-2 leading-relaxed">
                    💡 {skillNodes.concept.starterExample.contrastNote}
                  </p>
                )}
              </div>
            )}

            {skillNodes.concept.keyTakeaway &&
              !skillNodes.concept.keyTakeaway.includes('membuat kalimatmu terdengar alami') && (
              <p className="text-xs text-text-muted pl-1 leading-relaxed">
                📌 {skillNodes.concept.keyTakeaway}
              </p>
            )}
          </div>

          {/* ------------------------------------------------------ */}
          {/* CARD 2: FUNGSI — "Dipakai kapan?" (WAJIB PAHAM)         */}
          {/* ------------------------------------------------------ */}
          <div ref={node2Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-heading">
                <span className="w-5 h-5 rounded-md bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span>② Fungsi: "Dipakai kapan?"</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo/10 text-indigo border border-indigo/20">
                Wajib Paham ★★★★★
              </span>
            </div>

            <div className="space-y-2.5">
              {skillNodes.functions.map((fn, fIdx) => (
                <div
                  key={fIdx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo/15 text-indigo font-bold text-xs flex items-center justify-center shrink-0">
                      {fn.number}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                      {fn.label}
                    </h3>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    {fn.description}
                  </p>

                  {fn.miniExample && (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-surface-card border border-border-subtle/80 flex items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-text-primary font-jp leading-relaxed">
                          {fn.miniExample.japanese}
                        </p>
                        <p className="text-[11px] sm:text-xs text-text-muted leading-relaxed font-normal">
                          {cleanSummary(fn.miniExample.meaningId)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapanese(fn.miniExample!.japanese)}
                        className="p-1 rounded-lg text-text-muted hover:text-indigo transition-colors shrink-0 cursor-pointer"
                        title="Dengarkan audio"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* CARD 3: RUMUS — "Cara membuatnya" (WAJIB PAHAM)         */}
          {/* ------------------------------------------------------ */}
          <div ref={node3Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-heading">
                <span className="w-5 h-5 rounded-md bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span>③ Rumus: "Cara membuatnya"</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo/10 text-indigo border border-indigo/20">
                Wajib Paham ★★★★★
              </span>
            </div>

            <div className="space-y-3">
              {skillNodes.formulas.map((form, fIdx) => (
                <div
                  key={fIdx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-2.5"
                >
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                    {form.title}
                  </h4>

                  {/* Formula Breakdown Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {form.breakdown.map((part, pIdx) => (
                      <React.Fragment key={pIdx}>
                        {pIdx > 0 && <span className="text-text-muted font-bold text-xs">＋</span>}
                        <span className="px-2.5 py-1 rounded-lg bg-surface-card border border-border-subtle font-mono text-xs font-medium text-text-primary shadow-xs">
                          {part}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Step Progression (e.g. 話す ↓ 話せる ↓ 話せるようになる) */}
                  {form.progression && form.progression.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle/80 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                      {form.progression.map((step, sIdx) => (
                        <React.Fragment key={sIdx}>
                          {sIdx > 0 && <ArrowRight className="w-3.5 h-3.5 text-text-muted" />}
                          <span className={`px-2 py-0.5 rounded-md ${sIdx === form.progression!.length - 1 ? 'bg-indigo/15 text-indigo border border-indigo/25 font-semibold' : 'bg-surface-inset text-text-secondary font-medium'}`}>
                            {step}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {form.note && (
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      💡 {form.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* CARD 4: KATA COCOK — "Kata apa yang bisa masuk?" (PELENGKAP) */}
          {/* ------------------------------------------------------ */}
          <div ref={node4Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-card border border-border-subtle/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-secondary font-bold text-xs uppercase tracking-wider font-heading">
                <span className="w-5 h-5 rounded-md bg-surface-inset text-text-secondary flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <span>④ Kata Cocok: "Kata apa yang bisa masuk?"</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-inset text-text-muted border border-border-subtle">
                Pelengkap ★★★
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {skillNodes.wordIdentities.map((identity, iIdx) => (
                <div
                  key={iIdx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{identity.icon || '🏷️'}</span>
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                        {identity.typeCategory}
                      </h4>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed font-normal">
                      {identity.functionEffect}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-subtle/60 flex flex-wrap items-center gap-1.5">
                    {identity.examples.map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="px-2 py-0.5 rounded-md bg-surface-card text-text-primary text-xs font-mono font-medium border border-border-subtle/80"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* CARD 5: PERBEDAAN — "Jangan sampai tertukar!" (PELENGKAP) */}
          {/* ------------------------------------------------------ */}
          <div ref={node5Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-card border border-border-subtle/80 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider font-heading">
                <AlertTriangle className="w-4 h-4 text-red-700 dark:text-amber-400" />
                <span>⑤ Perbedaan: "Jangan sampai tertukar!"</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface-inset text-text-muted border border-border-subtle">
                Pelengkap ★★★
              </span>
            </div>

            <div className="space-y-2.5">
              {skillNodes.nuances.map((nuance, nIdx) => (
                <div
                  key={nIdx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-surface-card border border-border-subtle/80 space-y-1">
                      <p className="text-xs font-bold text-indigo font-jp">
                        {nuance.contrastA}
                      </p>
                      <p className="text-xs text-text-secondary font-normal leading-relaxed">
                        = {cleanSummary(nuance.meaningA)}
                      </p>
                    </div>

                    <div className="p-2.5 sm:p-3 rounded-xl bg-surface-card border border-border-subtle/80 space-y-1">
                      <p className="text-xs font-bold text-gold font-jp">
                        {nuance.contrastB}
                      </p>
                      <p className="text-xs text-text-secondary font-normal leading-relaxed">
                        = {cleanSummary(nuance.meaningB)}
                      </p>
                    </div>
                  </div>

                  {nuance.explanation && (
                    <p className="text-xs text-text-muted leading-relaxed pl-0.5">
                      💡 {nuance.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* CARD 6: CONTOH NYATA — "Lihat contoh bertingkat" (WAJIB) */}
          {/* ------------------------------------------------------ */}
          <div ref={node6Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-heading">
                <span className="w-5 h-5 rounded-md bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  6
                </span>
                <span>⑥ Contoh Nyata: "Lihat contoh bertingkat"</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo/10 text-indigo border border-indigo/20">
                Wajib Paham ★★★★★
              </span>
            </div>

            <div className="space-y-2.5">
              {skillNodes.examples.map((ex, exIdx) => {
                const tierColor =
                  ex.tier === 'basic'
                    ? 'border-emerald-500/25 bg-emerald-500/5'
                    : ex.tier === 'daily'
                    ? 'border-sky-500/25 bg-sky-500/5'
                    : 'border-purple-500/25 bg-purple-500/5';

                const badgeColor =
                  ex.tier === 'basic'
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : ex.tier === 'daily'
                    ? 'text-sky-400 bg-sky-500/15'
                    : 'text-purple-400 bg-purple-500/15';

                return (
                  <div
                    key={exIdx}
                    className={`p-3.5 sm:p-4 rounded-2xl border ${tierColor} space-y-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider font-mono ${badgeColor}`}>
                        {ex.tierLabel}
                      </span>

                      <button
                        type="button"
                        onClick={() => speakJapanese(ex.japanese)}
                        className="p-1 rounded-lg text-text-muted hover:text-indigo hover:bg-surface-inset transition-colors cursor-pointer"
                        title="Dengarkan pelafalan kalimat"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm sm:text-base font-semibold text-text-primary font-jp leading-relaxed">
                        <RubyText japanese={ex.japanese} reading={ex.reading} showFurigana={true} />
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary font-normal leading-relaxed">
                        {cleanSummary(ex.meaningId)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* CARD 7: COBA KUIS — "Tes pemahamanmu!" (WAJIB PAHAM)   */}
          {/* ------------------------------------------------------ */}
          <div ref={node7Ref} className="panel p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-surface-elevated via-surface-card to-surface-card border border-gold/30 shadow-md space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider font-heading">
                <Flame className="w-4 h-4 text-gold" />
                <span>⑦ Coba Kuis: "Tes pemahamanmu!"</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-gold/15 text-gold text-[10px] font-bold font-mono border border-gold/30">
                +15 EXP & +10 Gold
              </span>
            </div>

            {activeQuestion ? (
              <div className="space-y-3.5">
                {/* Question Prompt */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle/80 space-y-1.5">
                  <p className="text-[11px] sm:text-xs text-text-muted font-medium">
                    {activeQuestion.instructionId || activeQuestion.instruction || 'Pilihlah jawaban yang paling tepat:'}
                  </p>
                  <p className="text-sm sm:text-base font-semibold text-text-primary font-jp leading-relaxed">
                    <RubyText japanese={activeQuestion.prompt} reading={activeQuestion.ruby} showFurigana={true} />
                  </p>
                </div>

                {/* Option Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeQuestion.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswerIndex === oIdx;
                    const isCorrect = isAnswerChecked && oIdx === activeQuestion.correctIndex;
                    const isWrong = isAnswerChecked && isSelected && !isCorrect;

                    let btnStyle = 'bg-surface-inset hover:bg-surface-card border-border-subtle text-text-primary shadow-[inset_1px_1px_3px_var(--neu-d)]';
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)]';
                    } else if (isWrong) {
                      btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.2)]';
                    } else if (isSelected) {
                      btnStyle = 'bg-surface-elevated border-border-muted text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.25)]';
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(oIdx)}
                        disabled={isAnswerChecked}
                        className={`p-3 rounded-xl border text-left font-jp text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs ${btnStyle} ${isAnswerChecked ? 'cursor-default' : 'active:scale-[0.99]'}`}
                      >
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {isWrong && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback & Reward */}
                {isAnswerChecked && (
                  <div className="space-y-3 pt-2 animate-fade-in">
                    {selectedAnswerIndex === activeQuestion.correctIndex ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm font-heading">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          <span>Jawaban Tepat! Skill Tata Bahasa Berhasil Diuji.</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-gold shrink-0">
                          +15 EXP 🌟
                        </span>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm font-heading">
                        <XCircle className="w-5 h-5 shrink-0" />
                        <span>Kurang Tepat. Simak penjelasan berikut:</span>
                      </div>
                    )}

                    {activeQuestion.explanation && (
                      <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-secondary leading-relaxed space-y-1">
                        <strong className="text-text-primary block font-heading">Penjelasan:</strong>
                        <p>{activeQuestion.explanation}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {selectedAnswerIndex !== activeQuestion.correctIndex && (
                        <button
                          type="button"
                          onClick={handleRetryQuestion}
                          className="btn-physical-secondary text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer font-heading"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Coba Lagi</span>
                        </button>
                      )}

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="btn-physical-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer font-heading"
                        >
                          <span>Soal Lain</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-muted">Soal latihan tidak tersedia saat ini.</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border-subtle bg-surface-inset flex items-center justify-between text-xs text-text-muted font-mono">
          <span>SevnQuest Learning Flow • 7 Cards</span>
          <button
            type="button"
            onClick={onClose}
            className="btn-physical-primary text-xs py-2 px-4 rounded-xl cursor-pointer font-heading"
          >
            Selesai Belajar
          </button>
        </div>

      </motion.div>
    </motion.div>,
    document.body
  );
};
