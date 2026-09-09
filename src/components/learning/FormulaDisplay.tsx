import React, { useState, useMemo } from 'react';
import { parseFormula, FormulaToken, generateFormulaExplanation } from '../../utils/formulaParser';
import { ConjugationSheet } from './ConjugationSheet';
import { Info } from 'lucide-react';

interface FormulaDisplayProps {
  formula: string;
}

/**
 * FormulaDisplay — Interactive formula renderer for the Bunpou module.
 *
 * Replaces the static <pre> formula block. Parses the formula string into
 * clickable tokens, each linked to a conjugation pattern or grammar connector.
 *
 * Clicking a token opens the ConjugationSheet bottom-sheet modal.
 */
export const FormulaDisplay: React.FC<FormulaDisplayProps> = ({ formula }) => {
  const [activeSheet, setActiveSheet] = useState<{
    patternId: string;
    type: 'conjugation' | 'connector';
  } | null>(null);

  const tokens: FormulaToken[] = useMemo(() => parseFormula(formula), [formula]);
  const explanation = useMemo(() => generateFormulaExplanation(tokens), [tokens]);

  const handleTokenClick = (token: FormulaToken) => {
    if (token.linkedPatternId && token.linkedType) {
      setActiveSheet({
        patternId: token.linkedPatternId,
        type: token.linkedType,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 p-3 rounded-xl bg-stone-900 border border-stone-800 min-h-[40px]">
        {tokens.map((token, i) => {
          const isClickable = !!token.linkedPatternId;

          if (token.type === 'separator') {
            return (
              <span
                key={i}
                className="text-xs sm:text-sm font-mono text-stone-500 px-0.5 select-none"
              >
                {token.text}
              </span>
            );
          }

          if (isClickable) {
            return (
              <button
                key={i}
                onClick={() => handleTokenClick(token)}
                className="
                  text-xs sm:text-sm font-mono font-semibold
                  text-amber-300 hover:text-amber-200
                  border-b border-dashed border-amber-500/50 hover:border-amber-400
                  cursor-pointer transition-all duration-150
                  hover:bg-amber-500/10 rounded-sm px-1 py-0.5
                  active:scale-95
                "
                title="Klik untuk lihat cara konjugasi"
              >
                {token.text}
              </button>
            );
          }

          // Non-clickable literal
          return (
            <span
              key={i}
              className="text-xs sm:text-sm font-mono text-amber-200/80 px-0.5"
            >
              {token.text}
            </span>
          );
        })}
      </div>
      
      {explanation && (
        <div className="flex items-start gap-2 text-stone-400 p-2.5 rounded-xl bg-stone-900/50 border border-stone-800/50">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500/70" />
          <p className="text-xs sm:text-sm leading-relaxed">
            {explanation}
          </p>
        </div>
      )}

      {/* Conjugation Sheet Modal */}
      {activeSheet && (
        <ConjugationSheet
          patternId={activeSheet.patternId}
          type={activeSheet.type}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </div>
  );
};
