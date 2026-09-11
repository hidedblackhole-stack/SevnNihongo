import React, { useState } from 'react';
import { X, Volume2, HelpCircle, GitBranch, MapPin, Settings2, Swords, Bookmark } from 'lucide-react';
import { BunpouItem } from '../../types/content';
import { FormulaDisplay } from '../learning/FormulaDisplay';
import { RubyText } from '../learning/RubyText';
import { speakJapanese, playSound } from '../../utils/audio';

interface BunpouDetailModalProps {
  item: BunpouItem;
  onClose: () => void;
  soundEnabled?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export const BunpouDetailModal: React.FC<BunpouDetailModalProps> = ({
  item,
  onClose,
  soundEnabled = true,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);
  const subBranches = item.subFormulas || [];
  const currentSub = subBranches[activeSubIndex] || subBranches[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-ground/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel w-full max-w-2xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border-subtle flex items-start justify-between gap-3 shrink-0 bg-surface-inset">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-xs font-mono font-bold border border-border-subtle shadow-sm">
                {item.baseLevel ? `Fondasi ${item.baseLevel}` : `Level ${item.level}`}
              </span>
              {item.functions && item.functions.map((fn, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded-lg bg-surface-card text-text-secondary text-[11px] font-jp font-semibold border border-border-subtle">
                  {fn}
                </span>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
              {item.title}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-text-secondary">
              {item.meaningId}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => {
                  onToggleBookmark();
                  playSound('click', soundEnabled);
                }}
                className={`p-2 rounded-2xl border transition-all ${
                  isBookmarked
                    ? 'bg-surface-elevated text-gold border-gold/40 ring-1 ring-gold/30'
                    : 'bg-surface-card border-border-subtle text-text-muted hover:text-gold'
                }`}
                title={isBookmarked ? 'Tersimpan di Buku Saku' : 'Simpan ke Buku Saku'}
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-gold text-gold' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-surface-card hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors border border-border-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          {/* Explanation */}
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 font-heading">
              <HelpCircle className="w-3.5 h-3.5 text-gold" />
              Penjelasan Pola
            </h4>
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
              {item.explanation}
            </p>
          </div>

          {/* Nuansa & Kata Terkait */}
          {(item.nuance || (item.relatedKeywords && item.relatedKeywords.length > 0)) && (
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5">
              {item.nuance && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gold font-heading">
                    Nuansa Pemakaian (ニュアンス)
                  </span>
                  <p className="text-xs sm:text-sm text-text-primary leading-relaxed pl-1">
                    {item.nuance}
                  </p>
                </div>
              )}
              {item.relatedKeywords && item.relatedKeywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle">
                  <span className="text-[10px] font-bold text-text-muted font-heading mr-1">
                    Kata Terkait / Kolokasi Kunci:
                  </span>
                  {item.relatedKeywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-gold text-xs font-jp font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Formula */}
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gold font-heading">
              📐 Rumus Pembentukan (Formula)
            </h4>
            <FormulaDisplay formula={item.formula} />
          </div>

          {/* Cabang Rumus & Kondisi Penggunaan */}
          {subBranches.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle space-y-3.5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-gold/15 text-gold">
                    <GitBranch className="w-4 h-4" />
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                    Cabang Rumus & Kondisi Sambungan
                  </h4>
                </div>

                {subBranches.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {subBranches.map((sub, idx) => {
                      const isSelected = activeSubIndex === idx;
                      return (
                        <button
                          key={sub.id || idx}
                          onClick={() => {
                            setActiveSubIndex(idx);
                            playSound('click', soundEnabled);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border font-jp flex items-center gap-1 ${
                            isSelected
                              ? 'bg-surface-elevated text-text-primary border-border-primary shadow-sm font-black'
                              : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-strong'
                          }`}
                        >
                          <span>{sub.token}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {currentSub && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-surface-card border border-border-subtle flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading">
                        Lokasi & Posisi Penggunaan:
                      </span>
                      <p className="text-xs sm:text-sm text-text-primary font-medium leading-relaxed">
                        {currentSub.usageLocation}
                      </p>
                    </div>
                  </div>

                  {currentSub.connectionConditions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1 font-heading">
                        <Settings2 className="w-3.5 h-3.5 text-gold" />
                        Aturan Perubahan Kata (接続):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentSub.connectionConditions.map((cond, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2.5 rounded-xl bg-surface-card border border-border-subtle space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded-md bg-surface-inset text-[10px] font-bold text-gold border border-border-subtle">
                                {cond.partOfSpeech}
                              </span>
                              <span className="text-xs font-mono font-bold text-text-primary">
                                {cond.rule}
                              </span>
                            </div>
                            {cond.example && (
                              <p className="text-[11px] text-text-secondary font-jp pl-1">
                                Contoh: <span className="text-text-primary font-bold">{cond.example}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Perbedaan Pola Mirip */}
          {item.comparisonNotes && item.comparisonNotes.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-indigo/30 space-y-3 shadow-md">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <span className="p-1.5 rounded-lg bg-indigo/15 text-indigo">
                  <Swords className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-indigo font-heading">
                    Perbedaan dengan Pola Mirip (使い分け)
                  </h4>
                  <p className="text-[11px] text-text-muted">
                    Pahami perbedaannya agar tidak terkecoh oleh pilihan jebakan di ujian JLPT
                  </p>
                </div>
              </div>

              <div className="space-y-2">
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
              {item.examples.map((example, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <p className="text-sm sm:text-base font-bold text-text-primary">
                      <RubyText
                        japanese={example.japanese}
                        reading={example.reading}
                        showFurigana={true}
                      />
                    </p>
                    <p className="text-xs text-text-secondary">
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
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle flex items-center justify-end shrink-0 bg-surface-inset">
          <button
            onClick={onClose}
            className="btn-cta px-5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
