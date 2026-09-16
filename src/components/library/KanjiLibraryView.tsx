import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, BookOpen, Volume2, Bookmark, Languages, X } from 'lucide-react';
import { KANJI_DATABASE } from '../../data/kanji';
import { KanjiItem, ItemMasteryRecord } from '../../types/content';
import { KanjiDetailModal } from './KanjiDetailModal';
import { playSound, speakJapanese } from '../../utils/audio';
import { UserDeck } from '../../types/rpg';
import { isItemBookmarked } from '../../utils/decks';
import { convertRomajiToKana, matchJapaneseQuery } from '../../utils/imeEngine';

const SUUJI_CHARACTERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '零'];

const HIRAGANA_ORDER = [
  'あ','い','う','え','お',
  'か','き','く','け','こ',
  'さ','し','す','せ','そ',
  'た','ち','つ','て','と',
  'な','に','ぬ','ね','の',
  'は','ひ','ふ','へ','ほ',
  'ま','み','む','め','も',
  'や','ゆ','よ',
  'ら','り','る','れ','ろ',
  'わ','を','ん'
];

const KATAKANA_ORDER = [
  'ア','イ','ウ','エ','オ',
  'カ','キ','ク','ケ','コ',
  'サ','シ','ス','セ','ソ',
  'タ','チ','ツ','テ','ト',
  'ナ','ニ','ヌ','ネ','ノ',
  'ハ','ヒ','フ','ヘ','ホ',
  'マ','ミ','ム','メ','モ',
  'ヤ','ユ','ヨ',
  'ラ','リ','ル','レ','ロ',
  'ワ','ヲ','ン'
];

const getKanaRowLabel = (char: string): string => {
  if (['あ','い','う','え','お','ア','イ','ウ','エ','オ'].includes(char)) return 'Baris A (Vokal)';
  if (['か','き','く','け','こ','カ','キ','ク','ケ','コ'].includes(char)) return 'Baris Ka (k-)';
  if (['さ','し','す','せ','そ','サ','シ','ス','セ','ソ'].includes(char)) return 'Baris Sa (s-)';
  if (['た','ち','つ','て','と','タ','チ','ツ','テ','ト'].includes(char)) return 'Baris Ta (t-)';
  if (['な','に','ぬ','ね','の','ナ','ニ','ヌ','ネ','ノ'].includes(char)) return 'Baris Na (n-)';
  if (['は','ひ','ふ','へ','ほ','ハ','ヒ','フ','ヘ','ホ'].includes(char)) return 'Baris Ha (h-)';
  if (['ま','み','む','め','も','マ','ミ','ム','メ','モ'].includes(char)) return 'Baris Ma (m-)';
  if (['や','ゆ','よ','ヤ','ユ','ヨ'].includes(char)) return 'Baris Ya (y-)';
  if (['ら','り','る','れ','ろ','ラ','リ','ル','レ','ロ'].includes(char)) return 'Baris Ra (r-)';
  if (['わ','を','ん','ワ','ヲ','ン'].includes(char)) return 'Baris Wa (w-/n)';
  return 'Aksara Kana';
};


const LEVEL_OPTIONS = [
  { value: 'all', label: 'Semua Aksara' },
  { value: 'KANA', label: 'KANA (Dasar)' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
  { value: 'N2', label: 'N2' },
  { value: 'N1', label: 'N1' },
];

const KANA_CATEGORIES = [
  { value: 'all', label: 'Semua (Kana & Angka)' },
  { value: 'hiragana', label: 'Hiragana (46)' },
  { value: 'katakana', label: 'Katakana (46)' },
  { value: 'suuji', label: 'Angka (14)' },
];

interface KanjiLibraryViewProps {
  soundEnabled?: boolean;
  itemMastery?: Record<string, ItemMasteryRecord>;
  userDecks?: UserDeck[];
  onToggleBookmark?: (id: string, category: 'kanji', notes?: string, targetDeckId?: string) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordStudy?: (category: 'kanjiWriting', id: string, count?: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success?: boolean
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

export const KanjiLibraryView: React.FC<KanjiLibraryViewProps> = ({
  soundEnabled = true,
  itemMastery,
  userDecks,
  onToggleBookmark,
  onRewardPlayer,
  onRecordStudy,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [imeActive, setImeActive] = useState(true);
  const [visibleCount, setVisibleCount] = useState(48);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [kanaCategory, setKanaCategory] = useState<'all' | 'hiragana' | 'katakana' | 'suuji'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedKanji, setSelectedKanji] = useState<KanjiItem | null>(null);

  const suujiSet = useMemo(() => new Set(SUUJI_CHARACTERS), []);

  // De-duplicate kanji database (since it has both id and character keys)
  const allKanji = useMemo(() => {
    const seen = new Set<string>();
    const list: KanjiItem[] = [];
    for (const item of Object.values(KANJI_DATABASE)) {
      if (item && item.character && !seen.has(item.character)) {
        seen.add(item.character);
        list.push(item);
      }
    }
    return list;
  }, []);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allKanji.length,
      KANA: 0,
      N5: 0,
      N4: 0,
      N3: 0,
      N2: 0,
      N1: 0,
      kana_hiragana: 0,
      kana_katakana: 0,
      kana_suuji: 0,
    };

    for (const item of allKanji) {
      const lvl = item.jlpt || 'N3';
      const isHira = item.radical === 'Hiragana' || (lvl === 'KANA' && item.character >= 'ぁ' && item.character <= 'ん');
      const isKata = item.radical === 'Katakana' || (lvl === 'KANA' && item.character >= 'ァ' && item.character <= 'ン');
      const isNum = suujiSet.has(item.character);

      if (isHira) counts.kana_hiragana++;
      if (isKata) counts.kana_katakana++;
      if (isNum) counts.kana_suuji++;

      if (isHira || isKata || isNum) {
        counts.KANA++;
      }

      if (counts[lvl] !== undefined && lvl !== 'KANA') {
        counts[lvl]++;
      }
    }
    return counts;
  }, [allKanji, suujiSet]);

  const filteredKanji = useMemo(() => {
    const filtered = allKanji.filter((item) => {
      // 1. Level Filter
      if (levelFilter === 'KANA') {
        const isHiragana = HIRAGANA_ORDER.includes(item.character);
        const isKatakana = KATAKANA_ORDER.includes(item.character);
        const isSuuji = suujiSet.has(item.character);

        if (!isHiragana && !isKatakana && !isSuuji) return false;

        // Sub-filter inside KANA
        if (kanaCategory === 'hiragana' && !isHiragana) return false;
        if (kanaCategory === 'katakana' && !isKatakana) return false;
        if (kanaCategory === 'suuji' && !isSuuji) return false;
      } else if (levelFilter !== 'all') {
        if ((item.jlpt || 'N3') !== levelFilter) return false;
      }

      // 2. Search Query (Supports Romaji, Kana, Onyomi, Kunyomi, Meaning)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const charMatch = matchJapaneseQuery(q, [item.character]);
      const meaningMatch = item.meaningId?.toLowerCase().includes(q) || item.meaningEn?.toLowerCase().includes(q);
      const radicalMatch = matchJapaneseQuery(q, [item.radical, item.radicalName]);
      const onyomiMatch = item.onyomi?.some(on => matchJapaneseQuery(q, [on]));
      const kunyomiMatch = item.kunyomi?.some(kun => matchJapaneseQuery(q, [kun]));

      return charMatch || meaningMatch || radicalMatch || onyomiMatch || kunyomiMatch;
    });

    // Sort KANA neatly by official order
    if (levelFilter === 'KANA') {
      const getKanaRank = (item: KanjiItem) => {
        const char = item.character;
        const hIdx = HIRAGANA_ORDER.indexOf(char);
        if (hIdx !== -1) return 100 + hIdx;
        const kIdx = KATAKANA_ORDER.indexOf(char);
        if (kIdx !== -1) return 200 + kIdx;
        const sIdx = SUUJI_CHARACTERS.indexOf(char);
        if (sIdx !== -1) return 300 + sIdx;
        return 999;
      };
      return [...filtered].sort((a, b) => getKanaRank(a) - getKanaRank(b));
    }

    return filtered;
  }, [allKanji, levelFilter, kanaCategory, searchQuery, suujiSet]);

  const displayedKanji = filteredKanji.slice(0, visibleCount);

  const selectedIndex = useMemo(() => {
    if (!selectedKanji) return -1;
    return filteredKanji.findIndex(
      k => (k.id || k.character) === (selectedKanji.id || selectedKanji.character)
    );
  }, [selectedKanji, filteredKanji]);

  const hasNext = selectedIndex >= 0 && selectedIndex < filteredKanji.length - 1;
  const hasPrev = selectedIndex > 0;

  const handleNextKanji = () => {
    if (hasNext) {
      if (selectedIndex + 1 >= visibleCount) {
        setVisibleCount(prev => Math.min(prev + 48, filteredKanji.length));
      }
      setSelectedKanji(filteredKanji[selectedIndex + 1]);
    }
  };

  const handlePrevKanji = () => {
    if (hasPrev) {
      setSelectedKanji(filteredKanji[selectedIndex - 1]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Level Filters Toolbar */}
      <div className="panel p-4 sm:p-5 rounded-2xl border border-border-subtle shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input with Japanese IME Toggle */}
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const raw = e.target.value;
                const converted = imeActive ? convertRomajiToKana(raw) : raw;
                setSearchQuery(converted);
                setVisibleCount(48);
              }}
              placeholder={imeActive ? "Cari kanji/kana (ketik romaji otomatis jadi kana)..." : "Cari kanji, kana, angka, arti, onyomi, kunyomi..."}
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-surface-inset border border-border-subtle text-text-primary placeholder:text-text-muted text-sm font-medium focus:outline-hidden focus:border-border-muted font-jp"
            />

            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
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
                    ? 'bg-gold/20 text-gold border border-gold/40 shadow-xs'
                    : 'bg-surface-card text-text-muted border border-border-subtle hover:text-text-primary'
                }`}
                title={imeActive ? 'IME Jepang Aktif (Romaji -> Kana)' : 'Mode Huruf Latin'}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{imeActive ? 'あ' : 'A'}</span>
              </button>
            </div>
          </div>

          {/* Level Dropdown for Mobile / Desktop */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-surface-inset border border-border-subtle text-text-primary text-sm font-bold flex items-center justify-between gap-3 hover:border-border-muted transition-colors"
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-muted" />
                Level: {LEVEL_OPTIONS.find(o => o.value === levelFilter)?.label || levelFilter}
              </span>
              <ChevronDown className="w-4 h-4 text-text-muted" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 panel py-1.5 rounded-xl shadow-xl border border-border-subtle z-30 space-y-0.5">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setLevelFilter(opt.value);
                      setIsDropdownOpen(false);
                      setVisibleCount(48);
                      playSound('click', soundEnabled);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors ${
                      levelFilter === opt.value
                        ? 'bg-surface-inset font-bold text-wine-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-inset/60'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className="font-mono text-[10px] opacity-60">
                      {levelCounts[opt.value] || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Level Quick Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {LEVEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLevelFilter(opt.value);
                setVisibleCount(48);
                playSound('click', soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                levelFilter === opt.value
                  ? 'bg-surface-inset border border-wine-accent/40 text-wine-accent font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-inset/60 border border-transparent'
              }`}
            >
              <span>{opt.label}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-card border border-border-subtle/50 opacity-80">
                {levelCounts[opt.value] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Subcategory Filter Tabs when KANA is selected */}
        {levelFilter === 'KANA' && (
          <div className="flex items-center gap-2 pt-2 border-t border-border-subtle overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-text-muted uppercase font-mono shrink-0">
              Kategori KANA:
            </span>
            {KANA_CATEGORIES.map((cat) => {
              const count =
                cat.value === 'all'
                  ? levelCounts.KANA
                  : cat.value === 'hiragana'
                    ? levelCounts.kana_hiragana
                    : cat.value === 'katakana'
                      ? levelCounts.kana_katakana
                      : levelCounts.kana_suuji;
              return (
                <button
                  key={cat.value}
                  onClick={() => {
                    setKanaCategory(cat.value as any);
                    setVisibleCount(48);
                    playSound('click', soundEnabled);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all ${
                    kanaCategory === cat.value
                      ? 'bg-wine-accent text-white font-bold shadow-sm'
                      : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle'
                  }`}
                >
                  <span>{cat.label.split(' ')[0]}</span>
                  <span className="font-mono text-[10px] opacity-80">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Meta */}
      <div className="flex items-center justify-between px-1 text-xs text-text-muted font-mono">
        <span>
          Menampilkan {Math.min(displayedKanji.length, filteredKanji.length)} dari {filteredKanji.length} Aksara
        </span>
        {searchQuery && (
          <span>Pencarian: &quot;{searchQuery}&quot;</span>
        )}
      </div>

      {/* Kanji & Kana Cards Grid */}
      {displayedKanji.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {displayedKanji.map((item) => {
            const isHira = item.radical === 'Hiragana' || (item.jlpt === 'KANA' && item.character >= 'ぁ' && item.character <= 'ん');
            const isKata = item.radical === 'Katakana' || (item.jlpt === 'KANA' && item.character >= 'ァ' && item.character <= 'ン');
            const isNum = suujiSet.has(item.character);

            const badgeLabel = isHira ? 'Hiragana' : isKata ? 'Katakana' : isNum ? 'Angka' : item.jlpt || 'N3';
            const badgeColor = isHira
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : isKata
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                : isNum
                  ? 'bg-indigo/15 text-indigo dark:text-indigo-soft border-indigo/30'
                  : 'bg-surface-inset text-text-primary border-border-subtle';

            return (
              <div
                key={item.character}
                onClick={() => {
                  setSelectedKanji(item);
                  playSound('click', soundEnabled);
                }}
                className="group panel p-3.5 sm:p-4 rounded-2xl border border-border-subtle hover:border-border-muted transition-all cursor-pointer flex flex-col items-center justify-between text-center space-y-3 hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Top Badges */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono text-text-muted gap-1">
                  <span className={`px-1.5 py-0.5 rounded-md font-bold border text-[9.5px] tracking-wide whitespace-nowrap shrink-0 leading-none ${badgeColor}`}>
                    {badgeLabel}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="whitespace-nowrap">{item.strokeCount}画</span>
                    {onToggleBookmark && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(item.id || item.character, 'kanji');
                          playSound('click', soundEnabled);
                        }}
                        className={`p-1 rounded-md border transition-all ${
                          isItemBookmarked(userDecks, item.id || item.character, 'kanji')
                            ? 'bg-surface-elevated text-gold border-gold/40 ring-1 ring-gold/30'
                            : 'bg-surface-inset text-text-muted hover:text-gold border-border-subtle'
                        }`}
                        title={isItemBookmarked(userDecks, item.id || item.character, 'kanji') ? 'Tersimpan di Buku Saku' : 'Simpan ke Buku Saku'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isItemBookmarked(userDecks, item.id || item.character, 'kanji') ? 'fill-gold text-gold' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Giant Character Frame */}
                <div className="w-16 h-16 rounded-2xl bg-surface-inset flex items-center justify-center border border-border-subtle group-hover:border-wine-accent/40 transition-colors">
                  <span className="text-4xl font-jp font-bold text-text-primary select-none group-hover:scale-105 transition-transform">
                    {item.character}
                  </span>
                </div>

                {/* Meaning & Readings */}
                <div className="w-full space-y-0.5">
                  <h4
                    className="text-xs font-bold text-text-primary truncate font-heading"
                    title={item.meaningId}
                  >
                    {isHira || isKata
                      ? `Huruf 「${item.character}」`
                      : item.meaningId}
                  </h4>
                  <div className="text-[11px] text-text-muted font-mono truncate">
                    {isHira || isKata
                      ? `Romaji: ${(item.kunyomi?.[0] || item.onyomi?.[0] || '-').toLowerCase()}`
                      : (item.onyomi?.[0] ? item.onyomi[0].split(' ')[0] : item.kunyomi?.[0]?.split(' ')[0] || '-')}
                  </div>
                </div>

                {/* Category / Radical Tag */}
                <span className="text-[9.5px] text-text-secondary font-medium px-2 py-0.5 rounded-md bg-surface-inset/70 border border-border-subtle truncate max-w-full whitespace-nowrap">
                  {isHira || isKata
                    ? getKanaRowLabel(item.character)
                    : isNum
                      ? 'Angka / Sūji'
                      : (item.radical ? `Radikal: ${item.radical}` : (item.jlpt || 'Kanji'))}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center panel rounded-2xl border border-border-subtle space-y-3">
          <BookOpen className="w-10 h-10 text-text-muted mx-auto opacity-50" />
          <h3 className="text-base font-bold text-text-primary">Tidak Ada Aksara Ditemukan</h3>
          <p className="text-xs text-text-secondary">Coba ubah kata kunci pencarian atau filter kategori aksara.</p>
        </div>
      )}

      {/* Load More Button */}
      {visibleCount < filteredKanji.length && (
        <div className="text-center pt-4">
          <button
            onClick={() => {
              setVisibleCount(prev => prev + 48);
              playSound('click', soundEnabled);
            }}
            className="px-6 py-2.5 rounded-2xl bg-surface-inset border border-border-subtle hover:border-border-muted text-xs font-bold font-mono uppercase tracking-wider text-text-primary hover:shadow-sm transition-all"
          >
            Muat Lebih Banyak ({filteredKanji.length - visibleCount} Tersisa)
          </button>
        </div>
      )}

      {/* Detail & Writing Modal */}
      <KanjiDetailModal
        isOpen={Boolean(selectedKanji)}
        onClose={() => setSelectedKanji(null)}
        item={selectedKanji}
        masteryRecord={selectedKanji ? itemMastery?.[selectedKanji.id || selectedKanji.character] : undefined}
        soundEnabled={soundEnabled}
        isBookmarked={Boolean(selectedKanji && isItemBookmarked(userDecks, selectedKanji.id || selectedKanji.character, 'kanji'))}
        onToggleBookmark={onToggleBookmark && selectedKanji ? () => onToggleBookmark(selectedKanji.id || selectedKanji.character, 'kanji') : undefined}
        userDecks={userDecks}
        onToggleDeckItem={onToggleBookmark && selectedKanji ? (deckId) => onToggleBookmark(selectedKanji.id || selectedKanji.character, 'kanji', undefined, deckId) : undefined}
        onCompleteSheet={(sheet, score, reward) => {
          if (!selectedKanji) return;
          const exp = reward?.expGained ?? 15;
          const gold = reward?.goldGained ?? 5;
          const kanjiId = selectedKanji.id || selectedKanji.character;
          if (onRecordInteraction) {
            onRecordInteraction(kanjiId, 'kanji', 'writing', score >= 60);
          }
          if (onCompleteStudyItem) {
            onCompleteStudyItem('kanji', exp, gold, kanjiId, score >= 60 ? 1 : 0, 1);
          } else {
            onRewardPlayer?.(exp, gold);
            onRecordStudy?.('kanjiWriting', kanjiId, 1);
          }
        }}
        onNext={handleNextKanji}
        onPrev={handlePrevKanji}
        hasNext={hasNext}
        hasPrev={hasPrev}
      />
    </div>
  );
};
