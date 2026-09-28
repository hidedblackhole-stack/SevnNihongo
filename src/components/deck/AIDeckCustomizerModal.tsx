import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Copy, ExternalLink, Check, RefreshCw, AlertCircle, BookOpen, Layers } from 'lucide-react';
import { DeckType, UserDeck } from '../../types/rpg';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import {
  buildGeminiDeckPrompt,
  parseGeminiDeckJson,
  convertAiDeckToUserDeck,
  ParsedAiDeck,
} from '../../utils/aiDeckPrompt';

const TOPIC_SUGGESTIONS = [
  { label: '🍱 Kuliner & Restoran', topic: 'Kosakata dan percakapan memesan makanan di izakaya & restoran Jepang' },
  { label: '🛒 Konbini & Belanja', topic: 'Kosakata belanja, menanyakan barang, dan transaksi di minimarket konbini' },
  { label: '💼 Kerja & Kantor N3/N2', topic: 'Istilah bisnis, sopan santun kantor, dan percakapan antar rekan kerja' },
  { label: '🎮 Game RPG & Fantasi', topic: 'Istilah status game, petualangan, sihir, dan pertempuran RPG Jepang' },
  { label: '🏥 Rumah Sakit & Gejala', topic: 'Kosakata bagian tubuh, gejala penyakit, dan konsultasi ke dokter di Jepang' },
  { label: '🌸 Musim & Cuaca', topic: 'Kosakata empat musim, fenomena alam, dan prakiraan cuaca di Jepang' },
];

const JLPT_LEVELS = [
  { id: 'N5', label: 'N5 (Pemula)' },
  { id: 'N4', label: 'N4 (Dasar)' },
  { id: 'N3', label: 'N3 (Menengah)' },
  { id: 'N2', label: 'N2 (Mahir)' },
  { id: 'N1', label: 'N1 (Pakar)' },
  { id: 'ALL', label: 'Semua Level' },
];

const DECK_TYPES: { type: DeckType; label: string; desc: string }[] = [
  { type: 'mixed', label: 'Campuran', desc: 'Kosakata, kanji, dan pola kalimat' },
  { type: 'kotoba', label: 'Kosakata', desc: 'Fokus kata benda, kerja, sifat' },
  { type: 'kanji', label: 'Kanji & Karakter', desc: 'Fokus aksara, onyomi, kunyomi' },
  { type: 'bunpou', label: 'Tata Bahasa', desc: 'Fokus pola kalimat dan rumus' },
];

const ITEM_COUNTS = [5, 10, 15, 20];

interface AIDeckCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDeck: (newDeck: UserDeck) => void;
  soundEnabled?: boolean;
}

export const AIDeckCustomizerModal: React.FC<AIDeckCustomizerModalProps> = ({
  isOpen,
  onClose,
  onSaveDeck,
  soundEnabled = true,
}) => {
  useBackButton(isOpen, onClose, 'ai_deck_customizer_modal');

  // Step 1: Prompt parameters
  const [topic, setTopic] = useState('Kosakata dan percakapan memesan makanan di izakaya & restoran Jepang');
  const [level, setLevel] = useState('N4');
  const [type, setType] = useState<DeckType>('kotoba');
  const [count, setCount] = useState<number>(10);

  // Clipboard & Interaction feedback
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');

  // Step 2: JSON Import
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewDeck, setPreviewDeck] = useState<ParsedAiDeck | null>(null);

  // Generate live prompt
  const generatedPrompt = useMemo(() => {
    return buildGeminiDeckPrompt({
      topic: topic.trim() || 'Kosakata bahasa Jepang sehari-hari',
      level,
      type,
      count,
    });
  }, [topic, level, type, count]);

  // Handle parsing live when rawJsonInput changes
  React.useEffect(() => {
    if (!rawJsonInput.trim()) {
      setParseError(null);
      setPreviewDeck(null);
      return;
    }

    const res = parseGeminiDeckJson(rawJsonInput);
    if (res.success && res.deck) {
      setPreviewDeck(res.deck);
      setParseError(null);
    } else {
      setPreviewDeck(null);
      setParseError(res.error || 'Format JSON belum sesuai.');
    }
  }, [rawJsonInput]);

  if (!isOpen) return null;

  const handleCopyAndOpenGemini = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      playSound('correct', soundEnabled);

      // Open Gemini Web in new tab
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');

      // Switch automatically to Step 2 so user is ready to paste
      setTimeout(() => {
        setActiveTab('import');
      }, 700);

      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      // Fallback if clipboard API is blocked
      const textArea = document.createElement('textarea');
      textArea.value = generatedPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPrompt(true);
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
      setTimeout(() => setActiveTab('import'), 700);
      setTimeout(() => setCopiedPrompt(false), 3000);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawJsonInput(text);
        playSound('click', soundEnabled);
      }
    } catch {
      alert('Izin membaca clipboard tidak diaktifkan. Silakan tekan Ctrl+V (atau Paste manual) pada kotak teks.');
    }
  };

  const handleSaveImportedDeck = () => {
    if (!previewDeck) return;

    playSound('levelup', soundEnabled);
    const userDeck = convertAiDeckToUserDeck(previewDeck);
    onSaveDeck(userDeck);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-2xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-surface-card relative"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-inset shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold shadow-sm">
                <Sparkles className="w-5 h-5 text-gold" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold">
                  Prompt-Based Deck Customizer
                </span>
                <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary leading-tight flex items-center gap-2">
                  <span>Studio Deck Kustom AI</span>
                </h3>
                <p className="text-xs text-text-secondary">
                  Buat deck materi unik dengan bantuan Gemini AI melalui instruksi terstruktur.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="px-4 sm:px-5 pt-3 border-b border-border-subtle bg-surface-card shrink-0">
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-inset border border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('prompt');
                  playSound('click', soundEnabled);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'prompt'
                    ? 'bg-surface-card text-gold border border-border-subtle shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>1. Tentukan Topik & Salin</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('import');
                  playSound('click', soundEnabled);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'import'
                    ? 'bg-surface-card text-gold border border-border-subtle shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>2. Tempel Kode JSON & Simpan</span>
                {previewDeck && (
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0 bg-surface-card">
            {activeTab === 'prompt' ? (
              <div className="space-y-4 animate-fade-in">
                {/* Topic Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-primary">
                    Topik / Tema Deck yang Diinginkan
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Contoh: Percakapan di Kedai Kopi / Kosakata Anime Petualangan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-sm text-text-primary font-medium placeholder:text-text-muted"
                  />

                  {/* Suggestion Chips */}
                  <div className="pt-1.5 flex flex-wrap gap-1.5">
                    {TOPIC_SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setTopic(s.topic);
                          playSound('click', soundEnabled);
                        }}
                        className="text-[11px] py-1 px-2.5 rounded-lg bg-surface-inset border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-primary transition-all cursor-pointer"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Configurations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border-subtle">
                  {/* Focus Type */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold font-heading uppercase tracking-wider text-text-secondary">
                      Fokus Materi
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as DeckType)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-primary font-medium focus:border-border-primary focus:outline-none cursor-pointer"
                    >
                      {DECK_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* JLPT Level */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold font-heading uppercase tracking-wider text-text-secondary">
                      Target Level
                    </label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-primary font-medium focus:border-border-primary focus:outline-none cursor-pointer"
                    >
                      {JLPT_LEVELS.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold font-heading uppercase tracking-wider text-text-secondary">
                      Jumlah Kartu
                    </label>
                    <select
                      value={count}
                      onChange={(e) => setCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-primary font-medium focus:border-border-primary focus:outline-none cursor-pointer"
                    >
                      {ITEM_COUNTS.map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt} Materi
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Prompt Preview Inset */}
                <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                      Pratinjau Prompt Terstruktur untuk Gemini AI
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      Otomatis tersalin saat tombol diklik
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle max-h-36 overflow-y-auto font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap select-all">
                    {generatedPrompt}
                  </div>
                </div>

                {/* Big Action Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCopyAndOpenGemini}
                    className="btn-physical-primary w-full py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold font-heading flex items-center justify-center gap-2.5 cursor-pointer shadow-md"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Prompt Tersalin! Membuka Gemini AI...</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-gold" />
                        <span>Salin Prompt & Buka Gemini AI</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-text-muted text-center mt-2">
                    Setelah tombol diklik, tab Gemini akan terbuka otomatis. Cukup tekan <strong>Ctrl + V</strong> (Paste) di Gemini, lalu salin kode JSON yang dihasilkan ke langkah 2.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* JSON Paste Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-primary">
                      Tempelkan Kode JSON dari Gemini AI
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="text-[10px] font-mono text-gold hover:underline cursor-pointer"
                      >
                        Tempel dari Clipboard
                      </button>
                      {rawJsonInput && (
                        <button
                          type="button"
                          onClick={() => setRawJsonInput('')}
                          className="text-[10px] font-mono text-text-muted hover:text-text-primary cursor-pointer"
                        >
                          Bersihkan
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={rawJsonInput}
                    onChange={(e) => setRawJsonInput(e.target.value)}
                    placeholder="Tempelkan hasil teks atau blok ```json ... ``` dari Gemini AI di sini..."
                    rows={6}
                    className="w-full p-3 rounded-2xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none font-mono text-xs text-text-primary placeholder:text-text-muted leading-relaxed"
                  />
                </div>

                {/* Parsing Feedback */}
                {parseError && (
                  <div className="p-3 rounded-xl bg-wine/10 border border-wine/30 flex items-start gap-2.5 text-xs text-wine-accent">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Format Belum Sesuai</p>
                      <p className="text-[11px] opacity-90">{parseError}</p>
                    </div>
                  </div>
                )}

                {/* Valid Deck Preview Card */}
                {previewDeck && (
                  <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-surface-card border border-border-subtle">
                          {previewDeck.coverIcon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
                              {previewDeck.level}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted uppercase">
                              Tipe: {previewDeck.type}
                            </span>
                          </div>
                          <h4 className="font-heading font-bold text-sm sm:text-base text-text-primary mt-0.5">
                            {previewDeck.title}
                          </h4>
                          {previewDeck.description && (
                            <p className="text-xs text-text-secondary line-clamp-2">
                              {previewDeck.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-gold">
                          {previewDeck.items.length} Materi
                        </span>
                        <span className="block text-[10px] font-mono text-emerald-500 font-bold">
                          ✓ Siap Disimpan
                        </span>
                      </div>
                    </div>

                    {/* Preview first 4 items */}
                    <div className="pt-2 border-t border-border-subtle">
                      <span className="text-[10px] font-mono uppercase text-text-muted block mb-1.5">
                        Daftar Kartu yang Terdeteksi:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                        {previewDeck.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-between text-xs"
                          >
                            <div className="truncate mr-2">
                              <span className="font-jp font-bold text-text-primary mr-1.5">
                                {item.word}
                              </span>
                              {item.reading && item.reading !== item.word && (
                                <span className="text-[10px] text-text-muted mr-1.5">
                                  ({item.reading})
                                </span>
                              )}
                              <span className="text-text-secondary text-[11px]">
                                {item.meaning}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono px-1 rounded bg-surface-inset text-text-muted shrink-0">
                              {item.category || 'kotoba'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border-subtle flex items-center justify-between bg-surface-inset shrink-0">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="btn-physical-secondary py-2 px-4 rounded-xl text-xs font-bold font-heading cursor-pointer"
            >
              Batal
            </button>

            {activeTab === 'prompt' ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('import');
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary py-2 px-4 rounded-xl text-xs font-bold font-heading flex items-center gap-1.5 cursor-pointer"
              >
                <span>Sudah punya JSON? Lanjut ke Tempel</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!previewDeck}
                onClick={handleSaveImportedDeck}
                className="btn-physical-primary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold font-heading flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Check className="w-4 h-4 text-gold" />
                <span>Simpan ke Rak Buku</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
