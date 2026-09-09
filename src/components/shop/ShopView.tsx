import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Coins, Gem, FlaskConical, Scroll, Swords, Shirt, BookOpen, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ShopItem, PlayerStats } from '../../types/rpg';
import { SHOP_ITEMS } from '../../data/shop';
import { playSound } from '../../utils/audio';

interface ShopViewProps {
  stats: PlayerStats;
  onBuyItem: (item: ShopItem) => void;
  soundEnabled?: boolean;
}

export const ShopView: React.FC<ShopViewProps> = ({
  stats,
  onBuyItem,
  soundEnabled = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'potion' | 'scroll' | 'equipment' | 'skin'>('all');

  const filteredItems = selectedCategory === 'all'
    ? SHOP_ITEMS
    : SHOP_ITEMS.filter(item => item.type === selectedCategory);

  const renderIcon = (itemId: string) => {
    switch (itemId) {
      case 'pot_hp_small': return <FlaskConical className="w-6 h-6 text-rose-400" />;
      case 'pot_hp_elixir': return <FlaskConical className="w-6 h-6 text-rose-500" />;
      case 'pot_mp_small': return <FlaskConical className="w-6 h-6 text-sky-400" />;
      case 'scroll_exp_sm': return <Scroll className="w-6 h-6 text-amber-200" />;
      case 'scroll_exp_lg': return <BookOpen className="w-6 h-6 text-amber-400" />;
      case 'skin_sakura': return <Shirt className="w-6 h-6 text-pink-400" />;
      case 'skin_cyber': return <Zap className="w-6 h-6 text-purple-400" />;
      case 'equip_wooden_sword': return <Swords className="w-6 h-6 text-stone-300" />;
      default: return <ShoppingBag className="w-6 h-6 text-stone-400" />;
    }
  };

  const handlePurchase = (item: ShopItem) => {
    const canAfford = item.currency === 'gold' ? stats.gold >= item.price : stats.gems >= item.price;
    if (!canAfford) {
      playSound('wrong', soundEnabled);
      return;
    }

    playSound('coin', soundEnabled);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 }
    });
    onBuyItem(item);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-6">
      {/* Header & Wallet Banner */}
      <div className="panel p-4 sm:p-5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-border-subtle">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading tracking-wide text-text-primary flex items-center gap-2">
            🛒 Bazaar & Toko Saudagar
          </h2>
          <p className="text-xs text-text-secondary">
            Ramuan pemulih Stamina/Mana, Gulungan Mantra EXP, dan Perlengkapan Petualang
          </p>
        </div>

        {/* Currency Display */}
        <div className="py-2 px-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center gap-3 font-mono shadow-inner">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gold">
            <Coins className="w-4 h-4 text-gold" />
            <span>{stats.gold} Gold</span>
          </div>
          <div className="w-px h-3.5 bg-border-subtle" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo">
            <Gem className="w-4 h-4 text-indigo" />
            <span>{stats.gems} Gems</span>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="skeuo-tier-row mb-3">
        {[
          { id: 'all', label: 'Semua Komoditas' },
          { id: 'potion', label: <span className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-wine-accent" /> Ramuan Alkimia</span> },
          { id: 'scroll', label: <span className="flex items-center gap-1.5"><Scroll className="w-3.5 h-3.5 text-gold" /> Gulungan EXP</span> },
          { id: 'equipment', label: <span className="flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-text-secondary" /> Senjata & Zirah</span> },
          { id: 'skin', label: <span className="flex items-center gap-1.5"><Shirt className="w-3.5 h-3.5 text-indigo" /> Jubah & Aura</span> },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id as any);
              playSound('click', soundEnabled);
            }}
            className={`skeuo-tier-pill ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredItems.map((item) => {
          const canAfford = item.currency === 'gold' ? stats.gold >= item.price : stats.gems >= item.price;

          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              className="panel p-4 sm:p-5 flex flex-col justify-between space-y-3 group border border-border-subtle hover:border-border-primary transition-all shadow-md"
            >
              <div className="space-y-2 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                    {renderIcon(item.id)}
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-surface-inset text-text-muted border border-border-subtle">
                    {item.type}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-gold transition-colors font-heading">
                    {item.name}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Price & Buy Action */}
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-1 font-bold text-xs font-mono">
                  <span className="flex items-center">{item.currency === 'gold' ? <Coins className="w-3.5 h-3.5 text-gold" /> : <Gem className="w-3.5 h-3.5 text-indigo" />}</span>
                  <span className={canAfford ? 'text-gold' : 'text-text-muted'}>
                    {item.price} {item.currency}
                  </span>
                </div>

                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!canAfford}
                  className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 font-heading ${
                    canAfford
                      ? 'btn-cta'
                      : 'bg-surface-inset text-text-muted cursor-not-allowed opacity-60 border border-border-subtle'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Beli
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
