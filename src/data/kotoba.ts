import { KotobaItem } from '../types/content';
import kotobaData from './db/kotoba.json';

export const KOTOBA_DATABASE: Record<string, KotobaItem> = kotobaData as Record<string, KotobaItem>;
