import React, { useCallback, useSyncExternalStore } from 'react';
import { activeWordIndex, type TimedWord } from '../../engine/textStudy/wordTiming';
import { RubyText } from '../learning/RubyText';

/** Penyimpanan waktu pemutar: hanya pelanggan yang indeks katanya berubah yang dirender ulang. */
export interface TimeStore {
  get(): number;
  set(ms: number): void;
  subscribe(listener: () => void): () => void;
}

export function createTimeStore(): TimeStore {
  let ms = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => ms,
    set: next => {
      ms = next;
      listeners.forEach(l => l());
    },
    subscribe: l => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

interface Props {
  words: TimedWord[];
  store: TimeStore;
  showFurigana: boolean;
  className?: string;
}

/** Kalimat dengan sorotan kata demi kata: sudah lewat = terang, sedang diucapkan = emas, belum = redup. */
export const KaraokeLine: React.FC<Props> = ({ words, store, showFurigana, className = '' }) => {
  const activeIdx = useSyncExternalStore(
    store.subscribe,
    useCallback(() => activeWordIndex(words, store.get()), [words, store])
  );

  return (
    <span className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          className={i < activeIdx ? 'text-text-primary' : i === activeIdx ? 'text-gold' : 'text-text-muted'}
        >
          <RubyText japanese={w.text} showFurigana={showFurigana} />
        </span>
      ))}
    </span>
  );
};
