import React, { useState } from 'react';
import { X, Volume2, MapPin, GitBranch, Settings2 } from 'lucide-react';
import {
  ConjugationPattern,
  CONJUGATION_PATTERNS,
  getConnectorOrSubBranch,
} from '../../data/conjugationBank';
import { getSiblingSubBranches } from '../../data/bunpouSubKnowledge';
import { speakJapanese } from '../../utils/audio';

interface ConjugationSheetProps {
  patternId: string;
  type: 'conjugation' | 'connector';
  onClose: () => void;
}

/**
 * ConjugationSheet — Bottom-sheet modal that displays rich conjugation rules,
 * grammar connector explanations, and sub-formula branches (usage locations, conditions & examples).
 *
 * Consistent with the app's medieval dark stone/amber theme.
 */
export const ConjugationSheet: React.FC<ConjugationSheetProps> = ({
  patternId,
  type,
  onClose,
}) => {
  const [activeId, setActiveId] = useState<string>(patternId);

  const isConjugation = type === 'conjugation';
  const pattern: ConjugationPattern | undefined = isConjugation
    ? CONJUGATION_PATTERNS[activeId]
    : undefined;

  const connectorInfo = !isConjugation
    ? getConnectorOrSubBranch(activeId)
    : undefined;

  const subBranch = connectorInfo?.subBranch;
  const siblingBranches = !isConjugation ? getSiblingSubBranches(activeId) : [];

  if (!pattern && !connectorInfo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl panel bg-surface-card border-t border-x border-border-primary shadow-2xl animate-slide-up overflow-hidden max-h-[85vh] flex flex-col"
        style={{
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border-subtle shrink-0">
          <div className="space-y-0.5 flex-1 pr-2">
            {pattern ? (
              <>
                <h3 className="text-lg font-bold text-text-primary font-jp flex items-center gap-2">
                  <span className="text-indigo font-mono text-base">{pattern.symbol}</span>
                  <span className="text-text-muted">—</span>
                  <span>{pattern.nameJa}</span>
                </h3>
                <p className="text-xs text-indigo/80">
                  {pattern.nameId} / {pattern.nameEn}
                </p>
              </>
            ) : connectorInfo ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-indigo/15 border border-indigo/30 text-indigo text-xs font-mono font-bold">
                    Sub-Rumus
                  </span>
                  <h3 className="text-lg font-bold text-text-primary font-jp">
                    {connectorInfo.token}
                  </h3>
                </div>
                <p className="text-xs text-text-secondary line-clamp-1">
                  {connectorInfo.nameId}
                </p>
              </>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors border border-border-subtle shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sibling Sub-branches Quick Switcher */}
        {siblingBranches.length > 1 && (
          <div className="px-4 py-2.5 bg-surface-inset border-b border-border-subtle shrink-0 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo font-heading">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Cabang Rumus Terkait:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {siblingBranches.map((b) => {
                const isActive = b.id === activeId || b.token === connectorInfo?.token;
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveId(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border font-jp flex items-center gap-1 ${
                      isActive
                        ? 'bg-indigo/15 border-indigo text-indigo shadow-sm'
                        : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <span>{b.token}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          {/* Sub-branch Rich Presentation */}
          {subBranch ? (
            <div className="space-y-4">
              {/* Description & Meaning */}
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary font-heading">
                  📖 Fungsi & Nuansa
                </h4>
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                  {subBranch.meaning}
                </p>
              </div>

              {/* Lokasi Penggunaan */}
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo font-heading">
                  <MapPin className="w-4 h-4 text-indigo" />
                  <span>Lokasi & Posisi Penggunaan:</span>
                </div>
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed pl-5 font-medium">
                  {subBranch.usageLocation}
                </p>
              </div>

              {/* Kondisi Sambungan (Connection Rules) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo font-heading">
                  <Settings2 className="w-4 h-4" />
                  <span>Kondisi & Aturan Sambungan (接続)</span>
                </div>
                <div className="space-y-2">
                  {subBranch.connectionConditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-text-secondary text-[10px] font-bold">
                          {cond.partOfSpeech}
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo">
                          {cond.rule}
                        </span>
                      </div>
                      {cond.example && (
                        <p className="text-[11px] text-text-secondary pl-1">
                          Contoh: <span className="text-text-primary font-jp">{cond.example}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contoh Kalimat Khusus Sub Ini */}
              {subBranch.examples && subBranch.examples.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-heading">
                    💬 Contoh Kalimat untuk Sub Ini (例文)
                  </h4>
                  <div className="space-y-2">
                    {subBranch.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-start justify-between gap-2.5"
                      >
                        <div className="space-y-1 flex-1">
                          <p className="text-xs text-indigo/80 font-jp">
                            {ex.reading}
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-text-primary font-jp">
                            {ex.japanese}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {ex.meaningId}
                          </p>
                        </div>
                        <button
                          onClick={() => speakJapanese(ex.japanese)}
                          className="p-2 rounded-xl bg-surface-card hover:bg-surface-elevated text-indigo border border-border-subtle transition-colors shrink-0"
                          title="Dengarkan Suara"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : connectorInfo ? (
            /* Regular connector without sub-branch */
            <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle">
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {connectorInfo.description}
              </p>
            </div>
          ) : null}

          {/* Conjugation Table (only for conjugation patterns) */}
          {pattern && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle">
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {pattern.shortDescription}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo font-heading">
                  📐 Cara Pembentukan (Konjugasi)
                </h4>

                {/* Group I */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-[10px] font-bold border border-border-subtle">
                      Grup I
                    </span>
                    <span className="text-[10px] text-text-muted">五段動詞 / Godan</span>
                  </div>
                  <p className="text-xs text-text-primary font-jp whitespace-pre-line leading-relaxed">
                    {pattern.formation.groupI}
                  </p>
                </div>

                {/* Group II */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-[10px] font-bold border border-border-subtle">
                      Grup II
                    </span>
                    <span className="text-[10px] text-text-muted">一段動詞 / Ichidan</span>
                  </div>
                  <p className="text-xs text-text-primary font-jp whitespace-pre-line leading-relaxed">
                    {pattern.formation.groupII}
                  </p>
                </div>

                {/* Group III */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-[10px] font-bold border border-border-subtle">
                      Grup III
                    </span>
                    <span className="text-[10px] text-text-muted">不規則動詞 / Irregular</span>
                  </div>
                  <p className="text-xs text-text-primary font-jp whitespace-pre-line leading-relaxed">
                    {pattern.formation.groupIII}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom safe area + close hint */}
        <div className="p-3 pt-2 border-t border-border-subtle text-center shrink-0">
          <p className="text-[10px] text-text-muted">Ketuk di luar atau tombol ✕ untuk menutup</p>
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
