import React, { useState, useMemo, lazy, Suspense } from 'react';
import { 
  Search, Volume2, CheckCircle2, XCircle, HelpCircle, 
  Feather, BookOpen, Headphones, FileText, Check, 
  Swords, Play, RotateCcw, Trophy, Award, ArrowRight, 
  ChevronRight, ArrowLeft, Layers, Compass, Clock, Flame
} from 'lucide-react';
import { ALL_TRYOUTS, TryOutMeta } from '../../data/tryouts';
import { TryOutData } from '../../types/content';
import kanjiQuestionsDb from '../../data/db/kanji_questions.json';
import bunpouQuestionsDb from '../../data/db/bunpou_questions.json';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { playSound, speakJapanese } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { calculateQuizReward } from '../../utils/rewards';

const DungeonBattleModule = lazy(() => import('../dungeon/DungeonBattleModule').then(m => ({ default: m.DungeonBattleModule })));

export type JlptSection = 'all' | 'mojiGoi' | 'bunpou' | 'dokkai' | 'choukai' | 'tryout';

export interface UnifiedQuestionItem {
  id: string;
  section: 'mojiGoi' | 'bunpou' | 'dokkai' | 'choukai';
  level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  sourceTitle: string;
  instruction?: string;
  prompt: string;
  ruby?: string;
  passage?: string;
  audioText?: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

const SECTION_TABS: { value: JlptSection; label: string; jp: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'all', label: 'Semua Bagian', jp: '全て', icon: BookOpen },
  { value: 'mojiGoi', label: 'Moji & Goi', jp: '文字・語彙', icon: Feather },
  { value: 'bunpou', label: 'Bunpou', jp: '文法', icon: FileText },
  { value: 'dokkai', label: 'Dokkai', jp: '読解', icon: BookOpen },
  { value: 'choukai', label: 'Choukai', jp: '聴解', icon: Headphones },
  { value: 'tryout', label: 'Simulasi Ujian', jp: '模擬試験・試練', icon: Swords },
];

const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Level' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const SECTION_BADGE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  mojiGoi: { bg: 'bg-indigo/15 border-indigo/30', text: 'text-indigo', label: '文字・語彙 (Moji & Goi)' },
  bunpou: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', label: '文法 (Bunpou)' },
  dokkai: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', label: '読解 (Dokkai)' },
  choukai: { bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-400', label: '聴解 (Choukai)' },
  tryout: { bg: 'bg-gold/15 border-gold/40', text: 'text-gold', label: '模擬試験 (Simulasi Ujian)' },
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  N1: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  N2: { bg: 'bg-indigo/15', text: 'text-indigo', border: 'border-indigo/30' },
  N3: { bg: 'bg-gold/15', text: 'text-gold', border: 'border-gold/30' },
  N4: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  N5: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};

interface QuestionLibraryViewProps {
  soundEnabled?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordStudy?: (category: 'tryOuts' | 'questions' | 'dokkai' | 'choukai' | 'bunpou' | 'bossBattles', id: string, count?: number) => void;
}

export const QuestionLibraryView: React.FC<QuestionLibraryViewProps> = ({ 
  soundEnabled = true,
  onRewardPlayer,
  onRecordStudy,
}) => {
  const [activeSection, setActiveSection] = useState<JlptSection>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  // Active Full Exam Simulation (Dungeon Mode)
  const [activeDungeonTryout, setActiveDungeonTryout] = useState<TryOutData | null>(null);

  // Active Latihan Harian (10-Question Drill) State
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [drillQuestions, setDrillQuestions] = useState<UnifiedQuestionItem[]>([]);
  const [drillCurrentIndex, setDrillCurrentIndex] = useState(0);
  const [drillUserAnswers, setDrillUserAnswers] = useState<Record<number, number>>({});
  const [drillRevealed, setDrillRevealed] = useState<Record<number, boolean>>({});
  const [drillCompleted, setDrillCompleted] = useState(false);

  // Free Explorer User Interactive Answers state: questionId -> selectedOptionIndex
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({});

  // Build unified questions list from tryouts + kanji questions + bunpou questions + dokkai + choukai
  const allQuestions: UnifiedQuestionItem[] = useMemo(() => {
    const list: UnifiedQuestionItem[] = [];

    // 1. From Official Tryouts
    for (const tryout of ALL_TRYOUTS) {
      const lvl = tryout.level;
      const data = tryout.data;
      const source = tryout.title;

      // Moji Goi
      if (data?.sections?.mojiGoi?.questions) {
        data.sections.mojiGoi.questions.forEach((q, idx) => {
          list.push({
            id: `to_${tryout.id}_mg_${q.id || idx}`,
            section: 'mojiGoi',
            level: lvl,
            sourceTitle: source,
            instruction: q.instruction || 'Pilih jawaban yang paling tepat untuk melengkapi atau mengartikan kalimat.',
            prompt: q.prompt,
            ruby: q.ruby,
            options: q.options || [],
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
            explanation: `Latihan Simulasi ${lvl}. Pilihan jawaban yang tepat adalah nomor ${(q.correctIndex || 0) + 1}: "${(q.options || [])[q.correctIndex || 0]}".`
          });
        });
      }

      // Bunpou & Dokkai
      if (data?.sections?.bunpouDokkai?.questions) {
        data.sections.bunpouDokkai.questions.forEach((q, idx) => {
          const isDokkai = Boolean(q.passage) || (q.instruction && q.instruction.includes('文章'));
          list.push({
            id: `to_${tryout.id}_bd_${q.id || idx}`,
            section: isDokkai ? 'dokkai' : 'bunpou',
            level: lvl,
            sourceTitle: source,
            instruction: q.instruction || (isDokkai ? 'Bacalah teks wacana berikut lalu jawablah pertanyaannya.' : 'Pilih pola tata bahasa yang paling sesuai.'),
            prompt: q.prompt,
            ruby: q.ruby,
            passage: q.passage,
            options: q.options || [],
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
            explanation: `Latihan Simulasi ${lvl}. Kunci jawaban yang tepat adalah opsi ke-${(q.correctIndex || 0) + 1}: "${(q.options || [])[q.correctIndex || 0]}".`
          });
        });
      }

      // Choukai
      if (data?.sections?.choukai?.questions) {
        data.sections.choukai.questions.forEach((q, idx) => {
          list.push({
            id: `to_${tryout.id}_ck_${q.id || idx}`,
            section: 'choukai',
            level: lvl,
            sourceTitle: source,
            instruction: q.instruction || 'Dengarkan percakapan berikut lalu pilih jawaban yang tepat.',
            prompt: q.prompt,
            audioText: q.ruby || q.prompt,
            options: q.options || [],
            correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
            explanation: `Soal Choukai ${lvl}. Jawaban yang tepat adalah nomor ${(q.correctIndex || 0) + 1}: "${(q.options || [])[q.correctIndex || 0]}".`
          });
        });
      }
    }

    // 2. From Choukai Database
    Object.values(CHOUKAI_DATABASE).forEach((ck) => {
      const lvl = (ck.level?.includes('N4') ? 'N4' : ck.level?.includes('N5') ? 'N5' : 'N3') as 'N5' | 'N4' | 'N3';
      (ck.questions || []).forEach((q, qIdx) => {
        list.push({
          id: `db_ck_${ck.id}_${q.id || qIdx}`,
          section: 'choukai',
          level: lvl,
          sourceTitle: ck.title,
          instruction: `Percakapan: ${ck.dialogueSpeaker || 'Pelafalan Penutur Asli'}`,
          prompt: q.prompt,
          audioText: ck.audioText || ck.transcript,
          options: q.options || [],
          correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
          explanation: q.explanation || `Dengarkan baik-baik dialog. Jawaban yang benar adalah pilihan ke-${(q.correctIndex || 0) + 1}.`
        });
      });
    });

    // 3. From Dokkai Database
    Object.values(DOKKAI_DATABASE).forEach((dk) => {
      const lvl = (dk.level?.includes('N4') ? 'N4' : dk.level?.includes('N5') ? 'N5' : 'N3') as 'N5' | 'N4' | 'N3';
      (dk.questions || []).forEach((q, qIdx) => {
        list.push({
          id: `db_dk_${dk.id}_${q.id || qIdx}`,
          section: 'dokkai',
          level: lvl,
          sourceTitle: dk.title,
          instruction: 'Bacalah teks wacana berikut:',
          passage: dk.text,
          prompt: q.prompt,
          options: q.options || [],
          correctIndex: q.correctIndex !== undefined ? q.correctIndex : 0,
          explanation: q.explanation || `Pahami makna inti wacana. Kunci yang tepat adalah opsi ke-${(q.correctIndex || 0) + 1}.`
        });
      });
    });

    // 4. Sample slice from Kanji Questions (Moji/Goi)
    if (Array.isArray(kanjiQuestionsDb)) {
      kanjiQuestionsDb.slice(0, 80).forEach((kq) => {
        list.push({
          id: `kq_${kq.id}`,
          section: 'mojiGoi',
          level: 'N3',
          sourceTitle: 'Bank Soal Kanji Resmi',
          instruction: 'Pilihlah cara baca (yomikata) atau kanji yang tepat:',
          prompt: kq.prompt,
          ruby: kq.ruby,
          options: kq.options || [],
          correctIndex: kq.correct_index !== undefined ? kq.correct_index : 0,
          explanation: kq.explanation || 'Perhatikan bentuk kanji dan kaidah pembacaan onyomi/kunyomi.'
        });
      });
    }

    // 5. Sample slice from Bunpou Questions (Grammar)
    if (Array.isArray(bunpouQuestionsDb)) {
      bunpouQuestionsDb.slice(0, 80).forEach((bq) => {
        list.push({
          id: `bq_${bq.id}`,
          section: 'bunpou',
          level: 'N3',
          sourceTitle: 'Bank Soal Tata Bahasa Resmi',
          instruction: 'Lengkapi kalimat berikut dengan pola tata bahasa yang tepat:',
          prompt: bq.prompt,
          ruby: bq.ruby,
          options: bq.options || [],
          correctIndex: bq.correct_answer !== undefined ? bq.correct_answer : 0,
          explanation: bq.explanation || 'Sesuaikan bentuk sambungan part of speech dengan makna kalimat.'
        });
      });
    }

    return list;
  }, []);

  // Section & Level Filter Counts
  const countsBySection = useMemo(() => {
    const counts: Record<string, number> = { 
      all: allQuestions.length, 
      mojiGoi: 0, 
      bunpou: 0, 
      dokkai: 0, 
      choukai: 0,
      tryout: ALL_TRYOUTS.length,
    };
    for (const q of allQuestions) {
      if (counts[q.section] !== undefined) counts[q.section]++;
    }
    return counts;
  }, [allQuestions]);

  const countsByLevel = useMemo(() => {
    const counts: Record<string, number> = { all: allQuestions.length, N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    for (const q of allQuestions) {
      if (counts[q.level] !== undefined) counts[q.level]++;
    }
    return counts;
  }, [allQuestions]);

  // Filtering for Explorer
  const filteredQuestions = useMemo(() => {
    if (activeSection === 'tryout') return [];

    return allQuestions.filter((q) => {
      // 1. Section Filter
      if (activeSection !== 'all' && q.section !== activeSection) return false;

      // 2. Level Filter
      if (levelFilter !== 'all' && q.level !== levelFilter) return false;

      // 3. Search Query
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();

      return (
        q.prompt.toLowerCase().includes(query) ||
        (q.instruction && q.instruction.toLowerCase().includes(query)) ||
        (q.passage && q.passage.toLowerCase().includes(query)) ||
        (q.explanation && q.explanation.toLowerCase().includes(query)) ||
        q.options.some((opt) => opt.toLowerCase().includes(query))
      );
    });
  }, [allQuestions, activeSection, levelFilter, searchQuery]);

  // Filtered Tryouts for Tryout tab & Hero Section
  const filteredTryouts = useMemo(() => {
    if (levelFilter === 'all') return ALL_TRYOUTS;
    return ALL_TRYOUTS.filter(t => t.level === levelFilter);
  }, [levelFilter]);

  const displayedQuestions = filteredQuestions.slice(0, visibleCount);

  // --- LATIHAN HARIAN (10 SOAL DRILL) LOGIC ---
  const handleStartDrill = (section: JlptSection = activeSection, level: string = levelFilter) => {
    let pool = allQuestions.filter((q) => {
      const matchSec = (section === 'all' || section === 'tryout') ? true : q.section === section;
      const matchLvl = level === 'all' ? true : q.level === level;
      return matchSec && matchLvl;
    });

    if (pool.length < 10) {
      pool = allQuestions.filter((q) => (level === 'all' ? true : q.level === level));
    }
    if (pool.length === 0) {
      pool = allQuestions;
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    setDrillQuestions(shuffled);
    setDrillCurrentIndex(0);
    setDrillUserAnswers({});
    setDrillRevealed({});
    setDrillCompleted(false);
    setIsDrillActive(true);
    playSound('click', soundEnabled);
  };

  const handleDrillSelectOption = (optionIdx: number) => {
    if (drillUserAnswers[drillCurrentIndex] !== undefined) return;
    const currentQ = drillQuestions[drillCurrentIndex];
    if (!currentQ) return;

    const isCorrect = optionIdx === currentQ.correctIndex;
    setDrillUserAnswers((prev) => ({ ...prev, [drillCurrentIndex]: optionIdx }));
    setDrillRevealed((prev) => ({ ...prev, [drillCurrentIndex]: true }));

    if (isCorrect) {
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
  };

  const handleDrillNext = () => {
    if (drillCurrentIndex < drillQuestions.length - 1) {
      setDrillCurrentIndex((prev) => prev + 1);
      playSound('click', soundEnabled);
    } else {
      // Completed drill
      setDrillCompleted(true);
      playSound('levelUp', soundEnabled);

      let correctScore = 0;
      drillQuestions.forEach((q, idx) => {
        if (drillUserAnswers[idx] === q.correctIndex) {
          correctScore++;
        }
      });

      const levelSample = levelFilter === 'all' ? (drillQuestions[0]?.level || 'N3') : levelFilter;
      const quizReward = calculateQuizReward(levelSample, correctScore, drillQuestions.length);
      const expGain = quizReward.totalExpGained;
      const goldGain = quizReward.goldGained;
      if (onRewardPlayer && expGain > 0) {
        onRewardPlayer(expGain, goldGain);
      }
      if (onRecordStudy) {
        onRecordStudy('questions', `drill_${activeSection}_${levelFilter}`, correctScore);
      }
    }
  };

  const drillCorrectScore = useMemo(() => {
    let score = 0;
    drillQuestions.forEach((q, idx) => {
      if (drillUserAnswers[idx] === q.correctIndex) score++;
    });
    return score;
  }, [drillQuestions, drillUserAnswers]);

  // Handle free explorer answer
  const handleSelectOptionExplorer = (questionId: string, optionIdx: number, correctIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
    if (optionIdx === correctIdx) {
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
  };

  // --- IF RUNNING FULL DUNGEON EXAM SIMULATOR ---
  if (activeDungeonTryout) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Suspense fallback={<div className="panel p-12 text-center text-text-muted font-mono">Memuat Simulator Ujian...</div>}>
          <DungeonBattleModule
            tryOutData={activeDungeonTryout}
            onComplete={(score, total, exp, gold, tryoutId) => {
              onRewardPlayer?.(exp, gold);
              onRecordStudy?.('tryOuts', tryoutId || 'tryout_exam', total);
              setActiveDungeonTryout(null);
            }}
            onBack={() => setActiveDungeonTryout(null)}
            soundEnabled={soundEnabled}
          />
        </Suspense>
      </div>
    );
  }

  // --- IF RUNNING LATIHAN HARIAN (10 SOAL) INTERACTIVE DRILL ---
  if (isDrillActive) {
    if (drillCompleted) {
      const percentage = Math.round((drillCorrectScore / 10) * 100);
      let grade = 'C';
      let gradeText = 'Perlu Lebih Banyak Latihan';
      let gradeColor = 'text-amber-400 border-amber-400/40 bg-amber-400/10';

      if (percentage >= 90) {
        grade = 'S';
        gradeText = 'Sempurna! Penguasaan Luar Biasa';
        gradeColor = 'text-gold border-gold/40 bg-gold/10';
      } else if (percentage >= 80) {
        grade = 'A';
        gradeText = 'Luar Biasa! Kemampuan Sangat Mantap';
        gradeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
      } else if (percentage >= 60) {
        grade = 'B';
        gradeText = 'Bagus! Sudah Menguasai Dasar';
        gradeColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
      }

      return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
          {/* Result Card */}
          <div className="panel p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-md text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center">
              <Trophy className="w-8 h-8 text-gold" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Evaluasi Latihan Harian (10 Soal)
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-heading">
                Latihan Selesai!
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary">
                {gradeText}
              </p>
            </div>

            {/* Score & Grade Display */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-2">
              <div className="p-4 px-6 rounded-2xl bg-surface-inset border border-border-subtle text-center min-w-[140px]">
                <span className="text-[11px] font-mono text-text-muted uppercase block">Skor Benar</span>
                <span className="text-2xl sm:text-3xl font-bold text-text-primary font-mono">
                  {drillCorrectScore} <span className="text-sm font-normal text-text-muted">/ 10</span>
                </span>
              </div>

              <div className="p-4 px-6 rounded-2xl bg-surface-inset border border-border-subtle text-center min-w-[140px]">
                <span className="text-[11px] font-mono text-text-muted uppercase block">Akurasi</span>
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
                  {percentage}%
                </span>
              </div>

              <div className={`p-4 px-6 rounded-2xl border text-center min-w-[140px] ${gradeColor}`}>
                <span className="text-[11px] font-mono uppercase block opacity-80">Predikat</span>
                <span className="text-2xl sm:text-3xl font-bold font-mono">
                  {grade}
                </span>
              </div>
            </div>

            {/* Rewards Card */}
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center gap-6 text-xs font-bold font-mono">
              <div className="flex items-center gap-2 text-indigo">
                <Award className="w-4 h-4" />
                <span>+{drillCorrectScore * 10} EXP Didapatkan</span>
              </div>
              <div className="flex items-center gap-2 text-gold">
                <span>+{drillCorrectScore * 5} Gold Didapatkan</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleStartDrill(activeSection, levelFilter)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gold text-surface-ground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Latihan 10 Soal Baru (Acak)</span>
              </button>

              <button
                onClick={() => setIsDrillActive(false)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-surface-inset border border-border-subtle hover:border-border-muted text-text-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Bank Soal</span>
              </button>
            </div>
          </div>

          {/* Detailed Question Review List */}
          <div className="panel p-5 sm:p-6 rounded-3xl border border-border-subtle space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-text-muted" />
              Tinjauan & Pembahasan Soal Latihan (10 Soal)
            </h3>

            <div className="space-y-3">
              {drillQuestions.map((q, idx) => {
                const userAns = drillUserAnswers[idx];
                const isCorrect = userAns === q.correctIndex;

                return (
                  <div 
                    key={q.id || idx}
                    className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border-subtle/50 pb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle font-mono text-[11px] font-bold text-text-primary">
                          Soal {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-card border border-border-subtle font-mono text-[10px] text-text-muted">
                          {q.level} • {SECTION_BADGE_STYLE[q.section]?.label || q.section}
                        </span>
                      </div>
                      <span className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {isCorrect ? 'Jawaban Benar' : 'Jawaban Salah'}
                      </span>
                    </div>

                    <div className="text-xs sm:text-sm font-jp text-text-primary font-medium">
                      <RubyText text={q.prompt} ruby={q.ruby} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-jp pt-1">
                      {q.options.map((opt, oIdx) => {
                        const isChosen = userAns === oIdx;
                        const isRightAnswer = oIdx === q.correctIndex;

                        let style = 'bg-surface-card border-border-subtle text-text-secondary opacity-70';
                        if (isRightAnswer) {
                          style = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold opacity-100';
                        } else if (isChosen && !isRightAnswer) {
                          style = 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold opacity-100';
                        }

                        return (
                          <div key={oIdx} className={`p-2.5 rounded-xl border flex items-center gap-2 ${style}`}>
                            <span className="w-5 h-5 rounded bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-[10px]">
                              {oIdx + 1}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle text-xs text-text-secondary space-y-1">
                      <span className="font-bold text-text-primary block font-mono text-[11px]">
                        💡 Pembahasan:
                      </span>
                      <p className="leading-relaxed whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Active Drill Question Runner
    const currentQ = drillQuestions[drillCurrentIndex];
    const isAnswered = drillUserAnswers[drillCurrentIndex] !== undefined;
    const selectedAns = drillUserAnswers[drillCurrentIndex];
    const isCorrectCurrent = selectedAns === currentQ?.correctIndex;

    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Drill Progress & Control Header */}
        <div className="panel p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <button
              onClick={() => setIsDrillActive(false)}
              className="px-3 py-1.5 rounded-xl bg-surface-inset border border-border-subtle text-text-muted hover:text-text-primary text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Keluar Latihan</span>
            </button>

            <div className="flex items-center gap-2 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle text-text-primary font-bold">
                Level {currentQ?.level || levelFilter}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-inset border border-border-subtle text-emerald-400 font-bold">
                {drillCorrectScore} Benar
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted">
              <span>Soal {drillCurrentIndex + 1} dari {drillQuestions.length}</span>
              <span>{Math.round(((drillCurrentIndex + 1) / drillQuestions.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-inset border border-border-subtle overflow-hidden">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${((drillCurrentIndex + 1) / drillQuestions.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="panel p-6 sm:p-8 rounded-3xl border border-border-subtle shadow-sm space-y-5 animate-fade-in">
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${SECTION_BADGE_STYLE[currentQ.section]?.bg} ${SECTION_BADGE_STYLE[currentQ.section]?.text}`}>
                {SECTION_BADGE_STYLE[currentQ.section]?.label || currentQ.section}
              </span>
              <span className="text-xs font-mono text-text-muted">
                {currentQ.sourceTitle}
              </span>
            </div>

            {/* Instruction */}
            {currentQ.instruction && (
              <p className="text-xs text-text-secondary font-medium italic">
                {currentQ.instruction}
              </p>
            )}

            {/* Dokkai Passage Box */}
            {currentQ.passage && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2 max-h-64 overflow-y-auto font-jp text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-text-muted border-b border-border-subtle/50 pb-1">
                  <FileText className="w-3 h-3" /> Wacana Bacaan (Passage)
                </div>
                {currentQ.passage}
              </div>
            )}

            {/* Choukai Audio Button */}
            {currentQ.section === 'choukai' && currentQ.audioText && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle">
                <button
                  onClick={() => speakJapanese(currentQ.audioText!)}
                  className="px-4 py-2 rounded-xl bg-surface-card border border-border-subtle hover:border-gold/50 text-text-primary text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                >
                  <Volume2 className="w-4 h-4 text-gold" />
                  Putar Audio Percakapan
                </button>
                <span className="text-[11px] text-text-muted font-jp">
                  Dengarkan dialog untuk menentukan jawaban yang tepat
                </span>
              </div>
            )}

            {/* Prompt */}
            <div className="text-base sm:text-lg font-medium text-text-primary font-jp leading-relaxed py-2">
              <RubyText text={currentQ.prompt} ruby={currentQ.ruby} />
            </div>

            {/* 4 Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAns === optIdx;
                const isRight = optIdx === currentQ.correctIndex;

                let btnStyle = 'bg-surface-card border-border-subtle hover:border-border-muted text-text-primary';
                if (isAnswered) {
                  if (isRight) {
                    btnStyle = 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold';
                  } else if (isSelected && !isRight) {
                    btnStyle = 'bg-rose-500/15 border-rose-500 text-rose-400 font-bold';
                  } else {
                    btnStyle = 'bg-surface-card border-border-subtle opacity-50 text-text-muted';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleDrillSelectOption(optIdx)}
                    disabled={isAnswered}
                    className={`p-3.5 rounded-2xl border text-left text-xs sm:text-sm font-jp flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-xs font-bold shrink-0">
                        {optIdx + 1}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </div>
                    {isAnswered && isRight && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isRight && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation card appears upon answering */}
            {isAnswered && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold font-mono">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-text-primary">
                      Jawaban Benar: Pilihan ({currentQ.correctIndex + 1}) — {currentQ.options[currentQ.correctIndex]}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isCorrectCurrent ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isCorrectCurrent ? 'Jawaban Kamu Benar! ✨' : 'Belum Tepat ❌'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Footer Next Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleDrillNext}
                disabled={!isAnswered}
                className={`px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                  isAnswered
                    ? 'bg-gold text-surface-ground hover:opacity-95 shadow-sm'
                    : 'bg-surface-inset border border-border-subtle text-text-muted opacity-50 cursor-not-allowed'
                }`}
              >
                <span>
                  {drillCurrentIndex < drillQuestions.length - 1 ? 'Soal Berikutnya' : 'Selesaikan Latihan & Evaluasi'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- STANDARD BANK SOAL & EXPLORER VIEW ---
  return (
    <div className="space-y-6">
      {/* Top JLPT Section Navigation Tabs (Now including Simulasi Ujian beside Choukai) */}
      <div className="panel p-3 sm:p-4 rounded-3xl border border-border-subtle shadow-sm space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SECTION_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.value;
            const count = countsBySection[tab.value] || 0;

            return (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveSection(tab.value);
                  setVisibleCount(30);
                  playSound('click', soundEnabled);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-all ${
                  isActive
                    ? 'bg-surface-inset border border-border-subtle text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-inset/60 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 opacity-75" />
                <span>{tab.label}</span>
                <span className="font-jp text-[11px] opacity-70">({tab.jp})</span>
                <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle/50 opacity-80">
                  {tab.value === 'tryout' ? `${filteredTryouts.length} Paket` : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Level Quick Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar border-t border-border-subtle/40">
          <span className="text-[11px] font-mono font-bold text-text-muted uppercase shrink-0 mr-1">
            Filter Level:
          </span>
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLevelFilter(opt.value);
                setVisibleCount(30);
                playSound('click', soundEnabled);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                levelFilter === opt.value
                  ? 'bg-surface-inset border border-border-subtle text-text-primary font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-inset/60 border border-transparent'
              }`}
            >
              <span>{opt.label}</span>
              <span className="font-mono text-[10px] opacity-60">
                {opt.value === 'all' ? allQuestions.length : countsByLevel[opt.value] || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero Action Modes Grid (Latihan Harian 10 Soal + Simulasi Ujian Nyata) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1: Latihan Harian (10 Soal) */}
        <div className="panel p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4 hover:border-gold/40 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-gold/15 text-gold border border-gold/30 flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Mode Latihan Cepat
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {levelFilter === 'all' ? 'Semua Level' : `Level ${levelFilter}`}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading">
              Latihan Harian (10 Soal Acak)
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Drill interaktif 10 soal acak sesuai kategori dan level aktif. Dapatkan pembahasan instan, evaluasi skor, serta bonus EXP & Gold.
            </p>
          </div>

          <button
            onClick={() => handleStartDrill(activeSection, levelFilter)}
            className="w-full py-3 px-4 rounded-2xl bg-gold text-surface-ground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm hover:opacity-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulai Latihan Harian (10 Soal)</span>
          </button>
        </div>

        {/* Mode 2: Paket Simulasi Ujian Nyata (Dungeon Battle) */}
        <div className="panel p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo/40 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-indigo/15 text-indigo border border-indigo/30 flex items-center gap-1">
                <Swords className="w-3 h-3" />
                Ujian Nyata (Dungeon)
              </span>
              <span className="text-[11px] font-mono text-text-muted">
                {filteredTryouts.length} Paket Tersedia
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading">
              Simulasi Ujian Berskala Penuh
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Kondisi ujian JLPT sesungguhnya dengan batas waktu resmi, multi-sesi (Moji-Goi, Bunpou-Dokkai, Choukai), lembar jawaban grid, dan sertifikat kelulusan.
            </p>
          </div>

          <button
            onClick={() => {
              if (filteredTryouts.length > 0) {
                setActiveDungeonTryout(filteredTryouts[0].data);
              } else {
                setActiveSection('tryout');
              }
              playSound('click', soundEnabled);
            }}
            className="w-full py-3 px-4 rounded-2xl bg-surface-inset border border-border-subtle hover:border-border-muted text-text-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>
              {activeSection === 'tryout' ? 'Pilih Paket Ujian di Bawah' : 'Buka Paket Ujian Nyata'}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW A: IF IN TRYOUT TAB -> Display Paket Ujian Grid */}
      {activeSection === 'tryout' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Swords className="w-5 h-5 text-gold" />
              Paket Simulasi Ujian JLPT Resmi ({filteredTryouts.length} Paket)
            </h3>
            <span className="text-xs font-mono text-text-muted">
              {levelFilter === 'all' ? 'Menampilkan Seluruh Level' : `Level ${levelFilter}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTryouts.map((to) => {
              const lvlColor = LEVEL_COLORS[to.level] || LEVEL_COLORS.N5;

              return (
                <div
                  key={to.id}
                  className="panel p-5 rounded-3xl border border-border-subtle shadow-sm flex flex-col justify-between space-y-4 hover:border-border-muted transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${lvlColor.bg} ${lvlColor.text} ${lvlColor.border}`}>
                        Level {to.level}
                      </span>
                      <span className="text-[11px] font-mono text-text-muted">
                        Kode: {to.code}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-text-primary font-heading">
                        {to.title}
                      </h4>
                      <p className="text-xs text-text-secondary mt-1">
                        Paket ujian resmi dengan format soal standar JLPT
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-text-secondary">
                      <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-text-muted" />
                        <span>{to.totalQuestions} Soal</span>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-text-muted" />
                        <span>Timer Resmi</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveDungeonTryout(to.data);
                      playSound('click', soundEnabled);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-inset border border-border-subtle hover:border-gold/50 text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 text-gold fill-current" />
                    <span>Mulai Ujian Nyata</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* VIEW B: QUESTION EXPLORER (Moji-Goi, Bunpou, Dokkai, Choukai, or All) */
        <div className="space-y-4">
          {/* Search Bar & Explorer Summary */}
          <div className="panel p-4 rounded-2xl border border-border-subtle shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisibleCount(30);
                }}
                placeholder="Cari teks soal, bacaan wacana, opsi kata, atau pembahasan..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-inset border border-border-subtle text-text-primary placeholder:text-text-muted text-xs sm:text-sm font-medium focus:outline-none focus:border-border-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-text-muted hover:text-text-primary"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-text-muted w-full sm:w-auto justify-between sm:justify-end">
              <span>Menampilkan {Math.min(visibleCount, filteredQuestions.length)} dari {filteredQuestions.length} soal</span>
              {Object.keys(userAnswers).length > 0 && (
                <span className="px-2 py-0.5 rounded bg-surface-inset font-bold text-text-primary border border-border-subtle">
                  {Object.keys(userAnswers).length} Dijawab
                </span>
              )}
            </div>
          </div>

          {/* Question Cards List */}
          {displayedQuestions.length > 0 ? (
            <div className="space-y-4">
              {displayedQuestions.map((q, qIndex) => {
                const badgeMeta = SECTION_BADGE_STYLE[q.section] || SECTION_BADGE_STYLE.mojiGoi;
                const selectedAnswer = userAnswers[q.id];
                const isAnswered = selectedAnswer !== undefined;
                const isRevealed = revealedExplanations[q.id];

                return (
                  <div
                    key={q.id}
                    className="panel p-5 sm:p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4 hover:border-border-muted transition-colors"
                  >
                    {/* Header: Section Badge, Level Badge & Number */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${badgeMeta.bg} ${badgeMeta.text}`}>
                          {badgeMeta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface-inset font-bold text-text-primary border border-border-subtle text-[11px] font-mono">
                          {q.level}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        No. {qIndex + 1}
                      </span>
                    </div>

                    {/* Instruction */}
                    {q.instruction && (
                      <p className="text-xs text-text-secondary font-medium italic">
                        {q.instruction}
                      </p>
                    )}

                    {/* Dokkai Passage Box */}
                    {q.passage && (
                      <div className="p-4 rounded-xl bg-surface-inset/80 border border-border-subtle space-y-2 max-h-60 overflow-y-auto font-jp text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-text-muted border-b border-border-subtle/50 pb-1">
                          <FileText className="w-3 h-3" /> Wacana Bacaan (Passage)
                        </div>
                        {q.passage}
                      </div>
                    )}

                    {/* Choukai Audio Prompt Button */}
                    {q.section === 'choukai' && q.audioText && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-inset border border-border-subtle">
                        <button
                          onClick={() => speakJapanese(q.audioText!)}
                          className="px-3.5 py-2 rounded-xl bg-surface-card border border-border-subtle hover:border-gold/50 text-text-primary text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                          <Volume2 className="w-4 h-4 text-gold" />
                          Putar Dialog / Suara Soal
                        </button>
                        <span className="text-[11px] text-text-muted font-jp">
                          Gunakan speaker untuk mendengarkan percakapan
                        </span>
                      </div>
                    )}

                    {/* Prompt Text */}
                    <div className="text-sm sm:text-base font-medium text-text-primary font-jp leading-relaxed">
                      <RubyText text={q.prompt} ruby={q.ruby} />
                    </div>

                    {/* Multiple Choice Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isSelected = selectedAnswer === optIdx;
                        const isCorrect = optIdx === q.correctIndex;

                        let btnStyle = 'bg-surface-card border-border-subtle hover:border-border-muted text-text-primary';
                        if (isAnswered) {
                          if (isCorrect) {
                            btnStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                          } else if (isSelected && !isCorrect) {
                            btnStyle = 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold';
                          } else {
                            btnStyle = 'bg-surface-card border-border-subtle opacity-50 text-text-muted';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            onClick={() => handleSelectOptionExplorer(q.id, optIdx, q.correctIndex)}
                            disabled={isAnswered}
                            className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-jp flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                                {optIdx + 1}
                              </span>
                              <span className="leading-snug">{opt}</span>
                            </div>
                            {isAnswered && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            {isAnswered && isSelected && !isCorrect && (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Toggle & Content */}
                    <div className="pt-2 flex flex-col space-y-2 border-t border-border-subtle/50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => {
                            setRevealedExplanations((prev) => ({ ...prev, [q.id]: !prev[q.id] }));
                            playSound('click', soundEnabled);
                          }}
                          className="text-xs font-bold font-mono text-text-muted hover:text-text-primary flex items-center gap-1.5 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          {isRevealed ? 'Sembunyikan Pembahasan' : 'Lihat Pembahasan & Kunci Jawaban'}
                        </button>

                        {isAnswered && (
                          <span className={`text-xs font-bold font-mono ${selectedAnswer === q.correctIndex ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {selectedAnswer === q.correctIndex ? 'Jawaban Benar! ✨' : 'Jawaban Salah ❌'}
                          </span>
                        )}
                      </div>

                      {isRevealed && (
                        <div className="p-3.5 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-secondary space-y-1.5 animate-fade-in">
                          <div className="flex items-center gap-2 text-text-primary font-bold">
                            <Check className="w-4 h-4 text-emerald-400" />
                            Kunci Jawaban Benar: Opsi ({q.correctIndex + 1}) — {q.options[q.correctIndex]}
                          </div>
                          <p className="leading-relaxed whitespace-pre-line text-text-secondary">
                            {q.explanation || 'Perhatikan konteks kalimat dan makna tata bahasa.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center panel rounded-2xl border border-border-subtle space-y-3">
              <BookOpen className="w-10 h-10 text-text-muted mx-auto opacity-50" />
              <h3 className="text-base font-bold text-text-primary">Tidak Ada Soal Ditemukan</h3>
              <p className="text-xs text-text-secondary">Coba pilih level atau kata kunci pencarian yang lain.</p>
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredQuestions.length && (
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setVisibleCount((prev) => prev + 30);
                  playSound('click', soundEnabled);
                }}
                className="px-6 py-2.5 rounded-2xl bg-surface-inset border border-border-subtle hover:border-border-muted text-xs font-bold font-mono uppercase tracking-wider text-text-primary hover:shadow-sm transition-all"
              >
                Muat Lebih Banyak ({filteredQuestions.length - visibleCount} Tersisa)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
