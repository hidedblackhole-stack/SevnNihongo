import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Layers, Feather, BookMarked, Headphones, Swords, ArrowLeft, Sparkles, CheckCircle2, Star, AlertCircle, ShieldCheck, ChevronDown, ChevronUp, Crown, Coins } from 'lucide-react';
import { Stage, ItemMasteryRecord } from '../../types/content';
import { StageClearData } from '../../types/rpg';
import { BunpouModule } from '../learning/BunpouModule';
import { KotobaModule } from '../learning/KotobaModule';
import { KanjiModule } from '../learning/KanjiModule';
import { DokkaiModule } from '../learning/DokkaiModule';
import { ChoukaiModule } from '../learning/ChoukaiModule';
import { BossBattleModule } from '../learning/BossBattleModule';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { getGranularStageProgress } from '../../utils/mastery';

interface StageHubViewProps {
  stage: Stage;
  stageProgress?: StageClearData;
  itemMastery?: Record<string, ItemMasteryRecord>;
  onBackToMap: () => void;
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
  const [activeModule, setActiveModule] = useState<'hub' | 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss'>('hub');
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Hardware Back Button Interceptor
  useBackButton(true, () => {
    if (activeModule === 'hub') {
      onBackToMap();
    } else {
      const isConfirmed = window.confirm('Keluar dari Ujian? Progress saat ini tidak akan tersimpan.');
      if (isConfirmed) {
        setActiveModule('hub');
      } else {
        return false; // Prevent back
      }
    }
  });

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
      className="rpg-btn rpg-btn-secondary text-xs gap-1.5 self-start mb-2"
    >
      <ArrowLeft className="w-4 h-4 text-amber-400" />
      <span>Kembali ke Gerbang Stage</span>
    </button>
  );

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
          onReward={(exp, gold, mod, itemId, score, total) => handleModuleReward('dokkai', exp, gold, itemId, score, total)}
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
          onReward={(exp, gold, mod, itemId, score, total) => handleModuleReward('choukai', exp, gold, itemId, score, total)}
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

  // Memoize boss battle questions so options do not reshuffle on render and correctIndex is properly synced
  const memoizedBossQuestions = React.useMemo(() => {
    if (activeModule !== 'boss') return [];

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
      stage.kotobaIds.slice(0, 2).forEach(id => {
        const kt = KOTOBA_DATABASE[id];
        if (kt) {
          const rawOpts = [kt.meaningId, 'Menunda pertemuan penting', 'Membuat hidangan tradisional', 'Membeli perbekalan'];
          const shuffledOpts = [...rawOpts].sort(() => 0.5 - Math.random());
          const correctIdx = shuffledOpts.indexOf(kt.meaningId);
          compiled.push({
            id: `boss_kt_${kt.id}`,
            category: 'kotoba',
            prompt: `Pilih arti yang tepat untuk kosakata: 「${kt.word}」 (${kt.reading})`,
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
        return <span className="rpg-badge bg-gold/15 text-gold border-gold/40">LEARNING</span>;
      default:
        return <span className="rpg-badge bg-surface-inset text-text-muted border-border-subtle">AVAILABLE</span>;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-6">
      {/* Top Header Briefing Card */}
      <div className="panel panel-stitched p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              playSound('click', soundEnabled);
              onBackToMap();
            }}
            className="btn btn-pill text-xs gap-1.5"
          >
            <ArrowLeft className="w-4 h-4 text-gold" />
            <span>Kembali ke Peta</span>
          </button>

          <div className="flex items-center gap-1 text-gold">
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
              <Sparkles className="w-3.5 h-3.5 text-gold" />
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

      {/* If it's a Boss Stage, show the Boss Encounter CTA banner */}
      {stage.isBoss && (
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => {
            playSound('attack', soundEnabled);
            setActiveModule('boss');
          }}
          className="rpg-card p-5 sm:p-6 border-2 border-wine-accent cursor-pointer text-center space-y-3 shadow-xl group transition-all"
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
              Kalahkan penguasa wilayah dengan evaluasi 5 pilar (Bunpou, Kotoba, Kanji, Dokkai, Choukai)!
            </p>
          </div>
          <button className="btn btn-cta bg-wine hover:brightness-110 text-white gap-2 shadow-lg">
            <Swords className="w-4 h-4" /> Masuki Arena Pertarungan Boss
          </button>
        </motion.div>
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
                className="panel p-4 sm:p-4.5 cursor-pointer flex items-center justify-between gap-4 transition-all shadow-md group hover:border-gold/50"
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
                    <span className="btn btn-pill py-1 px-2.5 text-xs text-emerald-400 gap-1 font-mono">
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
      </div>
    </div>
  );
};
