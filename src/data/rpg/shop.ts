import { ShopItem } from '../../types/rpg';

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'pot_hp_small',
    name: 'Red Stamina Potion',
    category: 'potion',
    type: 'potion',
    description: 'Memulihkan 50 HP (Stamina) seketika untuk melanjutkan belajar tanpa menunggu.',
    price: 80,
    currency: 'gold',
    icon: '🧪',
    effectType: 'heal_hp',
    effectValue: 50,
    rarity: 'common'
  },
  {
    id: 'pot_hp_elixir',
    name: 'Max HP Elixir',
    category: 'potion',
    type: 'potion',
    description: 'Memulihkan 100% HP dan memberikan proteksi stamina.',
    price: 200,
    currency: 'gold',
    icon: '🍶',
    effectType: 'heal_hp',
    effectValue: 999,
    rarity: 'rare'
  },
  {
    id: 'pot_mp_small',
    name: 'Blue Mana Ether',
    category: 'potion',
    type: 'potion',
    description: 'Memulihkan 30 MP untuk menggunakan skill bantuan kuis (50/50 hint, time extend).',
    price: 100,
    currency: 'gold',
    icon: '💧',
    effectType: 'restore_mp',
    effectValue: 30,
    rarity: 'common'
  },
  {
    id: 'scroll_exp_sm',
    name: 'Sage Wisdom Scroll',
    category: 'scroll',
    type: 'scroll',
    description: 'Memberikan +100 EXP langsung untuk mempercepat kenaikan level.',
    price: 150,
    currency: 'gold',
    icon: '📜',
    effectType: 'exp_boost',
    effectValue: 100,
    rarity: 'rare'
  },
  {
    id: 'scroll_exp_lg',
    name: 'Grand Sensei Tome',
    category: 'scroll',
    type: 'scroll',
    description: 'Buku suci master bahasa Jepang yang memberikan +500 EXP seketika!',
    price: 500,
    currency: 'gold',
    icon: '📖',
    effectType: 'exp_boost',
    effectValue: 500,
    rarity: 'epic'
  },
  {
    id: 'skin_sakura',
    name: 'Sakura Wanderer Attire',
    category: 'skin',
    type: 'skin',
    description: 'Kostum petualang bertema kelopak bunga Sakura Kyoto dengan aura merah muda.',
    price: 15,
    currency: 'gems',
    icon: '🌸',
    effectType: 'unlock_skin',
    effectValue: 'sakura_wanderer',
    rarity: 'rare'
  },
  {
    id: 'skin_cyber',
    name: 'Cyber Samurai Hologram',
    category: 'skin',
    type: 'skin',
    description: 'Zirah futuristik neon berbalut pedang laser kuantum khas Osaka.',
    price: 30,
    currency: 'gems',
    icon: '⚡',
    effectType: 'unlock_skin',
    effectValue: 'cyber_samurai',
    rarity: 'epic'
  },
  {
    id: 'equip_wooden_sword',
    name: 'Bokken Pedang Kayu',
    category: 'equipment',
    type: 'equipment',
    description: 'Pedang latihan kayu yang memberikan +2 STR pada pertarungan Boss.',
    price: 250,
    currency: 'gold',
    icon: '🗡️',
    effectType: 'stat_boost',
    effectValue: 'str_2',
    rarity: 'common'
  }
];
