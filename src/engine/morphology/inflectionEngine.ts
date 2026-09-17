// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — MORPHOLOGICAL CONJUGATOR
// ==============================================================================

import {
  VerbGroup,
  ConjugationForm,
  VerbConjugationResult,
  AdjectiveType,
  AdjectiveForm,
  AdjectiveConjugationResult,
} from '../types';

/**
 * Well-known Godan verbs ending in -iru or -eru that mimic Ichidan verbs.
 */
const GODAN_EXCEPTIONS = new Set([
  '帰る', 'かえる',
  '入る', 'はいる',
  '走る', 'はしる',
  '切る', 'きる',
  '知る', 'しる',
  '要る', 'いる',
  '減る', 'へる',
  '喋る', 'しゃべる',
  '滑る', 'すべる',
  '蹴る', 'ける',
  '照る', 'てる',
  '握る', 'にぎる',
  '限る', 'かぎる',
  '散る', 'ちる',
  '焦る', 'あせる',
  '遮る', 'さえぎる',
  '覆る', 'くつがえる',
  '蘇る', 'よみがえる',
  '参る', 'まいる',
]);

/**
 * Detect the grammatical group of a Japanese verb.
 */
export function detectVerbGroup(word: string, reading?: string): VerbGroup {
  const w = word.trim();
  const r = (reading || '').trim();

  // 1. Suru verbs (e.g. する, 勉強する, 散歩する)
  if (w === 'する' || r === 'する' || w.endsWith('する') || r.endsWith('する')) {
    return 'suru';
  }

  // 2. Kuru verbs (e.g. 来る, くる, やって来る)
  if (w === '来る' || r === 'くる' || w.endsWith('来る') || r.endsWith('くる')) {
    return 'kuru';
  }

  // 3. Known Godan exceptions ending in -eru / -iru
  if (GODAN_EXCEPTIONS.has(w) || GODAN_EXCEPTIONS.has(r)) {
    return 'godan';
  }

  // 4. Verbs not ending in 'る' are always Godan (う, く, ぐ, す, つ, ぬ, ぶ, む)
  if (!w.endsWith('る') && !r.endsWith('る')) {
    return 'godan';
  }

  // 5. Verbs ending in 'る' preceded by 'i' or 'e' vowel sound are usually Ichidan
  const target = r || w;
  if (target.length >= 2) {
    const charBeforeRu = target[target.length - 2];
    const isIchidanVowel = /[いきしちにひみりぎじぢびぴえけせてねへめれげぜでべぺ]/.test(charBeforeRu);
    if (isIchidanVowel) {
      return 'ichidan';
    }
  }

  return 'godan';
}

/**
 * High-precision Verb Conjugator
 */
export function conjugateVerb(word: string, reading?: string): VerbConjugationResult {
  const w = word.trim();
  const r = (reading || w).trim();
  const group = detectVerbGroup(w, r);

  const forms: Record<ConjugationForm, { japanese: string; reading: string }> = {} as any;

  // ─────────────────────────────────────────────────────────────
  // 1. SURU VERBS
  // ─────────────────────────────────────────────────────────────
  if (group === 'suru') {
    const prefixJp = w === 'する' ? '' : w.slice(0, -2);
    const prefixRd = r === 'する' ? '' : r.slice(0, -2);

    const make = (suffixJp: string, suffixRd: string) => ({
      japanese: prefixJp + suffixJp,
      reading: prefixRd + suffixRd,
    });

    forms.jisho = { japanese: w, reading: r };
    forms.masu = make('します', 'します');
    forms.masu_stem = make('し', 'し');
    forms.te = make('して', 'して');
    forms.ta = make('した', 'した');
    forms.nai = make('しない', 'しない');
    forms.nakatta = make('しなかった', 'しなかった');
    forms.ba = make('すれば', 'すれば');
    forms.tara = make('したら', 'したら');
    forms.volitional = make('しよう', 'しよう');
    forms.imperative = make('しろ', 'しろ');
    forms.potential = make('できる', 'できる');
    forms.passive = make('される', 'される');
    forms.causative = make('させる', 'させる');
    forms.causative_passive = make('させられる', 'させられる');
    forms.tai = make('したい', 'したい');
    forms.sou_appearance = make('しそう', 'しそう');
    forms.sou_hearsay = make('するそう', 'するそう');
    forms.yasui = make('しやすい', 'しやすい');
    forms.nikui = make('しにくい', 'しにくい');

    return { word: w, reading: r, group, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. KURU VERBS
  // ─────────────────────────────────────────────────────────────
  if (group === 'kuru') {
    const isKanji = w.includes('来');
    const prefixJp = isKanji ? w.replace(/来[る|て|た|ない]*$/, '') : w.replace(/くる$/, '');
    const prefixRd = r.replace(/くる$/, '');

    const makeKuru = (kanjiEnding: string, kanaEnding: string) => ({
      japanese: prefixJp + (isKanji ? kanjiEnding : kanaEnding),
      reading: prefixRd + kanaEnding,
    });

    forms.jisho = { japanese: w, reading: r };
    forms.masu = makeKuru('来ます', 'きます');
    forms.masu_stem = makeKuru('来', 'き');
    forms.te = makeKuru('来て', 'きて');
    forms.ta = makeKuru('来た', 'きた');
    forms.nai = makeKuru('来ない', 'こない');
    forms.nakatta = makeKuru('来なかった', 'こなかった');
    forms.ba = makeKuru('来れば', 'くれば');
    forms.tara = makeKuru('来たら', 'きたら');
    forms.volitional = makeKuru('来よう', 'こよう');
    forms.imperative = makeKuru('来い', 'こい');
    forms.potential = makeKuru('来られる', 'こられる');
    forms.passive = makeKuru('来られる', 'こられる');
    forms.causative = makeKuru('来させる', 'こさせる');
    forms.causative_passive = makeKuru('来させられる', 'こさせられる');
    forms.tai = makeKuru('来たい', 'きたい');
    forms.sou_appearance = makeKuru('来そう', 'きそう');
    forms.sou_hearsay = makeKuru('来るそう', 'くるそう');
    forms.yasui = makeKuru('来やすい', 'きやすい');
    forms.nikui = makeKuru('来にくい', 'きにくい');

    return { word: w, reading: r, group, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ICHIDAN VERBS
  // ─────────────────────────────────────────────────────────────
  if (group === 'ichidan') {
    const stemJp = w.slice(0, -1);
    const stemRd = r.slice(0, -1);

    const make = (suffix: string) => ({
      japanese: stemJp + suffix,
      reading: stemRd + suffix,
    });

    forms.jisho = { japanese: w, reading: r };
    forms.masu = make('ます');
    forms.masu_stem = make('');
    forms.te = make('て');
    forms.ta = make('た');
    forms.nai = make('ない');
    forms.nakatta = make('なかった');
    forms.ba = make('れば');
    forms.tara = make('たら');
    forms.volitional = make('よう');
    forms.imperative = make('ろ');
    forms.potential = make('られる');
    forms.passive = make('られる');
    forms.causative = make('させる');
    forms.causative_passive = make('させられる');
    forms.tai = make('たい');
    forms.sou_appearance = make('そう');
    forms.sou_hearsay = { japanese: w + 'そう', reading: r + 'そう' };
    forms.yasui = make('やすい');
    forms.nikui = make('にくい');

    return { word: w, reading: r, group, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. GODAN VERBS
  // ─────────────────────────────────────────────────────────────
  const lastCharRd = r[r.length - 1];
  const stemJp = w.slice(0, -1);
  const stemRd = r.slice(0, -1);

  // Godan Kana shifts mapping
  const shifts: Record<string, { a: string; i: string; e: string; o: string; te: string; ta: string }> = {
    'う': { a: 'わ', i: 'い', e: 'え', o: 'おう', te: 'って', ta: 'った' },
    'く': { a: 'か', i: 'き', e: 'け', o: 'こう', te: 'いて', ta: 'いた' },
    'ぐ': { a: 'が', i: 'ぎ', e: 'げ', o: 'ごう', te: 'いで', ta: 'いだ' },
    'す': { a: 'さ', i: 'し', e: 'せ', o: 'そう', te: 'して', ta: 'した' },
    'つ': { a: 'た', i: 'ち', e: 'て', o: 'とう', te: 'って', ta: 'った' },
    'ぬ': { a: 'な', i: 'に', e: 'ね', o: 'のう', te: 'んで', ta: 'んだ' },
    'ぶ': { a: 'ば', i: 'び', e: 'べ', o: 'ぼう', te: 'んで', ta: 'んだ' },
    'む': { a: 'ま', i: 'み', e: 'め', o: 'もう', te: 'んで', ta: 'んだ' },
    'る': { a: 'ら', i: 'り', e: 'れ', o: 'ろう', te: 'って', ta: 'った' },
  };

  const shift = shifts[lastCharRd] || shifts['う'];

  // Special Irregular: 行く (iku / yuku) -> 行って / 行った (not iite / iida)
  let teSuffix = shift.te;
  let taSuffix = shift.ta;
  if (w === '行く' || r === 'いく' || r === 'ゆく') {
    teSuffix = 'って';
    taSuffix = 'った';
  }

  const make = (suffixJp: string, suffixRd?: string) => ({
    japanese: stemJp + suffixJp,
    reading: stemRd + (suffixRd || suffixJp),
  });

  forms.jisho = { japanese: w, reading: r };
  forms.masu = make(shift.i + 'ます');
  forms.masu_stem = make(shift.i);
  forms.te = make(teSuffix);
  forms.ta = make(taSuffix);
  forms.nai = make(shift.a + 'ない');
  forms.nakatta = make(shift.a + 'なかった');
  forms.ba = make(shift.e + 'ば');
  forms.tara = make(taSuffix + 'ら');
  forms.volitional = make(shift.o);
  forms.imperative = make(shift.e);
  forms.potential = make(shift.e + 'る');
  forms.passive = make(shift.a + 'れる');
  forms.causative = make(shift.a + 'せる');
  forms.causative_passive = make(shift.a + 'せられる');
  forms.tai = make(shift.i + 'たい');
  forms.sou_appearance = make(shift.i + 'そう');
  forms.sou_hearsay = { japanese: w + 'そう', reading: r + 'そう' };
  forms.yasui = make(shift.i + 'やすい');
  forms.nikui = make(shift.i + 'にくい');

  return { word: w, reading: r, group, forms };
}

/**
 * High-precision Adjective Conjugator
 */
export function conjugateAdjective(
  word: string,
  reading: string | undefined,
  type: AdjectiveType
): AdjectiveConjugationResult {
  const w = word.trim();
  const r = (reading || w).trim();

  const forms: Record<AdjectiveForm, { japanese: string; reading: string }> = {} as any;

  // ─────────────────────────────────────────────────────────────
  // I-KEIYOUSHIS
  // ─────────────────────────────────────────────────────────────
  if (type === 'i') {
    // Special case: いい (ii / yoi)
    if (w === 'いい' || r === 'いい' || w === '良い') {
      forms.base = { japanese: w, reading: r };
      forms.negative = { japanese: 'よくない', reading: 'よくない' };
      forms.past = { japanese: 'よかった', reading: 'よかった' };
      forms.past_negative = { japanese: 'よくなかった', reading: 'よくなかった' };
      forms.te = { japanese: 'よくて', reading: 'よくて' };
      forms.adverbial = { japanese: 'よく', reading: 'よく' };
      forms.sou_appearance = { japanese: 'よさそう', reading: 'よさそう' };
      forms.attributive = { japanese: w, reading: r };
      return { word: w, reading: r, type, forms };
    }

    const stemJp = w.replace(/い$/, '');
    const stemRd = r.replace(/い$/, '');

    const make = (suffix: string) => ({
      japanese: stemJp + suffix,
      reading: stemRd + suffix,
    });

    forms.base = { japanese: w, reading: r };
    forms.negative = make('くない');
    forms.past = make('かった');
    forms.past_negative = make('くなかった');
    forms.te = make('くて');
    forms.adverbial = make('く');
    forms.sou_appearance = make('そう');
    forms.attributive = { japanese: w, reading: r };

    return { word: w, reading: r, type, forms };
  }

  // ─────────────────────────────────────────────────────────────
  // NA-KEIYOUSHIS
  // ─────────────────────────────────────────────────────────────
  // Normalize if user provided with 'な' or 'だ' at the end
  const cleanJp = w.replace(/[なだ]$/, '');
  const cleanRd = r.replace(/[なだ]$/, '');

  const make = (suffix: string) => ({
    japanese: cleanJp + suffix,
    reading: cleanRd + suffix,
  });

  forms.base = { japanese: cleanJp, reading: cleanRd };
  forms.negative = make('じゃない');
  forms.past = make('だった');
  forms.past_negative = make('じゃなかった');
  forms.te = make('で');
  forms.adverbial = make('に');
  forms.sou_appearance = make('そう');
  forms.attributive = make('な');

  return { word: cleanJp, reading: cleanRd, type, forms };
}
