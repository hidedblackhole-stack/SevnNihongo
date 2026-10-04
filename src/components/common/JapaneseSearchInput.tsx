import React, { useState } from 'react';
import { Search, Languages, X } from 'lucide-react';
import { convertRomajiToKana } from '../../utils/imeEngine';
import { playSound } from '../../utils/audio';

interface JapaneseSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholderIme?: string;
  placeholderLatin?: string;
  soundEnabled?: boolean;
  autoFocus?: boolean;
  /** Kelas wadah (default: flex-1 agar mengisi baris filter). */
  className?: string;
  /** Kelas input; default = tampilan Library Kotoba/Bunpou. */
  inputClassName?: string;
}

const DEFAULT_INPUT_CLASS =
  'w-full pl-10 pr-20 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary transition-all shadow-inner font-medium font-jp';

/**
 * UI input pencarian materi Jepang (hanya tampilan). Logika pencarian ada di engine/search/universalSearch.
 * Toggle A / あ hanyalah alat bantu mengetik kana: pencarian romaji tetap bekerja di mode A.
 */
export const JapaneseSearchInput: React.FC<JapaneseSearchInputProps> = ({
  value,
  onChange,
  placeholderIme = 'Cari (romaji → kana)...',
  placeholderLatin = 'Cari kata, romaji, arti...',
  soundEnabled = true,
  autoFocus,
  className = 'flex-1',
  inputClassName = DEFAULT_INPUT_CLASS,
}) => {
  const [imeActive, setImeActive] = useState(true);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      <input
        type="text"
        placeholder={imeActive ? placeholderIme : placeholderLatin}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(imeActive ? convertRomajiToKana(raw) : raw);
        }}
        className={inputClassName}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="w-6 h-6 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card flex items-center justify-center transition-all cursor-pointer"
            title="Hapus pencarian"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            setImeActive(prev => !prev);
          }}
          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${
            imeActive
              ? 'bg-gold/20 text-gold border border-border-subtle shadow-xs'
              : 'bg-surface-card text-text-muted border border-border-subtle hover:text-text-primary'
          }`}
          title={imeActive ? 'IME Jepang Aktif (Romaji -> Kana)' : 'Mode Huruf Latin'}
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{imeActive ? 'あ' : 'A'}</span>
        </button>
      </div>
    </div>
  );
};
