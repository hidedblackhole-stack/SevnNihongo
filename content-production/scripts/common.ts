import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(CP_ROOT, '..');
export const GENERATED = path.join(CP_ROOT, 'generated');

export const writeJson = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
};
export const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;
export const fail = (msg: string): never => { console.error(`✗ ${msg}`); process.exit(1); };
