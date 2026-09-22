import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Zap,
  Layers,
  HelpCircle,
  Award,
} from 'lucide-react';
import { BunpouItem, Question, ItemMasteryRecord } from '../../types/content';
import { RubyText } from '../learning/RubyText';
import { speakJapanese, playSound } from '../../utils/audio';
import { getCanonicalGrammarTitle } from '../../utils/bunpouTitleUtils';
import { UserDeck } from '../../types/rpg';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';
import { getGrammarSkillNodes, getBunpouCategoryTags } from '../../utils/bunpouSkillAdapter';

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
  // Extract intelligent 7-node skill architecture
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
  const nodeNames = ['Konsep', 'Fungsi', 'Rumus', 'Kata', 'Nuansa', 'Contoh', 'Quest'];

  const scrollToNode = (index: number) => {
    playSound('click', soundEnabled);
    const target = nodeRefs[index]?.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Node 7: Training Quest States
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

      {/* Modal Skill Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 panel w-full max-w-3xl border border-border-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] bg-surface-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* 1. HEADER IDENTITY                                       */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-6 border-b border-border-subtle shrink-0 bg-surface-elevated/95 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0 flex-1">
              {/* Top Meta Badges */}
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

                {masteryRecord && (
                  <span className="px-2 py-0.5 rounded-lg bg-surface-card text-gold text-xs font-mono font-bold border border-gold/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-gold" />
                    <span>Lv.{masteryRecord.masteryLevel || 1}</span>
                  </span>
                )}
              </div>

              {/* Title & Reading */}
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-text-primary font-heading tracking-wide font-jp truncate">
                  {patternTitle}
                </h1>

                <button
                  type="button"
                  onClick={() => speakJapanese(patternTitle.replace(/^[〜~]/, ''))}
                  className="p-2 rounded-xl bg-surface-card hover:bg-surface-inset text-indigo hover:text-indigo-light transition-all border border-border-subtle cursor-pointer shrink-0 shadow-xs active:scale-95"
                  title="Dengarkan pelafalan"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Main Essence Meaning */}
              <p className="text-xs sm:text-sm font-semibold text-text-secondary leading-relaxed max-w-xl">
                {item.meaningId || item.meaning}
              </p>
            </div>

            {/* Top Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <DeckBookmarkPicker
                itemId={item.id}
                category="bunpou"
                itemTitle={item.title}
                itemSubtitle={item.meaningId || item.meaning}
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

          {/* Stepper / Quick Navigation Bar */}
          <div className="pt-4 mt-2 border-t border-border-subtle/70 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {nodeNames.map((name, nIdx) => (
              <button
                key={nIdx}
                type="button"
                onClick={() => scrollToNode(nIdx)}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold font-sans transition-all whitespace-nowrap shrink-0 bg-surface-card hover:bg-surface-inset border border-border-subtle text-text-secondary hover:text-indigo flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span className="w-4 h-4 rounded-md bg-surface-inset text-text-muted text-[10px] font-mono flex items-center justify-center font-bold">
                  {nIdx + 1}
                </span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SCROLLABLE LEARNING NODES (7 KARTU)                   */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">

          {/* ------------------------------------------------------ */}
          {/* NODE 1: CONCEPT (KONSEP DASAR)                         */}
          {/* ------------------------------------------------------ */}
          <div ref={node1Ref} className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span>Node 01: Konsep Dasar (基本概念)</span>
              </div>
              <span className="text-[11px] text-text-muted font-sans font-medium">Esensi Pola</span>
            </div>

            {/* Core Explanation */}
            <p className="text-sm text-text-primary leading-relaxed font-medium">
              {skillNodes.concept.summary}
            </p>

            {/* Visual Contrast: Dulu vs Sekarang */}
            {(skillNodes.concept.beforeState || skillNodes.concept.afterState) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-wine-accent font-heading">
                    <XCircle className="w-4 h-4" />
                    <span>Kondisi Semula (Sebelumnya)</span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium leading-relaxed">
                    {skillNodes.concept.beforeState || 'Keadaan lama yang belum berubah.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 font-heading">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kondisi Terkini (Sekarang)</span>
                  </div>
                  <p className="text-xs text-text-primary font-medium leading-relaxed">
                    {skillNodes.concept.afterState || 'Telah bergeser menjadi keadaan baru.'}
                  </p>
                </div>
              </div>
            )}

            {skillNodes.concept.keyTakeaway && (
              <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle/80 flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <p className="text-xs text-text-secondary font-medium leading-relaxed">
                  <strong className="text-text-primary">Poin Utama:</strong> {skillNodes.concept.keyTakeaway}
                </p>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------ */}
          {/* NODE 2: FUNCTION (FUNGSI PENGGUNAAN)                   */}
          {/* ------------------------------------------------------ */}
          <div ref={node2Ref} className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span>Node 02: Fungsi Penggunaan (主な用法)</span>
              </div>
              <span className="text-[11px] text-text-muted font-sans font-medium">Kapan Digunakan</span>
            </div>

            <div className="space-y-3">
              {skillNodes.functions.map((fn, fIdx) => (
                <div
                  key={fIdx}
                  className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gold/20 text-gold font-bold text-xs flex items-center justify-center">
                      {fn.number}
                    </span>
                    <h3 className="text-sm font-bold text-text-primary font-heading">
                      {fn.label}
                    </h3>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed font-medium pl-7">
                    {fn.description}
                  </p>

                  {fn.miniExample && (
                    <div className="ml-7 p-3 rounded-xl bg-surface-card border border-border-subtle flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary font-jp">
                          {fn.miniExample.japanese}
                        </p>
                        <p className="text-xs text-text-muted font-medium">
                          {fn.miniExample.meaningId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakJapanese(fn.miniExample!.japanese)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-indigo transition-colors shrink-0 cursor-pointer"
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
          {/* NODE 3: FORMULA (STRUKTUR RUMUS)                       */}
          {/* ------------------------------------------------------ */}
          <div ref={node3Ref} className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span>Node 03: Struktur Rumus (接続と文法公式)</span>
              </div>
              <span className="text-[11px] text-text-muted font-sans font-medium">Formula Teknis</span>
            </div>

            <div className="space-y-3.5">
              {skillNodes.formulas.map((form, fIdx) => (
                <div
                  key={fIdx}
                  className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3"
                >
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                    {form.title}
                  </h4>

                  {/* Formula Breakdown Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {form.breakdown.map((part, pIdx) => (
                      <React.Fragment key={pIdx}>
                        {pIdx > 0 && <span className="text-text-muted font-bold text-xs">＋</span>}
                        <span className="px-3 py-1.5 rounded-xl bg-surface-card border border-border-subtle font-mono text-xs font-bold text-text-primary shadow-xs">
                          {part}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Step Progression (e.g. 話す -> 話せる -> 話せるようになる) */}
                  {form.progression && form.progression.length > 0 && (
                    <div className="p-3 rounded-xl bg-surface-card/60 border border-border-subtle flex flex-wrap items-center gap-2 text-xs font-mono">
                      {form.progression.map((step, sIdx) => (
                        <React.Fragment key={sIdx}>
                          {sIdx > 0 && <ArrowRight className="w-3.5 h-3.5 text-text-muted" />}
                          <span className={`px-2 py-1 rounded-lg ${sIdx === form.progression!.length - 1 ? 'bg-gold/20 text-gold border border-gold/30 font-bold' : 'bg-surface-inset text-text-secondary'}`}>
                            {step}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {form.note && (
                    <p className="text-[11px] text-text-muted leading-relaxed italic">
                      💡 {form.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* NODE 4: WORD IDENTITY (IDENTITAS KATA)                 */}
          {/* ------------------------------------------------------ */}
          <div ref={node4Ref} className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <span>Node 04: Identitas Kata (品詞と動詞の性質)</span>
              </div>
              <span className="text-[11px] text-text-muted font-sans font-medium">Kompatibilitas Kata</span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Pola ini memiliki efek makna berbeda tergantung pada kelompok atau jenis kata yang bersambung:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skillNodes.wordIdentities.map((identity, iIdx) => (
                <div
                  key={iIdx}
                  className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span>{identity.icon || '🏷️'}</span>
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                        {identity.typeCategory}
                      </h4>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed font-medium">
                      {identity.functionEffect}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-subtle/60 flex flex-wrap items-center gap-1.5">
                    {identity.examples.map((ex, exIdx) => (
                      <span
                        key={exIdx}
                        className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-xs font-mono font-semibold border border-border-subtle"
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
          {/* NODE 5: NUANCE (NUANSA & PERBEDAAN RASA BAHASA)        */}
          {/* ------------------------------------------------------ */}
          <div ref={node5Ref} className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <span>Node 05: Nuansa & Rasa Bahasa (ニュアンスの差)</span>
              </div>
              <span className="text-[11px] text-text-muted font-sans font-medium">Perbedaan Native</span>
            </div>

            <div className="space-y-3">
              {skillNodes.nuances.map((nuance, nIdx) => (
                <div
                  key={nIdx}
                  className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <p className="text-xs font-bold text-indigo font-jp">
                        {nuance.contrastA}
                      </p>
                      <p className="text-xs text-text-secondary font-medium leading-relaxed">
                        = {nuance.meaningA}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <p className="text-xs font-bold text-gold font-jp">
                        {nuance.contrastB}
                      </p>
                      <p className="text-xs text-text-secondary font-medium leading-relaxed">
                        = {nuance.meaningB}
                      </p>
                    </div>
                  </div>

                  {nuance.explanation && (
                    <p className="text-xs text-text-muted leading-relaxed pl-1">
                      💡 {nuance.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* NODE 6: EXAMPLES (CONTOH BERJENJANG 3 TINGKAT)         */}
          {/* ------------------------------------------------------ */}
          <div ref={node6Ref} className="panel p-5 sm:p-6 rounded-3xl bg-surface-card border border-border-subtle shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-indigo/15 text-indigo flex items-center justify-center font-bold text-xs">
                  6
                </span>
                <span>Node 06: Contoh Kalimat Berjenjang (段階別例文)</span>
              </div>
              <span className="text-[11px] text-text-muted font-sans font-medium">3 Tingkat Pemahaman</span>
            </div>

            <div className="space-y-3">
              {skillNodes.examples.map((ex, exIdx) => {
                const tierColor =
                  ex.tier === 'basic'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : ex.tier === 'daily'
                    ? 'border-sky-500/30 bg-sky-500/5'
                    : 'border-purple-500/30 bg-purple-500/5';

                const badgeColor =
                  ex.tier === 'basic'
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : ex.tier === 'daily'
                    ? 'text-sky-400 bg-sky-500/15'
                    : 'text-purple-400 bg-purple-500/15';

                return (
                  <div
                    key={exIdx}
                    className={`p-4 rounded-2xl border ${tierColor} space-y-2`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider font-mono ${badgeColor}`}>
                        {ex.tierLabel}
                      </span>

                      <button
                        type="button"
                        onClick={() => speakJapanese(ex.japanese)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-indigo hover:bg-surface-inset transition-colors cursor-pointer"
                        title="Dengarkan pelafalan kalimat"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <p className="text-base sm:text-lg font-bold text-text-primary font-jp leading-relaxed">
                        <RubyText japanese={ex.japanese} reading={ex.reading} showFurigana={true} />
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed">
                        {ex.meaningId}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------ */}
          {/* NODE 7: TRAINING QUEST (UJI PEMAHAMAN + REWARD EXP)     */}
          {/* ------------------------------------------------------ */}
          <div ref={node7Ref} className="panel p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-surface-elevated via-surface-card to-surface-card border border-gold/30 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-wider font-mono">
                <span className="w-6 h-6 rounded-lg bg-gold/15 text-gold flex items-center justify-center font-bold text-xs">
                  7
                </span>
                <span>Node 07: Training Quest (実践チャレンジ)</span>
              </div>
              <span className="px-2 py-0.5 rounded-lg bg-gold/15 text-gold text-[10px] font-bold font-mono border border-gold/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>+15 EXP & +10 Gold</span>
              </span>
            </div>

            {activeQuestion ? (
              <div className="space-y-4">
                {/* Prompt Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                  <p className="text-xs text-text-muted font-medium">
                    {activeQuestion.instructionId || activeQuestion.instruction || 'Pilihlah jawaban yang paling tepat:'}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-text-primary font-jp leading-relaxed">
                    <RubyText japanese={activeQuestion.prompt} reading={activeQuestion.ruby} showFurigana={true} />
                  </p>
                </div>

                {/* Answer Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeQuestion.options.map((opt, oIdx) => {
                    const isSelected = selectedAnswerIndex === oIdx;
                    const isCorrect = isAnswerChecked && oIdx === activeQuestion.correctIndex;
                    const isWrong = isAnswerChecked && isSelected && !isCorrect;

                    let btnStyle = 'bg-surface-inset hover:bg-surface-card border-border-subtle text-text-primary';
                    if (isCorrect) {
                      btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30';
                    } else if (isWrong) {
                      btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 ring-2 ring-rose-500/30';
                    } else if (isSelected) {
                      btnStyle = 'bg-indigo/20 border-indigo text-indigo';
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectAnswer(oIdx)}
                        disabled={isAnswerChecked}
                        className={`p-3.5 rounded-2xl border text-left font-jp text-xs sm:text-sm font-bold transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs ${btnStyle} ${isAnswerChecked ? 'cursor-default' : 'active:scale-[0.99]'}`}
                      >
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {isWrong && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Reward Feedback */}
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
                        <span>Kurang Tepat. Simak penjelasan di bawah ini:</span>
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
                          <span>Tantangan Lain</span>
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
          <span>7 Knowledge Nodes • SevnQuest Skill Tree</span>
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
