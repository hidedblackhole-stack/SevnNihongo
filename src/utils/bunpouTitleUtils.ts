// Utility to derive canonical grammar pattern titles & formation rules from BunpouItem
// Eliminates raw formula symbols (+, ;, /), example sentences, and crowded patterns from main titles.
// Provides a clean, human-friendly hierarchy:
// 1. mainTitle: Clean Japanese grammar title (e.g. "〜ように言う / 〜ように頼む")
// 2. formationRule: Clean formation/connection pattern (e.g. "Vる・Vない + ように")
// 3. audioTarget: Pronounceable text for speech synthesis

import { BunpouItem } from '../types/content';

export interface GrammarTitleInfo {
  mainTitle: string;
  formationRule?: string;
  audioTarget: string;
}

/**
 * Derives a structured, clean grammar title info containing:
 * - mainTitle: The primary grammar point name (human-readable, free of formulas/semicolons)
 * - formationRule: The connection/formation pattern (if applicable)
 * - audioTarget: Text suitable for audio speech
 */
export function getGrammarTitleInfo(item: Pick<BunpouItem, 'title' | 'formula'>): GrammarTitleInfo {
  if (!item || !item.title) {
    return { mainTitle: '', audioTarget: '' };
  }

  const rawTitle = item.title.trim();
  const rawFormula = (item.formula || '').trim();

  // If there are no fullwidth or halfwidth parentheses, title is already direct
  if (!rawTitle.includes('（') && !rawTitle.includes('(')) {
    let cleanFormula = rawFormula
      .replace(/[\uff0b+]/g, ' + ')
      .replace(/[\uff0f/]/g, ' / ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanFormula === rawTitle || !cleanFormula) {
      cleanFormula = undefined;
    }

    return {
      mainTitle: rawTitle,
      formationRule: cleanFormula,
      audioTarget: rawTitle.replace(/^[〜~]/, '')
    };
  }

  // Handle specific well-known titles that should stay as-is
  if (rawTitle === '動詞（非過去）') return { mainTitle: '動詞（非過去）', audioTarget: '動詞' };
  if (rawTitle === '〜ないもの（だろう）か') {
    return {
      mainTitle: '〜ないものだろうか',
      formationRule: 'Vない + ものだろうか',
      audioTarget: 'ないものだろうか'
    };
  }
  if (rawTitle.includes('総まとめ')) {
    return { mainTitle: rawTitle, audioTarget: rawTitle };
  }

  const openIdx = rawTitle.indexOf('（') !== -1 ? rawTitle.indexOf('（') : rawTitle.indexOf('(');
  const closeIdx = rawTitle.lastIndexOf('）') !== -1 ? rawTitle.lastIndexOf('）') : rawTitle.lastIndexOf(')');
  const inside = rawTitle.slice(openIdx + 1, closeIdx !== -1 ? closeIdx : undefined).trim();

  // 1. Special cases for grammar function descriptions inside parentheses
  if (inside.includes('受身') || inside.includes('passive')) {
    return {
      mainTitle: '〜れる / 〜られる',
      formationRule: rawFormula.includes('（Nに）') ? '(Nに) + Vれる' : 'V[受身形]',
      audioTarget: 'れる'
    };
  }
  if (
    inside.includes('使役') ||
    inside.includes('causative') ||
    inside.includes('(さ)せて') ||
    inside.includes('させて')
  ) {
    if (rawFormula.includes('V(さ)せて') || rawTitle.includes('ください') || inside.includes('ください')) {
      return {
        mainTitle: '〜(さ)せてください',
        formationRule: 'V(さ)せて + ください / もらえますか',
        audioTarget: 'させてください'
      };
    }
    return {
      mainTitle: '〜(さ)せる',
      formationRule: 'V[使役形]',
      audioTarget: 'させる'
    };
  }
  if (inside.includes('noun-forming') || inside.includes('nominalizer')) {
    if (inside.includes('→さ')) return { mainTitle: '〜さ', formationRule: 'Aい(〜さ)・na + さ (名詞化)', audioTarget: 'さ' };
    if (inside.includes('→み')) return { mainTitle: '〜み', formationRule: 'Aい(〜み)・na + み (名詞化)', audioTarget: 'み' };
    if (inside.includes('＋の') || inside.includes('の,')) return { mainTitle: '〜の', formationRule: 'V・A・na・N + の (名詞化)', audioTarget: 'の' };
    if (inside.includes('こと')) return { mainTitle: '〜こと', formationRule: 'V・A・na・N + こと (名詞化)', audioTarget: 'こと' };
  }
  if (inside.includes('特別な敬語')) return { mainTitle: '敬語 (尊敬・謙譲)', audioTarget: '敬語' };
  if (inside.includes('丁寧な尋ね方')) return { mainTitle: '〜でしょうか', formationRule: '丁寧な尋ね方', audioTarget: 'でしょうか' };
  if (inside.includes('伝言・依頼')) return { mainTitle: '〜お伝えください', formationRule: '伝言・依頼', audioTarget: 'お伝えください' };

  // 2. Parse clauses separated by semicolon (e.g. 'Vるよう(に)＋言う／頼む；Vないよう(に)')
  const clauses = inside.split(/[\uff1b;]/).map((s) => s.trim());
  let mainClause = clauses[0];

  // Remove English translation segment if separated by ' / '
  if (mainClause.includes(' / ') && /[a-zA-Z]/.test(mainClause.split(' / ')[1])) {
    mainClause = mainClause.split(' / ')[0].trim();
  }

  // Check for connector before ＋ or +
  let formationPart = '';
  let mainCore = mainClause;
  const plusMatch = mainClause.match(/^(.*?)[＋+](.*)$/);
  if (plusMatch) {
    formationPart = plusMatch[1].trim();
    mainCore = plusMatch[2].trim();
  }

  let cleanMain = '';

  // Case A: 〜ように言う / 〜ように頼む
  if (plusMatch && (formationPart.includes('よう') || inside.includes('よう'))) {
    const verbs = mainCore.split(/[\uff0f/]/).map((v) => v.trim()).filter(Boolean);
    if (verbs.length > 1) {
      cleanMain = verbs.map((v) => '〜ように' + v.replace(/^〜?ように/, '')).join(' / ');
    } else {
      cleanMain = '〜ように' + mainCore.replace(/^〜?ように/, '');
    }
    formationPart = 'Vる・Vない + ように';
  }
  // Case B: 〜てくれと頼まれる / 言われる
  else if (plusMatch && (formationPart.includes('くれと') || inside.includes('くれと'))) {
    const verbs = mainCore.split(/[\uff0f/]/).map((v) => v.trim()).filter(Boolean);
    if (verbs.length > 1) {
      cleanMain = verbs.map((v) => '〜てくれと' + v).join(' / ');
    } else {
      cleanMain = '〜てくれと' + mainCore;
    }
    formationPart = 'Vてくれと・Vないでくれと + 頼まれる';
  }
  // Case C: 〜と言われる / 〜と注意される
  else if (plusMatch && mainCore.match(/^と[＋+]?(?:言われる|注意される|しかられる|怒られる|伝える|聞く)/)) {
    const verbs = mainCore.replace(/^と[＋+]?/, '').split(/[\uff0f/]/).map((v) => v.trim()).filter(Boolean);
    cleanMain = verbs.slice(0, 2).map((v) => '〜と' + v).join(' / ');
    formationPart = 'V命令形・Vるな + と';
  }
  // Case D: 〜てごらん
  else if (mainCore.includes('ごらん') || formationPart.includes('ごらん') || inside.includes('ごらん')) {
    cleanMain = '〜てごらん';
    formationPart = 'Vて + ごらん';
  }
  // Case E: Slanted multiple variants e.g. 'ばかり／ばかりだ／ばかりのN...'
  else if (mainCore.includes('／') || mainCore.includes('/')) {
    const parts = mainCore
      .split(/[\uff0f/]/)
      .map((s) => s.trim().replace(/^[VNAna]+/, ''))
      .filter((s) => s && !s.includes('のN') && !s.includes('で、') && !s.includes('文'));

    if (parts.length > 1 && parts[1].length <= 6 && !parts[1].startsWith(parts[0])) {
      cleanMain = '〜' + parts[0] + ' / 〜' + parts[1];
    } else if (parts.length > 0) {
      cleanMain = '〜' + parts[0];
    } else {
      cleanMain = '〜' + mainCore;
    }
  }
  // Case F: Normal single core
  else {
    cleanMain = mainCore;
    cleanMain = cleanMain.replace(/^(?:N\/na\/V\/A|N\/V\/A\/na\/N|V\/A\/na\/N|N・na・V・A|N・V・A・na・N|\[文\])[＋+]?/, '');
    cleanMain = cleanMain.replace(/^(?:N／Vて|N／Nに／Nで|Nの／V)[＋+]?/, '');
    cleanMain = cleanMain.replace(/^(?:Vます／Vません／Vれます|Vる／Vない／Vれる|Vる／Vない|Vます|Vる|Vない|Vて|Vた|Vよう|Nに|N)[＋+]?/, '');
    cleanMain = cleanMain.replace(/^[VNAna]+(?=[ぁ-んァ-ヶ一-龠々])/, '');
    cleanMain = cleanMain.replace(/^[VNAna]+$/, '');
    cleanMain = cleanMain.replace(/^[＋+]/, '').trim();

    if (!cleanMain.startsWith('〜') && !cleanMain.startsWith('～')) {
      cleanMain = '〜' + cleanMain;
    }
  }

  // Clean parentheses from mainTitle: よう(に) -> ように, だ(った) -> だ
  cleanMain = cleanMain.replace(/よう[（(]に[）)]/g, 'ように');
  cleanMain = cleanMain.replace(/[（(][^）)]*[）)]/g, '');
  cleanMain = cleanMain.replace(/[\uff0b+]/g, '');

  // 4. Clean formationRule
  if (!formationPart && rawFormula) {
    const fPlus = rawFormula.match(/^(.*?)[＋+](.*)$/);
    if (fPlus) {
      formationPart = fPlus[1].trim();
    } else if (rawFormula.includes('／') || rawFormula.includes('/')) {
      formationPart = rawFormula;
    }
  }

  let cleanFormation = formationPart
    .replace(/[\uff0b+]/g, ' + ')
    .replace(/[\uff0f/]/g, '・')
    .replace(/\s+/g, ' ')
    .replace(/よう[（(]に[）)]/g, 'ように')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[；;]/g, ' / ')
    .replace(/・\s*$/g, '')
    .trim();

  // If formation rule is redundant with mainTitle, omit it
  if (cleanFormation === cleanMain.replace(/^[〜~]/, '')) {
    cleanFormation = '';
  }

  const audioTarget = cleanMain.replace(/^[〜~]/, '').split(' / ')[0].split('・')[0].trim();

  return {
    mainTitle: cleanMain,
    formationRule: cleanFormation || undefined,
    audioTarget
  };
}

/**
 * Returns canonical title string (backward compatible with existing callers)
 */
export function getCanonicalGrammarTitle(item: Pick<BunpouItem, 'title' | 'formula'>): string {
  return getGrammarTitleInfo(item).mainTitle;
}
