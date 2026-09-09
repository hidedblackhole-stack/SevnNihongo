import { TryOutData } from '../../types/content';
import n1_2023_07 from './n1_2023_07.json';
import n2_2023_07 from './n2_2023_07.json';
import n2_2022_07 from './n2_2022_07.json';
import n2_2021_12 from './n2_2021_12.json';
import n3_2022_12 from './n3_2022_12.json';
import n3_2021_12 from './n3_2021_12.json';
import n4_2023_07 from './n4_2023_07.json';
import n4_2018 from './n4_2018.json';
import n5_2018 from './n5_2018.json';

export interface TryOutMeta {
  id: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  title: string;
  year: number;
  month?: number;
  totalQuestions: number;
  data: TryOutData;
}

export const ALL_TRYOUTS: TryOutMeta[] = [
  {
    id: 'n5_2018',
    level: 'N5',
    title: 'JLPT N5 — 2018',
    year: 2018,
    totalQuestions: n5_2018.sections.mojiGoi.questions.length + n5_2018.sections.bunpouDokkai.questions.length,
    data: n5_2018 as unknown as TryOutData
  },
  {
    id: 'n4_2018',
    level: 'N4',
    title: 'JLPT N4 — 2018',
    year: 2018,
    totalQuestions: n4_2018.sections.mojiGoi.questions.length + n4_2018.sections.bunpouDokkai.questions.length,
    data: n4_2018 as unknown as TryOutData
  },
  {
    id: 'n4_2023_07',
    level: 'N4',
    title: 'JLPT N4 — Juli 2023',
    year: 2023,
    month: 7,
    totalQuestions: n4_2023_07.sections.mojiGoi.questions.length + n4_2023_07.sections.bunpouDokkai.questions.length,
    data: n4_2023_07 as unknown as TryOutData
  },
  {
    id: 'n3_2021_12',
    level: 'N3',
    title: 'JLPT N3 — Desember 2021',
    year: 2021,
    month: 12,
    totalQuestions: n3_2021_12.sections.mojiGoi.questions.length + n3_2021_12.sections.bunpouDokkai.questions.length,
    data: n3_2021_12 as unknown as TryOutData
  },
  {
    id: 'n3_2022_12',
    level: 'N3',
    title: 'JLPT N3 — Desember 2022',
    year: 2022,
    month: 12,
    totalQuestions: n3_2022_12.sections.mojiGoi.questions.length + n3_2022_12.sections.bunpouDokkai.questions.length,
    data: n3_2022_12 as unknown as TryOutData
  },
  {
    id: 'n2_2021_12',
    level: 'N2',
    title: 'JLPT N2 — Desember 2021',
    year: 2021,
    month: 12,
    totalQuestions: n2_2021_12.sections.mojiGoi.questions.length + n2_2021_12.sections.bunpouDokkai.questions.length,
    data: n2_2021_12 as unknown as TryOutData
  },
  {
    id: 'n2_2022_07',
    level: 'N2',
    title: 'JLPT N2 — Juli 2022',
    year: 2022,
    month: 7,
    totalQuestions: n2_2022_07.sections.mojiGoi.questions.length + n2_2022_07.sections.bunpouDokkai.questions.length,
    data: n2_2022_07 as unknown as TryOutData
  },
  {
    id: 'n2_2023_07',
    level: 'N2',
    title: 'JLPT N2 — Juli 2023',
    year: 2023,
    month: 7,
    totalQuestions: n2_2023_07.sections.mojiGoi.questions.length + n2_2023_07.sections.bunpouDokkai.questions.length,
    data: n2_2023_07 as unknown as TryOutData
  },
  {
    id: 'n1_2023_07',
    level: 'N1',
    title: 'JLPT N1 — Juli 2023',
    year: 2023,
    month: 7,
    totalQuestions: n1_2023_07.sections.mojiGoi.questions.length + n1_2023_07.sections.bunpouDokkai.questions.length,
    data: n1_2023_07 as unknown as TryOutData
  }
];

export function getTryoutsByLevel(level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5'): TryOutMeta[] {
  return ALL_TRYOUTS.filter(t => t.level === level);
}

export function getTryoutById(id: string): TryOutData | undefined {
  const match = ALL_TRYOUTS.find(t => t.id === id);
  return match?.data;
}

export const DEFAULT_TRYOUT = ALL_TRYOUTS.find(t => t.id === 'n3_2022_12')!.data;
