import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Layers, Feather, BookMarked, Headphones, Swords, ArrowLeft, CheckCircle2, Star, ShieldCheck, ChevronDown, ChevronUp, Crown, ChevronRight, ChevronLeft, Compass, ListFilter, X, Trophy, BookCheck } from 'lucide-react';
import { Stage, ItemMasteryRecord } from '../../types/content';
import { StageClearData } from '../../types/rpg';
import { BunpouModule } from '../learning/BunpouModule';
import { KotobaModule } from '../learning/KotobaModule';
import { KanjiModule } from '../learning/KanjiModule';
import { DokkaiModule } from '../learning/DokkaiModule';
import { ChoukaiModule } from '../learning/ChoukaiModule';
import { BossBattleModule } from '../learning/BossBattleModule';
import { QuizEngine } from '../learning/QuizEngine';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { getGranularStageProgress } from '../../utils/mastery';
import { getSiblingStagesForStage } from '../../data/world/maps';
import { fisherYatesShuffle } from '../../utils/smartRandomizer';

interface StageHubViewProps {
  stage: Stage;
  stageProgress?: StageClearData;
  itemMastery?: Record<string, ItemMasteryRecord>;
  onBackToMap: () => void;
  onBackToWorldList?: () => void;
  onSelectStage?: (newStage: Stage) => void;
  allStages?: Stage[];
  onModuleComplete: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
  playerMp: number;
  playerMaxMp: number;
  playerInt: number;
  playerStr: number;
  playerHp: number;
  playerMaxHp: number;
  onUseMp: (amount: number) => boolean;
  onHpDamage?: (amount: number) => void;
  onGameOver?: () => void;
  onStartRemediationRecall?: (itemIds: string[]) => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const StageHubView: React.FC<StageHubViewProps> = ({
  stage,
  stageProgress,
  itemMastery = {},
  onBackToMap,
  onBackToWorldList,
  onSelectStage,
  allStages,
  onModuleComplete,
  playerMp,
  playerMaxMp,
  playerInt,
  playerStr,
  playerHp,
  playerMaxHp,
  onUseMp,
  onHpDamage,
  onGameOver,
  onStartRemediationRecall,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeModule, setActiveModule] = useState<'hub' | 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'exam'>('hub');
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [isStageListOpen, setIsStageListOpen] = useState(false);

  // Compute siblings and world info for navigation
  const siblingInfo = useMemo(() => {
    return getSiblingStagesForStage(stage);
  }, [stage.id]);

  const { world, prevStage, nextStage, allStagesInWorld } = siblingInfo;
  const effectiveStages = allStagesInWorld.length > 0 ? allStagesInWorld : (allStages || []);

  // Hardware Back Button Interceptor
  useBackButton(true, () => {
    if (activeModule === 'exam') {
      const isConfirmed = window.confirm('Keluar dari Ujian Stage? Progress pengerjaan soal saat ini tidak akan tersimpan.');
      if (isConfirmed) {
        setActiveModule('hub');
        playSound('click', soundEnabled);
        return false; // Remain inside stage hub
      }
      return false; // Abort back, stay in exam
    }

    if (activeModule !== 'hub') {
      // Return from study submodule (Kotoba, Kanji, Bunpou, Reading, etc.) to stage hub
      setActiveModule('hub');
      playSound('click', soundEnabled);
      return false; // Remain inside stage hub
    }

    // At stage hub, back returns to world/region map
    onBackToMap();
  }, 'stage_hub');

  const clearedModules = stageProgress?.clearedModules || [];
  const granularProgress = getGranularStageProgress(stage, itemMastery);

  const handleModuleReward = (
    mod: string,
    exp: number,
    gold: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => {
    onModuleComplete(mod as any, exp, gold, itemId, score, total);
  };

  const renderBackButton = () => (
    <button
      onClick={() => {
        setActiveModule('hub');
        playSound('click', soundEnabled);
      }}
      className="rpg-btn rpg-btn-secondary text-xs gap-1.5 self-start mb-2 cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4 text-amber-400" />
      <span>Kembali ke Gerbang Stage {stage.stageNumber}</span>
    </button>
  );

  // Approximate total question count for Ujian Stage banner display in Hub
  const stageExamQuestionCount = React.useMemo(() => {
    let count = 0;
    (stage.bunpouIds || []).forEach(id => {
      const bp = BUNPOU_DATABASE[id];
      if (bp && bp.questions) count += Math.min(bp.questions.length, 3);
    });
    count += (stage.kotobaIds || []).length;
    (stage.kanjiIds || []).forEach(id => {
      const kj = KANJI_DATABASE[id];
      if (kj && kj.questions) count += Math.min(kj.questions.length, 2);
    });
    (stage.dokkaiIds || []).forEach(id => {
      const dk = DOKKAI_DATABASE[id];
      if (dk && dk.questions) count += Math.min(dk.questions.length, 2);
    });
    (stage.choukaiIds || []).forEach(id => {
      const ck = CHOUKAI_DATABASE[id];
      if (ck && ck.questions) count += Math.min(ck.questions.length, 1);
    });
    return Math.max(count, 5);
  }, [stage.bunpouIds, stage.kotobaIds, stage.kanjiIds, stage.dokkaiIds, stage.choukaiIds]);

  // Memoize boss & stage exam questions so options do not reshuffle on render
  const memoizedBossQuestions = React.useMemo(() => {
    if (activeModule !== 'boss' && activeModule !== 'exam') return [];

    const compiled: (import('../../types/content').Question & { category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' })[] = [];

    // Bunpou questions (25%)
    if (stage.bunpouIds && stage.bunpouIds.length > 0) {
      stage.bunpouIds.forEach(id => {
        const bp = BUNPOU_DATABASE[id];
        if (bp && bp.questions) {
          bp.questions.slice(0, 3).forEach(q => compiled.push({ ...q, category: 'bunpou' }));
        }
      });
    }

    // Kotoba questions (20%)
    if (stage.kotobaIds && stage.kotobaIds.length > 0) {
      const otherKotoba = Object.values(KOTOBA_DATABASE);
      stage.kotobaIds.forEach(id => {
        const kt = KOTOBA_DATABASE[id];
        if (kt) {
          const poolDistractors = otherKotoba
            .filter(o => o.id !== kt.id && o.meaningId)
            .map(o => o.meaningId);
          const shuffledPool = fisherYatesShuffle(poolDistractors).slice(0, 3);
          const shuffledOpts = fisherYatesShuffle([kt.meaningId, ...shuffledPool]);
          const correctIdx = shuffledOpts.indexOf(kt.meaningId);
          compiled.push({
            id: `exam_kt_${kt.id}`,
            category: 'kotoba',
            instruction: '次の言葉の意味として最も適切なものを一つ選びなさい。',
            instructionId: 'Pilihlah arti yang paling tepat untuk kosakata berikut.',
            prompt: kt.word,
            ruby: kt.reading,
            translation: kt.meaningId,
            options: shuffledOpts,
            correctIndex: correctIdx,
            explanation: `Kosakata 「${kt.word}」 (${kt.reading}) = ${kt.meaningId}`
          });
        }
      });
    }

    // Kanji questions (20%)
    if (stage.kanjiIds && stage.kanjiIds.length > 0) {
      stage.kanjiIds.slice(0, 2).forEach(id => {
        const kj = KANJI_DATABASE[id];
        if (kj && kj.questions) {
          kj.questions.slice(0, 2).forEach(q => compiled.push({ ...q, category: 'kanji' }));
        }
      });
    }

    // Dokkai questions (20%)
    if (stage.dokkaiIds && stage.dokkaiIds.length > 0) {
      stage.dokkaiIds.slice(0, 1).forEach(id => {
        const dk = DOKKAI_DATABASE[id];
        if (dk && dk.questions) {
          dk.questions.slice(0, 2).forEach(q => compiled.push({ ...q, category: 'dokkai' }));
        }
      });
    }

    // Choukai questions (15%)
    if (stage.choukaiIds && stage.choukaiIds.length > 0) {
      stage.choukaiIds.slice(0, 1).forEach(id => {
        const ck = CHOUKAI_DATABASE[id];
        if (ck && ck.questions) {
          ck.questions.slice(0, 1).forEach(q => compiled.push({ ...q, category: 'choukai' }));
        }
      });
    }

    return compiled.length > 0
      ? compiled
      : Object.values(BUNPOU_DATABASE).flatMap(b => (b.questions || []).map(q => ({ ...q, category: 'bunpou' as const }))).slice(0, 10);
  }, [activeModule, stage.id]);

  if (activeModule === 'bunpou') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <BunpouModule
          bunpouIds={stage.bunpouIds}
          bunpouMixedSetId={stage.bunpouMixedSetId}
          onReward={(exp, gold, mod, itemId, score, total) => handleModuleReward(mod, exp, gold, itemId, score, total)}
          onBack={() => setActiveModule('hub')}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
        />
      </div>
    );
  }

  if (activeModule === 'kotoba') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <KotobaModule
          kotobaIds={stage.kotobaIds}
          bunpouIds={stage.bunpouIds}
          onReward={(exp, gold, mod, itemId, score, total) => handleModuleReward(mod, exp, gold, itemId, score, total)}
          onBack={() => setActiveModule('hub')}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
        />
      </div>
    );
  }

  if (activeModule === 'kanji') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <KanjiModule
          kanjiIds={stage.kanjiIds}
          onReward={(exp, gold, mod, itemId, score, total) => handleModuleReward(mod, exp, gold, itemId, score, total)}
          onBack={() => setActiveModule('hub')}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
        />
      </div>
    );
  }

  if (activeModule === 'dokkai') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <DokkaiModule
          dokkaiIds={stage.dokkaiIds}
          onReward={(exp, gold, _mod, itemId, score, total) => handleModuleReward('dokkai', exp, gold, itemId, score, total)}
          onBack={() => setActiveModule('hub')}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
        />
      </div>
    );
  }

  if (activeModule === 'choukai') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <ChoukaiModule
          choukaiIds={stage.choukaiIds}
          onReward={(exp, gold, _mod, itemId, score, total) => handleModuleReward('choukai', exp, gold, itemId, score, total)}
          onBack={() => setActiveModule('hub')}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
        />
      </div>
    );
  }

  if (activeModule === 'boss') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <BossBattleModule
          bossName={stage.bossName || 'Overlord of Nihongo'}
          bossTitle={stage.bossTitle}
          bossHpTotal={stage.bossHp || 1200}
          questions={memoizedBossQuestions}
          playerStr={playerStr}
          playerInt={playerInt}
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
          playerMp={playerMp}
          playerMaxMp={playerMaxMp}
          onUseMp={onUseMp}
          onHpDamage={onHpDamage}
          onGameOver={onGameOver}
          soundEnabled={soundEnabled}
          onVictory={(exp, gold) => handleModuleReward('boss', exp, gold)}
          onExit={() => setActiveModule('hub')}
          onStartRemediationRecall={onStartRemediationRecall}
        />
      </div>
    );
  }

  if (activeModule === 'exam') {
    return (
      <div className="space-y-4">
        {renderBackButton()}
        <QuizEngine
          title={`🏆 Ujian Stage ${stage.stageNumber}: Evaluasi Seluruh Materi (${memoizedBossQuestions.length} Soal)`}
          questions={memoizedBossQuestions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onComplete={(score, total, exp, gold) => {
            handleModuleReward('boss', exp * 1.5, gold * 1.5, stage.id, score, total);
          }}
          onExit={() => setActiveModule('hub')}
        />
      </div>
    );
  }

  // HUB VIEW (The 5 Pillars in Mastery Framework)
  const modulesList = [
    {
      id: 'bunpou',
      name: 'BUNPOU • Grimoire Tata Bahasa',
      sub: `${stage.bunpouIds.length} Pola Rumus & Drill 7 Soal Konjugasi`,
      icon: BookOpen,
      iconColor: 'text-gold',
      percentage: granularProgress.bunpou.percentage,
      items: granularProgress.bunpou.items,
      isCompleted: clearedModules.includes('bunpou')
    },
    {
      id: 'kotoba',
      name: 'KOTOBA • Gulungan Kosakata',
      sub: `${stage.kotobaIds.length} Flashcard Kosakata & Kuis Pilihan`,
      icon: Layers,
      iconColor: 'text-indigo',
      percentage: granularProgress.kotoba.percentage,
      items: granularProgress.kotoba.items,
      isCompleted: clearedModules.includes('kotoba')
    },
    {
      id: 'kanji',
      name: 'KANJI • Aksara Kuno Karakter',
      sub: `${stage.kanjiIds.length} Rune Kanji, Stroke Order & Ujian Baca`,
      icon: Feather,
      iconColor: 'text-wine-accent',
      percentage: granularProgress.kanji.percentage,
      items: granularProgress.kanji.items,
      isCompleted: clearedModules.includes('kanji')
    },
    {
      id: 'dokkai',
      name: 'DOKKAI • Naskah Bacaan Terpadu',
      sub: 'Reading 1 (3 Soal) & Reading 2 (4 Soal Analisis)',
      icon: BookMarked,
      iconColor: 'text-dokkai',
      percentage: granularProgress.dokkai.percentage,
      items: granularProgress.dokkai.items,
      isCompleted: clearedModules.includes('dokkai')
    },
    {
      id: 'choukai',
      name: 'CHOUKAI • Resonansi Percakapan',
      sub: 'Listening Penutur Asli & Soal Pemahaman Audio',
      icon: Headphones,
      iconColor: 'text-choukai',
      percentage: granularProgress.choukai.percentage,
      items: granularProgress.choukai.items,
      isCompleted: clearedModules.includes('choukai')
    }
  ];

  // Only display modules that actually have items in this stage (e.g. Hiragana/Katakana dojo only has kanji writing & kotoba reading)
  const availableModules = modulesList.filter(mod => {
    if (mod.id === 'bunpou') return (stage.bunpouIds && stage.bunpouIds.length > 0);
    if (mod.id === 'kotoba') return (stage.kotobaIds && stage.kotobaIds.length > 0);
    if (mod.id === 'kanji') return (stage.kanjiIds && stage.kanjiIds.length > 0);
    if (mod.id === 'dokkai') return (stage.dokkaiIds && stage.dokkaiIds.length > 0);
    if (mod.id === 'choukai') return (stage.choukaiIds && stage.choukaiIds.length > 0);
    return true;
  });

  const getStatusBadge = (status: import('../../types/content').MasteryStatus) => {
    switch (status) {
      case 'PERFECTED':
        return <span className="rpg-badge bg-gold/20 text-gold-soft border-gold">PERFECTED ★</span>;
      case 'MASTERED':
        return <span className="rpg-badge bg-state-success/20 text-state-success border-state-success">MASTERED</span>;
      case 'COMPLETED':
        return <span className="rpg-badge bg-indigo/20 text-indigo border-indigo">COMPLETED</span>;
      case 'LEARNING':
        return <span className="rpg-badge bg-sky-500/15 text-sky-400 border-sky-500/30">LEARNING</span>;
      default:
        return <span className="rpg-badge bg-surface-inset text-text-muted border-border-subtle">AVAILABLE</span>;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-6 animate-fade-in">
      {/* 0. INTERACTIVE BREADCRUMB NAVIGATION */}
      <nav aria-label="Jalur Navigasi" className="flex items-center gap-1.5 text-xs text-text-secondary font-mono flex-wrap px-1">
        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            if (onBackToWorldList) {
              onBackToWorldList();
            } else {
              onBackToMap();
            }
          }}
          className="hover:text-gold flex items-center gap-1 transition-colors group cursor-pointer"
          title="Kembali ke Pilihan World Utama"
        >
          <Compass className="w-3.5 h-3.5 text-gold group-hover:scale-110 transition-transform" />
          <span>World</span>
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />

        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            onBackToMap();
          }}
          className="hover:text-gold font-bold text-text-primary transition-colors cursor-pointer"
          title="Kembali ke Daftar Stage World Ini"
        >
          {world ? (world.name.split('(')[0].trim() || `JLPT ${world.jlptLevel}`) : 'Daftar Stage'}
        </button>

        <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />

        <span className="text-gold font-bold truncate max-w-[200px] sm:max-w-none">
          Stage {stage.stageNumber}: {stage.title_jp || stage.title}
        </span>
      </nav>

      {/* Top Header Briefing Card */}
      <div className="panel panel-stitched p-4 sm:p-6 space-y-4 shadow-xl">
        {/* Top Control Bar: Back to Stage List & Fast Stage Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onBackToMap();
            }}
            className="btn btn-pill text-xs gap-1.5 self-start shadow-sm border-gold/30 hover:border-gold cursor-pointer"
            title="Kembali ke daftar modul stage di world ini"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>Kembali ke Daftar Stage {world ? `(${world.jlptLevel})` : ''}</span>
          </button>

          {/* Fast Stage Switcher: [◀ Prev] [Stage X/Y ▾] [Next ▶] */}
          {onSelectStage && effectiveStages.length > 0 && (
            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                disabled={!prevStage}
                onClick={() => {
                  if (prevStage) {
                    playSound('click', soundEnabled);
                    onSelectStage(prevStage);
                  }
                }}
                className={`btn btn-pill text-xs py-1.5 px-2.5 gap-1 ${
                  prevStage
                    ? 'text-text-primary hover:text-gold cursor-pointer'
                    : 'opacity-40 cursor-not-allowed text-text-muted border-border-subtle'
                }`}
                title={prevStage ? `Pindah ke Stage ${prevStage.stageNumber}` : 'Sudah di Stage Pertama'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Prev</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setIsStageListOpen(true);
                }}
                className="btn btn-pill text-xs py-1.5 px-3 gap-1.5 font-mono font-bold text-gold border-gold/40 hover:bg-gold/10 cursor-pointer"
                title="Buka daftar stage untuk berganti stage langsung"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>
                  Stage {stage.stageNumber}
                  {effectiveStages.length > 0 ? ` / ${effectiveStages.length}` : ''}
                </span>
                <ChevronDown className="w-3 h-3 text-gold/70" />
              </button>

              <button
                type="button"
                disabled={!nextStage}
                onClick={() => {
                  if (nextStage) {
                    playSound('click', soundEnabled);
                    onSelectStage(nextStage);
                  }
                }}
                className={`btn btn-pill text-xs py-1.5 px-2.5 gap-1 ${
                  nextStage
                    ? 'text-text-primary hover:text-gold cursor-pointer'
                    : 'opacity-40 cursor-not-allowed text-text-muted border-border-subtle'
                }`}
                title={nextStage ? `Pindah ke Stage ${nextStage.stageNumber}` : 'Sudah di Stage Terakhir'}
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 text-gold self-end sm:self-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < (stageProgress?.stars || 0)
                    ? 'fill-gold text-gold'
                    : 'text-surface-inset/60'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="breadcrumb-label">
            STAGE {stage.stageNumber} • {stage.isBoss ? '👑 UJIAN AKHIR WILAYAH' : 'EKSPEDISI MATERI HARIAN'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
            {stage.title}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {stage.description}
          </p>
        </div>

        {/* Granular Progress Breakdown Chips */}
        <div className="p-3.5 rounded-2xl bg-surface-inset/50 border border-border-subtle space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gold font-heading flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-gold" />
              Tingkat Penguasaan Stage:
            </span>
            <span className="font-mono font-bold text-gold text-sm">
              {granularProgress.overallPercentage}%
            </span>
          </div>

          {/* Master Progress Bar */}
          <div className="rpg-progress-track">
            <div
              className="rpg-progress-fill"
              style={{ width: `${granularProgress.overallPercentage}%` }}
            />
          </div>

          {/* Category Percentages */}
          <div className="flex flex-wrap gap-2 pt-1">
            {availableModules.map(mod => (
              <div key={mod.id} className="flex-1 min-w-[90px] p-2 rounded-xl bg-surface-inset/70 border border-border-subtle text-center flex flex-col items-center">
                <span className="text-[10px] text-text-secondary flex items-center gap-1 font-body">
                  <mod.icon className="w-3 h-3 text-gold"/> {mod.name.split('•')[0].trim()}
                </span>
                <span className={`text-xs font-mono font-bold ${mod.iconColor}`}>{mod.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rewards Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="btn btn-pill py-1 px-3 text-xs gap-1.5 shadow-sm text-gold">
              EXP: +{stage.rewardExp}
            </div>
          </div>

          <button
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="text-[11px] text-gold hover:text-gold-soft flex items-center gap-1 font-body font-bold"
          >
            <span>{expandedDetails ? 'Sembunyikan Status Butir' : 'Lihat Rincian Butir Materi'}</span>
            {expandedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Sub-Item Mastery Breakdown List */}
      {expandedDetails && (
        <div className="panel p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gold font-heading flex items-center gap-2">
            <span>📋 Status Penguasaan Setiap Butir Materi</span>
          </h3>

          <div className="space-y-4 text-xs">
            {/* Bunpou items breakdown */}
            {granularProgress.bunpou?.items && granularProgress.bunpou.items.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-text-primary font-heading block">Grimoire Bunpou ({granularProgress.bunpou.items.length} Pola)</span>
                <div className="grid grid-cols-1 gap-2">
                  {(granularProgress.bunpou.items || []).map(item => (
                    <div key={item.id} className="p-3 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gold font-heading">{item.title}</span>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">{item.meaning}</p>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-gold font-bold">{item.masteryPercentage}% Mastery</span>
                        <span className="text-text-muted block text-[10px]">{item.attempts}x percobaan • Best: {item.bestScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* The 5 Core Learning Modules */}
      <div className="space-y-3">
        <h3 className="breadcrumb-label px-1">
          Pilar Materi Belajar Stage Ini:
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {availableModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.id}
                whileHover={{ scale: 1.01, x: 2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  playSound('click', soundEnabled);
                  setActiveModule(mod.id as any);
                }}
                className="panel p-4 sm:p-4.5 cursor-pointer flex items-center justify-between gap-4 transition-all shadow-md group hover:border-border-primary"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-surface-inset/70 border border-border-subtle text-gold shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading group-hover:text-gold transition-colors">
                        {mod.name}
                      </h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-inset/60 text-gold-soft border border-border-subtle">
                        {mod.percentage}%
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-text-secondary">
                      {mod.sub}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {mod.isCompleted ? (
                    <span className="btn btn-pill py-1 px-2.5 text-xs text-gold gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selesai
                    </span>
                  ) : (
                    <span className="btn btn-pill py-1 px-3 text-xs text-gold-soft font-bold font-heading">
                      Buka →
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* SECTION EVALUASI / UJIAN STAGE (Tepat di Bawah Pilar Materi) */}
        {stage.isBoss ? (
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              playSound('attack', soundEnabled);
              setActiveModule('boss');
            }}
            className="rpg-card p-5 sm:p-6 border border-wine-accent/40 cursor-pointer text-center space-y-3 shadow-xl group transition-all"
          >
            <div className="p-3 inline-flex rounded-full bg-wine/30 border border-wine-accent text-wine-accent">
              <Swords className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-wine-accent font-heading flex justify-center items-center gap-2 group-hover:brightness-110 transition-colors">
                <Crown className="w-5 h-5 text-gold" />
                TANTANG BOSS: {stage.bossName}
              </h3>
              <p className="text-xs text-text-secondary">
                Kalahkan penguasa wilayah dengan evaluasi 5 pilar ({availableModules.map(m => m.name.split('•')[0].trim()).join(', ')})!
              </p>
            </div>
            <button className="btn btn-cta bg-wine hover:brightness-110 text-white gap-2 shadow-lg">
              <Swords className="w-4 h-4" /> Masuki Arena Pertarungan Boss
            </button>
          </motion.div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              playSound('click', soundEnabled);
              setActiveModule('exam');
            }}
            className="panel p-5 sm:p-6 border border-border-subtle text-center space-y-3 shadow-xl group transition-all bg-surface-card cursor-pointer hover:border-border-primary"
          >
            <div className="p-3 inline-flex rounded-full bg-gold/20 border border-gold text-gold">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gold font-heading flex justify-center items-center gap-2 group-hover:brightness-110">
                <BookCheck className="w-5 h-5 text-gold" />
                UJIAN STAGE {stage.stageNumber}: {stage.title_jp || stage.title}
              </h3>
              <p className="text-xs text-text-secondary max-w-md mx-auto mt-1">
                Evaluasi pemahaman komprehensif menguji gabungan materi stage ini ({availableModules.map(m => m.name.split('•')[0].trim()).join(', ')})!
              </p>
            </div>
            <button className="btn btn-cta bg-gold hover:brightness-110 text-surface-base font-bold gap-2 shadow-lg mx-auto">
              <BookCheck className="w-4 h-4" /> Mulai Ujian Stage ({stageExamQuestionCount} Soal)
            </button>
          </motion.div>
        )}

        {/* Bottom Quick Navigation Between Stages */}
        {onSelectStage && (prevStage || nextStage) && (
          <div className="pt-4 border-t border-border-subtle flex items-center justify-between gap-2 flex-wrap">
            {prevStage ? (
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onSelectStage(prevStage);
                }}
                className="btn btn-pill text-xs gap-1.5 cursor-pointer hover:border-gold"
              >
                <ChevronLeft className="w-4 h-4 text-gold" />
                <span>Stage {prevStage.stageNumber}: {prevStage.title_jp || prevStage.title}</span>
              </button>
            ) : <div />}

            {nextStage && (
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onSelectStage(nextStage);
                }}
                className="btn btn-pill text-xs gap-1.5 ml-auto cursor-pointer hover:border-gold"
              >
                <span>Stage {nextStage.stageNumber}: {nextStage.title_jp || nextStage.title}</span>
                <ChevronRight className="w-4 h-4 text-gold" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Stage Switcher Modal */}
      {isStageListOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 animate-fade-in"
          onClick={() => setIsStageListOpen(false)}
        >
          <div 
            className="panel panel-stitched w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-border-primary text-text-primary animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface-elevated/60">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-gold" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-heading text-text-primary">
                    Pilih Stage di {world ? (world.name.split('(')[0].trim() || `JLPT ${world.jlptLevel}`) : 'World'}
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Langsung berpindah materi tanpa perlu keluar ke menu utama
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setIsStageListOpen(false);
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-inset transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto space-y-2 flex-1">
              {effectiveStages.map((s, i) => {
                const isCurrent = s.id === stage.id;
                return (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setIsStageListOpen(false);
                      if (onSelectStage) {
                        onSelectStage(s);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-surface-elevated border-gold/40 text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.25)]'
                        : 'bg-surface-card hover:bg-surface-elevated border-border-subtle text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isCurrent ? 'bg-gold text-surface-base' : 'bg-surface-inset text-text-secondary'
                      }`}>
                        {s.stageNumber || i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[10px] text-text-secondary font-jp truncate">
                          {s.title_jp}
                        </div>
                        <div className="text-xs font-bold font-heading truncate">
                          {s.title_en || s.title}
                        </div>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gold text-surface-base shrink-0 font-mono">
                        Sedang Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-secondary font-mono flex items-center gap-1 shrink-0">
                        <span>Pilih</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-border-subtle bg-surface-elevated/40 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setIsStageListOpen(false);
                }}
                className="btn btn-pill text-xs py-1.5 px-4 font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
