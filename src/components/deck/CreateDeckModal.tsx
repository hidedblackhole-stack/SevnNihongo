import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Layers, Sparkles, BookOpen, PenTool, Check } from 'lucide-react';
import { DeckType, UserDeck } from '../../types/rpg';
import { playSound } from '../../utils/audio';

const AVAILABLE_ICONS = ['🔖', '📖', '✍️', '⚡', '🎯', '🌸', '🗡️', '📜', '🌟', '🔥', '🏯', '🍵'];

const DECK_TYPES: { type: DeckType; label: string; desc: string }[] = [
  { type: 'mixed', label: 'Campuran', desc: 'Kosakata, Kanji, dan Tata Bahasa sekaligus' },
  { type: 'flashcard', label: 'Flashcard Drill', desc: 'Fokus hafalan bolak-balik arti & bacaan' },
  { type: 'writing', label: 'Latihan Menulis', desc: 'Fokus goresan kanvas Kanji & Kosakata' },
  { type: 'kotoba', label: 'Fokus Kosakata', desc: 'Kumpulan kata dan frasa penting' },
  { type: 'kanji', label: 'Fokus Aksara & Kanji', desc: 'Koleksi kanji dan onyomi/kunyomi' },
  { type: 'bunpou', label: 'Fokus Tata Bahasa', desc: 'Pola kalimat, rumus, dan contoh praktis' },
];

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description: string; type: DeckType; coverIcon: string }) => void;
  editingDeck?: UserDeck | null;
  soundEnabled?: boolean;
}

export const CreateDeckModal: React.FC<CreateDeckModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDeck,
  soundEnabled = true,
}) => {
  const [title, setTitle] = useState(editingDeck?.title || '');
  const [description, setDescription] = useState(editingDeck?.description || '');
  const [type, setType] = useState<DeckType>(editingDeck?.type || 'mixed');
  const [coverIcon, setCoverIcon] = useState(editingDeck?.coverIcon || '📖');
  const [error, setError] = useState('');

  // Reset or initialize when modal opens/changes
  React.useEffect(() => {
    if (editingDeck) {
      setTitle(editingDeck.title);
      setDescription(editingDeck.description || '');
      setType(editingDeck.type || 'mixed');
      setCoverIcon(editingDeck.coverIcon || '📖');
    } else {
      setTitle('');
      setDescription('');
      setType('mixed');
      setCoverIcon('📖');
    }
    setError('');
  }, [editingDeck, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Judul deck wajib diisi');
      return;
    }

    playSound('click', soundEnabled);
    onSave({
      title: trimmed,
      description: description.trim(),
      type,
      coverIcon,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-surface-ground/80 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="panel w-full max-w-lg border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-inset">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{coverIcon}</span>
              <div>
                <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary">
                  {editingDeck ? 'Edit Buku Saku' : 'Buat Buku Saku Baru'}
                </h3>
                <p className="text-xs text-text-secondary">
                  Sesuaikan nama, tipe latihan, dan ikon sampul deck
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1">
                Judul Deck <span className="text-wine-accent">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Contoh: Kosakata N3 Bab 1 / Kanji Sulit"
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-sm text-text-primary font-medium"
              />
              {error && <p className="text-xs text-wine-accent font-bold mt-1">{error}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1">
                Deskripsi / Catatan (Opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan target hafalan, minggu belajar, atau materi khusus..."
                rows={2}
                maxLength={120}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-xs text-text-primary resize-none"
              />
            </div>

            {/* Choose Cover Icon */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1.5">
                Pilih Ikon Sampul
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setCoverIcon(icon);
                      playSound('click', soundEnabled);
                    }}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all border ${
                      coverIcon === icon
                        ? 'bg-surface-elevated border-border-primary ring-2 ring-gold/40 scale-105'
                        : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Deck Type / Purpose */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1.5">
                Fokus / Tipe Deck
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DECK_TYPES.map((dt) => {
                  const isSelected = type === dt.type;
                  return (
                    <button
                      key={dt.type}
                      type="button"
                      onClick={() => {
                        setType(dt.type);
                        playSound('click', soundEnabled);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-surface-elevated border-border-primary ring-1 ring-gold/30'
                          : 'bg-surface-inset border-border-subtle hover:bg-surface-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-heading font-bold text-text-primary">
                          {dt.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-gold" />}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">
                        {dt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-secondary hover:bg-surface-inset border border-transparent"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-heading font-bold bg-surface-elevated text-text-primary border border-border-primary shadow-sm hover:shadow transition-all"
              >
                {editingDeck ? 'Simpan Perubahan' : 'Buat Deck'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
