import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Volume2, Sparkles, CheckCircle2, RotateCcw, ArrowRight, ArrowLeft, BookCheck } from 'lucide-react';
import { BookIcon } from '../ui/EngravingIcons';
import { KotobaItem, Question } from '../../types/content';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { QuizEngine } from './QuizEngine';
import { speakJapanese, playSound } from '../../utils/audio';
import { RubyText } from './RubyText';
import { KotobaDetailModal } from '../library/KotobaDetailModal';

interface KotobaModuleProps {
  kotobaIds: string[];
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const KotobaModule: React.FC<KotobaModuleProps> = ({
  kotobaIds,
  onReward,
  onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'flashcard' | 'quiz'>('library');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expPopup, setExpPopup] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [isExamActive, setIsExamActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KotobaItem | null>(null);

  const fallbackKotobaItem: KotobaItem = React.useMemo(() => {
    return Object.values(KOTOBA_DATABASE)[0] || {
      id: 'kotoba_0001',
      word: '毎朝',
      reading: 'まいあさ',
      meaningId: 'Setiap pagi',
      meaningEn: 'every morning',
      meaningJa: '朝ごとに。すべての朝。',
      jlpt: 'N5',
      wordType: 'noun',
      kanjiComponents: ['毎', '朝']
    };
  }, []);

  // Flashcard pool: 15 random items for casual browsing
  const items: KotobaItem[] = React.useMemo(() => {
    let validItems = (kotobaIds || []).map(id => KOTOBA_DATABASE[id]).filter(Boolean);
    if (validItems.length === 0) {
      validItems = Object.values(KOTOBA_DATABASE).slice(0, 15);
    }
    const shuffled = [...validItems].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 15);
  }, [kotobaIds]);

  // Quiz pool: 25 random items from FULL pool
  const quizItems: KotobaItem[] = React.useMemo(() => {
    let validItems = (kotobaIds || []).map(id => KOTOBA_DATABASE[id]).filter(Boolean);
    if (validItems.length === 0) {
      validItems = Object.values(KOTOBA_DATABASE).slice(0, 25);
    }
    const shuffled = [...validItems].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 25);
  }, [kotobaIds, isQuizActive]); // re-shuffle when quiz starts

  // Exam pool: ALL items
  const examItems: KotobaItem[] = React.useMemo(() => {
    const validItems = (kotobaIds || []).map(id => KOTOBA_DATABASE[id]).filter(Boolean);
    if (validItems.length === 0) {
      return Object.values(KOTOBA_DATABASE).slice(0, 25);
    }
    return validItems;
  }, [kotobaIds]);

  const currentItem = items[currentCardIndex] || items[0] || fallbackKotobaItem;

  const handlePlayAudio = (word: string) => {
    speakJapanese(word);
  };

  const handleFlipCard = () => {
    if (!isFlipped) {
      onReward(0.01, 0, 'kotoba_flip');
      setExpPopup(true);
      setTimeout(() => setExpPopup(false), 800);
    }
    setIsFlipped(!isFlipped);
    playSound('click', soundEnabled);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    if (currentCardIndex < items.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      playSound('click', soundEnabled);
    }
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      playSound('click', soundEnabled);
    }
  };



  // Generate Quiz Questions from a given pool of items
  // Generate Quiz Questions with high distractor plausibility and 100% Indonesian translations
  const generateQuestions = (pool: KotobaItem[]): Question[] => {
    // Helper to check if text is clean Indonesian (not English)
    const isCleanIndonesian = (text?: string) => {
      if (!text || text.trim().length === 0) return false;
      // Tolak string yang mengandung titik koma atau kurung yang umum di JMdict (English)
      if (text.includes(';') || text.includes('(') || text.includes(')')) return false;
      
      // Jika mengandung awalan kata bahasa Inggris yang umum
      if (/^(to |the |a |an |in |on |of |at |for |with |and )\b/i.test(text.trim())) return false;
      
      // Jika hanya karakter latin biasa tapi tidak ada penanda kata Indonesia yang umum, kemungkinan itu bahasa asing
      if (/^[a-zA-Z\s,.'\"?!-]+$/.test(text.trim()) && !/\b(dan|atau|yang|di|ke|dari|untuk|dengan|selamat|pagi|siang|malam|tidak|bisa|sudah|orang|satu|dua|tiga|hari|bulan|tahun|saya|kamu|dia|mereka|kita|kami|ini|itu|sini|sana|situ|apa|siapa|kapan|mengapa|berapa)\b/i.test(text)) {
        return false;
      }
      return true;
    };

    // Specific semantic groups for common categories (greetings, numbers, family, colors, etc.)
    const GREETING_DISTRACTORS = ['Selamat siang', 'Selamat malam', 'Sampai jumpa', 'Terima kasih', 'Sama-sama', 'Permisi', 'Maaf', 'Halo'];
    const TIME_DISTRACTORS = ['Kemarin', 'Besok lusa', 'Tadi malam', 'Minggu depan', 'Bulan lalu', 'Tahun ini', 'Hari ini', 'Sekarang'];

    return pool.map((item, idx) => {
      const isGreeting = item.wordType === 'expression' || /^(おはよう|こんにちは|こんばんは|さようなら|ありがとう|いただきます|ごちそうさま|いってきます|ただいま)/.test(item.word);
      const isTimeWord = /^(きょう|きのう|あした|あさ|ひる|よる|こんばん|まいあさ|まいばん)/.test(item.reading || item.word) || /\b(pagi|siang|malam|besok|kemarin|hari ini)\b/i.test(item.meaningId);

      // Get similar items for distractors
      const sameTypeItems = Object.values(KOTOBA_DATABASE).filter(k => 
        k.id !== item.id && 
        k.wordType === item.wordType &&
        isCleanIndonesian(k.meaningId) &&
        k.meaningId.toLowerCase() !== item.meaningId.toLowerCase()
      );

      const poolCandidates = sameTypeItems.length >= 3 
        ? sameTypeItems 
        : Object.values(KOTOBA_DATABASE).filter(k => 
            k.id !== item.id && 
            isCleanIndonesian(k.meaningId) &&
            k.meaningId.toLowerCase() !== item.meaningId.toLowerCase()
          );

      // Score candidates based on similarity
      const getSimilarityScore = (candidate: KotobaItem) => {
        let score = 0;
        if (candidate.jlpt === item.jlpt) score += 5;
        if (candidate.kanjiComponents && item.kanjiComponents) {
          const sharedKanji = candidate.kanjiComponents.filter(c => item.kanjiComponents.includes(c)).length;
          score += sharedKanji * 10;
        }
        score += Math.random() * 5;
        return score;
      };

      const sortedCandidates = [...poolCandidates].sort((a, b) => getSimilarityScore(b) - getSimilarityScore(a));
      const topCandidates = sortedCandidates.slice(0, 10);

      // Randomize question type (0 = JP->ID, 1 = ID->JP, 2 = ID->Reading/Spelling)
      const qType = Math.floor(Math.random() * 3);

      let prompt = '';
      let correctAns = '';
      let distractors: string[] = [];

      if (qType === 0) {
        prompt = `Apa arti dari kata berikut?\n\n${item.word}`;
        correctAns = item.meaningId;
        
        let candStrings = [];
        if (isGreeting) candStrings = GREETING_DISTRACTORS.filter(d => d.toLowerCase() !== item.meaningId.toLowerCase());
        else if (isTimeWord) candStrings = TIME_DISTRACTORS.filter(d => d.toLowerCase() !== item.meaningId.toLowerCase());
        else candStrings = topCandidates.map(c => c.meaningId);
        
        distractors = Array.from(new Set(candStrings)).slice(0, 3);
      } else if (qType === 1) {
        prompt = `Bahasa Jepang yang tepat untuk:\n\n"${item.meaningId}"`;
        correctAns = item.word;
        distractors = Array.from(new Set(topCandidates.map(c => c.word))).slice(0, 3);
      } else {
        prompt = `Pilih cara penulisan/bacaan yang tepat untuk kata:\n\n"${item.meaningId}"`;
        correctAns = item.reading || item.word;
        distractors = Array.from(new Set(topCandidates.map(c => c.reading || c.word))).slice(0, 3);
      }

      // Fallback distractors
      const fallbacks = [
        ['Melakukan kegiatan harian', 'Menyatakan keadaan', 'Kondisi saat ini'],
        ['たべる', 'のむ', 'いく'],
        ['taberu', 'nomu', 'iku']
      ][qType];
      
      while (distractors.length < 3) {
        distractors.push(fallbacks[distractors.length]);
      }

      const options = [correctAns, ...distractors].sort(() => 0.5 - Math.random());
      const correctIndex = options.indexOf(correctAns);

      return {
        id: `kotoba_q_${item.id}_${qType}`,
        prompt,
        audioPrompt: qType === 0 ? item.word : undefined,
        options,
        correctIndex,
        explanation: `Kata 「${item.word}」 (${item.reading || item.word}) memiliki arti "${item.meaningId}".`
      };
    });
  };

  // Store questions in dedicated state created once upon starting the quiz
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);

  const handleStartQuiz = () => {
    playSound('click', soundEnabled);
    const generated = generateQuestions(quizItems);
    setQuizQuestions(generated);
    setIsQuizActive(true);
  };

  const handleStartExam = () => {
    playSound('click', soundEnabled);
    const generated = generateQuestions(examItems);
    setExamQuestions(generated);
    setIsExamActive(true);
  };

  // Quiz mode (25 soal random)
  if (isQuizActive) {
    return (
      <div className="w-full space-y-4">
        <QuizEngine
          title={`📝 Latihan Kosakata (${quizQuestions.length} Soal Acak)`}
          questions={quizQuestions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onComplete={(score, total, exp, gold) => {
            onReward(exp, gold, 'kotoba', items[0]?.id || 'kotoba_set', score, total);
          }}
          onExit={() => {
            setIsQuizActive(false);
            setQuizQuestions([]);
          }}
        />
      </div>
    );
  }

  // Exam mode (seluruh kosakata stage)
  if (isExamActive) {
    return (
      <div className="w-full space-y-4">
        <QuizEngine
          title={`🏆 Ujian Stage Kosakata (${examQuestions.length} Soal)`}
          questions={examQuestions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onComplete={(score, total, exp, gold) => {
            // Ujian Stage gives more reward
            onReward(exp * 2, gold * 2, 'kotoba', items[0]?.id || 'kotoba_exam', score, total);
          }}
          onExit={() => {
            setIsExamActive(false);
            setExamQuestions([]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-surface-elevated text-indigo shadow-sm border border-border-subtle">
            <BookIcon className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary font-heading flex items-center gap-2">
              Modul 2: 📝 KOTOBA (Kosakata)
            </h2>
            <p className="text-xs text-text-secondary">
              Hafalkan {items.length} kosakata hari ini lewat Flashcard interaktif & Uji dengan Quiz
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-inset p-1 rounded-2xl border border-border-subtle">
          <button
            onClick={() => {
              setActiveTab('library');
              playSound('click', soundEnabled);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'library'
                ? 'bg-indigo text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            📖 Library Pustaka
          </button>
          
          <div className="hidden sm:block w-px h-6 bg-border-subtle mx-1"></div>

          <button
            onClick={() => {
              setActiveTab('flashcard');
              playSound('click', soundEnabled);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flashcard'
                ? 'bg-indigo text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            🗂️ Latihan Flashcard
          </button>
          <button
            onClick={handleStartQuiz}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-surface-elevated text-gold border border-gold/40 hover:brightness-105 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            🎯 Latihan (25)
          </button>
          <button
            onClick={handleStartExam}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-surface-elevated text-wine-accent border border-wine-accent/40 hover:brightness-105 transition-all flex items-center gap-1.5"
          >
            <BookCheck className="w-3.5 h-3.5" />
            🏆 Ujian Stage
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'library' ? (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary font-heading mb-1">Materi Kosakata (Kotoba)</h3>
            <p className="text-xs text-text-secondary">
              Pelajari daftar kosakata di bawah ini dengan saksama. Jika Anda merasa sudah siap, masuklah ke Mode Latihan (Flashcard/Quiz) untuk mendapatkan EXP!
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  playSound('click', soundEnabled);
                }}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-card border border-border-subtle hover:bg-surface-elevated transition-colors cursor-pointer group"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-surface-inset flex items-center justify-center text-[10px] font-bold text-indigo border border-border-subtle">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="text-lg font-black text-text-primary font-jp mb-0.5 flex items-end gap-1.5">
                        <RubyText japanese={item.word} reading={item.reading} showFurigana={furiganaEnabled} />
                      </h4>
                      <p className="text-xs font-bold text-gold mb-1">{item.meaningId}</p>
                      <p className="text-[10px] text-text-muted">Tipe: {item.wordType}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAudio(item.word);
                      }}
                      className="p-1.5 rounded-lg bg-surface-inset text-text-secondary hover:text-indigo hover:bg-surface-elevated transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
        {/* Card Progress */}
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Kata <strong className="text-indigo font-bold">{currentCardIndex + 1}</strong> dari {items.length}</span>
          <span className="font-mono text-gold font-bold">Total: {items.length}</span>
        </div>

        {/* Interactive 3D Flip Card */}
        <div
          onClick={handleFlipCard}
          className="relative w-full aspect-[4/3] max-h-[340px] rounded-3xl cursor-pointer perspective-1000 select-none group"
        >
          <AnimatePresence>
            {expPopup && (
              <motion.div
                key="expPopup"
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -40, scale: 1.2 }}
                exit={{ opacity: 0, y: -60 }}
                className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 text-state-success font-black text-xl drop-shadow-md pointer-events-none flex items-center gap-1"
              >
                <Sparkles className="w-4 h-4" />+0.01 EXP
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, type: 'spring', damping: 20 }}
            className="w-full h-full relative [transform-style:preserve-3d]"
          >
            {/* FRONT OF CARD (Japanese Kanji + Furigana) */}
            <div className="absolute inset-0 [backface-visibility:hidden] rounded-3xl border border-border-subtle bg-surface-card p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl">
              <div className="w-full flex justify-between items-center text-xs">
                <span className="px-2.5 py-1 rounded-full bg-surface-inset text-indigo border border-border-subtle text-[11px] font-mono">
                  {currentItem.jlpt} • {currentItem.wordType}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAudio(currentItem.word);
                  }}
                  className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-gold border border-border-subtle transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Center Big Word */}
              <div className="text-center space-y-2 my-auto">
                {furiganaEnabled ? (
                  <h3 className="text-4xl sm:text-5xl font-black text-text-primary tracking-wider font-heading">
                    <RubyText
                      japanese={currentItem.word}
                      reading={currentItem.reading}
                      showFurigana={furiganaEnabled}
                    />
                  </h3>
                ) : (
                  <>
                    <p className="text-sm sm:text-base font-mono text-indigo font-medium">
                      {currentItem.reading}
                    </p>
                    <h3 className="text-4xl sm:text-5xl font-black text-text-primary tracking-wider font-jp font-heading">
                      {currentItem.word}
                    </h3>
                  </>
                )}
                <p className="text-xs text-text-muted pt-2">
                  (Klik untuk membalik kartu & melihat arti)
                </p>
              </div>

              {/* Kanji Breakdown Pills */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {(currentItem.kanjiComponents || []).map((k, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-inset text-text-secondary border border-border-subtle">
                    {k}
                  </span>
                ))}
              </div>
            </div>

            {/* BACK OF CARD (Indonesian & Japanese Meaning + Example) */}
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-3xl border border-border-subtle bg-surface-elevated p-6 sm:p-8 flex flex-col items-center justify-between shadow-xl">
              <div className="w-full flex justify-between items-center text-xs">
                <span className="text-indigo font-bold">Terjemahan & Arti</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayAudio(currentItem.word);
                  }}
                  className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-gold border border-border-subtle transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center space-y-2.5 my-auto">
                <h4 className="text-2xl sm:text-3xl font-black text-gold font-heading">
                  {currentItem.meaningId}
                </h4>
                <p className="text-xs text-text-secondary italic">
                  Definisi JP: {currentItem.meaningJa}
                </p>

                {currentItem.exampleSentence && (
                  <div className="mt-3 p-3 rounded-xl bg-surface-inset border border-border-subtle text-left space-y-1 max-w-sm mx-auto">
                    {furiganaEnabled ? (
                      <p className="text-xs font-bold text-text-primary">
                        <RubyText
                          japanese={currentItem.exampleSentence.japanese}
                          reading={currentItem.exampleSentence.reading}
                          showFurigana={furiganaEnabled}
                        />
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] text-indigo font-mono">
                          {currentItem.exampleSentence.reading}
                        </p>
                        <p className="text-xs font-bold text-text-primary font-jp">
                          {currentItem.exampleSentence.japanese}
                        </p>
                      </>
                    )}
                    <p className="text-[11px] text-text-secondary">
                      {currentItem.exampleSentence.meaningId}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-text-muted">
                (Klik untuk kembali ke tampilan depan)
              </p>
            </div>
          </motion.div>
        </div>

        {/* Card Controls */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
            className="rpg-btn rpg-btn-secondary flex-1 py-3 text-sm font-bold gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Sebelumnya</span>
          </button>

          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === items.length - 1}
            className="rpg-btn rpg-btn-primary flex-1 py-3 text-sm font-bold gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Selanjutnya</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Quiz CTA Banner */}
        <div className="p-4 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-text-primary font-heading">Siap Menguji Ingatan Kotoba?</h4>
            <p className="text-[11px] text-text-secondary">Jawab kuis arti kata dengan tantangan opsi pilihan ganda</p>
          </div>
          <button
            onClick={handleStartQuiz}
            className="btn py-2 px-4 text-xs font-bold shadow-md shrink-0"
          >
            Mulai Kuis
          </button>
        </div>
      </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <KotobaDetailModal
            isOpen={true}
            onClose={() => setSelectedItem(null)}
            item={selectedItem}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
