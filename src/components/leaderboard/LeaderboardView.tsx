import React, { useEffect, useState, useRef } from 'react';
import {
  Trophy,
  Medal,
  Loader2,
  RefreshCw,
  Flame,
  Crown,
  ChevronDown,
  ChevronUp,
  WifiOff,
  Swords
} from 'lucide-react';
import {
  getLeaderboard,
  getWeeklyLeaderboard,
  getCurrentWeekId,
  getUserLeaderboardRank,
  LeaderboardEntry,
  WeeklyLeaderboardEntry,
  UserRankInfo
} from '../../lib/supabase';
import { playSound } from '../../utils/audio';
import { PlayerStats } from '../../types/rpg';
import { RPG_TIERS, getTierForExp } from '../../data/tiers';
import { TIER_AVATAR_MAP, TIER_AVATAR_FEMALE_MAP } from '../avatar/TierAvatar';
import { PlayerProfileModal } from './PlayerProfileModal';

interface LeaderboardViewProps {
  currentUserId: string;
  currentUserStats?: PlayerStats;
  soundEnabled: boolean;
  onOpenStatusModal?: () => void;
  onUpdateSignature?: (sig: string) => void;
  isActive?: boolean;
}

type LeaderboardTab = 'all-time' | 'weekly';

const STORAGE_KEY_LB_CACHE = 'nihongo_quest_leaderboard_alltime_cache';
const STORAGE_KEY_WEEKLY_CACHE = 'nihongo_quest_leaderboard_weekly_cache';
const STORAGE_KEY_TOTAL_COUNT = 'nihongo_quest_leaderboard_total_count';
const STORAGE_KEY_MY_RANK = 'nihongo_quest_leaderboard_my_rank';

// Initial authentic seed snapshot of top players so offline/first-time users never see empty/broken screen
const SEED_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  { user_id: 'cef82769-aa26-4160-8d55-023e9cba218e', player_name: "SevnSoul", level: 199, total_exp: 1011958, tier_index: 9, stat_tryout: 3, stat_flashcard: 487, stat_kanji: 310, stat_boss: 9, last_updated: '2026-09-25T14:39:56.923+00:00' },
  { user_id: '99374b85-175b-41b5-b9a4-3893f9cd564d', player_name: "Reksa", level: 1, total_exp: 7400, tier_index: 3, last_updated: '2026-09-16T13:13:13.247658+00:00' },
  { user_id: '0f431d43-f9e0-45ae-a651-00d1d40ad3fb', player_name: "Shadow", level: 1, total_exp: 6739, tier_index: 2, avatar_url: "🥷", stat_flashcard: 10, stat_kanji: 286, last_updated: '2026-09-21T05:26:26.723+00:00' },
  { user_id: 'b38d01ac-c3dd-4c0b-b55b-7b189b600170', player_name: "Cieru", level: 1, total_exp: 5802, tier_index: 2, stat_flashcard: 10, last_updated: '2026-09-18T08:07:27.923+00:00' },
  { user_id: '5eff94a7-e2bc-459e-ae6f-081cc408c54c', player_name: "Tabibito", level: 14, total_exp: 5595, tier_index: 3, stat_flashcard: 18, stat_kanji: 12, last_updated: '2026-09-11T11:11:44.76+00:00' },
  { user_id: 'b52e3d6c-4d8a-41e6-a33d-e77b39f3085f', player_name: "binzzy", level: 1, total_exp: 4710, tier_index: 2, stat_flashcard: 40, stat_kanji: 27, stat_boss: 3, last_updated: '2026-09-16T16:20:49.397+00:00' },
  { user_id: '50aed205-967f-4b33-92dc-b7d87a1213b6', player_name: "Samurai", level: 1, total_exp: 4705, tier_index: 2, avatar_url: "🐉", stat_flashcard: 95, stat_kanji: 47, stat_boss: 1, last_updated: '2026-09-24T08:53:09.172+00:00' },
  { user_id: '3a2b6dcc-5255-4ce8-b643-eaccf1a2e84a', player_name: "Patih SMI", level: 1, total_exp: 4098, tier_index: 2, avatar_url: "🌸", stat_flashcard: 14, stat_kanji: 16, stat_boss: 2, last_updated: '2026-09-24T05:19:04.036+00:00' },
  { user_id: '5a8e1f75-8652-4dec-949b-3d7ec99d7625', player_name: "Samurai", level: 1, total_exp: 3632, tier_index: 1, stat_flashcard: 30, stat_kanji: 185, last_updated: '2026-09-24T13:25:45.887+00:00' },
  { user_id: '523c4462-8143-48fd-8171-6b36d0166a1a', player_name: "Ninja", level: 1, total_exp: 3414, tier_index: 4, stat_flashcard: 7, stat_kanji: 15, stat_boss: 1, last_updated: '2026-09-16T12:05:46.21+00:00' },
  { user_id: 'a0fc5626-425d-4faa-8192-3e3873fb7920', player_name: "Ronin", level: 1, total_exp: 2897, tier_index: 1, stat_flashcard: 122, stat_kanji: 14, last_updated: '2026-09-26T14:49:17.468+00:00' },
  { user_id: '7f249041-6928-47e7-bab6-3958a30fffd6', player_name: "Frzz", level: 1, total_exp: 2892, tier_index: 1, avatar_url: "⚔️", stat_kanji: 7, last_updated: '2026-09-25T18:43:19.553281+00:00' },
  { user_id: 'b2722ad4-dedc-46af-8b41-5fb7fff1fb0a', player_name: "Samurai", level: 1, total_exp: 2704, tier_index: 1, stat_flashcard: 8, stat_kanji: 14, last_updated: '2026-09-17T11:40:44.318+00:00' },
  { user_id: 'e51aaf28-de85-46c8-8bc1-ae7a478113af', player_name: "Wanabe", level: 1, total_exp: 2488, tier_index: 1, avatar_url: "🥷", stat_flashcard: 3, stat_kanji: 2, stat_boss: 2, last_updated: '2026-09-25T18:31:14.204+00:00' },
  { user_id: 'ace4c522-48f3-4373-a7b5-12ad14c644ae', player_name: "Yamazaki", level: 1, total_exp: 2097, tier_index: 1, avatar_url: "👹", stat_flashcard: 3, stat_kanji: 17, last_updated: '2026-09-25T11:30:46.949+00:00' },
  { user_id: 'cc2ac6e2-b525-4fad-864a-57139d2ac0fa', player_name: "Ronin", level: 1, total_exp: 2032, tier_index: 1, stat_flashcard: 4, stat_kanji: 10, last_updated: '2026-09-20T06:30:47.02993+00:00' },
  { user_id: '043f6ed1-7aa5-4022-9095-f5d8a9c5ee42', player_name: "frzxss", level: 1, total_exp: 1886, tier_index: 4, stat_flashcard: 8, stat_kanji: 4, last_updated: '2026-09-16T03:05:41.600268+00:00' },
  { user_id: '65673b6b-705c-4c88-b9d0-8e07dda1b439', player_name: "˚୨୧⋆｡˚ ⋆", level: 1, total_exp: 1779, tier_index: 1, stat_flashcard: 3, stat_kanji: 3, stat_boss: 2, last_updated: '2026-09-24T23:31:14.933+00:00' },
  { user_id: 'af6b4db7-a3f7-40fa-a0d0-d3cff95fc23a', player_name: "Dante", level: 1, total_exp: 1708, tier_index: 1, avatar_url: "⛩️", stat_flashcard: 4, stat_kanji: 5, last_updated: '2026-09-21T09:55:21.447752+00:00' },
  { user_id: '9831669c-e16d-46fd-b0fe-423563305150', player_name: "Samurai", level: 1, total_exp: 1670, tier_index: 1, stat_flashcard: 4, stat_kanji: 5, last_updated: '2026-09-17T04:02:51.495+00:00' },
  { user_id: '2bcd78e6-cb06-4918-b6de-bcc8de85d22b', player_name: "Thesevn", level: 1, total_exp: 1628, tier_index: 1, avatar_url: "🐉", stat_flashcard: 12, stat_kanji: 7, last_updated: '2026-09-22T02:28:43.916+00:00' },
  { user_id: '0a06f234-6b34-4f91-ab99-8c3941753159', player_name: "Luthor", level: 1, total_exp: 1534, tier_index: 1, stat_flashcard: 3, stat_kanji: 9, stat_boss: 1, last_updated: '2026-09-25T13:29:10.595+00:00' },
  { user_id: 'fc319046-4ce4-4a5e-badd-f8985c1cfdb7', player_name: "Ninja", level: 1, total_exp: 1463, tier_index: 1, avatar_url: "⛩️", stat_kanji: 14, last_updated: '2026-09-19T11:42:16.947+00:00' },
  { user_id: '3646b60b-c3f5-4033-b5d5-c888ef32b13d', player_name: "Kenshi", level: 1, total_exp: 1415, tier_index: 1, stat_flashcard: 5, stat_kanji: 9, last_updated: '2026-09-24T06:27:11.432+00:00' },
  { user_id: 'd13d2fb3-fa21-48e8-8e29-e52e087eca40', player_name: "Tabibito", level: 1, total_exp: 1387, tier_index: 1, stat_flashcard: 4, stat_kanji: 3, stat_boss: 1, last_updated: '2026-09-17T12:59:57.975+00:00' },
  { user_id: '532a9c46-e9e5-4a76-8474-1e28ec8ab6fc', player_name: "sang pewaris", level: 1, total_exp: 1306, tier_index: 1, avatar_url: "🌸", stat_flashcard: 4, stat_kanji: 8, last_updated: '2026-09-26T11:27:20.164+00:00' },
  { user_id: '53d33965-bedc-4ae3-b707-3b4c20088b9b', player_name: "Tabibito", level: 1, total_exp: 1274, tier_index: 1, stat_flashcard: 1, stat_boss: 2, last_updated: '2026-09-19T05:17:34.643+00:00' },
  { user_id: '591c4ddd-befa-46ce-979f-05ea64a0dd47', player_name: "Ninja", level: 1, total_exp: 1265, tier_index: 6, last_updated: '2026-09-17T15:06:42.840867+00:00' },
  { user_id: '6b88517a-ee12-4de1-adf9-30f4e2427267', player_name: "LeviiHechou", level: 1, total_exp: 1220, tier_index: 1, avatar_url: "⚔️", stat_boss: 1, last_updated: '2026-09-17T23:51:27.517642+00:00' },
  { user_id: '51fe7181-ee50-4bf0-9e65-857c23d62813', player_name: "Reksa", level: 1, total_exp: 1210, tier_index: 3, last_updated: '2026-09-16T13:54:29.553057+00:00' },
  { user_id: '02d4af2d-737d-4ae0-adf8-125cdcbc2fa2', player_name: "Ninja", level: 1, total_exp: 1182, tier_index: 1, stat_flashcard: 2, stat_kanji: 7, last_updated: '2026-09-17T04:22:45.001035+00:00' },
  { user_id: 'c1818e18-6d41-4431-82d2-9fb5055099c1', player_name: "Wanderer", level: 1, total_exp: 1166, tier_index: 0, avatar_url: "⛩️", stat_flashcard: 4, stat_kanji: 7, last_updated: '2026-09-20T04:00:22.9+00:00' },
  { user_id: 'b95d11dc-6892-4089-8999-898a47c4f1b3', player_name: "Ikky", level: 1, total_exp: 1151, tier_index: 0, stat_flashcard: 5, stat_kanji: 10, last_updated: '2026-09-16T22:23:14.497+00:00' },
  { user_id: '7fe368a4-ef3c-4ce4-aeea-40fc5905276d', player_name: "kal", level: 1, total_exp: 1112, tier_index: 0, avatar_url: "🐉", stat_flashcard: 1, stat_kanji: 1, last_updated: '2026-09-18T12:21:09.999+00:00' },
  { user_id: '319b4e0e-50f3-4531-ad57-c9340056149e', player_name: "Thomas", level: 1, total_exp: 1078, tier_index: 2, stat_flashcard: 2, stat_kanji: 2, last_updated: '2026-09-17T19:36:11.747978+00:00' },
  { user_id: '7b42250c-7342-434a-966d-3a91dc18b76e', player_name: "Gakusei", level: 1, total_exp: 1069, tier_index: 0, stat_flashcard: 2, stat_kanji: 8, last_updated: '2026-09-19T13:31:25.684+00:00' },
  { user_id: 'ff139cbc-1e03-494a-86de-3db60b9074ff', player_name: "Tabibito", level: 1, total_exp: 1060, tier_index: 2, stat_flashcard: 1, stat_kanji: 21, last_updated: '2026-09-16T10:36:47.416+00:00' },
  { user_id: '1adbe256-9167-4d65-9761-4d76b4025a19', player_name: "サト", level: 1, total_exp: 1015, tier_index: 0, avatar_url: "🐉", stat_flashcard: 4, last_updated: '2026-09-22T09:56:00.771+00:00' },
  { user_id: 'dbe8fc7a-2fdf-4366-bbc7-a6318806113a', player_name: "Riza Ravenhart", level: 1, total_exp: 891, tier_index: 0, avatar_url: "⚔️", stat_flashcard: 3, stat_kanji: 2, last_updated: '2026-09-20T04:21:04.607528+00:00' },
  { user_id: '44080cd9-4bb4-4a56-8356-268174b88a02', player_name: "Ninja", level: 1, total_exp: 865, tier_index: 5, last_updated: '2026-09-14T13:35:06.546663+00:00' },
  { user_id: '8197c7df-25b0-431b-a04a-19e8157a119c', player_name: "vaelith", level: 1, total_exp: 821, tier_index: 0, avatar_url: "🐼", stat_flashcard: 3, stat_kanji: 18, last_updated: '2026-09-17T09:02:47.435+00:00' },
  { user_id: '27ea9986-c6c3-4016-979d-782c3817e660', player_name: "Samurai", level: 1, total_exp: 820, tier_index: 1, last_updated: '2026-09-17T04:11:22.07288+00:00' },
  { user_id: '3032cce8-a9a9-438b-8ec5-51e02b07cfdd', player_name: "Ronin", level: 1, total_exp: 805, tier_index: 0, last_updated: '2026-09-17T10:43:26.372538+00:00' },
  { user_id: 'a36da029-361f-4d2e-80d0-c81bec6a7ebf', player_name: "Dodo😝", level: 1, total_exp: 800, tier_index: 5, avatar_url: "🐼", last_updated: '2026-09-16T16:08:43.363997+00:00' },
  { user_id: 'cdc38d61-4e10-454a-8b1f-cb94ddab8d1c', player_name: "Wanderer", level: 1, total_exp: 764, tier_index: 1, avatar_url: "⛩️", stat_flashcard: 3, last_updated: '2026-09-17T03:33:44.570522+00:00' },
  { user_id: '2e0416c1-d99f-4938-8763-9bed464b02cb', player_name: "Ronin", level: 1, total_exp: 750, tier_index: 1, last_updated: '2026-09-12T04:05:31.265375+00:00' },
  { user_id: '4a148fc1-f07d-4cd1-bae2-72e1352b6c41', player_name: "Wanderer", level: 1, total_exp: 728, tier_index: 0, stat_kanji: 12, last_updated: '2026-09-21T04:33:44.856+00:00' },
  { user_id: 'f98734b8-1b6e-4c13-b00c-81d2c123bfaa', player_name: "Wanderer", level: 1, total_exp: 709, tier_index: 0, stat_flashcard: 3, stat_kanji: 6, last_updated: '2026-09-21T05:25:58.182+00:00' },
  { user_id: 'cba549c5-46e7-4c6c-a029-f9cdb3b0aec7', player_name: "Tabibito", level: 1, total_exp: 643, tier_index: 0, avatar_url: "👹", stat_flashcard: 1, stat_kanji: 2, last_updated: '2026-09-23T09:10:42.639+00:00' },
  { user_id: '8ccce5b8-c578-46ac-90a0-710b84131675', player_name: "Kenshi", level: 1, total_exp: 639, tier_index: 0, stat_flashcard: 3, stat_kanji: 1, last_updated: '2026-09-17T10:26:10.853+00:00' },
  { user_id: 'f355547a-edb6-47d5-b112-8f243f16edf2', player_name: "AtarBejir", level: 1, total_exp: 631, tier_index: 1, avatar_url: "👺", stat_flashcard: 2, last_updated: '2026-09-17T06:54:02.647048+00:00' },
  { user_id: '0b1aed71-db99-48e8-95f1-68eecaa17990', player_name: "Tabibito", level: 1, total_exp: 610, tier_index: 0, last_updated: '2026-09-16T10:00:20.538261+00:00' },
  { user_id: '757db1f6-e820-4569-92bb-1ede9953f8f5', player_name: "Tabibito", level: 1, total_exp: 588, tier_index: 0, stat_flashcard: 3, stat_kanji: 2, last_updated: '2026-09-17T18:46:23.985+00:00' },
  { user_id: 'e84a1f7c-90c6-43f7-9419-7095910e026c', player_name: "Kenshi", level: 1, total_exp: 575, tier_index: 1, last_updated: '2026-09-10T14:50:30.660092+00:00' },
  { user_id: '9740aeef-5ffd-4745-9f75-8c132dc1f8f6', player_name: "Fand", level: 1, total_exp: 541, tier_index: 0, avatar_url: "🥷", stat_flashcard: 3, last_updated: '2026-09-16T12:08:48.488326+00:00' },
  { user_id: '9ce76014-75f3-4ca8-99e9-debb9a4f56dd', player_name: "Ronin", level: 1, total_exp: 525, tier_index: 1, last_updated: '2026-09-17T05:24:00.825835+00:00' },
  { user_id: '49fa7ae3-763e-4432-b263-6ffecd59603b', player_name: "Ninja", level: 1, total_exp: 522, tier_index: 0, stat_flashcard: 12, stat_kanji: 6, last_updated: '2026-09-22T11:20:12.108+00:00' },
  { user_id: '095207aa-9e38-4a69-958e-b2306293d534', player_name: "Gakusei", level: 1, total_exp: 505, tier_index: 1, stat_kanji: 6, last_updated: '2026-09-15T16:24:56.34+00:00' },
  { user_id: '008a75d0-63aa-41cd-add5-a28b8d3268ad', player_name: "Ronin", level: 1, total_exp: 505, tier_index: 2, last_updated: '2026-09-15T14:23:53.45694+00:00' },
  { user_id: '99cc267d-0052-4655-a713-8b02d6989b7b', player_name: "Tabibito", level: 1, total_exp: 502, tier_index: 0, stat_flashcard: 1, stat_kanji: 4, last_updated: '2026-09-19T11:05:47.988856+00:00' },
  { user_id: 'b40e99b3-d9a4-41f7-9d8a-494edc1c2c9e', player_name: "Ronin", level: 1, total_exp: 499, tier_index: 0, stat_kanji: 1, stat_boss: 1, last_updated: '2026-09-26T11:45:16.151+00:00' },
  { user_id: 'baa5cdec-c893-4a0c-a766-c8a603f220a1', player_name: "Aryaadzz", level: 1, total_exp: 497, tier_index: 0, avatar_url: "⛩️", stat_flashcard: 23, stat_kanji: 18, last_updated: '2026-09-19T00:16:06.919+00:00' },
  { user_id: 'a9ce9871-58f7-4a34-8b34-2e1f8fd57d0f', player_name: "SevnSoul", level: 1, total_exp: 480, tier_index: 9, last_updated: '2026-09-17T13:36:40.649866+00:00' },
  { user_id: 'b82ed293-7c5d-45b5-aa17-91b00002030d', player_name: "Da'iz", level: 1, total_exp: 470, tier_index: 3, avatar_url: "👹", last_updated: '2026-09-15T16:36:09.190572+00:00' },
  { user_id: '79d5910d-67ec-4f2d-b6f2-2f88887ee631', player_name: "rey", level: 1, total_exp: 441, tier_index: 0, stat_flashcard: 2, last_updated: '2026-09-24T02:46:55.655+00:00' },
  { user_id: '298adce9-5dcb-4f27-8ada-0655588080d0', player_name: "Samurai", level: 1, total_exp: 435, tier_index: 0, last_updated: '2026-09-17T00:34:43.946655+00:00' },
  { user_id: 'f320bd7f-a6e1-4b8e-8ea7-34191bdce911', player_name: "Tabibito", level: 1, total_exp: 431, tier_index: 0, stat_flashcard: 2, stat_kanji: 1, last_updated: '2026-09-21T14:34:26.059+00:00' },
  { user_id: 'c7015556-987a-4603-a2a6-a6fc4b79111e', player_name: "Kai", level: 1, total_exp: 426, tier_index: 0, avatar_url: "🐼", stat_flashcard: 1, stat_kanji: 2, last_updated: '2026-09-17T02:53:11.409+00:00' },
  { user_id: 'ae62bb00-106e-47dd-90c0-81f2b68d4b0f', player_name: "Kenshi", level: 3, total_exp: 425, tier_index: 1, stat_flashcard: 3, stat_kanji: 1, last_updated: '2026-09-12T14:11:25.742+00:00' },
  { user_id: '1188c9c2-7df7-4e26-ac5a-90c06972fbd9', player_name: "Aspi", level: 1, total_exp: 415, tier_index: 0, avatar_url: "⛩️", stat_flashcard: 4, stat_kanji: 31, last_updated: '2026-09-25T02:44:45.48+00:00' },
  { user_id: '15ee0ffb-ecfe-43d1-87af-61f56cd37e9f', player_name: "Kenshi", level: 1, total_exp: 415, tier_index: 0, last_updated: '2026-09-18T01:36:13.092923+00:00' },
  { user_id: 'e0fdc423-ea87-48f5-baeb-6c66f9a29a92', player_name: "Gakusei", level: 1, total_exp: 411, tier_index: 0, stat_flashcard: 2, last_updated: '2026-09-24T01:15:58.995+00:00' },
  { user_id: '7ee9b9d2-9382-4b5e-a2f7-96c946146925', player_name: "Ronin", level: 1, total_exp: 400, tier_index: 3, last_updated: '2026-09-16T09:04:26.37429+00:00' },
  { user_id: '586e9b81-c249-4092-903e-1d1cec7dedf5', player_name: "Ronin", level: 1, total_exp: 397, tier_index: 0, stat_flashcard: 3, last_updated: '2026-09-16T19:34:04.237+00:00' },
  { user_id: '3dfe047d-ec78-4f7d-a6a4-a2d68b58a714', player_name: "Ninja", level: 1, total_exp: 342, tier_index: 0, stat_kanji: 5, last_updated: '2026-09-19T10:41:11.925+00:00' },
  { user_id: '5ae477dd-0bf8-4ec7-be92-57b913285eb5', player_name: "Gakusei", level: 1, total_exp: 340, tier_index: 2, last_updated: '2026-09-15T14:20:58.730274+00:00' },
  { user_id: 'f3a7f5fb-f1da-41f9-8d1f-21afbbd70560', player_name: "Tabibito", level: 1, total_exp: 340, tier_index: 0, stat_flashcard: 2, stat_kanji: 9, last_updated: '2026-09-26T13:54:41.187+00:00' },
  { user_id: 'aa7bacac-4215-40b2-bf57-0a693743ef67', player_name: "Wanderer", level: 1, total_exp: 334, tier_index: 0, stat_kanji: 2, last_updated: '2026-09-21T08:34:53.976+00:00' },
  { user_id: '68e9d20f-330d-421c-b3a8-f2eb805152ad', player_name: "Gakusei", level: 1, total_exp: 320, tier_index: 0, stat_flashcard: 1, last_updated: '2026-09-18T12:15:14.968+00:00' },
  { user_id: 'e3833e40-7ff8-4f7f-9bac-566ea0c33139', player_name: "Gakusei", level: 1, total_exp: 319, tier_index: 0, stat_flashcard: 1, stat_kanji: 2, last_updated: '2026-09-26T00:05:07.446+00:00' },
  { user_id: 'd66e9560-e117-4226-9313-e23b5466e677', player_name: "Ninja", level: 1, total_exp: 310, tier_index: 1, last_updated: '2026-09-24T12:50:39.674507+00:00' },
  { user_id: 'a1689493-5567-42bd-84ad-667d813ef4a7', player_name: "Ninja", level: 1, total_exp: 304, tier_index: 0, stat_flashcard: 2, last_updated: '2026-09-17T23:50:18.822626+00:00' },
  { user_id: 'e48f1918-8da8-4f04-8afd-26911eacf266', player_name: "Ronin", level: 1, total_exp: 298, tier_index: 0, stat_flashcard: 2, stat_kanji: 1, last_updated: '2026-09-20T23:57:16.294+00:00' },
  { user_id: '35a5f224-4640-4215-87ae-b1620b455194', player_name: "Gakusei", level: 1, total_exp: 290, tier_index: 1, last_updated: '2026-09-17T03:09:38.918968+00:00' },
  { user_id: 'd49e8e58-66c2-4498-8188-c15e71a0779a', player_name: "Kenshi", level: 1, total_exp: 275, tier_index: 0, last_updated: '2026-09-17T04:50:55.826576+00:00' },
  { user_id: '4558e0a3-b3be-4388-8b9d-9f1e4ef65d4f', player_name: "Gakusei", level: 1, total_exp: 273, tier_index: 0, stat_flashcard: 1, last_updated: '2026-09-26T11:15:23.968+00:00' },
  { user_id: '348a417e-395d-4ed3-83b6-d6655bda0ba5', player_name: "Ninja", level: 1, total_exp: 270, tier_index: 0, last_updated: '2026-09-17T01:15:57.949144+00:00' },
  { user_id: 'cdeea13e-2ba6-421d-9cae-2920806d07ca', player_name: "Ronin", level: 1, total_exp: 265, tier_index: 0, last_updated: '2026-09-17T13:56:41.21511+00:00' },
  { user_id: 'fb9b2dfe-2621-4749-8eb3-9cce796769d7', player_name: "ハスビ", level: 1, total_exp: 242, tier_index: 0, avatar_url: "🥷", stat_flashcard: 1, stat_kanji: 6, last_updated: '2026-09-24T11:10:18.889+00:00' },
  { user_id: '4bcafd64-bf64-4641-a7ec-d65a8addae98', player_name: "Tabibito", level: 1, total_exp: 240, tier_index: 0, last_updated: '2026-09-13T07:15:24.801741+00:00' },
  { user_id: '8c65fbd8-090b-4439-ab08-3a6700de7e4d', player_name: "Wanderer", level: 1, total_exp: 225, tier_index: 0, last_updated: '2026-09-16T14:28:37.272748+00:00' },
  { user_id: 'ffc8f324-fefa-4d28-942c-4346d78f83c9', player_name: "Gakusei", level: 1, total_exp: 220, tier_index: 0, last_updated: '2026-09-22T07:10:43.666+00:00' },
  { user_id: '52945da2-bbfa-411d-8c42-26304f25b4dd', player_name: "Tabibito", level: 1, total_exp: 210, tier_index: 0, last_updated: '2026-09-16T14:52:24.680188+00:00' },
  { user_id: 'e42b3ded-155b-4774-91c8-9820c7ccd687', player_name: "Kenshi", level: 1, total_exp: 210, tier_index: 0, last_updated: '2026-09-16T02:07:48.621393+00:00' },
  { user_id: '24a73573-4fe2-4a7b-9a07-df881c861b45', player_name: "Wanderer", level: 1, total_exp: 210, tier_index: 1, last_updated: '2026-09-16T16:28:49.958401+00:00' },
  { user_id: '04ee77a1-dbf0-4664-93b8-111d1b3d9049', player_name: "Ronin", level: 1, total_exp: 207, tier_index: 0, stat_flashcard: 5, stat_kanji: 13, last_updated: '2026-09-19T08:43:31.315+00:00' },
  { user_id: 'ea45f733-8f84-49e2-bdd5-0b88543b2c92', player_name: "Kishin", level: 1, total_exp: 207, tier_index: 0, avatar_url: "🌸", stat_flashcard: 2, last_updated: '2026-09-25T04:19:24.5+00:00' },
  { user_id: '76acb127-cd3f-47cb-933d-2e43d9c2a015', player_name: "Kenshi", level: 1, total_exp: 200, tier_index: 0, last_updated: '2026-09-16T03:55:33.952532+00:00' },
  { user_id: '310807a7-7ff8-4f0a-a568-4c5db7be637b', player_name: "Ninja", level: 1, total_exp: 200, tier_index: 0, last_updated: '2026-09-16T11:38:00.788791+00:00' },
  { user_id: '593af284-2d2a-47c5-8541-0fc757d1704c', player_name: "Tabibito", level: 1, total_exp: 195, tier_index: 1, last_updated: '2026-09-16T08:41:00.239546+00:00' },
];

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  currentUserId,
  currentUserStats,
  soundEnabled,
  onOpenStatusModal,
  onUpdateSignature,
  isActive = true,
}) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('all-time');

  // Load cached or seed entries immediately for instant 0ms rendering
  const [allTimeEntries, setAllTimeEntries] = useState<LeaderboardEntry[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_LB_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return SEED_LEADERBOARD_ENTRIES;
  });

  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_WEEKLY_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [selectedPlayer, setSelectedPlayer] = useState<(LeaderboardEntry & { rank?: number; weeklyScore?: number }) | null>(null);
  
  // If we already have items (from cache or seed), do not block with full loader
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(100);

  const [totalDbCount, setTotalDbCount] = useState<number>(() => {
    try {
      const cachedCount = localStorage.getItem(STORAGE_KEY_TOTAL_COUNT);
      if (cachedCount) return Number(cachedCount) || 286;
    } catch {}
    return 286;
  });

  const [myRankInfo, setMyRankInfo] = useState<UserRankInfo | null>(() => {
    try {
      const cachedRank = localStorage.getItem(STORAGE_KEY_MY_RANK);
      if (cachedRank) return JSON.parse(cachedRank);
    } catch {}
    return null;
  });

  // Guard ref against duplicate concurrent fetches
  const isFetchingRef = useRef(false);

  const fetchLeaderboard = async (isManualRefresh = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualRefresh) {
      setIsRefreshing(true);
      playSound('click', soundEnabled);
    } else {
      // If active list is completely empty, show loader; otherwise background sync
      const currentList = activeTab === 'all-time' ? allTimeEntries : weeklyEntries;
      if (currentList.length === 0) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
    }

    try {
      if (activeTab === 'all-time') {
        const data = await getLeaderboard(displayLimit);
        if (data && data.length > 0) {
          setAllTimeEntries(data);
          setHasError(false);
          try {
            localStorage.setItem(STORAGE_KEY_LB_CACHE, JSON.stringify(data));
          } catch {}
        } else if (allTimeEntries.length === 0) {
          setHasError(true);
        }

        // Fast rank lookup using preloaded data
        if (currentUserId) {
          const listForRank = (data && data.length > 0) ? data : allTimeEntries;
          const rankInfo = await getUserLeaderboardRank(currentUserId, listForRank);
          if (rankInfo) {
            setMyRankInfo(rankInfo);
            try {
              localStorage.setItem(STORAGE_KEY_MY_RANK, JSON.stringify(rankInfo));
            } catch {}
            if (rankInfo.totalPlayers) {
              setTotalDbCount(rankInfo.totalPlayers);
              try {
                localStorage.setItem(STORAGE_KEY_TOTAL_COUNT, String(rankInfo.totalPlayers));
              } catch {}
            }
          }
        }
      } else {
        const currentWeekId = getCurrentWeekId();
        const data = await getWeeklyLeaderboard(currentWeekId, displayLimit);
        setWeeklyEntries(data);
        setHasError(false);
      }
    } catch (err) {
      console.warn('Leaderboard fetch caught error:', err);
      if (activeTab === 'all-time' && allTimeEntries.length === 0) {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  // Single unified controller effect: triggers when tab becomes active or params change
  useEffect(() => {
    if (!isActive) return;
    fetchLeaderboard();
  }, [isActive, activeTab, displayLimit]);

  const handleSelectPlayer = (entry: LeaderboardEntry | WeeklyLeaderboardEntry, index: number) => {
    playSound('open_modal', soundEnabled);
    if (activeTab === 'all-time') {
      const allTime = entry as LeaderboardEntry;
      const totalExp = allTime.total_exp || 0;
      const computedTierIndex = getTierForExp(totalExp).tierIndex;
      setSelectedPlayer({
        ...allTime,
        tier_index: computedTierIndex,
        rank: index + 1,
      });
    } else {
      const weekly = entry as WeeklyLeaderboardEntry;
      const allTimeMatch = allTimeEntries.find((e) => e.user_id === weekly.user_id);
      const totalExp = allTimeMatch?.total_exp || weekly.score;
      const computedTierIndex = getTierForExp(totalExp).tierIndex;
      setSelectedPlayer({
        user_id: weekly.user_id,
        player_name: weekly.player_name,
        level: allTimeMatch?.level || 1,
        total_exp: totalExp,
        tier_index: computedTierIndex,
        last_updated: weekly.updated_at,
        avatar_url: weekly.avatar_url || allTimeMatch?.avatar_url,
        stat_tryout: allTimeMatch?.stat_tryout || 0,
        stat_flashcard: allTimeMatch?.stat_flashcard || 0,
        stat_kanji: allTimeMatch?.stat_kanji || 0,
        stat_boss: allTimeMatch?.stat_boss || 0,
        rank: index + 1,
        weeklyScore: weekly.score,
      });
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400 shrink-0" fill="currentColor" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300 shrink-0" fill="currentColor" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700 shrink-0" fill="currentColor" />;

    const rankNum = index + 1;
    const isLarge = rankNum >= 100;

    return (
      <span
        className={`font-bold font-mono tabular-nums text-text-muted text-center whitespace-nowrap leading-none ${
          isLarge ? 'text-xs tracking-tight' : 'text-sm'
        }`}
      >
        {rankNum}
      </span>
    );
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'panel border border-gold/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.3)] text-text-primary';
    if (index === 1) return 'panel border border-border-primary shadow-sm text-text-primary';
    if (index === 2) return 'panel border border-border-subtle shadow-sm text-text-primary';
    return 'panel border border-border-subtle/50 shadow-sm text-text-primary';
  };

  const currentEntries = activeTab === 'all-time' ? allTimeEntries : weeklyEntries;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="panel p-4 sm:p-5 mb-4 shadow-md border border-border-subtle flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading tracking-wide text-text-primary flex items-center gap-2">
            <Trophy className="w-5 h-5 text-gold" />
            Global Rankings
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">Compete with scholars around the world</p>
        </div>
        <button
          onClick={() => fetchLeaderboard(true)}
          disabled={isRefreshing || isLoading}
          className="py-2 px-3.5 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle flex items-center gap-1.5 shrink-0 text-xs font-mono font-bold transition-all shadow-inner active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-gold' : ''}`} />
          <span>{isRefreshing ? 'SYNCING...' : 'REFRESH'}</span>
        </button>
      </div>

      {/* Tabs as Skeuomorphic Pills */}
      <div className="skeuo-tier-row mb-4">
        <button
          onClick={() => {
            setActiveTab('all-time');
            playSound('click', soundEnabled);
          }}
          className={`skeuo-tier-pill flex-1 flex justify-center items-center gap-2 ${activeTab === 'all-time' ? 'active' : ''}`}
        >
          <Trophy className="w-4 h-4" />
          Hall of Fame
        </button>
        <button
          onClick={() => {
            setActiveTab('weekly');
            playSound('click', soundEnabled);
          }}
          className={`skeuo-tier-pill flex-1 flex justify-center items-center gap-2 ${activeTab === 'weekly' ? 'active' : ''}`}
        >
          <Flame className="w-4 h-4" />
          Weekly Arena
        </button>
      </div>

      {/* Description Context & Connection Status */}
      <div className="px-3.5 py-2.5 text-xs text-center text-text-secondary bg-surface-inset rounded-xl border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-1.5 shadow-inner">
        <span className="font-medium">
          {activeTab === 'all-time' 
            ? `Total EXP seumur hidup • Menampilkan ${displayLimit === 100 ? 'Top 100' : 'Semua'} (${currentEntries.length} dari ${totalDbCount} petualang).`
            : "Peringkat mingguan dari skor Quiz dan Kanji. Direset setiap hari Senin!"}
        </span>
        {hasError ? (
          <button
            onClick={() => fetchLeaderboard(true)}
            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold font-mono flex items-center gap-1 cursor-pointer transition-colors"
            title="Klik untuk mencoba menghubungkan kembali"
          >
            <WifiOff className="w-3 h-3 text-amber-400" />
            Mode Offline • Coba Lagi
          </button>
        ) : isRefreshing ? (
          <span className="text-[10px] text-gold font-bold font-mono flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-gold" />
            Sinkronisasi data...
          </span>
        ) : (
          <span className="text-[10px] text-emerald-400 font-bold font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Real-time Synced
          </span>
        )}
      </div>

      {/* Leaderboard List mapped to Skeuomorphic Canvas Card */}
      <div className="journey-canvas-card rounded-3xl overflow-hidden border shadow-md relative min-h-[400px]">
        {/* Grayscale SVG Turbulence Grain Background Overlay */}
        <div className="skeuo-grain rounded-3xl" />
        
        <div className="relative z-10 h-full p-2 sm:p-4">
          {isLoading && currentEntries.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-secondary gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
              <span className="text-sm font-bold font-heading">Mencari juara arena...</span>
            </div>
          ) : currentEntries.length === 0 ? (
            hasError ? (
              <div className="py-16 px-4 flex flex-col items-center justify-center text-center text-text-secondary">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3">
                  <WifiOff className="w-7 h-7 text-amber-400" />
                </div>
                <p className="font-bold font-heading text-text-primary text-base">Gagal Memuat Arena</p>
                <p className="text-xs mt-1.5 text-text-muted max-w-xs">
                  Koneksi internet tidak stabil. Ketuk tombol di bawah untuk menyegarkan data.
                </p>
                <button
                  type="button"
                  onClick={() => fetchLeaderboard(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>COBA MUAT ULANG</span>
                </button>
              </div>
            ) : activeTab === 'weekly' ? (
              <div className="py-16 px-4 flex flex-col items-center justify-center text-center text-text-secondary">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-3">
                  <Flame className="w-7 h-7 text-rose-400" />
                </div>
                <p className="font-bold font-heading text-text-primary text-base">Arena Mingguan Baru Dimulai!</p>
                <p className="text-xs mt-1.5 text-text-muted max-w-xs leading-relaxed">
                  Peringkat direset setiap hari Senin. Kerjakan Quiz atau Kanji hari ini untuk menjadi petualang pertama di papan peringkat mingguan!
                </p>
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-text-secondary text-sm">
                <Trophy className="w-12 h-12 mb-3 opacity-30 text-gold" />
                <p className="font-bold font-heading">Belum ada yang menaklukkan arena ini.</p>
                <p className="text-xs mt-1 text-text-muted">Jadilah yang pertama untuk meraih kemenangan!</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              {currentEntries.map((entry, index) => {
                const isMe = entry.user_id === currentUserId;

                // Type coercion for dynamic rendering
                const expToDisplay = activeTab === 'all-time' 
                  ? (entry as LeaderboardEntry).total_exp 
                  : (entry as WeeklyLeaderboardEntry).score;

                // Dynamically reconcile tier with rebalanced EXP curve
                const { tierIndex: computedTierIndex } = getTierForExp(expToDisplay);
                const tier = RPG_TIERS[computedTierIndex];
                const userGender = (entry as any)?.character_gender || (entry as any)?.characterGender || 'male';
                const avatarMap = userGender === 'female' ? TIER_AVATAR_FEMALE_MAP : TIER_AVATAR_MAP;
                const avatarThumbnail = avatarMap[tier?.tier || 1];
                  
                const levelToDisplay = activeTab === 'all-time'
                  ? (entry as LeaderboardEntry).level
                  : null; // Weekly doesn't have level

                return (
                  <div
                    key={entry.user_id}
                    onClick={() => handleSelectPlayer(entry, index)}
                    className={`flex items-center gap-3 p-3 sm:px-4 rounded-2xl transition-all border shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${getRankStyle(index)} ${isMe ? 'border-gold/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.35)] scale-[1.01]' : ''}`}
                    title="Klik untuk melihat profil karakter petualang"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center min-w-[2.25rem] sm:min-w-[2.5rem] w-auto shrink-0 px-0.5 text-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar / Character Portrait */}
                    <div className="w-10 h-10 rounded-xl bg-surface-inset flex flex-col items-center justify-center shrink-0 border border-border-subtle overflow-hidden shadow-inner relative">
                      {entry.avatar_url ? (
                        <span className="text-xl leading-none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                          {entry.avatar_url}
                        </span>
                      ) : avatarThumbnail ? (
                        <img
                          src={avatarThumbnail}
                          alt={tier?.name || 'Avatar'}
                          className="w-full h-full object-cover object-top filter drop-shadow-sm"
                          loading="lazy"
                        />
                      ) : tier ? (
                        <span className="font-bold text-text-muted opacity-80">{tier.name.charAt(0)}</span>
                      ) : (
                        <div className="w-6 h-6 bg-surface-elevated rounded-full" />
                      )}
                      {levelToDisplay && (
                        <span className="absolute bottom-0 text-[8px] font-mono font-bold text-gold bg-black/70 px-1 rounded-t">
                          Lv.{levelToDisplay}
                        </span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold truncate max-w-[120px] sm:max-w-[200px]">
                          {entry.player_name}
                        </span>
                        {isMe && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            activeTab === 'all-time' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 truncate">
                        {tier?.name || 'Novice'}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold text-sm sm:text-base tracking-tight drop-shadow-md ${
                        activeTab === 'all-time' ? 'text-amber-300' : 'text-rose-300'
                      }`}>
                        {expToDisplay.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest opacity-60">
                        {activeTab === 'all-time' ? 'TOTAL XP' : 'WEEK SCORE'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Expand All / Collapse Toggle if DB has more than 100 players */}
              {activeTab === 'all-time' && totalDbCount > 100 && (
                <div className="text-center pt-3 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayLimit(prev => prev === 100 ? 500 : 100);
                      playSound('click', soundEnabled);
                    }}
                    className="px-4 py-2 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                  >
                    {displayLimit === 100 ? (
                      <>
                        <ChevronDown className="w-4 h-4 text-gold" />
                        <span>Tampilkan Seluruh Petualang ({totalDbCount} Pemain)</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4 text-gold" />
                        <span>Kembali ke Top 100 Hall of Fame</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prominent Bottom Bar for Current Player's Rank & Standing (Floating above bottom navigation) */}
      {myRankInfo && (
        <div className="sticky bottom-16 sm:bottom-20 z-20 mt-3 animate-fade-in">
          <div
            onClick={() => {
              handleSelectPlayer(myRankInfo.entry, myRankInfo.rank - 1);
            }}
            className="p-3 sm:px-4 rounded-2xl bg-surface-elevated/95 border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-between gap-3 cursor-pointer hover:border-border-primary transition-all hover:scale-[1.01] active:scale-[0.99]"
            title="Klik untuk melihat detail profil petualang kamu"
          >
            {/* Rank badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shrink-0 text-amber-400 font-mono font-black text-xs shadow-inner">
                #{myRankInfo.rank}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm truncate text-text-primary">
                    {myRankInfo.entry.player_name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-black uppercase tracking-wider">
                    YOU
                  </span>
                </div>
                <div className="text-[11px] text-text-muted flex items-center gap-1 truncate">
                  {myRankInfo.rank <= 100 ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-emerald-400" />
                      Masuk Top 100 Dunia!
                    </span>
                  ) : (
                    <span className="text-amber-300 font-medium">
                      ⚔️ Butuh {Math.max(1, myRankInfo.cutoffExpTop100 - (myRankInfo.entry.total_exp || 0) + 1)} EXP lagi ke Top 100
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* EXP Score */}
            <div className="text-right shrink-0">
              <div className="font-mono font-black text-sm sm:text-base text-amber-300">
                {myRankInfo.entry.total_exp.toLocaleString()}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-text-muted">
                Peringkat #{myRankInfo.rank} / {myRankInfo.totalPlayers}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Portal Modal (Teleported to document.body) */}
      <PlayerProfileModal
        player={selectedPlayer}
        isOpen={Boolean(selectedPlayer)}
        onClose={() => setSelectedPlayer(null)}
        isCurrentUser={selectedPlayer?.user_id === currentUserId}
        soundEnabled={soundEnabled}
        onOpenFullStatusModal={onOpenStatusModal}
        currentUserStats={currentUserStats}
        onUpdateSignature={onUpdateSignature}
      />
    </div>
  );
};
