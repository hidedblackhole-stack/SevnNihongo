import React, { useRef, useState, useEffect, useMemo } from 'react';
import { RotateCcw, Check, PlayCircle, Eye, EyeOff, Loader2, Clock, Sparkles, Volume2 } from 'lucide-react';
import HanziWriter from 'hanzi-writer';
import { playSound, speakJapanese } from '../../utils/audio';
import { sendScoreEvent } from '../../lib/supabase';
import { KANA_STROKE_DICT } from '../../data/kanaStrokeDict';
import { getKanjiBaseExp, calculateWritingReward, WritingRewardResult } from '../../utils/rewards';
import { KANJI_DATABASE } from '../../data/kanji';
import { KanjiItem } from '../../types/content';
import { getHighlightedYomikata } from '../../utils/readingHighlightUtils';

export const SMALL_KANA_SET = new Set([
  // Hiragana sutegana
  'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
  'っ',
  'ゃ', 'ゅ', 'ょ',
  'ゎ',
  // Katakana sutegana
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
  'ッ',
  'ャ', 'ュ', 'ョ',
  'ヮ',
  'ヵ', 'ヶ',
]);

export const isSmallKana = (char: string): boolean => {
  return char.length > 0 && SMALL_KANA_SET.has(char);
};

export function transformSmallKanaData(charData: any) {
  if (!charData || !Array.isArray(charData.strokes) || !Array.isArray(charData.medians)) {
    return charData;
  }

  // Authentic Japanese Yokogaki layout:
  // Scale down to ~58% and position in bottom-left quadrant (左下)
  const scale = 0.58;
  const targetCx = 275;
  const targetCy = 140;
  const origCx = 512;
  const origCy = 388;

  const transformedStrokes = charData.strokes.map((pathStr: string) => {
    return pathStr.replace(/([MCZ])([^MCZ]*)/gi, (match, cmd, args) => {
      if (cmd.toUpperCase() === 'Z') return cmd;
      const numRegex = /[-+]?(?:\d*\.\d+|\d+)/g;
      const nums: number[] = [];
      let m: RegExpExecArray | null;
      while ((m = numRegex.exec(args)) !== null) {
        nums.push(parseFloat(m[0]));
      }
      if (nums.length === 0) return cmd;
      const transformed: string[] = [];
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i];
        const y = nums[i + 1];
        if (y !== undefined) {
          const newX = Math.round(targetCx + (x - origCx) * scale);
          const newY = Math.round(targetCy + (y - origCy) * scale);
          transformed.push(`${newX},${newY}`);
        } else {
          transformed.push(Math.round(x).toString());
        }
      }
      return cmd + transformed.join(' ');
    });
  });

  const transformedMedians = charData.medians.map((stroke: number[][]) =>
    stroke.map(([x, y]: number[]) => [
      Math.round(targetCx + (x - origCx) * scale),
      Math.round(targetCy + (y - origCy) * scale)
    ])
  );

  return {
    ...charData,
    strokes: transformedStrokes,
    medians: transformedMedians,
  };
}

const strokeDataCache = new Map<string, any>();
const activeFetches = new Map<string, Promise<any>>();

export const preloadStrokeData = (word: string) => {
  const chars = Array.from(new Set(word.split('')));
  chars.forEach(char => {
    if (strokeDataCache.has(char) || activeFetches.has(char)) return;

    // Check embedded Kana stroke dictionary first (instant 0ms, zero network)
    if (KANA_STROKE_DICT[char]) {
      const data = isSmallKana(char)
        ? transformSmallKanaData(KANA_STROKE_DICT[char])
        : KANA_STROKE_DICT[char];
      strokeDataCache.set(char, data);
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
      .catch(() => fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0/${encoded}.json`)
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
        const finalData = isSmallKana(char) ? transformSmallKanaData(data) : data;
        strokeDataCache.set(char, finalData);
        activeFetches.delete(char);
        return finalData;
      })
      .catch(err => {
        activeFetches.delete(char);
        throw err;
      });

    activeFetches.set(char, fetchPromise);
  });
};

export interface KanjiWritingCanvasProps {
  kanjiChar?: string;
  character?: string; // Backwards compatible alias
  level?: string;
  totalSheets?: number; // default: 1 (sandbox mode)
  onCompleteSheet?: (sheetNumber: number, score: number, reward?: WritingRewardResult) => void;
  onFinish?: (reward?: WritingRewardResult) => void; // Callback when sheet is completed and user finishes
  onComplete?: () => void; // Backwards compatible alias for onFinish
  soundEnabled?: boolean;
  autoAdvance?: boolean;
  leniency?: number;
  averageDistanceThreshold?: number;
  strokeCount?: number;
  meaning?: string;
  meaningId?: string; // Backwards compatible alias
  kunyomi?: string | string[];
  onyomi?: string | string[];
  reading?: string;
  romaji?: string;
  relatedWords?: Array<{ word: string; reading: string; meaningId: string; meaningEn?: string }>;
  showStopwatch?: boolean; // Stopwatch on writing canvas (default: true)
  showPromptHeader?: boolean; // Complete prompt header with readings & audio (default: true)
  className?: string;
}

export const KanjiWritingCanvas: React.FC<KanjiWritingCanvasProps> = ({
  kanjiChar: rawKanjiChar,
  character,
  level,
  totalSheets = 1,
  onCompleteSheet,
  onFinish,
  onComplete,
  soundEnabled = true,
  autoAdvance = false,
  leniency,
  averageDistanceThreshold,
  strokeCount,
  meaning,
  meaningId,
  kunyomi,
  onyomi,
  reading,
  romaji,
  relatedWords,
  showStopwatch = true,
  showPromptHeader = true,
  className = '',
}) => {
  const kanjiChar = rawKanjiChar || character || '';
  const isKana = kanjiChar.length > 0 && kanjiChar.charCodeAt(0) >= 0x3040 && kanjiChar.charCodeAt(0) <= 0x30ff;
  const isSmall = isSmallKana(kanjiChar);

  // Database lookup fallback for complete character metadata
  const dbItem = useMemo(() => {
    return KANJI_DATABASE[kanjiChar] || null;
  }, [kanjiChar]);

  const effectiveMeaning = meaning || meaningId || dbItem?.meaningId || dbItem?.meaningEn || '';

  const onyomiList: string[] = useMemo(() => {
    if (onyomi) {
      if (Array.isArray(onyomi)) return onyomi;
      return onyomi.split(/[、,]/).map(s => s.trim()).filter(Boolean);
    }
    return dbItem?.onyomi || [];
  }, [onyomi, dbItem]);

  const kunyomiList: string[] = useMemo(() => {
    if (kunyomi) {
      if (Array.isArray(kunyomi)) return kunyomi;
      return kunyomi.split(/[、,]/).map(s => s.trim()).filter(Boolean);
    }
    return dbItem?.kunyomi || [];
  }, [kunyomi, dbItem]);

  const effectiveRelatedWords = useMemo(() => {
    if (relatedWords && relatedWords.length > 0) return relatedWords;
    return dbItem?.relatedWords || [];
  }, [relatedWords, dbItem]);

  const effectiveRomaji = useMemo(() => {
    if (romaji) return romaji;
    if (isKana) {
      return kunyomiList[0] || onyomiList[0] || kanjiChar;
    }
    return '';
  }, [romaji, isKana, kunyomiList, onyomiList, kanjiChar]);

  const promptKanjiItem: KanjiItem = useMemo(() => {
    return {
      id: dbItem?.id || `kj_${kanjiChar}`,
      character: kanjiChar,
      meaningId: effectiveMeaning,
      meaningEn: dbItem?.meaningEn || '',
      onyomi: onyomiList,
      kunyomi: kunyomiList,
      jlpt: level || dbItem?.jlpt || (isKana ? 'KANA' : 'N5'),
      strokeCount: strokeCount || dbItem?.strokeCount || 1,
      radical: dbItem?.radical || '',
      radicalName: dbItem?.radicalName || '',
      relatedWords: effectiveRelatedWords,
      questions: dbItem?.questions || [],
    };
  }, [dbItem, kanjiChar, effectiveMeaning, onyomiList, kunyomiList, level, isKana, strokeCount, effectiveRelatedWords]);

  // Dynamic calibration: Kana has sweeping curves (e.g. stroke 2 of か & カ) requiring ~400 threshold and 1.05 leniency
  // to avoid false rejections, while Kanji uses 360 threshold and 1.0 leniency.
  // Small Kana (sutegana) scaled in bottom-left quadrant uses 1.15 leniency and 440 threshold.
  const effectiveLeniency = leniency ?? (isSmall ? 1.15 : (isKana ? 1.05 : 1.0));
  const effectiveDistanceThreshold = averageDistanceThreshold ?? (isSmall ? 440 : (isKana ? 400 : 360));

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

  // Performance factors for dynamic EXP
  const [watermarkEverUsed, setWatermarkEverUsed] = useState(false);
  const [animationCount, setAnimationCount] = useState(0);
  const [lastReward, setLastReward] = useState<WritingRewardResult | null>(null);

  // Progressive Stroke Memory State
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [totalCharStrokes, setTotalCharStrokes] = useState(strokeCount || 0);

  // Stopwatch State per Canvas Sheet (1 canvas = 1 sheet)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Reset timer & sheet state whenever the character changes
  useEffect(() => {
    setCurrentSheet(1);
    setCompletedSheets([]);
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    setWatermarkEverUsed(false);
    setAnimationCount(0);
    setLastReward(null);
  }, [kanjiChar]);

  // Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset stroke memory & canvas stopwatch when character or sheet changes
  useEffect(() => {
    setCurrentStrokeIndex(0);
    setMistakesCount(0);
    const alreadyDone = completedSheets.includes(currentSheet);
    setIsQuizComplete(alreadyDone);
    setElapsedSeconds(0);
    setIsTimerRunning(!alreadyDone);
  }, [kanjiChar, currentSheet]);

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
  const hasRewardedRef = useRef<Record<number, boolean>>({});

  // Reset rewarded ref when character changes
  useEffect(() => {
    hasRewardedRef.current = {};
  }, [kanjiChar]);

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

    // Background: Dark Washi Indigo (#191d26) vs Light Washi Sand (#f1efe8)
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = isLightMode ? '#f1efe8' : '#191d26';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // If small kana, highlight bottom-left quadrant (左下 / Yokogaki standard)
    if (isSmall) {
      ctx.fillStyle = isLightMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.12)';
      ctx.fillRect(0, canvasSize / 2, canvasSize / 2, canvasSize / 2);
    }

    // Grid lines: Dark Sashiko (rgba(111, 147, 207, 0.20)) vs Light Sashiko (rgba(37, 62, 99, 0.18))
    ctx.strokeStyle = isLightMode ? 'rgba(37, 62, 99, 0.18)' : 'rgba(111, 147, 207, 0.20)';
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

    // Subtle guide crosshairs for bottom-left quadrant if small kana
    if (isSmall) {
      ctx.strokeStyle = isLightMode ? 'rgba(99, 102, 241, 0.40)' : 'rgba(129, 140, 248, 0.40)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);

      ctx.beginPath();
      // Vertical midpoint of bottom-left quadrant
      ctx.moveTo(canvasSize / 4, canvasSize / 2);
      ctx.lineTo(canvasSize / 4, canvasSize);
      // Horizontal midpoint of bottom-left quadrant
      ctx.moveTo(0, canvasSize * 0.75);
      ctx.lineTo(canvasSize / 2, canvasSize * 0.75);
      ctx.stroke();
    }
  }, [canvasSize, isLightMode, isSmall]);

  // 2. HanziWriter Setup (Layer Interaktif)
  useEffect(() => {
    if (!writerContainerRef.current) return;
    if (!kanjiChar) {
      setIsLoading(false);
      return;
    }
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
        strokeColor: isLightMode ? '#262420' : '#f8fafc',
        highlightColor: '#e2555b',
        drawingColor: isLightMode ? '#262420' : '#f8fafc',
        outlineColor: isLightMode ? 'rgba(37, 62, 99, 0.20)' : 'rgba(151, 181, 224, 0.25)',
        showHintAfterMisses: 2,
        drawingWidth: isSmall ? 10 : 12,
        leniency: effectiveLeniency,
        averageDistanceThreshold: effectiveDistanceThreshold,
        charDataLoader: (char, onComplete, onError) => {
          if (strokeDataCache.has(char)) {
            setIsLoading(false);
            onComplete(strokeDataCache.get(char));
            return;
          }

          const processData = (rawData: any) => {
            if (!rawData) return rawData;
            return isSmallKana(char) ? transformSmallKanaData(rawData) : rawData;
          };

          if (KANA_STROKE_DICT[char]) {
            const finalData = processData(KANA_STROKE_DICT[char]);
            strokeDataCache.set(char, finalData);
            setIsLoading(false);
            onComplete(finalData);
            return;
          }

          if (!activeFetches.has(char)) {
            preloadStrokeData(char);
          }

          activeFetches.get(char)!
            .then(data => {
              if (isCancelled) return;
              const finalData = processData(data);
              strokeDataCache.set(char, finalData);
              setIsLoading(false);
              onComplete(finalData);
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

      // Extract total strokes count from character data
      writer.getCharacterData().then(charData => {
        if (charData && Array.isArray(charData.strokes)) {
          setTotalCharStrokes(charData.strokes.length);
        }
      }).catch(() => {});

      startQuiz(0);
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
  }, [kanjiChar, currentSheet, canvasSize, isLightMode, effectiveLeniency, effectiveDistanceThreshold]);

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

  const startQuiz = (startStroke = currentStrokeIndex) => {
    if (!writerRef.current) return;
    setIsQuizComplete(false);

    try {
      writerRef.current.quiz({
        leniency: effectiveLeniency,
        averageDistanceThreshold: effectiveDistanceThreshold,
        quizStartStrokeNum: startStroke,
        acceptBackwardsStrokes: false,
        showHintAfterMisses: 2,
        onMistake: () => {
          setMistakesCount(prev => prev + 1);
        },
        onCorrectStroke: (strokeData: any) => {
          const nextStroke = (strokeData.strokeNum ?? 0) + 1;
          setCurrentStrokeIndex(nextStroke);
        },
        onComplete: () => {
          setIsQuizComplete(true);
          setIsTimerRunning(false); // Stop stopwatch for this canvas immediately
          setCurrentStrokeIndex(totalCharStrokes || strokeCount || 0);
          playSound('fanfare', soundEnabled);

          // Guarantee reward & study stats recording immediately upon completing strokes
          if (!hasRewardedRef.current[currentSheet]) {
            hasRewardedRef.current[currentSheet] = true;
            setCompletedSheets(prev => prev.includes(currentSheet) ? prev : [...prev, currentSheet]);
            const score = Math.max(0, 100 - (mistakesCount * 15));
            const baseExp = getKanjiBaseExp({
              character: kanjiChar,
              strokeCount: totalCharStrokes || strokeCount,
              jlpt: level,
            });
            const reward = calculateWritingReward({
              baseExp,
              mistakesCount,
              watermarkUsed: watermarkEverUsed || showGuide,
              animationCount,
              elapsedSeconds,
              strokeCount: totalCharStrokes || strokeCount,
            });
            setLastReward(reward);
            onCompleteSheet?.(currentSheet, score, reward);
            if (score >= 60) {
              sendScoreEvent('kanji_write', `${kanjiChar}_sheet_${currentSheet}`, true);
            }
          }
        }
      });
    } catch {
      // ignore
    }
  };

  // Progressive Stroke Memory: Animate only the remaining uncompleted strokes!
  const animateOrder = () => {
    if (!writerRef.current || isAnimating) return;
    setAnimationCount(prev => prev + 1);
    try {
      setIsAnimating(true);
      writerRef.current.cancelQuiz();

      const fromStroke = currentStrokeIndex;
      const total = totalCharStrokes || strokeCount || 8;

      if (fromStroke === 0) {
        // Full character animation from stroke 0
        writerRef.current.animateCharacter({
          onComplete: () => {
            setIsAnimating(false);
            if (!isQuizComplete) {
              startQuiz(0);
            }
          }
        });
      } else {
        // Animate ONLY remaining strokes from currentStrokeIndex to end!
        let currentS = fromStroke;
        const playNext = () => {
          if (currentS >= total || !writerRef.current) {
            setIsAnimating(false);
            if (!isQuizComplete) {
              // Seamlessly resume quiz right where user left off
              startQuiz(fromStroke);
            }
            return;
          }
          writerRef.current.animateStroke(currentS, {
            onComplete: () => {
              currentS++;
              playNext();
            }
          });
        };
        playNext();
      }
    } catch {
      setIsAnimating(false);
      startQuiz(currentStrokeIndex);
    }
  };

  const clearCanvas = () => {
    playSound('click', soundEnabled);
    hasRewardedRef.current[currentSheet] = false;
    setCompletedSheets(prev => prev.filter(s => s !== currentSheet));
    setCurrentStrokeIndex(0);
    setMistakesCount(0);
    setIsQuizComplete(false);
    setElapsedSeconds(0); // Reset stopwatch whenever Kanji is repeated
    setIsTimerRunning(true);
    setWatermarkEverUsed(false);
    setAnimationCount(0);
    setLastReward(null);

    if (!hasStrokeData && fallbackCanvasRef.current) {
      const ctx = fallbackCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      return;
    }

    if (writerRef.current) {
      writerRef.current.cancelQuiz();
      startQuiz(0);
    }
  };

  const completeCurrentSheet = () => {
    const isAlreadyCompleted = completedSheets.includes(currentSheet);

    // If already scored and on the final sheet, clicking "Selesai" finishes
    if (completedSheets.includes(currentSheet) && currentSheet >= totalSheets) {
      playSound('fanfare', soundEnabled);
      setIsTimerRunning(false);
      onFinish?.(lastReward || undefined);
      return;
    }

    // If already completed and not final sheet, advance to next sheet
    if (isAlreadyCompleted && currentSheet < totalSheets) {
      playSound('click', soundEnabled);
      setCurrentSheet(prev => prev + 1);
      setIsQuizComplete(false);
      setElapsedSeconds(0);
      setIsTimerRunning(true);
      setWatermarkEverUsed(false);
      setAnimationCount(0);
      if (!hasStrokeData && fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      }
      return;
    }

    // If not completed yet and quiz is not completed, cannot save
    if (!isQuizComplete && !hasRewardedRef.current[currentSheet]) return;

    if (!hasRewardedRef.current[currentSheet]) {
      hasRewardedRef.current[currentSheet] = true;
      playSound('correct', soundEnabled);
      const updated = [...completedSheets, currentSheet];
      setCompletedSheets(updated);
      const score = Math.max(0, 100 - (mistakesCount * 15));

      // Dynamic EXP Calculation
      const baseExp = getKanjiBaseExp({
        character: kanjiChar,
        strokeCount: totalCharStrokes || strokeCount,
        jlpt: level,
      });

      const reward = calculateWritingReward({
        baseExp,
        mistakesCount,
        watermarkUsed: watermarkEverUsed || showGuide,
        animationCount,
        elapsedSeconds,
        strokeCount: totalCharStrokes || strokeCount,
      });
      setLastReward(reward);
      onCompleteSheet?.(currentSheet, score, reward);

      if (score >= 60) {
        sendScoreEvent('kanji_write', `${kanjiChar}_sheet_${currentSheet}`, true);
      }
    }

    // If on Sheet 1〜(totalSheets - 1), advance to next sheet
    if (currentSheet < totalSheets) {
      setCurrentSheet(prev => prev + 1);
      setIsQuizComplete(false);
      setElapsedSeconds(0);
      setIsTimerRunning(true);
      setMistakesCount(0);
      setWatermarkEverUsed(false);
      setAnimationCount(0);
      if (!hasStrokeData && fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      }
    } else {
      // Finished all sheets (or single sheet in sandbox mode)
      playSound('fanfare', soundEnabled);
      setIsTimerRunning(false);
      onFinish?.(lastReward || undefined);
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
    ctx.strokeStyle = isLightMode ? '#262420' : '#f8fafc';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    if (!isQuizComplete) {
      setIsQuizComplete(true);
      setIsTimerRunning(false);
    }
  };

  const stopFallbackDraw = () => {
    isDrawingFallbackRef.current = false;
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-md mx-auto space-y-4 ${className}`}>
      {/* Complete Prompt & Yomikata Card Header (Unified Standard across Library, Dungeon & Decks) */}
      {showPromptHeader && (
        <div className="w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center space-y-3 mb-1 text-center">
          {/* Highlighted Yomikata / Reading Header (Hidden Kanji to test recall in writing mode) */}
          <div className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4 min-h-[52px] w-full">
            {effectiveRelatedWords && effectiveRelatedWords.length > 0 ? (
              effectiveRelatedWords.slice(0, 2).map((rw, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-between px-3.5 py-2.5 rounded-2xl bg-surface-inset hover:bg-surface-card border border-border-subtle hover:border-wine-accent/40 transition-all shadow-inner group cursor-pointer min-w-[135px] max-w-[220px]"
                  onClick={() => speakJapanese(rw.word)}
                  title="Klik untuk mendengar audio kata ini"
                >
                  {/* Yomikata Reading with high-contrast target badge */}
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="text-xl sm:text-2xl font-bold font-jp">
                      {getHighlightedYomikata(rw.word, rw.reading, promptKanjiItem)}
                    </div>
                    <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent group-hover:scale-110 transition-all flex-shrink-0" />
                  </div>

                  {/* Indonesian meaning */}
                  <span className="text-[11px] text-text-secondary text-center leading-tight line-clamp-2 mt-0.5 font-medium">
                    {rw.meaningId}
                  </span>
                </div>
              ))
            ) : (
              <div
                className="flex flex-col items-center justify-between px-4 py-2.5 rounded-2xl bg-surface-inset hover:bg-surface-card border border-border-subtle hover:border-wine-accent/40 transition-all shadow-inner group cursor-pointer w-full"
                onClick={() =>
                  speakJapanese(
                    kunyomiList[0]?.replace(/[.-]/g, '') || onyomiList[0] || kanjiChar
                  )
                }
                title="Klik untuk mendengar"
              >
                <div className="text-xl sm:text-2xl font-bold font-jp text-wine-accent drop-shadow-sm mb-1 flex items-center gap-1.5">
                  <span>
                    {kunyomiList[0]?.replace(/[.-]/g, '') ||
                      onyomiList[0] ||
                      reading ||
                      kanjiChar}
                  </span>
                  <Volume2 className="w-4 h-4 text-text-muted opacity-60 group-hover:text-wine-accent transition-colors" />
                </div>
                {effectiveMeaning && (
                  <span className="text-[11px] text-text-secondary mt-0.5 font-medium">{effectiveMeaning}</span>
                )}
              </div>
            )}
          </div>

          {/* Readings (ON / KUN or ROMAJI) and Meaning Pill Badge */}
          <div className="flex flex-col items-center justify-center gap-1.5 text-xs w-full">
            {isKana ? (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted font-bold bg-surface-inset px-2 py-0.5 rounded text-[10px] font-mono">
                  ROMAJI
                </span>
                <span className="text-wine-accent font-mono font-bold tracking-wider">
                  {effectiveRomaji}
                </span>
              </div>
            ) : (
              <>
                {onyomiList.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[10px]">
                      ON
                    </span>
                    <span className="text-wine-accent font-jp tracking-wider font-medium">
                      {onyomiList.join(', ')}
                    </span>
                  </div>
                )}
                {kunyomiList.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[10px]">
                      KUN
                    </span>
                    <span className="text-state-success font-jp tracking-wider font-medium">
                      {kunyomiList.join(', ')}
                    </span>
                  </div>
                )}
              </>
            )}
            {effectiveMeaning && (
              <div className="text-text-primary mt-2 font-medium px-3.5 py-1.5 bg-surface-inset rounded-xl border border-border-subtle shadow-sm text-center">
                {effectiveMeaning}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Sheet Indicator Tabs (Only shown if totalSheets > 1) */}
      {totalSheets > 1 && (
        <div className="w-full max-w-[340px] sm:max-w-[360px]">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
            <span className="font-bold text-text-primary font-heading">
              Lembar Latihan Menulis (Sheet {currentSheet}/{totalSheets})
            </span>
            <span className="font-mono">{completedSheets.length} / {totalSheets} Selesai</span>
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${totalSheets}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalSheets }, (_, i) => i + 1).map((sheetNum) => {
              const isCompleted = completedSheets.includes(sheetNum);
              const isCurrent = currentSheet === sheetNum;
              return (
                <button
                  key={sheetNum}
                  type="button"
                  onClick={() => {
                    if (currentSheet !== sheetNum) {
                      setCurrentSheet(sheetNum);
                      const alreadyDone = completedSheets.includes(sheetNum);
                      setIsQuizComplete(alreadyDone);
                      setElapsedSeconds(0);
                      setIsTimerRunning(!alreadyDone);
                      setMistakesCount(0);
                      setWatermarkEverUsed(false);
                      setAnimationCount(0);
                      playSound('click', soundEnabled);
                    }
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-wine-accent text-white shadow-md ring-2 ring-wine-accent/50 font-black scale-105'
                      : isCompleted
                        ? 'bg-wine-accent/20 text-wine-accent border border-wine-accent/40 font-bold'
                        : 'bg-surface-inset text-text-muted hover:bg-surface-elevated'
                  }`}
                >
                  #{sheetNum}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Canvas Top Bar / Stopwatch, Mistakes & Watermark Guide Toggle */}
      <div className="flex items-center justify-between w-full max-w-[340px] sm:max-w-[360px] px-1 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showStopwatch && (
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-inset border border-border-subtle text-text-primary flex items-center gap-1 shadow-sm"
              title={`Stopwatch (${isTimerRunning ? 'Berjalan' : 'Selesai'})`}
            >
              <Clock className="w-3 h-3 text-gold" />
              <span>{formatTime(elapsedSeconds)}</span>
              {totalSheets > 1 && (
                <span className="text-[9px] text-text-muted font-normal">/kanvas #{currentSheet}</span>
              )}
            </span>
          )}
          {isQuizComplete && lastReward ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-gold border border-gold/40 flex items-center gap-1 font-mono animate-scale-up shadow-sm">
              <Sparkles className="w-3 h-3 text-gold" />
              +{lastReward.expGained} EXP Belajar!
            </span>
          ) : totalCharStrokes > 0 && !isQuizComplete ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-inset border border-border-subtle text-text-primary">
              Goresan {Math.min(currentStrokeIndex + 1, totalCharStrokes)}/{totalCharStrokes}
            </span>
          ) : null}
          {isSmall && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo/15 text-indigo border border-indigo/30 flex items-center gap-1 font-heading"
              title="Huruf kecil ditulis di kuadran kiri-bawah (sutegana)"
            >
              Kuadran Kiri Bawah (左下)
            </span>
          )}
          {mistakesCount > 0 && !isQuizComplete ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-inset text-rose-400 border border-rose-500/30 flex items-center gap-1 font-mono">
              Salah: {mistakesCount}
            </span>
          ) : !totalCharStrokes && !isQuizComplete ? (
            <span className="text-[11px] text-text-muted font-heading">
              Area Menulis
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm select-none ${
            showGuide
              ? 'bg-wine-accent/20 text-wine-accent border border-wine-accent/40 hover:bg-wine-accent/30'
              : 'bg-surface-inset text-text-muted border border-border-subtle hover:bg-surface-elevated'
          }`}
          title="Tampilkan / Sembunyikan garis panduan karakter"
        >
          {showGuide ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showGuide ? 'Watermark ON' : 'Watermark OFF'}</span>
        </button>
      </div>

      {/* Interactive Writing Canvas with Japanese Grid */}
      <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[360px] rounded-3xl overflow-hidden border border-border-subtle shadow-2xl bg-surface-inset touch-none">
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
              <div className={`absolute inset-0 flex pointer-events-none select-none text-text-primary/20 font-jp font-bold ${
                isSmall
                  ? 'items-end justify-start p-8 text-7xl'
                  : 'items-center justify-center text-9xl'
              }`}>
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-card/80 backdrop-blur-sm rounded-3xl">
            <Loader2 className="w-8 h-8 text-wine-accent animate-spin mb-2" />
            <span className="text-xs font-bold text-wine-accent font-heading tracking-widest animate-pulse">Menyiapkan Kanji...</span>
          </div>
        )}
      </div>

      {/* Action Controls: 2 Balanced Rows (Never wraps text on any device) */}
      <div className="flex flex-col w-full max-w-[340px] sm:max-w-[360px] gap-2.5">
        {/* Row 1: Animasi & Ulangi in 2 equal, comfortable columns */}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          <button
            type="button"
            onClick={animateOrder}
            disabled={isAnimating || !hasStrokeData}
            className="w-full py-2.5 px-3 rounded-xl bg-surface-card hover:bg-surface-elevated text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-border-subtle hover:border-wine-accent/40 disabled:opacity-50 whitespace-nowrap shadow-sm select-none active:scale-95"
            title="Tampilkan animasi goresan"
          >
            <PlayCircle className="w-4 h-4 text-wine-accent shrink-0" />
            <span className="whitespace-nowrap">Animasi</span>
          </button>

          <button
            type="button"
            onClick={clearCanvas}
            className="w-full py-2.5 px-3 rounded-xl bg-surface-inset hover:bg-surface-elevated text-text-secondary hover:text-text-primary text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-border-subtle whitespace-nowrap shadow-sm select-none active:scale-95"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Ulangi</span>
          </button>
        </div>

        {/* Row 2: Simpan Sheet / Next / Selesai Primary CTA */}
        {(!autoAdvance || !hasStrokeData) && (
          <button
            type="button"
            onClick={completeCurrentSheet}
            disabled={(!isQuizComplete && hasStrokeData) && !completedSheets.includes(currentSheet)}
            className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 select-none ${
              isQuizComplete || completedSheets.includes(currentSheet) || !hasStrokeData
                ? 'bg-wine-accent hover:opacity-95 text-white font-black shadow-lg shadow-wine-accent/25'
                : 'bg-surface-inset text-text-muted cursor-not-allowed border border-border-subtle'
            }`}
          >
            {completedSheets.includes(currentSheet) ? (
              currentSheet >= totalSheets ? (
                <>
                  <Check className="w-4 h-4 text-surface-base stroke-[3]" />
                  <span>{totalSheets > 1 ? `Selesai (${totalSheets}/${totalSheets})` : 'Selesai Menulis'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-surface-base stroke-[3]" />
                  <span>Lanjut ke Sheet #{currentSheet + 1}</span>
                </>
              )
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{totalSheets > 1 ? `Simpan Sheet #${currentSheet}` : 'Selesai Menulis'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
