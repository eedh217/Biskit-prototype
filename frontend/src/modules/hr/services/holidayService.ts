import { v4 as uuidv4 } from 'uuid';
import type { Holiday } from '../types/leave';

const STORAGE_KEY = 'biskit_holidays';

/**
 * 2024~2025년 대한민국 공휴일 기본 데이터
 */
const DEFAULT_HOLIDAYS_2024_2025: Omit<Holiday, 'id' | 'createdAt'>[] = [
  // 2024년
  { date: '20240101', name: '신정', year: 2024 },
  { date: '20240209', name: '설날 연휴', year: 2024 },
  { date: '20240210', name: '설날', year: 2024 },
  { date: '20240211', name: '설날 연휴', year: 2024 },
  { date: '20240212', name: '대체공휴일', year: 2024 },
  { date: '20240301', name: '삼일절', year: 2024 },
  { date: '20240410', name: '국회의원 선거일', year: 2024 },
  { date: '20240505', name: '어린이날', year: 2024 },
  { date: '20240506', name: '대체공휴일', year: 2024 },
  { date: '20240515', name: '석가탄신일', year: 2024 },
  { date: '20240606', name: '현충일', year: 2024 },
  { date: '20240815', name: '광복절', year: 2024 },
  { date: '20240916', name: '추석 연휴', year: 2024 },
  { date: '20240917', name: '추석', year: 2024 },
  { date: '20240918', name: '추석 연휴', year: 2024 },
  { date: '20241003', name: '개천절', year: 2024 },
  { date: '20241009', name: '한글날', year: 2024 },
  { date: '20241225', name: '성탄절', year: 2024 },

  // 2025년
  { date: '20250101', name: '신정', year: 2025 },
  { date: '20250128', name: '설날 연휴', year: 2025 },
  { date: '20250129', name: '설날', year: 2025 },
  { date: '20250130', name: '설날 연휴', year: 2025 },
  { date: '20250301', name: '삼일절', year: 2025 },
  { date: '20250303', name: '대체공휴일', year: 2025 },
  { date: '20250505', name: '어린이날', year: 2025 },
  { date: '20250506', name: '대체공휴일', year: 2025 },
  { date: '20250515', name: '석가탄신일', year: 2025 },
  { date: '20250606', name: '현충일', year: 2025 },
  { date: '20250815', name: '광복절', year: 2025 },
  { date: '20251005', name: '추석 연휴', year: 2025 },
  { date: '20251006', name: '추석', year: 2025 },
  { date: '20251007', name: '추석 연휴', year: 2025 },
  { date: '20251008', name: '대체공휴일', year: 2025 },
  { date: '20251003', name: '개천절', year: 2025 },
  { date: '20251009', name: '한글날', year: 2025 },
  { date: '20251225', name: '성탄절', year: 2025 },
];

function getStoredData(): Holiday[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: Holiday[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 초기 데이터 시드
 */
function seedHolidays(): void {
  const existing = getStoredData();
  if (existing.length === 0) {
    const holidays: Holiday[] = DEFAULT_HOLIDAYS_2024_2025.map((h) => ({
      id: uuidv4(),
      ...h,
      createdAt: new Date().toISOString(),
    }));
    saveData(holidays);
  }
}

export const holidayService = {
  /**
   * 전체 공휴일 목록 조회
   */
  async getAll(): Promise<Holiday[]> {
    await delay(50);
    seedHolidays();
    return getStoredData();
  },

  /**
   * 특정 연도 공휴일 조회
   */
  async getByYear(year: number): Promise<Holiday[]> {
    await delay(50);
    seedHolidays();
    const all = getStoredData();
    return all.filter((h) => h.year === year);
  },

  /**
   * 공휴일 추가
   */
  async create(dto: Omit<Holiday, 'id' | 'createdAt'>): Promise<Holiday> {
    await delay(50);
    const data = getStoredData();
    const newHoliday: Holiday = {
      id: uuidv4(),
      ...dto,
      createdAt: new Date().toISOString(),
    };
    data.push(newHoliday);
    saveData(data);
    return newHoliday;
  },

  /**
   * 공휴일 삭제
   */
  async delete(id: string): Promise<void> {
    await delay(50);
    const data = getStoredData();
    const filtered = data.filter((h) => h.id !== id);
    saveData(filtered);
  },
};
