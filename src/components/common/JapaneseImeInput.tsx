import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, CornerDownLeft, Languages } from 'lucide-react';
import { convertRomajiToKana, getHenkanCandidates, HenkanCandidate } from '../../utils/imeEngine';
import { playSound } from '../../utils/audio';

export interface JapaneseImeInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  contextWords?: string[];
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  soundEnabled?: boolean;
  showImeToggle?: boolean;
  isTextarea?: boolean;
  rows?: number;
}

export const JapaneseImeInput: React.FC<JapaneseImeInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ketik romaji/kana di sini...',
  contextWords = [],
  disabled = false,
  autoFocus = false,
  className = '',
  soundEnabled = true,
  showImeToggle = true,
  isTextarea = false,
  rows = 2,
}) => {
  const [imeActive, setImeActive] = useState<boolean>(true);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState<number>(0);
  const [showCandidates, setShowCandidates] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Extract the current "active word" at the cursor or the trailing token
  const activeWord = useMemo(() => {
    if (!value) return '';
    // Find trailing token separated by space or punctuation
    const matches = value.match(/([a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)$/);
    return matches ? matches[1] : '';
  }, [value]);

  // Candidates for the active token
  const candidates: HenkanCandidate[] = useMemo(() => {
    if (!imeActive || !activeWord) return [];
    return getHenkanCandidates(activeWord, contextWords);
  }, [imeActive, activeWord, contextWords]);

  useEffect(() => {
    setActiveCandidateIndex(0);
    setShowCandidates(candidates.length > 0 && focused);
  }, [candidates, focused]);

  const handleApplyCandidate = (cand: HenkanCandidate) => {
    if (!activeWord) return;
    playSound('click', soundEnabled);

    // Replace the trailing active word with the candidate text
    const beforeWord = value.slice(0, value.length - activeWord.length);
    const newValue = beforeWord + cand.text;
    onChange(newValue);
    setShowCandidates(false);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawVal = e.target.value;

    if (!imeActive) {
      onChange(rawVal);
      return;
    }

    // Convert romaji to kana in real-time
    const converted = convertRomajiToKana(rawVal);
    onChange(converted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Space bar: trigger Henkan or cycle candidates
    if (e.key === ' ' && imeActive && candidates.length > 0 && activeWord.length > 0) {
      e.preventDefault();
      if (!showCandidates) {
        setShowCandidates(true);
        setActiveCandidateIndex(0);
        // Automatically apply the first candidate
        handleApplyCandidate(candidates[0]);
      } else {
        // Cycle to next candidate
        const nextIdx = (activeCandidateIndex + 1) % candidates.length;
        setActiveCandidateIndex(nextIdx);
        handleApplyCandidate(candidates[nextIdx]);
      }
      return;
    }

    // Enter key
    if (e.key === 'Enter') {
      if (showCandidates && candidates[activeCandidateIndex]) {
        e.preventDefault();
        handleApplyCandidate(candidates[activeCandidateIndex]);
        setShowCandidates(false);
        return;
      }

      if (onSubmit && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
        return;
      }
    }

    // Escape: close candidate bar
    if (e.key === 'Escape' && showCandidates) {
      e.preventDefault();
      setShowCandidates(false);
      return;
    }

    // Number keys 1-9 while candidate dropdown is active
    if (showCandidates && /^[1-9]$/.test(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < candidates.length) {
        e.preventDefault();
        handleApplyCandidate(candidates[idx]);
        return;
      }
    }

    // Tab key: cycle candidate
    if (e.key === 'Tab' && showCandidates && candidates.length > 0) {
      e.preventDefault();
      const nextIdx = (activeCandidateIndex + 1) % candidates.length;
      setActiveCandidateIndex(nextIdx);
      handleApplyCandidate(candidates[nextIdx]);
    }
  };

  return (
    <div className="relative w-full space-y-1.5">
      <div
        className={`relative flex items-center rounded-2xl bg-surface-inset border transition-all ${
          focused
            ? 'border-gold/60 shadow-[0_0_12px_rgba(240,190,82,0.2),inset_2px_2px_5px_var(--neu-d)]'
            : 'border-border-subtle shadow-[inset_2px_2px_5px_var(--neu-d),inset_-1px_-1px_3px_var(--neu-l)]'
        }`}
      >
        {/* Input / Textarea Element */}
        {isTextarea ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              // Slight timeout so click on candidate bar registers before blur closes it
              setTimeout(() => setFocused(false), 200);
            }}
            className={`w-full bg-transparent px-4 py-3 text-sm sm:text-base font-jp font-medium text-text-primary placeholder:text-text-muted placeholder:font-body outline-hidden resize-none ${className}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setTimeout(() => setFocused(false), 200);
            }}
            className={`w-full bg-transparent px-4 py-3 text-sm sm:text-base font-jp font-medium text-text-primary placeholder:text-text-muted placeholder:font-body outline-hidden ${className}`}
          />
        )}

        {/* Right Action Icons (IME Toggle & Commit Hint) */}
        <div className="flex items-center gap-1.5 pr-3 shrink-0">
          {showImeToggle && (
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                setImeActive(prev => !prev);
                if (inputRef.current) inputRef.current.focus();
              }}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
                imeActive
                  ? 'bg-gold/20 text-gold border border-gold/40 shadow-xs'
                  : 'bg-surface-card text-text-muted border border-border-subtle hover:text-text-primary'
              }`}
              title={imeActive ? 'IME Jepang Aktif (Romaji -> Kana)' : 'Mode Huruf Latin'}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{imeActive ? 'あ' : 'A'}</span>
            </button>
          )}

          {onSubmit && value.trim().length > 0 && (
            <button
              type="button"
              onClick={onSubmit}
              className="w-7 h-7 rounded-lg bg-surface-card hover:bg-gold/20 text-text-muted hover:text-gold border border-border-subtle flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Kirim Kalimat (Enter)"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Henkan Candidate Bar */}
      {showCandidates && candidates.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap p-1.5 bg-surface-card border border-gold/40 rounded-xl shadow-[3px_3px_10px_var(--neu-d),0_0_12px_rgba(240,190,82,0.15)] animate-fade-in z-20">
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-text-muted px-1.5 shrink-0">
            <Sparkles className="w-3 h-3 text-gold" />
            <span>Henkan (変換):</span>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {candidates.slice(0, 5).map((cand, idx) => {
              const isSelected = idx === activeCandidateIndex;
              return (
                <button
                  key={`${cand.text}-${idx}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleApplyCandidate(cand);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-jp font-bold flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                    isSelected
                      ? 'bg-gold text-surface-base border border-gold font-black shadow-xs'
                      : 'bg-surface-inset hover:bg-surface-elevated text-text-primary border border-border-subtle hover:border-gold/30'
                  }`}
                >
                  <span className={`text-[10px] font-mono ${isSelected ? 'opacity-80' : 'text-text-muted'}`}>
                    {idx + 1}.
                  </span>
                  <span>{cand.text}</span>
                  {cand.label && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-semibold ${
                      isSelected ? 'bg-surface-base/20 text-surface-base' : 'bg-surface-card text-text-muted'
                    }`}>
                      {cand.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <span className="text-[10px] font-mono text-text-muted ml-auto pr-1 hidden sm:inline-block">
            Tekan <kbd className="px-1 py-0.5 rounded bg-surface-inset border border-border-subtle">Space</kbd> untuk Henkan
          </span>
        </div>
      )}
    </div>
  );
};
