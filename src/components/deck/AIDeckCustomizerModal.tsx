import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
  BookOpen,
  Languages,
  Scroll,
  Utensils,
  ShoppingBag,
  Briefcase,
  Gamepad2,
  HeartPulse,
  CloudSun,
  Compass,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Trash2,
  CheckCircle2,
  Bot,
  FileCode2,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
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
  { id: 'kuliner', label: 'Kuliner', fullTitle: 'Kuliner & Izakaya', promptTopic: 'Kosakata dan percakapan memesan makanan di izakaya & restoran Jepang', icon: Utensils },
  { id: 'konbini', label: 'Konbini', fullTitle: 'Konbini & Belanja', promptTopic: 'Kosakata belanja, menanyakan barang, dan transaksi di minimarket konbini', icon: ShoppingBag },
  { id: 'kerja', label: 'Kerja', fullTitle: 'Kerja & Kantor', promptTopic: 'Istilah bisnis, sopan santun kantor, dan percakapan antar rekan kerja', icon: Briefcase },
  { id: 'rpg', label: 'Game RPG', fullTitle: 'Game RPG Fantasi', promptTopic: 'Istilah status game, petualangan, sihir, dan pertempuran RPG Jepang', icon: Gamepad2 },
  { id: 'medis', label: 'Medis', fullTitle: 'Rumah Sakit & Medis', promptTopic: 'Kosakata bagian tubuh, gejala penyakit, dan konsultasi ke dokter di Jepang', icon: HeartPulse },
  { id: 'musim', label: 'Musim', fullTitle: 'Musim & Cuaca', promptTopic: 'Kosakata empat musim, fenomena alam, dan prakiraan cuaca di Jepang', icon: CloudSun },
  { id: 'wisata', label: 'Wisata', fullTitle: 'Bandara & Wisata', promptTopic: 'Kosakata liburan, check-in hotel, transportasi stasiun, dan bandara Jepang', icon: Compass },
  { id: 'kaigo', label: 'Kaigo', fullTitle: 'Perawat (Kaigo)', promptTopic: 'Istilah komunikasi dengan lansia dan pelayanan panti asuhan/kaigo Jepang', icon: Stethoscope },
];

const JLPT_LEVELS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'N5', label: 'N5' },
  { id: 'N4', label: 'N4' },
  { id: 'N3', label: 'N3' },
  { id: 'N2', label: 'N2' },
  { id: 'N1', label: 'N1' },
];

const DECK_TYPES: { type: DeckType; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { type: 'kotoba', label: 'Kosakata', icon: BookOpen, desc: 'Kata benda, kerja, sifat' },
  { type: 'kanji', label: 'Kanji', icon: Languages, desc: 'Aksara & cara baca' },
  { type: 'bunpou', label: 'Tata Bahasa', icon: Scroll, desc: 'Pola kalimat & rumus' },
  { type: 'mixed', label: 'Campuran', icon: Sparkles, desc: 'Semua variasi materi' },
];

const ITEM_COUNTS = [5, 10, 15, 20, 25, 30, 35];

const DEMO_JSON_STRING = JSON.stringify(
  {
    title: 'Percakapan Izakaya & Restoran',
    description: 'Kosakata dan frasa penting saat memesan makanan dan berinteraksi di restoran Jepang.',
    type: 'kotoba',
    coverIcon: '🍱',
    level: 'N4',
    items: [
      {
        word: '注文',
        reading: 'ちゅうもん',
        meaning: 'Pesanan / Memesan makanan',
        category: 'kotoba',
        exampleJp: 'すみません、注文をお願いします。',
        exampleReading: 'すみません、ちゅうもんをおねがいします。',
        exampleId: 'Permisi, saya ingin memesan makanan.',
      },
      {
        word: 'おすすめ',
        reading: 'おすすめ',
        meaning: 'Rekomendasi menu',
        category: 'kotoba',
        exampleJp: '本日のおすすめ料理は何ですか？',
        exampleReading: 'ほんじつのおすすめりょうりはなんですか？',
        exampleId: 'Apa masakan rekomendasi untuk hari ini?',
      },
      {
        word: 'お会計',
        reading: 'おかいけい',
        meaning: 'Tagihan / Pembayaran nota',
        category: 'kotoba',
        exampleJp: 'お会計は別々でできますか？',
        exampleReading: 'おかいけいはべつべつでできますか？',
        exampleId: 'Bisa minta tagihannya dipisah sendiri-sendiri?',
      },
      {
        word: '居酒屋',
        reading: 'いざかや',
        meaning: 'Kedai makan & minum khas Jepang',
        category: 'kotoba',
        exampleJp: '仕事帰りに居酒屋へ行きましょう。',
        exampleReading: 'しごとがえりにいざかやへいきましょう。',
        exampleId: 'Ayo mampir ke izakaya sepulang kerja.',
      },
      {
        word: '乾杯',
        reading: 'かんぱい',
        meaning: 'Bersulang (Cheers)',
        category: 'kotoba',
        exampleJp: '皆さん、乾杯！',
        exampleReading: 'みなさん、かんぱい！',
        exampleId: 'Semuanya, bersulang!',
      },
    ],
  },
  null,
  2
);

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

  // Step 1: Prompt parameters with persistence (Point 11)
  const [topic, setTopic] = useState('');
  const [selectedLevels, setSelectedLevels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nihongo_quest_ai_deck_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.levels) && parsed.levels.length > 0) return parsed.levels;
      }
    } catch {}
    return ['ALL'];
  });

  const [type, setType] = useState<DeckType>(() => {
    try {
      const saved = localStorage.getItem('nihongo_quest_ai_deck_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.type) return parsed.type;
      }
    } catch {}
    return 'kotoba';
  });

  const [count, setCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('nihongo_quest_ai_deck_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.count === 'number' && parsed.count >= 5) return parsed.count;
      }
    } catch {}
    return 20;
  });

  const [customNotes, setCustomNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasGeneratedPrompt, setHasGeneratedPrompt] = useState(false);

  // Save preferences (Point 11)
  useEffect(() => {
    try {
      localStorage.setItem(
        'nihongo_quest_ai_deck_prefs',
        JSON.stringify({ type, levels: selectedLevels, count })
      );
    } catch {}
  }, [type, selectedLevels, count]);

  // Point 2: Hubungan input topik dan chip tema
  const handleToggleTopic = (chip: (typeof TOPIC_SUGGESTIONS)[0]) => {
    const isCurrentlySelected =
      topic.trim().toLowerCase() === chip.fullTitle.toLowerCase() ||
      topic.trim().toLowerCase() === chip.promptTopic.toLowerCase() ||
      topic.trim().toLowerCase() === chip.label.toLowerCase();

    if (isCurrentlySelected) {
      setTopic('');
    } else {
      setTopic(chip.fullTitle);
    }
    playSound('click', soundEnabled);
  };

  // Point 7: Multi-select JLPT Level
  const handleToggleLevel = (lvlId: string) => {
    playSound('click', soundEnabled);
    if (lvlId === 'ALL') {
      setSelectedLevels(['ALL']);
      return;
    }
    let updated = selectedLevels.filter((l) => l !== 'ALL');
    if (updated.includes(lvlId)) {
      updated = updated.filter((l) => l !== lvlId);
      if (updated.length === 0) updated = ['ALL'];
    } else {
      updated.push(lvlId);
    }
    setSelectedLevels(updated);
  };

  const activeLevelDisplay = useMemo(() => {
    if (selectedLevels.includes('ALL')) return 'Semua Level';
    return [...selectedLevels].sort().join(', ');
  }, [selectedLevels]);

  const effectivePromptTopic = useMemo(() => {
    const match = TOPIC_SUGGESTIONS.find(
      (s) =>
        s.fullTitle.toLowerCase() === topic.trim().toLowerCase() ||
        s.label.toLowerCase() === topic.trim().toLowerCase() ||
        s.promptTopic.toLowerCase() === topic.trim().toLowerCase()
    );
    return match ? match.promptTopic : topic.trim();
  }, [topic]);

  const estimatedMinutes = useMemo(() => {
    return Math.max(3, Math.round(count * 0.5));
  }, [count]);

  // Clipboard & Interaction feedback
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'import'>('prompt');

  // Step 2: JSON Import
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewDeck, setPreviewDeck] = useState<ParsedAiDeck | null>(null);

  // Generate live prompt (with customNotes)
  const generatedPrompt = useMemo(() => {
    return buildGeminiDeckPrompt({
      topic: effectivePromptTopic || 'Kosakata bahasa Jepang sehari-hari',
      level: activeLevelDisplay,
      type,
      count,
      customNotes: customNotes.trim() || undefined,
    });
  }, [effectivePromptTopic, activeLevelDisplay, type, count, customNotes]);

  // Handle parsing live when rawJsonInput changes
  useEffect(() => {
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
    if (!topic.trim()) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      setHasGeneratedPrompt(true);
      playSound('correct', soundEnabled);

      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');

      setTimeout(() => {
        setActiveTab('import');
      }, 700);

      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = generatedPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPrompt(true);
      setHasGeneratedPrompt(true);
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
      setTimeout(() => setActiveTab('import'), 700);
      setTimeout(() => setCopiedPrompt(false), 3000);
    }
  };

  const handleCopyOnly = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      playSound('click', soundEnabled);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // ignore
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

  const handleInsertDemoJson = () => {
    setRawJsonInput(DEMO_JSON_STRING);
    playSound('correct', soundEnabled);
  };

  const handleSaveImportedDeck = () => {
    if (!previewDeck) return;

    playSound('levelup', soundEnabled);
    const userDeck = convertAiDeckToUserDeck(previewDeck);
    onSaveDeck(userDeck);
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 overflow-y-auto overscroll-contain animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            playSound('click', soundEnabled);
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-2xl bg-surface-card border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] my-auto relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header (Skeuomorphic Solid Surface - DESIGN.md) */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-inset shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-gold" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                  Buku Catatan AI
                </span>
                <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary leading-tight">
                  Studio Deck Kustom AI
                </h3>
                <p className="text-xs text-text-secondary line-clamp-1">
                  Rancang materi petualangan tematik terstruktur dengan bantuan Gemini AI
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Process Bar (DESIGN.md: Solid tiers & subtle borders) */}
          <div className="px-4 sm:px-5 py-2.5 border-b border-border-subtle bg-surface-card shrink-0">
            <div className="h-11 px-3 sm:px-4 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-between">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('prompt');
                  playSound('click', soundEnabled);
                }}
                className={`flex items-center gap-2 text-xs sm:text-sm font-heading font-bold transition-all cursor-pointer ${
                  activeTab === 'prompt' ? 'text-gold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    hasGeneratedPrompt
                      ? 'bg-surface-card border border-border-subtle text-emerald-400'
                      : activeTab === 'prompt'
                        ? 'bg-surface-elevated border border-border-primary text-gold shadow-xs'
                        : 'bg-surface-card border border-border-subtle text-text-muted'
                  }`}
                >
                  {hasGeneratedPrompt ? <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400" /> : '1'}
                </span>
                <span>Rancang Prompt</span>
              </button>

              {/* Connecting Divider Line (Solid border, NO gradient) */}
              <div className="flex-1 mx-3 sm:mx-6 h-[2px] rounded-full bg-border-subtle relative overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    hasGeneratedPrompt || activeTab === 'import' ? 'w-full bg-border-primary' : 'w-0'
                  }`}
                />
              </div>

              {/* Step 2 */}
              <button
                type="button"
                disabled={!hasGeneratedPrompt && !previewDeck}
                onClick={() => {
                  if (hasGeneratedPrompt || previewDeck) {
                    setActiveTab('import');
                    playSound('click', soundEnabled);
                  }
                }}
                className={`flex items-center gap-2 text-xs sm:text-sm font-heading font-bold transition-all ${
                  activeTab === 'import'
                    ? 'text-gold cursor-pointer'
                    : hasGeneratedPrompt || previewDeck
                      ? 'text-text-secondary hover:text-text-primary cursor-pointer'
                      : 'text-text-muted cursor-not-allowed opacity-50'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                    activeTab === 'import'
                      ? 'bg-surface-elevated border border-border-primary text-gold shadow-xs'
                      : hasGeneratedPrompt || previewDeck
                        ? 'bg-surface-card border border-border-subtle text-text-secondary'
                        : 'bg-surface-card border border-border-subtle text-text-muted'
                  }`}
                >
                  2
                </span>
                <span>Tempel JSON</span>
                {previewDeck && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0 bg-surface-card">
            {activeTab === 'prompt' ? (
              <div className="space-y-5 sm:space-y-6 animate-fade-in">
                {/* 1. Tentukan Topik */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-heading font-bold text-text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-surface-elevated text-gold border border-border-subtle font-mono font-bold text-xs flex items-center justify-center shadow-xs">1</span>
                      <span>Topik Deck</span>
                    </label>
                    {topic && (
                      <button
                        type="button"
                        onClick={() => setTopic('')}
                        className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                      >
                        Bersihkan
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-text-secondary">
                    Contoh: Kaigo di Genba, Izakaya & Restoran, Airport Japanese...
                  </p>

                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Masukkan topik bahasa Jepang..."
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-sm text-text-primary placeholder:text-text-muted transition-all min-h-[42px]"
                  />

                  {/* Suggestion Chips (Tactile elevation, NO colored outline/glow) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs text-text-muted font-medium block">
                      Saran tema populer (klik untuk memilih / membatalkan):
                    </span>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Saran Topik">
                      {TOPIC_SUGGESTIONS.map((s) => {
                        const IconComponent = s.icon;
                        const isSelected =
                          topic.trim().toLowerCase() === s.fullTitle.toLowerCase() ||
                          topic.trim().toLowerCase() === s.promptTopic.toLowerCase() ||
                          topic.trim().toLowerCase() === s.label.toLowerCase();

                        return (
                          <button
                            key={s.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleToggleTopic(s)}
                            className={`text-xs py-2 px-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 min-h-[38px] ${
                              isSelected
                                ? 'bg-surface-elevated border-border-primary text-text-primary font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.25)]'
                                : 'bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-primary hover:bg-surface-card'
                            }`}
                          >
                            <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-gold' : 'text-text-muted'}`} />
                            <span>{s.label}</span>
                            {isSelected && <Check className="w-3 h-3 text-gold stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Tentukan Isi Deck (Fokus Materi - Skeuomorphic cards) */}
                <div className="space-y-2.5">
                  <label className="text-xs sm:text-sm font-heading font-bold text-text-primary flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-surface-elevated text-gold border border-border-subtle font-mono font-bold text-xs flex items-center justify-center shadow-xs">2</span>
                    <span>Fokus Materi</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Fokus Materi">
                    {DECK_TYPES.map((t) => {
                      const IconComponent = t.icon;
                      const isSelected = type === t.type;
                      return (
                        <button
                          key={t.type}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            setType(t.type);
                            playSound('click', soundEnabled);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative min-h-[78px] ${
                            isSelected
                              ? 'bg-surface-elevated border-border-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)] text-text-primary'
                              : 'bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-card hover:border-border-primary'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-surface-card border border-border-subtle text-gold flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-4 h-4 ${isSelected ? 'text-gold' : 'text-text-muted'}`} />
                            <span className={`text-xs font-heading font-bold ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                              {t.label}
                            </span>
                          </div>
                          <span className="text-xs text-text-secondary font-medium mt-2 line-clamp-1 leading-snug">
                            {t.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Level JLPT (Multi-Select - Tactile buttons) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-heading font-bold text-text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-surface-elevated text-gold border border-border-subtle font-mono font-bold text-xs flex items-center justify-center shadow-xs">3</span>
                      <span>Target Level JLPT</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-gold">
                      {activeLevelDisplay}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 p-1 rounded-xl bg-surface-inset border border-border-subtle">
                    {JLPT_LEVELS.map((lvl) => {
                      const isSelected = selectedLevels.includes(lvl.id);
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleToggleLevel(lvl.id)}
                          className={`h-10 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-surface-elevated border border-border-primary text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.3)]'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                          }`}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Jumlah Kartu (Tactile buttons) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs sm:text-sm font-heading font-bold text-text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-surface-elevated text-gold border border-border-subtle font-mono font-bold text-xs flex items-center justify-center shadow-xs">4</span>
                      <span>Jumlah Kartu</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-gold">
                      {count} Kartu (± {estimatedMinutes} menit)
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 p-1 rounded-xl bg-surface-inset border border-border-subtle">
                    {ITEM_COUNTS.map((cnt) => {
                      const isSelected = count === cnt;
                      return (
                        <button
                          key={cnt}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            setCount(cnt);
                            playSound('click', soundEnabled);
                          }}
                          className={`h-10 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'bg-surface-elevated border border-border-primary text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.3)]'
                              : 'text-text-muted hover:text-text-primary hover:bg-surface-card'
                          }`}
                        >
                          {cnt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Live Summary Bar (Skeuomorphic Inset Tray) */}
                <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-4 h-4 text-gold shrink-0" />
                    <span className="font-bold text-text-muted">Ringkasan:</span>
                    <span className="truncate font-medium text-text-primary">
                      {count} Kartu · {DECK_TYPES.find(d => d.type === type)?.label} · {topic.trim() || 'Topik belum diisi'} · {activeLevelDisplay}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gold font-mono font-bold shrink-0 self-end sm:self-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>± {estimatedMinutes} menit belajar</span>
                  </div>
                </div>

                {/* 6. Opsi Lanjutan & Catatan AI (Accordion) */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors font-medium cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gold" />
                    <span>Opsi Lanjutan & Catatan Tambahan AI (Opsional)</span>
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-2"
                    >
                      <textarea
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Contoh: Utamakan kosakata kasual sehari-hari, sertakan kanji level N4 saja, beri furigana lengkap..."
                        rows={2}
                        className="w-full p-3 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-xs text-text-primary placeholder:text-text-muted transition-all font-sans resize-none"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Prompt Details Inspector Accordion */}
                <div>
                  <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Bot className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="font-bold text-text-primary">Pratinjau Prompt:</span>
                        <span className="font-mono text-gold px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-[11px]">
                          {activeLevelDisplay}
                        </span>
                        <span className="font-mono text-text-secondary px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle text-[11px]">
                          {count} Kartu
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPromptDetails(!showPromptDetails)}
                        className="text-xs font-mono text-text-secondary hover:text-gold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>{showPromptDetails ? 'Tutup Teks' : 'Lihat Teks'}</span>
                        {showPromptDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {showPromptDetails && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-2 border-t border-border-subtle"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono text-text-muted">
                            Prompt terstruktur otomatis:
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyOnly}
                            className="text-[11px] font-mono text-gold hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Salin Teks Saja</span>
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle max-h-32 overflow-y-auto font-mono text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap select-all">
                          {generatedPrompt}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* JSON Paste Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-primary">
                      Tempelkan Kode JSON dari Gemini AI
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleInsertDemoJson}
                        className="text-[10px] font-mono text-text-primary hover:bg-surface-elevated flex items-center gap-1 cursor-pointer bg-surface-card px-2.5 py-1 rounded-lg border border-border-subtle shadow-xs"
                      >
                        <Sparkles className="w-3 h-3 text-gold" />
                        <span>Coba Contoh Demo</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="text-[10px] font-mono text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer bg-surface-card px-2.5 py-1 rounded-lg border border-border-subtle shadow-xs"
                      >
                        <Clipboard className="w-3 h-3 text-text-muted" />
                        <span>Tempel Clipboard</span>
                      </button>
                      {rawJsonInput && (
                        <button
                          type="button"
                          onClick={() => setRawJsonInput('')}
                          className="text-[10px] font-mono text-text-muted hover:text-text-primary flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Bersihkan</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={rawJsonInput}
                    onChange={(e) => setRawJsonInput(e.target.value)}
                    placeholder="Tempelkan hasil teks atau blok ```json ... ``` dari Gemini AI di sini..."
                    rows={5}
                    className="w-full p-3.5 rounded-2xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none font-mono text-xs text-text-primary placeholder:text-text-muted leading-relaxed transition-all resize-none"
                  />
                </div>

                {/* Parsing Feedback / Error */}
                {parseError && (
                  <div className="p-3.5 rounded-2xl bg-wine/10 border border-border-subtle flex items-start gap-2.5 text-xs text-wine-accent animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Format Belum Sesuai</p>
                      <p className="text-[11px] opacity-90 leading-relaxed">{parseError}</p>
                      <p className="text-[10px] text-text-muted mt-1">
                        Tips: Pastikan kamu menyalin dari kurung kurawal pembuka <code className="text-text-primary font-bold">&#123;</code> hingga kurung kurawal penutup <code className="text-text-primary font-bold">&#125;</code>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty State Prompt */}
                {!rawJsonInput && (
                  <div className="p-5 rounded-2xl bg-surface-inset border border-dashed border-border-subtle text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-surface-card border border-border-subtle flex items-center justify-center text-gold mx-auto shadow-xs">
                      <FileCode2 className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="text-xs font-bold font-heading text-text-primary">
                        Kotak JSON Masih Kosong
                      </p>
                      <p className="text-[11px] text-text-secondary max-w-sm mx-auto mt-0.5">
                        Salin jawaban dari Gemini AI lalu tempel di atas, atau klik tombol <strong className="text-gold">"Coba Contoh Demo"</strong> untuk melihat pratinjau deck secara langsung.
                      </p>
                    </div>
                  </div>
                )}

                {/* Valid Deck Preview Card */}
                {previewDeck && (
                  <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3 animate-fade-in shadow-inner">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-2xl bg-surface-card border border-border-subtle shadow-xs">
                          {previewDeck.coverIcon}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-surface-card text-gold border border-border-subtle">
                              {previewDeck.level}
                            </span>
                            <span className="text-[10px] font-mono text-text-muted uppercase px-1.5 py-0.5 rounded bg-surface-card border border-border-subtle">
                              Tipe: {previewDeck.type}
                            </span>
                          </div>
                          <h4 className="font-heading font-bold text-sm sm:text-base text-text-primary mt-1">
                            {previewDeck.title}
                          </h4>
                          {previewDeck.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                              {previewDeck.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-gold block">
                          {previewDeck.items.length} Materi
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center justify-end gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Siap Disimpan
                        </span>
                      </div>
                    </div>

                    {/* Preview List of items */}
                    <div className="pt-2 border-t border-border-subtle">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono uppercase text-text-muted">
                          Daftar Materi yang Terdeteksi ({previewDeck.items.length}):
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {previewDeck.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-surface-card border border-border-subtle flex flex-col justify-between text-xs space-y-1"
                          >
                            <div className="flex items-baseline justify-between gap-1.5">
                              <div className="truncate">
                                <span className="font-jp font-bold text-text-primary mr-1.5 text-sm">
                                  {item.word}
                                </span>
                                {item.reading && item.reading !== item.word && (
                                  <span className="text-[11px] text-text-muted">
                                    【{item.reading}】
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-inset text-text-muted shrink-0 border border-border-subtle">
                                {item.category || 'kotoba'}
                              </span>
                            </div>

                            <p className="text-text-secondary text-[11px] font-medium line-clamp-1">
                              {item.meaning}
                            </p>

                            {item.exampleJp && (
                              <p className="text-[10px] text-text-muted line-clamp-1 italic pt-0.5 border-t border-border-subtle/50 font-jp">
                                例: {item.exampleJp}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions (Skeuomorphic Physical Buttons - DESIGN.md) */}
          <div className="p-4 sm:p-5 border-t border-border-subtle bg-surface-inset shrink-0 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                className="btn-physical-secondary py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold font-heading cursor-pointer min-h-[42px]"
              >
                Batal
              </button>

              {activeTab === 'prompt' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!topic.trim()}
                    onClick={handleCopyAndOpenGemini}
                    className="btn-physical-primary py-2.5 px-6 rounded-xl text-xs sm:text-sm font-bold font-heading flex items-center gap-2 cursor-pointer group min-h-[42px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span className="text-emerald-300">Tersalin ✓ Membuka Gemini AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-gold group-hover:rotate-12 transition-transform" />
                        <span>Buat & Salin Prompt ✦</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!previewDeck}
                  onClick={handleSaveImportedDeck}
                  className="btn-physical-primary py-2.5 px-6 rounded-xl text-xs sm:text-sm font-bold font-heading flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[42px]"
                >
                  <Check className="w-4 h-4 text-gold stroke-[3]" />
                  <span>Simpan ke Rak Buku</span>
                </button>
              )}
            </div>

            {/* Secondary Navigation Ghost Link */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              {activeTab === 'prompt' ? (
                <div className="w-full flex items-center justify-between">
                  {!topic.trim() ? (
                    <span className="text-[11px] text-text-secondary font-medium flex items-center gap-1">
                      ⚠️ Masukkan topik atau pilih tema terlebih dahulu
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('import');
                      setHasGeneratedPrompt(true);
                      playSound('click', soundEnabled);
                    }}
                    className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium text-xs ml-auto"
                  >
                    <span>Sudah punya JSON?</span>
                    <span className="text-gold underline underline-offset-2 font-bold">Tempel langsung →</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('prompt');
                    playSound('click', soundEnabled);
                  }}
                  className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 cursor-pointer font-medium text-xs mx-auto"
                >
                  <span>← Ingin racik ulang?</span>
                  <span className="text-gold underline underline-offset-2 font-bold">Kembali ke Rancang Prompt</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
