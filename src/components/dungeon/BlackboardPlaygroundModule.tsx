import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  Sparkles,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  Search,
  Check,
  BookmarkPlus,
  Eye,
  EyeOff,
  Award
} from 'lucide-react';
import { RubyText } from '../learning/RubyText';
import { playSound, speakJapanese } from '../../utils/audio';
import { VerbItem } from '../../data/conjugationRules';
import { GrammarPatternSchema, ConjugationForm } from '../../engine/types';
import { conjugateVerb, detectVerbGroup } from '../../engine/morphology/inflectionEngine';
import { synthesizeSentence } from '../../engine/synthesis/sentenceSynthesizer';
import { PATTERN_SCHEMAS } from '../../engine/syntax/patternSchemas';
import { UserDeck } from '../../types/rpg';

interface BlackboardPlaygroundModuleProps {
  verbs: VerbItem[];
  patterns?: GrammarPatternSchema[];
  levelCategory?: string;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onSaveToDeck?: (verb: VerbItem) => void;
  onFinishSession?: (exploredCount: number) => void;
}

function getVerbMeaning(v?: VerbItem | any): string {
  if (!v) return '';
  return v.meaningId || v.meaning || '';
}

function getVerbLevel(v?: VerbItem | any): string {
  if (!v) return 'N5';
  return v.level || (v.jlpt ? String(v.jlpt) : 'N5');
}

export const BlackboardPlaygroundModule: React.FC<BlackboardPlaygroundModuleProps> = ({
  verbs,
  patterns: initialPatterns,
  levelCategory = 'all',
  soundEnabled = true,
  userDecks,
  onSaveToDeck,
  onFinishSession,
}) => {
  // All patterns database
  const allPatterns = useMemo(() => {
    return initialPatterns && initialPatterns.length > 0
      ? initialPatterns
      : Object.values(PATTERN_SCHEMAS);
  }, [initialPatterns]);

  // Current active indices
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [activePatternId, setActivePatternId] = useState<string>(() => {
    return allPatterns.find(p => p.id === 'te_iru')?.id || allPatterns[0]?.id || 'te_iru';
  });

  // Display toggles
  const [showFurigana, setShowFurigana] = useState(true);
  const [showRomaji, setShowRomaji] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [exploredCount, setExploredCount] = useState(1);

  // Modals / Drawers
  const [showVerbPicker, setShowVerbPicker] = useState(false);
  const [showPatternPicker, setShowPatternPicker] = useState(false);
  const [verbSearchQuery, setVerbSearchQuery] = useState('');
  const [verbLevelFilter, setVerbLevelFilter] = useState<string>('all');
  const [patternLevelFilter, setPatternLevelFilter] = useState<string>('all');
  const [bookmarkSuccess, setBookmarkSuccess] = useState(false);

  // Active verb & active pattern
  const activeVerb: VerbItem = useMemo(() => {
    if (verbs.length === 0) {
      return {
        id: 'verb_yomu',
        kanji: '読む',
        reading: 'よむ',
        romaji: 'yomu',
        meaningId: 'membaca',
        group: 'godan',
        level: 'N5',
        forms: {} as any,
        formsReadings: {} as any,
      };
    }
    return verbs[currentVerbIndex % verbs.length];
  }, [verbs, currentVerbIndex]);

  const activePattern: GrammarPatternSchema = useMemo(() => {
    return allPatterns.find(p => p.id === activePatternId) || allPatterns[0];
  }, [allPatterns, activePatternId]);

  // Conjugation and transformation calculation
  const transformation = useMemo(() => {
    if (!activeVerb || !activePattern) return null;

    const w = activeVerb.kanji;
    const r = activeVerb.reading;
    const group = activeVerb.group || detectVerbGroup(w, r);
    const conjResult = conjugateVerb(w, r);

    const reqForm = (activePattern.requiredConjugation || 'jisho') as ConjugationForm;
    const conjugated = conjResult.forms[reqForm] || conjResult.forms.jisho;

    // Build the combined transformed word
    const suffix = activePattern.fixedSuffix || '';
    const fullJapanese = `${conjugated.japanese}${suffix}`;
    const fullReading = `${conjugated.reading}${suffix}`;

    // Compute transformation logic explanation
    let intermediateFormLabel = 'Bentuk Kamus (辞書形)';
    if (reqForm === 'te') intermediateFormLabel = 'Bentuk-Te (て形)';
    else if (reqForm === 'ta') intermediateFormLabel = 'Bentuk-Ta / Lampau (た形)';
    else if (reqForm === 'nai') intermediateFormLabel = 'Bentuk-Nai / Negatif (ない形)';
    else if (reqForm === 'masu_stem') intermediateFormLabel = 'Masu-Stem (ます語幹)';
    else if (reqForm === 'potential') intermediateFormLabel = 'Bentuk Potensial (可能形)';
    else if (reqForm === 'ba') intermediateFormLabel = 'Bentuk Pengandaian (ば形)';

    // Group explanation in Indonesian
    let groupExplanation = '';
    if (group === 'godan') {
      groupExplanation = 'Golongan 1 (Godan - 五段動詞): Mengubah vokal akhir kamus.';
    } else if (group === 'ichidan') {
      groupExplanation = 'Golongan 2 (Ichidan - 一段動詞): Menghilangkan akhiran る.';
    } else if (group === 'suru') {
      groupExplanation = 'Golongan 3 (Suru - 不規則動詞): Berubah mengikuti する ➔ し.';
    } else if (group === 'kuru') {
      groupExplanation = 'Golongan 3 (Kuru - 不規則動詞): Berubah mengikuti 来る ➔ き.';
    }

    // Meaning template synthesis
    const rawMeaning = getVerbMeaning(activeVerb);
    let transformedMeaning = activePattern.meaningTemplateId
      .replace('{predicate}', rawMeaning)
      .replace('{object}', '')
      .replace('di {location}', '')
      .replace('{location}', '')
      .replace(/\s+/g, ' ')
      .trim();

    // Contextual sentence synthesis
    let contextSentence: { japanese: string; reading: string; meaningId: string } | null = null;
    try {
      const synth = synthesizeSentence({
        patternId: activePattern.id,
        verbWord: activeVerb.kanji,
        verbReading: activeVerb.reading,
        verbMeaningId: rawMeaning,
      });
      if (synth) {
        contextSentence = {
          japanese: synth.japanese,
          reading: synth.reading,
          meaningId: synth.meaningId,
        };
      }
    } catch {
      // Fallback example
      contextSentence = {
        japanese: `${fullJapanese}。`,
        reading: `${fullReading}。`,
        meaningId: `${transformedMeaning}.`,
      };
    }

    // Segment into Verb Stem vs Pattern Suffix for direct interaction and color coding
    const rawPattern = activePattern.pattern.replace('〜', '');
    const patLen = rawPattern.length;
    const verbJp = fullJapanese.slice(0, Math.max(1, fullJapanese.length - patLen));
    const patJp = fullJapanese.slice(Math.max(1, fullJapanese.length - patLen));

    let patRdLen = patLen;
    if (rawPattern === '前に') patRdLen = 3;
    const verbRd = fullReading.slice(0, Math.max(1, fullReading.length - patRdLen));
    const patRd = fullReading.slice(Math.max(1, fullReading.length - patRdLen));

    return {
      group,
      groupExplanation,
      reqForm,
      intermediateFormLabel,
      conjugatedStem: conjugated.japanese,
      conjugatedStemReading: conjugated.reading,
      suffix,
      fullJapanese,
      fullReading,
      verbSegment: {
        japanese: verbJp,
        reading: verbRd,
      },
      patternSegment: {
        japanese: patJp,
        reading: patRd,
      },
      transformedMeaning,
      contextSentence,
    };
  }, [activeVerb, activePattern]);

  // Handle Speech
  const handlePlayAudio = async (text: string) => {
    if (!text) return;
    playSound('click', soundEnabled);
    setIsSpeaking(true);
    try {
      await speakJapanese(text);
    } catch {
      // ignore
    } finally {
      setIsSpeaking(false);
    }
  };

  // Quick Multi-Pattern Matrix for the currently active verb
  const patternMatrix = useMemo(() => {
    if (!activeVerb) return [];
    const w = activeVerb.kanji;
    const r = activeVerb.reading;
    const conjResult = conjugateVerb(w, r);

    return allPatterns.map(p => {
      const reqForm = (p.requiredConjugation || 'jisho') as ConjugationForm;
      const conjugated = conjResult.forms[reqForm] || conjResult.forms.jisho;
      const fullJp = `${conjugated.japanese}${p.fixedSuffix || ''}`;
      const fullRd = `${conjugated.reading}${p.fixedSuffix || ''}`;

      const rawMeaning = getVerbMeaning(activeVerb);
      let briefMeaning = p.meaningTemplateId
        .replace('{predicate}', rawMeaning)
        .replace('{object}', '')
        .replace('di {location}', '')
        .replace('{location}', '')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        pattern: p,
        fullJapanese: fullJp,
        fullReading: fullRd,
        meaning: briefMeaning,
        isActive: p.id === activePatternId,
      };
    });
  }, [activeVerb, allPatterns, activePatternId]);

  // Actions
  const handleNextVerb = () => {
    playSound('click', soundEnabled);
    setCurrentVerbIndex(prev => prev + 1);
    setExploredCount(prev => prev + 1);
  };

  const handlePrevVerb = () => {
    playSound('click', soundEnabled);
    setCurrentVerbIndex(prev => (prev > 0 ? prev - 1 : verbs.length - 1));
  };

  const handleRandomVerb = () => {
    playSound('click', soundEnabled);
    if (verbs.length <= 1) return;
    let nextIdx = Math.floor(Math.random() * verbs.length);
    if (nextIdx === currentVerbIndex) {
      nextIdx = (nextIdx + 1) % verbs.length;
    }
    setCurrentVerbIndex(nextIdx);
    setExploredCount(prev => prev + 1);
  };

  const handleRandomPattern = () => {
    playSound('click', soundEnabled);
    if (allPatterns.length <= 1) return;
    const otherPatterns = allPatterns.filter(p => p.id !== activePatternId);
    const pick = otherPatterns[Math.floor(Math.random() * otherPatterns.length)];
    if (pick) {
      setActivePatternId(pick.id);
      setExploredCount(prev => prev + 1);
    }
  };

  const handleShuffleBoth = () => {
    playSound('click', soundEnabled);
    handleRandomVerb();
    handleRandomPattern();
  };

  // Filtered lists for pickers
  const filteredVerbs = useMemo(() => {
    let list = verbs;
    if (verbLevelFilter !== 'all') {
      list = list.filter(v => getVerbLevel(v).toUpperCase() === verbLevelFilter.toUpperCase());
    }
    if (verbSearchQuery.trim()) {
      const q = verbSearchQuery.toLowerCase().trim();
      list = list.filter(
        v =>
          v.kanji.includes(q) ||
          v.reading.includes(q) ||
          getVerbMeaning(v).toLowerCase().includes(q) ||
          (v.romaji || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [verbs, verbLevelFilter, verbSearchQuery]);

  const filteredPatterns = useMemo(() => {
    let list = allPatterns;
    if (patternLevelFilter !== 'all') {
      list = list.filter(p => (p.jlpt || '').toUpperCase() === patternLevelFilter.toUpperCase());
    }
    return list;
  }, [allPatterns, patternLevelFilter]);

  const handleBookmark = () => {
    if (onSaveToDeck && activeVerb) {
      playSound('click', soundEnabled);
      onSaveToDeck(activeVerb);
      setBookmarkSuccess(true);
      setTimeout(() => setBookmarkSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP CONTROLS & STATUS BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="panel p-3.5 sm:p-4 rounded-3xl border border-border-subtle bg-surface-card shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left: Badge & Counter */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal/15 text-teal border border-teal/30 flex items-center justify-center shrink-0 shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-black text-sm sm:text-base text-text-primary tracking-wide">
                黒板の実験室 · Kokuban Playground
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal/15 text-teal border border-teal/30">
                Mode Eksplorasi Bebas
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Eksplorasi ke-{exploredCount} · Kosakata {currentVerbIndex + 1} dari {verbs.length}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Furigana Toggle */}
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowFurigana(prev => !prev);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-2xs ${
              showFurigana
                ? 'bg-gold/15 text-gold border-gold/30'
                : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-primary'
            }`}
            title="Tampilkan / Sembunyikan Furigana"
          >
            {showFurigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Furigana</span>
          </button>

          {/* Romaji Toggle */}
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowRomaji(prev => !prev);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all shadow-2xs ${
              showRomaji
                ? 'bg-indigo/15 text-indigo border-indigo/30'
                : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-primary'
            }`}
            title="Tampilkan / Sembunyikan Romaji"
          >
            <span>[Aa]</span>
          </button>

          {/* Shuffle Both Button */}
          <button
            type="button"
            onClick={handleShuffleBoth}
            className="btn-skeuo-gold px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Acak Kata Kerja & Pola Kalimat Sekaligus"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="font-heading font-bold">Acak Keduanya</span>
          </button>

          {/* Finish / Harvest Button */}
          {onFinishSession && (
            <button
              type="button"
              onClick={() => {
                playSound('victory', soundEnabled);
                onFinishSession(exploredCount);
              }}
              className="btn-skeuo-indigo px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Selesai belajar dan panen hadiah EXP"
            >
              <Award className="w-3.5 h-3.5 text-gold" />
              <span className="font-heading font-bold">Selesai Belajar</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THE AUTHENTIC JAPANESE BLACKBOARD / WHITEBOARD CANVAS
          ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl p-3 sm:p-4 bg-[#543d2b] dark:bg-[#2b1e16] border-4 border-[#73533a] dark:border-[#3d2a1f] shadow-2xl overflow-hidden">
        {/* Wood Grain Outer Frame Highlights */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/30 pointer-events-none" />

        {/* The Writing Slate Surface (Green Chalkboard in Dark Mode, Washi Board in Light Mode) */}
        <div
          className="relative rounded-2xl p-5 sm:p-8 min-h-[380px] flex flex-col justify-between overflow-hidden shadow-inner border border-black/20
            bg-[#fcfaf4] text-[#18181b] 
            dark:bg-[#192c21] dark:text-[#f8fafc]
            transition-colors duration-300"
          style={{
            backgroundImage: `radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.18) 100%)`,
          }}
        >
          {/* Top Board Bar: Clean Japanese Slate Header & Shuffles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10 dark:border-white/10">
            {/* Left: Slate Title & Active Overview */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 text-black/80 dark:text-white/90 border border-black/10 dark:border-white/15 flex items-center gap-1.5 shadow-2xs">
                <span>🏫</span>
                <span>黒板の実験室 (Blackboard)</span>
              </span>
              <span className="text-xs font-mono text-black/60 dark:text-white/60">
                Kata: <b className="text-[#1e3a8a] dark:text-[#38bdf8] font-bold">{activeVerb.kanji}</b> · Pola: <b className="text-[#b91c1c] dark:text-[#fef08a] font-bold">{activePattern.pattern}</b>
              </span>
            </div>

            {/* Right: Quick Shuffle Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRandomVerb}
                className="px-2.5 py-1 rounded-xl border border-black/15 dark:border-white/15 bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-xs font-mono font-medium transition-all text-black/80 dark:text-white/80 active:scale-95 flex items-center gap-1 cursor-pointer"
                title="Acak Kata Kerja Dasar Saja"
              >
                <Shuffle className="w-3 h-3 text-[#1e3a8a] dark:text-[#38bdf8]" />
                <span className="hidden sm:inline">Acak Kata</span>
              </button>

              <button
                type="button"
                onClick={handleRandomPattern}
                className="px-2.5 py-1 rounded-xl border border-black/15 dark:border-white/15 bg-white/60 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-xs font-mono font-medium transition-all text-black/80 dark:text-white/80 active:scale-95 flex items-center gap-1 cursor-pointer"
                title="Acak Pola Kalimat Saja"
              >
                <Shuffle className="w-3 h-3 text-[#b91c1c] dark:text-[#fef08a]" />
                <span className="hidden sm:inline">Acak Pola</span>
              </button>

              <button
                type="button"
                onClick={handleShuffleBoth}
                className="px-3 py-1 rounded-xl border border-black/15 dark:border-white/15 bg-white/80 dark:bg-white/15 hover:bg-white dark:hover:bg-white/25 text-xs font-mono font-bold transition-all text-black dark:text-white active:scale-95 flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Acak Kata & Pola Bersamaan"
              >
                <Sparkles className="w-3 h-3 text-gold" />
                <span className="hidden sm:inline">Acak Semua</span>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CENTER HERO: THE TRANSFORMED RESULT ON THE BOARD
              ───────────────────────────────────────────────────────────── */}
          <div className="py-8 sm:py-10 text-center space-y-4">
            <AnimatePresence mode="wait">
              {transformation && (
                <motion.div
                  key={`${activeVerb.kanji}_${activePattern.id}`}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Badge: Level & Pattern Title */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/15 dark:border-white/20 bg-black/5 dark:bg-white/5 text-xs font-mono text-black/70 dark:text-white/80">
                    <span className="font-bold text-[#b91c1c] dark:text-[#fef08a]">
                      {activePattern.jlpt || 'N5'}
                    </span>
                    <span>·</span>
                    <span>{activePattern.title}</span>
                  </div>

                  {/* Giant Transformed Text with Color-Coded Clickable Segments */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2">
                    <div className="inline-flex items-center justify-center flex-wrap gap-x-1 select-none">
                      {/* 1. KOTOBA (VERB STEM) SEGMENT - CLICKABLE */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setShowVerbPicker(true);
                        }}
                        className="relative group/verb inline-flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 px-2.5 sm:px-3 py-1 -my-1 rounded-2xl border-2 border-dashed border-transparent hover:border-[#1e3a8a]/40 dark:hover:border-[#38bdf8]/50 hover:bg-[#1e3a8a]/10 dark:hover:bg-[#38bdf8]/15"
                        title={`Klik untuk mengganti kata kerja dasar (${activeVerb.kanji})`}
                      >
                        {/* Hover hint badge */}
                        <span className="absolute -top-8 opacity-0 group-hover/verb:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-[#1e3a8a] text-white dark:bg-[#0284c7] dark:text-white shadow-lg z-30 flex items-center gap-1">
                          <span>👆</span>
                          <span>Ganti Kata ({activeVerb.kanji} - {getVerbMeaning(activeVerb)})</span>
                        </span>

                        <RubyText
                          japanese={transformation.verbSegment.japanese}
                          reading={transformation.verbSegment.reading}
                          showFurigana={showFurigana}
                          className="text-4xl sm:text-6xl md:text-7xl font-black font-jp tracking-tight text-[#1e3a8a] dark:text-[#38bdf8] drop-shadow-sm"
                        />

                        {/* Interactive underline indicator */}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="h-1 w-6 sm:w-10 rounded-full bg-[#1e3a8a]/40 dark:bg-[#38bdf8]/50 group-hover/verb:w-12 group-hover/verb:bg-[#1e3a8a] dark:group-hover/verb:bg-[#38bdf8] transition-all" />
                          <span className="text-[10px] font-mono text-[#1e3a8a]/80 dark:text-[#38bdf8]/90 font-bold hidden sm:inline">
                            Kata
                          </span>
                        </div>
                      </button>

                      {/* 2. POLA (PATTERN SUFFIX) SEGMENT - CLICKABLE */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setShowPatternPicker(true);
                        }}
                        className="relative group/pola inline-flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 px-2.5 sm:px-3 py-1 -my-1 rounded-2xl border-2 border-dashed border-transparent hover:border-[#b91c1c]/40 dark:hover:border-[#fef08a]/50 hover:bg-[#b91c1c]/10 dark:hover:bg-[#fef08a]/15"
                        title={`Klik untuk mengganti pola kalimat (${activePattern.pattern})`}
                      >
                        {/* Hover hint badge */}
                        <span className="absolute -top-8 opacity-0 group-hover/pola:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-[#b91c1c] text-white dark:bg-[#ca8a04] dark:text-black shadow-lg z-30 flex items-center gap-1">
                          <span>👆</span>
                          <span>Ganti Pola ({activePattern.pattern})</span>
                        </span>

                        <RubyText
                          japanese={transformation.patternSegment.japanese}
                          reading={transformation.patternSegment.reading}
                          showFurigana={showFurigana}
                          className="text-4xl sm:text-6xl md:text-7xl font-black font-jp tracking-tight text-[#b91c1c] dark:text-[#fef08a] drop-shadow-sm"
                        />

                        {/* Interactive underline indicator */}
                        <div className="flex items-center gap-1 mt-1">
                          <span className="h-1 w-6 sm:w-10 rounded-full bg-[#b91c1c]/40 dark:bg-[#fef08a]/50 group-hover/pola:w-12 group-hover/pola:bg-[#b91c1c] dark:group-hover/pola:bg-[#fef08a] transition-all" />
                          <span className="text-[10px] font-mono text-[#b91c1c]/80 dark:text-[#fef08a]/90 font-bold hidden sm:inline">
                            Pola
                          </span>
                        </div>
                      </button>

                      {/* Pronunciation Audio Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(transformation.fullJapanese)}
                        disabled={isSpeaking}
                        className="p-3 rounded-2xl border border-black/15 dark:border-white/20 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 transition-all text-black/80 dark:text-white shadow-md cursor-pointer shrink-0 ml-2"
                        title="Dengarkan pelafalan hasil perubahan"
                      >
                        <Volume2 className={`w-6 h-6 ${isSpeaking ? 'animate-bounce text-gold' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Micro Interaction Hint */}
                  <p className="text-[11px] font-mono text-black/50 dark:text-white/50 pt-0.5">
                    💡 Klik langsung <span className="font-bold text-[#1e3a8a] dark:text-[#38bdf8]">kata (biru/cyan)</span> atau <span className="font-bold text-[#b91c1c] dark:text-[#fef08a]">pola (merah/kuning)</span> di papan tulis untuk menggantinya.
                  </p>

                  {/* Romaji & Meaning Output */}
                  <div className="space-y-1 pt-1">
                    {showRomaji && (
                      <p className="text-sm sm:text-base font-mono font-medium text-black/60 dark:text-white/70">
                        <span className="text-[#1e3a8a] dark:text-[#38bdf8] font-bold">{activeVerb.romaji}</span>
                        {' '}+{' '}
                        <span className="text-[#b91c1c] dark:text-[#fef08a] font-bold">{activePattern.pattern.replace('〜', '')}</span>
                        {' '}➔ {transformation.fullReading}
                      </p>
                    )}
                    <div className="inline-block px-4 py-1.5 rounded-2xl bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/15">
                      <p className="text-base sm:text-xl font-bold text-[#b91c1c] dark:text-[#fef08a] font-heading">
                        "{transformation.transformedMeaning}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BOTTOM BOARD AREA: STEP-BY-STEP BREAKDOWN & CONTEXT SENTENCE
              ───────────────────────────────────────────────────────────── */}
          {transformation && (
            <div className="pt-4 border-t border-black/10 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Left Column: Logika Perubahan (Formula) */}
              <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-black/80 dark:text-white/90">
                  <Sparkles className="w-3.5 h-3.5 text-[#b91c1c] dark:text-[#fef08a]" />
                  <span>Logika Perubahan Bentuk:</span>
                </div>
                <div className="text-black/70 dark:text-white/70 space-y-1">
                  <p>
                    • <span className="font-bold text-black/90 dark:text-white">{activeVerb.kanji}</span> adalah{' '}
                    <span className="text-[#1e3a8a] dark:text-[#86efac] font-bold">
                      {transformation.groupExplanation}
                    </span>
                  </p>
                  <p>
                    • Diubah ke <span className="font-bold">{transformation.intermediateFormLabel}</span>: 「
                    <span className="text-[#1e3a8a] dark:text-[#86efac] font-bold">
                      {transformation.conjugatedStem}
                    </span>
                    」
                  </p>
                  <p>
                    • Disambung rumus 「
                    <span className="text-[#b91c1c] dark:text-[#fef08a] font-bold">
                      {transformation.suffix}
                    </span>
                    」 ➔ Hasil: 「<span className="font-bold">{transformation.fullJapanese}</span>」
                  </p>
                </div>
              </div>

              {/* Right Column: Contoh Kalimat Alami (Context Sentence) */}
              {transformation.contextSentence && (
                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 font-bold text-black/80 dark:text-white/90">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#1e3a8a] dark:text-[#86efac]" />
                      <span>Contoh Kalimat Utuh:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(transformation.contextSentence?.japanese || '')}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-black/70 dark:text-white transition-colors cursor-pointer"
                      title="Dengarkan kalimat"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-black/80 dark:text-white/80 space-y-0.5">
                    <p className="font-jp text-sm font-semibold text-black dark:text-white">
                      {transformation.contextSentence.japanese}
                    </p>
                    <p className="text-[11px] text-black/60 dark:text-white/60">
                      {transformation.contextSentence.reading}
                    </p>
                    <p className="text-[11px] font-sans font-medium text-[#b91c1c] dark:text-[#fef08a]">
                      "{transformation.contextSentence.meaningId}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            WOODEN CHALK TRAY AT THE BOTTOM (Skeuomorphic Chalk & Eraser)
            ───────────────────────────────────────────────────────────── */}
        <div className="mt-2 pt-2 border-t border-[#3d2a1f] flex items-center justify-between px-3 text-xs">
          {/* Chalk pieces decoration */}
          <div className="flex items-center gap-2">
            <span className="w-8 h-2 rounded-full bg-white/90 shadow-sm inline-block" title="Kapur Putih" />
            <span className="w-7 h-2 rounded-full bg-yellow-300 shadow-sm inline-block" title="Kapur Kuning" />
            <span className="w-6 h-2 rounded-full bg-emerald-300 shadow-sm inline-block" title="Kapur Hijau" />
            <span className="w-7 h-2 rounded-full bg-rose-300 shadow-sm inline-block" title="Kapur Merah Muda" />
          </div>

          {/* Blackboard Eraser (Kokuban Fuki) - Click for cute sound */}
          <motion.button
            whileTap={{ rotate: -5, scale: 0.95 }}
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowVerbPicker(false);
              setShowPatternPicker(false);
            }}
            className="px-3 py-0.5 rounded-lg bg-[#3d2a1f] hover:bg-[#4a3427] border border-[#2b1e16] text-[#e0c4a8] text-[10px] font-mono flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Penghapus Papan Tulis (黒板拭き)"
          >
            <span>🧹 黒板拭き (Penghapus)</span>
          </motion.button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NAVIGATION BAR (PREV / NEXT VERB & SAVE BUTTON)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePrevVerb}
          className="btn-skeuo-indigo px-4 py-2 text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kosakata Sebelumnya</span>
        </button>

        <div className="flex items-center gap-2">
          {onSaveToDeck && (
            <button
              type="button"
              onClick={handleBookmark}
              className={`px-3 py-2 rounded-2xl border text-xs font-heading font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
                bookmarkSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-surface-card hover:bg-surface-elevated text-text-primary border-border-subtle'
              }`}
            >
              {bookmarkSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <BookmarkPlus className="w-4 h-4 text-gold" />}
              <span>{bookmarkSuccess ? 'Tersimpan!' : 'Simpan ke Buku Saku'}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleNextVerb}
          className="btn-skeuo-indigo px-4 py-2 text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span>Kosakata Berikutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MULTI-PATTERN COMPARISON MATRIX (CHEAT SHEET TRAY)
          ───────────────────────────────────────────────────────────── */}
      <div className="panel p-4 sm:p-5 rounded-3xl border border-border-subtle bg-surface-card space-y-3 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gold" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-text-primary">
              Bandingkan Semua Pola untuk 「{activeVerb.kanji}」
            </h3>
          </div>
          <span className="text-xs text-text-muted">
            Klik salah satu kartu di bawah untuk langsung mengganti tampilan papan tulis:
          </span>
        </div>

        {/* Horizontal Scrolling or Grid of Pattern Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {patternMatrix.map(item => {
            return (
              <motion.div
                key={item.pattern.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  playSound('click', soundEnabled);
                  setActivePatternId(item.pattern.id);
                }}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                  item.isActive
                    ? 'bg-surface-elevated border-teal/40 text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]'
                    : 'bg-surface-inset border-border-subtle shadow-[inset_1px_1px_3px_var(--neu-d)] hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-text-muted">
                    {item.pattern.pattern}
                  </span>
                  <span className="text-[9px] font-mono text-gold font-bold">
                    {item.pattern.jlpt || 'N5'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold font-jp text-text-primary leading-tight">
                    {item.fullJapanese}
                  </h4>
                  <p className="text-[10px] font-mono text-text-muted truncate">
                    {item.fullReading}
                  </p>
                </div>

                <p className="text-[10px] text-text-secondary line-clamp-1 border-t border-border-subtle/50 pt-1 font-sans">
                  {item.meaning}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL PICKER: PILIH KATA KERJA (VERB DRAWER)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showVerbPicker && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="panel p-5 rounded-3xl border border-border-subtle bg-surface-card w-full max-w-xl max-h-[85vh] flex flex-col space-y-4 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo" />
                  <h3 className="font-heading font-black text-lg text-text-primary">
                    Pilih Kata Kerja (動詞)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerbPicker(false)}
                  className="p-1.5 rounded-xl hover:bg-surface-inset text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search & Level Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={verbSearchQuery}
                    onChange={e => setVerbSearchQuery(e.target.value)}
                    placeholder="Cari kanji, cara baca, romaji, atau arti..."
                    className="w-full pl-10 pr-4 py-2 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-indigo"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['all', 'N5', 'N4', 'N3', 'Kaigo'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setVerbLevelFilter(lvl)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        verbLevelFilter === lvl
                          ? 'bg-indigo text-white shadow-xs'
                          : 'bg-surface-inset text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {lvl === 'all' ? 'Semua' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verbs List */}
              <div className="overflow-y-auto space-y-1.5 max-h-[50vh] pr-1">
                {filteredVerbs.length === 0 ? (
                  <p className="text-center py-8 text-xs text-text-muted">
                    Tidak ditemukan kosakata yang cocok.
                  </p>
                ) : (
                  <>
                    {filteredVerbs.slice(0, 100).map((v, idx) => {
                      const isSelected = v.kanji === activeVerb.kanji;
                      return (
                        <div
                          key={`${v.kanji}_${idx}`}
                          onClick={() => {
                            playSound('click', soundEnabled);
                            const realIdx = verbs.findIndex(x => x.kanji === v.kanji);
                            if (realIdx >= 0) setCurrentVerbIndex(realIdx);
                            setShowVerbPicker(false);
                            setExploredCount(prev => prev + 1);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo/15 border-indigo text-text-primary shadow-xs'
                              : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold font-jp text-text-primary">
                              {v.kanji}
                            </span>
                            <div>
                              <p className="text-xs font-jp text-text-muted">{v.reading}</p>
                              <p className="text-xs font-medium text-text-primary">{getVerbMeaning(v)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card text-text-muted border border-border-subtle">
                              {getVerbLevel(v)}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-indigo shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                    {filteredVerbs.length > 100 && (
                      <p className="text-center py-2 text-[11px] font-mono text-text-muted">
                        Menampilkan 100 dari {filteredVerbs.length} kata pustaka (ketik di kolom cari untuk mempersempit).
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL PICKER: PILIH POLA KALIMAT (PATTERN DRAWER)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPatternPicker && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="panel p-5 rounded-3xl border border-border-subtle bg-surface-card w-full max-w-xl max-h-[85vh] flex flex-col space-y-4 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gold" />
                  <h3 className="font-heading font-black text-lg text-text-primary">
                    Pilih Pola Kalimat (文法パターン)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPatternPicker(false)}
                  className="p-1.5 rounded-xl hover:bg-surface-inset text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Level Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['all', 'N5', 'N4', 'N3'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPatternLevelFilter(lvl)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      patternLevelFilter === lvl
                        ? 'bg-gold text-surface-base shadow-xs font-black'
                        : 'bg-surface-inset text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {lvl === 'all' ? 'Semua Level' : lvl}
                  </button>
                ))}
              </div>

              {/* Patterns List */}
              <div className="overflow-y-auto space-y-1.5 max-h-[50vh] pr-1">
                {filteredPatterns.map(p => {
                  const isSelected = p.id === activePatternId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        playSound('click', soundEnabled);
                        setActivePatternId(p.id);
                        setShowPatternPicker(false);
                        setExploredCount(prev => prev + 1);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gold/15 border-gold text-text-primary shadow-xs'
                          : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black font-jp text-gold">
                            {p.pattern}
                          </span>
                          <span className="text-xs font-bold text-text-primary">{p.title}</span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {p.nuanceExplanation || p.meaningTemplateId}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card text-text-muted border border-border-subtle">
                          {p.jlpt || 'N5'}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-gold shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
