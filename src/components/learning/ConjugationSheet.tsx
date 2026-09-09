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
        className="w-full max-w-lg rounded-t-3xl bg-stone-900 border-t border-x border-amber-600/40 shadow-2xl animate-slide-up overflow-hidden max-h-[85vh] flex flex-col"
        style={{
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-stone-800 shrink-0">
          <div className="space-y-0.5 flex-1 pr-2">
            {pattern ? (
              <>
                <h3 className="text-lg font-bold text-stone-100 font-jp flex items-center gap-2">
                  <span className="text-amber-400 font-mono text-base">{pattern.symbol}</span>
                  <span className="text-stone-500">—</span>
                  <span>{pattern.nameJa}</span>
                </h3>
                <p className="text-xs text-amber-300/80">
                  {pattern.nameId} / {pattern.nameEn}
                </p>
              </>
            ) : connectorInfo ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                    Sub-Rumus
                  </span>
                  <h3 className="text-lg font-bold text-stone-100 font-jp">
                    {connectorInfo.token}
                  </h3>
                </div>
                <p className="text-xs text-stone-300 line-clamp-1">
                  {connectorInfo.nameId}
                </p>
              </>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 transition-colors border border-stone-700 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sibling Sub-branches Quick Switcher */}
        {siblingBranches.length > 1 && (
          <div className="px-4 py-2.5 bg-stone-950/80 border-b border-stone-800 shrink-0 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 font-medieval">
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
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
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
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-medieval">
                  📖 Fungsi & Nuansa
                </h4>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
                  {subBranch.meaning}
                </p>
              </div>

              {/* Lokasi Penggunaan */}
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-amber-600/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-medieval">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Lokasi & Posisi Penggunaan:</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-200 leading-relaxed pl-5 font-medium">
                  {subBranch.usageLocation}
                </p>
              </div>

              {/* Kondisi Sambungan (Connection Rules) */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 font-medieval">
                  <Settings2 className="w-4 h-4" />
                  <span>Kondisi & Aturan Sambungan (接続)</span>
                </div>
                <div className="space-y-2">
                  {subBranch.connectionConditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 text-[10px] font-bold">
                          {cond.partOfSpeech}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {cond.rule}
                        </span>
                      </div>
                      {cond.example && (
                        <p className="text-[11px] text-stone-400 pl-1">
                          Contoh: <span className="text-stone-300 font-jp">{cond.example}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contoh Kalimat Khusus Sub Ini */}
              {subBranch.examples && subBranch.examples.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 font-medieval">
                    💬 Contoh Kalimat untuk Sub Ini (例文)
                  </h4>
                  <div className="space-y-2">
                    {subBranch.examples.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-stone-950 border border-stone-800 flex items-start justify-between gap-2.5"
                      >
                        <div className="space-y-1 flex-1">
                          <p className="text-xs text-amber-400/80 font-jp">
                            {ex.reading}
                          </p>
                          <p className="text-xs sm:text-sm font-bold text-stone-100 font-jp">
                            {ex.japanese}
                          </p>
                          <p className="text-xs text-stone-300">
                            {ex.meaningId}
                          </p>
                        </div>
                        <button
                          onClick={() => speakJapanese(ex.japanese)}
                          className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 transition-colors shrink-0"
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
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {connectorInfo.description}
              </p>
            </div>
          ) : null}

          {/* Conjugation Table (only for conjugation patterns) */}
          {pattern && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800">
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  {pattern.shortDescription}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 font-medieval">
                  📐 Cara Pembentukan (Konjugasi)
                </h4>

                {/* Group I */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-900/50 text-blue-300 text-[10px] font-bold border border-blue-700/30">
                      Grup I
                    </span>
                    <span className="text-[10px] text-stone-500">五段動詞 / Godan</span>
                  </div>
                  <p className="text-xs text-stone-300 font-jp whitespace-pre-line leading-relaxed">
                    {pattern.formation.groupI}
                  </p>
                </div>

                {/* Group II */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-900/50 text-emerald-300 text-[10px] font-bold border border-emerald-700/30">
                      Grup II
                    </span>
                    <span className="text-[10px] text-stone-500">一段動詞 / Ichidan</span>
                  </div>
                  <p className="text-xs text-stone-300 font-jp whitespace-pre-line leading-relaxed">
                    {pattern.formation.groupII}
                  </p>
                </div>

                {/* Group III */}
                <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-purple-900/50 text-purple-300 text-[10px] font-bold border border-purple-700/30">
                      Grup III
                    </span>
                    <span className="text-[10px] text-stone-500">不規則動詞 / Irregular</span>
                  </div>
                  <p className="text-xs text-stone-300 font-jp whitespace-pre-line leading-relaxed">
                    {pattern.formation.groupIII}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom safe area + close hint */}
        <div className="p-3 pt-2 border-t border-stone-800 text-center shrink-0">
          <p className="text-[10px] text-stone-500">Ketuk di luar atau tombol ✕ untuk menutup</p>
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
