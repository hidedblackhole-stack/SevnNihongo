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
      <div className="flex flex-wrap items-center gap-1 p-3 rounded-xl bg-surface-inset border border-border-subtle min-h-[40px]">
        {tokens.map((token, i) => {
          const isClickable = !!token.linkedPatternId;

          if (token.type === 'separator') {
            return (
              <span
                key={i}
                className="text-xs sm:text-sm font-mono text-text-muted px-0.5 select-none"
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
                  text-indigo hover:opacity-80
                  border-b border-dashed border-indigo/50 hover:border-indigo
                  cursor-pointer transition-all duration-150
                  hover:bg-indigo/10 rounded-sm px-1 py-0.5
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
              className="text-xs sm:text-sm font-mono text-text-primary px-0.5"
            >
              {token.text}
            </span>
          );
        })}
      </div>
      
      {explanation && (
        <div className="flex items-start gap-2 text-text-secondary p-2.5 rounded-xl bg-surface-inset border border-border-subtle">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-gold" />
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
