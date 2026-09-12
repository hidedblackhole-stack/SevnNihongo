// Utility to derive canonical grammar pattern titles from BunpouItem
// Eliminates example sentences from titles and displays the authentic Japanese grammar formula pattern.

import { BunpouItem } from '../types/content';

/**
 * Derives a clean, concise grammar pattern title (e.g. "〜れる・〜られる", "〜(さ)せてください", "〜ている").
 * Prevents example sentences (e.g. "書かれている", "赤ちゃんに泣かれた") from cluttering the library.
 */
export function getCanonicalGrammarTitle(item: Pick<BunpouItem, 'title' | 'formula'>): string {
  if (!item || !item.title) return '';

  const rawTitle = item.title.trim();

  // If there are no fullwidth parentheses, it's already a standard title (e.g. "〜方", "あげる", "後(の)")
  if (!rawTitle.includes('（')) {
    return rawTitle;
  }

  // Handle specific well-known titles that should stay as-is
  if (rawTitle === '動詞（非過去）') return '動詞（非過去）';
  if (rawTitle === '〜ないもの（だろう）か') return '〜ないもの（だろう）か';
  if (rawTitle.includes('総まとめ')) return rawTitle;

  const openIdx = rawTitle.indexOf('（');
  const closeIdx = rawTitle.lastIndexOf('）');
  const inside = rawTitle.slice(openIdx + 1, closeIdx !== -1 ? closeIdx : undefined).trim();
  const formula = item.formula || '';

  // Special cases for grammar function descriptions inside parentheses
  if (inside.includes('受身') || inside.includes('passive')) {
    if (formula.includes('（Nに）Vれる')) return '(Nに) 〜れる・〜られる';
    return '〜れる・〜られる';
  }
  if (inside.includes('使役') || inside.includes('causative')) {
    if (formula.includes('V(さ)せて') || rawTitle.includes('ください')) return '〜(さ)せてください';
    return '〜(さ)せる';
  }
  if (inside.includes('noun-forming') || inside.includes('nominalizer')) {
    if (inside.includes('→さ')) return '〜さ (名詞化)';
    if (inside.includes('→み')) return '〜み (名詞化)';
    if (inside.includes('＋の') || inside.includes('の,')) return '〜の (名詞化)';
    if (inside.includes('こと')) return '〜こと (名詞化)';
  }
  if (inside.includes('特別な敬語')) return '敬語 (尊敬・謙譲)';
  if (inside.includes('丁寧な尋ね方')) return '〜でしょうか';
  if (inside.includes('伝言・依頼')) return '〜お伝えください';

  let title = inside;

  // Remove English translation segment if separated by ' / '
  if (title.includes(' / ') && /[a-zA-Z]/.test(title.split(' / ')[1])) {
    title = title.split(' / ')[0].trim();
  }

  // Strip connector formulas before ＋
  title = title.replace(/^(?:N\/na\/V\/A|N\/V\/A\/na\/N|V\/A\/na\/N|N・na・V・A|N・V・A・na・N|\[文\])[＋+]/, '');
  title = title.replace(/^(?:N／Vて|N／Nに／Nで|Nの／V)[＋+]/, '');
  title = title.replace(/^(?:Vます／Vません／Vれます|Vる／Vない／Vれる|Vる／Vない|Vます|Vる|Vない|Vて|Vた|Vよう|Nに|N)[＋+]/, '');

  // Replace leading V or N or A with 〜
  title = title.replace(/^V\(さ\)せて/, '(さ)せて');
  title = title.replace(/^[VNAna]+(?=[ぁ-んァ-ヶ一-龠々])/, '〜');
  title = title.replace(/^[VNAna]+$/, '〜');

  // Handle forms like 〜るようになる -> 〜ようになる
  title = title.replace(/^〜る/, '〜');

  // If inside contains multiple long variants, keep the first 1 or 2 concise variants
  if (title.includes('／')) {
    const parts = title.split('／').map(s => s.trim().replace(/^V/, '〜'));
    if (parts.length > 2) {
      title = parts.slice(0, 2).join('／');
    } else {
      title = parts.join('／');
    }
  }

  // If inside contains ' / ', keep concise
  if (title.includes(' / ')) {
    const parts = title.split(' / ').map(s => s.trim().replace(/^V/, '〜'));
    if (parts.length > 2) {
      title = parts.slice(0, 2).join(' / ');
    } else {
      title = parts.join(' / ');
    }
  }

  title = title.replace(/^〜\s*[＋+]\s*/, '〜');

  if (
    !title.startsWith('〜') &&
    !title.startsWith('～') &&
    !title.startsWith('(') &&
    !title.startsWith('（') &&
    !title.startsWith('[')
  ) {
    title = '〜' + title;
  }

  return title;
}
