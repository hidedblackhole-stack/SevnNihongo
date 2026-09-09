import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Sparkles, PlayCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import HanziWriter from 'hanzi-writer';
import { playSound } from '../../utils/audio';
import { sendScoreEvent } from '../../lib/supabase';
import { KANA_STROKE_DICT } from '../../data/kanaStrokeDict';

const strokeDataCache = new Map<string, any>();
const activeFetches = new Map<string, Promise<any>>();

export const preloadStrokeData = (word: string) => {
  const chars = Array.from(new Set(word.split('')));
  chars.forEach(char => {
    if (strokeDataCache.has(char) || activeFetches.has(char)) return;

    // Check embedded Kana stroke dictionary first (instant 0ms, zero network)
    if (KANA_STROKE_DICT[char]) {
      strokeDataCache.set(char, KANA_STROKE_DICT[char]);
      return;
    }

    const encoded = encodeURIComponent(char);
    const hex = char.charCodeAt(0).toString(16).toLowerCase();
    const isKana = char.charCodeAt(0) >= 0x3040 && char.charCodeAt(0) <= 0x30ff;

    const fetchPromise = fetch(`/data/kana-strokes/${encoded}.json`)
      .then(res => {
        if (!res.ok) return fetch(`/data/kana-strokes/${hex}.json`);
        return res;
      })
      .then(res => {
        if (!res.ok) throw new Error('Local Kana Not Found');
        return res.json();
      })
      .catch(() => fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.2/${encoded}.json`)
        .then(res => {
          if (!res.ok) throw new Error('JP Not Found');
          return res.json();
        })
      )
      .catch(() => fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encoded}.json`)
        .then(res => {
          if (!res.ok) throw new Error('Data Not Found');
          return res.json();
        })
      )
      .catch(() => {
        // Never use Youyin for Kana characters (to prevent corrupt Chinese stroke counts)
        if (isKana) throw new Error('Kana data not available in Chinese database');
        return fetch(`https://cdn.jsdelivr.net/gh/MadLadSquad/hanzi-writer-data-youyin/data/${encoded}.json`)
          .then(res => {
            if (!res.ok) throw new Error('Youyin Not Found');
            return res.json();
          });
      })
      .then(data => {
        strokeDataCache.set(char, data);
        activeFetches.delete(char);
        return data;
      })
      .catch(err => {
        activeFetches.delete(char);
        throw err;
      });

    activeFetches.set(char, fetchPromise);
  });
};

interface KanjiWritingCanvasProps {
  kanjiChar: string;
  totalSheets?: number; // 7 Sheets as required by specs
  onCompleteSheet?: (sheetNumber: number, score: number) => void;
  onFinish?: () => void; // Callback when 7th sheet is completed and user finishes
  soundEnabled?: boolean;
  autoAdvance?: boolean;
  leniency?: number;
}

export const KanjiWritingCanvas: React.FC<KanjiWritingCanvasProps> = ({
  kanjiChar,
  totalSheets = 7,
  onCompleteSheet,
  onFinish,
  soundEnabled = true,
  autoAdvance = false,
  leniency = 0.7,
}) => {
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const writerContainerRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  const [currentSheet, setCurrentSheet] = useState(1);
  const [completedSheets, setCompletedSheets] = useState<number[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState(320);

  // Light Mode Detection for genuine Hosho paper & chocolate ink styling
  const [isLightMode, setIsLightMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.classList.contains('theme-light');
      setIsLightMode(isLight);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fallback for non-CJK / Kana characters without stroke data
  const [hasStrokeData, setHasStrokeData] = useState(true);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingFallbackRef = useRef(false);

  // Auto-advance logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQuizComplete && autoAdvance) {
      timer = setTimeout(() => {
        completeCurrentSheet();
      }, 600);
    }
    return () => clearTimeout(timer);
  }, [isQuizComplete, autoAdvance]);

  // Measure container size dynamically
  useEffect(() => {
    const container = gridCanvasRef.current?.parentElement;
    if (!container) return;

    const updateSize = () => {
      const container = gridCanvasRef.current?.parentElement;
      if (container && container.offsetWidth > 0) {
        setCanvasSize(Math.floor(container.offsetWidth));
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 1. Background Grid Setup (HTML5 Canvas 2D Context)
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    // Background: Dark (#1f1612) vs Light Hosho Warm Paper (#FFF9F0)
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = isLightMode ? '#FFF9F0' : '#1f1612';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Grid lines: Dark (#36261e) vs Light Subtle Paper Grid (#DDCEBA)
    ctx.strokeStyle = isLightMode ? '#DDCEBA' : '#36261e';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Horizontal & Vertical Crosshairs
    ctx.beginPath();
    ctx.moveTo(canvasSize / 2, 0);
    ctx.lineTo(canvasSize / 2, canvasSize);
    ctx.moveTo(0, canvasSize / 2);
    ctx.lineTo(canvasSize, canvasSize / 2);
    ctx.stroke();

    // Diagonal Guidelines
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvasSize, canvasSize);
    ctx.moveTo(canvasSize, 0);
    ctx.lineTo(0, canvasSize);
    ctx.stroke();
  }, [canvasSize, isLightMode]);

  // 2. HanziWriter Setup (Layer Interaktif)
  useEffect(() => {
    if (!writerContainerRef.current) return;
    if (canvasSize === 0) return;

    writerContainerRef.current.innerHTML = '';
    setIsLoading(true);
    setHasStrokeData(true);
    let isCancelled = false;

    try {
      const writer = HanziWriter.create(writerContainerRef.current, kanjiChar, {
        width: canvasSize,
        height: canvasSize,
        padding: 15,
        showOutline: showGuide,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 100,
        strokeColor: isLightMode ? '#57382A' : '#d4af37',
        highlightColor: isLightMode ? '#C64F45' : '#ef4444',
        drawingColor: isLightMode ? '#57382A' : '#d4af37',
        outlineColor: isLightMode ? '#D8C5A7' : 'rgba(148, 163, 184, 0.2)',
        showHintAfterMisses: 2,
        drawingWidth: 12,
        leniency: leniency,
        charDataLoader: (char, onComplete, onError) => {
          if (KANA_STROKE_DICT[char]) {
            strokeDataCache.set(char, KANA_STROKE_DICT[char]);
            setIsLoading(false);
            onComplete(KANA_STROKE_DICT[char]);
            return;
          }

          if (strokeDataCache.has(char)) {
            setIsLoading(false);
            onComplete(strokeDataCache.get(char));
            return;
          }

          if (!activeFetches.has(char)) {
            preloadStrokeData(char);
          }

          activeFetches.get(char)!
            .then(data => {
              if (isCancelled) return;
              setIsLoading(false);
              onComplete(data);
            })
            .catch(err => {
              if (isCancelled) return;
              setIsLoading(false);
              setHasStrokeData(false);
              onError(err);
            });
        }
      });

      writerRef.current = writer;
      startQuiz();
    } catch {
      setIsLoading(false);
      setHasStrokeData(false);
    }

    return () => {
      isCancelled = true;
      if (writerRef.current) {
        try {
          writerRef.current.cancelQuiz();
        } catch {
          // ignore
        }
      }
      if (writerContainerRef.current) {
        writerContainerRef.current.innerHTML = '';
      }
    };
  }, [kanjiChar, currentSheet, canvasSize, isLightMode, leniency]);

  // Sync watermark outline visibility
  useEffect(() => {
    if (writerRef.current && hasStrokeData) {
      try {
        if (showGuide) {
          writerRef.current.showOutline();
        } else {
          writerRef.current.hideOutline();
        }
      } catch {
        // ignore
      }
    }
  }, [showGuide, hasStrokeData]);

  const startQuiz = () => {
    if (!writerRef.current) return;
    setIsQuizComplete(false);
    setMistakesCount(0);

    try {
      writerRef.current.quiz({
        leniency: leniency,
        onMistake: () => {
          setMistakesCount(prev => prev + 1);
        },
        onCorrectStroke: () => {
          // Visual stroke confirmation handled by HanziWriter
        },
        onComplete: () => {
          setIsQuizComplete(true);
          playSound('fanfare', soundEnabled);
        }
      });
    } catch {
      // ignore
    }
  };

  const animateOrder = () => {
    if (!writerRef.current || isAnimating) return;
    try {
      setIsAnimating(true);
      writerRef.current.cancelQuiz();

      writerRef.current.animateCharacter({
        onComplete: () => {
          setIsAnimating(false);
          if (!isQuizComplete) {
            startQuiz();
          }
        }
      });
    } catch {
      setIsAnimating(false);
      startQuiz();
    }
  };

  const clearCanvas = () => {
    playSound('click', soundEnabled);
    if (!hasStrokeData && fallbackCanvasRef.current) {
      const ctx = fallbackCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      setIsQuizComplete(false);
      return;
    }
    startQuiz();
  };

  const completeCurrentSheet = () => {
    const isAlreadyCompleted = completedSheets.includes(currentSheet);

    // If already scored and on the final sheet, clicking "Selesai" finishes
    if (completedSheets.includes(currentSheet) && currentSheet >= totalSheets) {
      playSound('fanfare', soundEnabled);
      onFinish?.();
      return;
    }

    // If already completed and not final sheet, advance to next sheet
    if (isAlreadyCompleted && currentSheet < totalSheets) {
      playSound('click', soundEnabled);
      setCurrentSheet(prev => prev + 1);
      setIsQuizComplete(false);
      if (!hasStrokeData && fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      }
      return;
    }

    // If not completed yet and quiz is not completed, cannot save
    if (!isQuizComplete) return;

    // Save this sheet
    playSound('correct', soundEnabled);
    const updated = [...completedSheets, currentSheet];
    setCompletedSheets(updated);
    const score = Math.max(0, 100 - (mistakesCount * 15));
    onCompleteSheet?.(currentSheet, score);

    if (score >= 60) {
      sendScoreEvent('kanji_write', `${kanjiChar}_sheet_${currentSheet}`, true);
    }

    // If on Sheet 1〜6, advance to next sheet
    if (currentSheet < totalSheets) {
      setCurrentSheet(prev => prev + 1);
      setIsQuizComplete(false);
      if (!hasStrokeData && fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      }
    } else if (autoAdvance) {
      // Automatically trigger onFinish if autoAdvance is enabled (since the Selesai button is hidden)
      playSound('fanfare', soundEnabled);
      onFinish?.();
    }
  };

  // Fallback drawing handlers (only active when CDN has no stroke order data, e.g. rare characters/kana)
  const startFallbackDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!fallbackCanvasRef.current) return;
    isDrawingFallbackRef.current = true;
    const canvas = fallbackCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const moveFallbackDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingFallbackRef.current || !fallbackCanvasRef.current) return;
    const canvas = fallbackCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isLightMode ? '#57382A' : '#d4af37';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    if (!isQuizComplete) {
      setIsQuizComplete(true);
    }
  };

  const stopFallbackDraw = () => {
    isDrawingFallbackRef.current = false;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4">
      {/* 7-Sheet Indicator Tabs */}
      <div className="w-full">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span className="font-bold text-amber-300">
            Lembar Latihan Menulis (Sheet {currentSheet}/{totalSheets})
          </span>
          <span>{completedSheets.length} / {totalSheets} Selesai</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: totalSheets }, (_, i) => i + 1).map((sheetNum) => {
            const isCompleted = completedSheets.includes(sheetNum);
            const isCurrent = currentSheet === sheetNum;
            return (
              <button
                key={sheetNum}
                type="button"
                onClick={() => {
                  setCurrentSheet(sheetNum);
                  playSound('click', soundEnabled);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                    : isCompleted
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                #{sheetNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas Top Bar / Mistakes & Watermark Guide Toggle (Outside Writing Area) */}
      <div className="flex items-center justify-between w-full max-w-[320px] px-1 text-xs">
        <div>
          {mistakesCount > 0 && !isQuizComplete ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40 backdrop-blur-md flex items-center gap-1 animate-pulse">
              Salah Gores: {mistakesCount}
            </span>
          ) : (
            <span className="text-[11px] text-text-muted font-medieval">
              Area Menulis
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm ${
            showGuide
              ? 'bg-amber-500/20 text-gold-base border border-amber-400/40 hover:bg-amber-500/30'
              : 'bg-surface-inset text-text-muted border border-border-subtle hover:bg-surface-elevated'
          }`}
          title="Tampilkan / Sembunyikan garis panduan karakter"
        >
          {showGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showGuide ? 'Watermark ON' : 'Watermark OFF'}</span>
        </button>
      </div>

      {/* Interactive Writing Canvas with Japanese Grid */}
      <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden border-2 border-amber-500/30 shadow-2xl bg-stone-900 canvas-practice-card touch-none">
        {/* Background Grid Canvas */}
        <canvas
          ref={gridCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* HanziWriter SVG Container */}
        {hasStrokeData && (
          <div
            ref={writerContainerRef}
            className={`absolute inset-0 w-full h-full z-10 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          />
        )}

        {/* Fallback Canvas for Non-CJK/Kana Characters */}
        {!hasStrokeData && (
          <div className="absolute inset-0 z-10">
            {showGuide && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none text-stone-100/20 text-9xl font-jp font-bold">
                {kanjiChar}
              </div>
            )}
            <canvas
              ref={fallbackCanvasRef}
              width={canvasSize}
              height={canvasSize}
              onMouseDown={startFallbackDraw}
              onMouseMove={moveFallbackDraw}
              onMouseUp={stopFallbackDraw}
              onMouseLeave={stopFallbackDraw}
              onTouchStart={startFallbackDraw}
              onTouchMove={moveFallbackDraw}
              onTouchEnd={stopFallbackDraw}
              className="absolute inset-0 w-full h-full cursor-crosshair"
            />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-900/50 backdrop-blur-sm rounded-3xl">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
            <span className="text-xs font-bold text-amber-300 font-medieval tracking-widest animate-pulse">Menyiapkan Kanji...</span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-[320px] gap-3">
        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={animateOrder}
            disabled={isAnimating || !hasStrokeData}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-900/40 hover:bg-amber-500/60 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-amber-500/30 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            Animasi
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-stone-700"
          >
            <RotateCcw className="w-4 h-4" />
            Ulangi
          </button>
        </div>

        {(!autoAdvance || !hasStrokeData) && (
          <button
            type="button"
            onClick={completeCurrentSheet}
            disabled={(!isQuizComplete && hasStrokeData) && !completedSheets.includes(currentSheet)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
              isQuizComplete || completedSheets.includes(currentSheet)
                ? currentSheet >= totalSheets && completedSheets.includes(currentSheet)
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25 active:scale-95'
                  : 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-black shadow-amber-500/20 active:scale-95'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700/50'
            }`}
          >
            {completedSheets.includes(currentSheet) ? (
              currentSheet >= totalSheets ? (
                <>
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>Selesai</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                  <span>Lanjut ke #{currentSheet + 1}</span>
                </>
              )
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Simpan Sheet #{currentSheet}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
