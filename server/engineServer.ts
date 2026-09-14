// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — BACKEND EXPRESS REST API
// ==============================================================================

import express, { Request, Response } from 'express';
import {
  conjugateVerb,
  conjugateAdjective,
  synthesizeSentence,
  generateSentenceExercise,
  validateSentenceSubmission,
  PATTERN_SCHEMAS,
} from '../src/engine';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Permissive CORS for local testing & frontend consumption
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

/**
 * Health check & engine info
 */
app.get('/api/engine/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    engine: 'Japanese Language Intelligence Engine (J-LIE)',
    version: '1.0.0',
    capabilities: [
      'Morphological Conjugation (Godan/Ichidan/Kuru/Suru/Adjectives)',
      'Syntax Slot-Filler Schemas',
      'Dynamic Sentence Synthesis',
      'Interactive Sentence Builder & Real-time Validator',
    ],
    supportedPatterns: Object.keys(PATTERN_SCHEMAS).length,
  });
});

/**
 * Endpoint: Morphological Conjugation
 */
app.post('/api/engine/conjugate', (req: Request, res: Response) => {
  const { word, reading, type = 'verb', adjType = 'i' } = req.body;

  if (!word) {
    return res.status(400).json({ error: 'Field "word" is required.' });
  }

  if (type === 'adjective') {
    const result = conjugateAdjective(word, reading, adjType);
    return res.json(result);
  }

  const result = conjugateVerb(word, reading);
  return res.json(result);
});

/**
 * Endpoint: Dynamic Sentence Synthesis
 */
app.post('/api/engine/synthesize', (req: Request, res: Response) => {
  const { patternId, verbWord, verbReading, objectWord, locationWord } = req.body;

  if (!patternId) {
    return res.status(400).json({ error: 'Field "patternId" is required.' });
  }

  const result = synthesizeSentence({
    patternId,
    verbWord,
    verbReading,
    objectWord,
    locationWord,
  });

  return res.json(result);
});

/**
 * Endpoint: Generate new Sentence Construction Practice Exercise (Sakubun)
 */
app.get('/api/engine/practice/new', (req: Request, res: Response) => {
  const { patternId, jlpt } = req.query;

  const exercise = generateSentenceExercise({
    patternId: patternId ? String(patternId) : undefined,
    jlpt: jlpt ? (String(jlpt) as any) : undefined,
    includeDistractors: true,
  });

  return res.json(exercise);
});

/**
 * Endpoint: Verify submitted sentence construction
 */
app.post('/api/engine/practice/verify', (req: Request, res: Response) => {
  const { exercise, submittedTileIds } = req.body;

  if (!exercise || !Array.isArray(submittedTileIds)) {
    return res.status(400).json({
      error: 'Both "exercise" object and "submittedTileIds" array are required.',
    });
  }

  const feedback = validateSentenceSubmission(exercise, submittedTileIds);
  return res.json(feedback);
});

// Export server instance for testing or direct startup
export { app };

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  app.listen(PORT, () => {
    console.log(`🚀 J-LIE Backend Server running on http://localhost:${PORT}`);
    console.log(`👉 Health check: http://localhost:${PORT}/api/engine/health`);
  });
}
