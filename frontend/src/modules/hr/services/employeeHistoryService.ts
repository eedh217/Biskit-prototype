import { v4 as uuidv4 } from 'uuid';
import type {
  EmployeeHistory,
  CreateEmployeeHistoryDto,
  HistoryCategory,
} from '../types/employeeHistory';

const STORAGE_KEY = 'biskit_employee_history';

/**
 * LocalStorage에서 이력 데이터 읽기
 */
function getStoredHistory(): EmployeeHistory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse employee history from localStorage:', error);
    return [];
  }
}

/**
 * LocalStorage에 이력 데이터 저장
 */
function saveHistory(history: EmployeeHistory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save employee history to localStorage:', error);
    throw new Error('이력 저장에 실패했습니다.');
  }
}

/**
 * API 호출 시뮬레이션 (로딩 UX)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 직원 이력 서비스
 */
export const employeeHistoryService = {
  /**
   * 특정 직원의 이력 조회
   */
  async getByEmployeeId(employeeId: string): Promise<EmployeeHistory[]> {
    await delay(100);
    const allHistory = getStoredHistory();
    return allHistory
      .filter((h) => h.employeeId === employeeId)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  },

  /**
   * 특정 직원의 특정 카테고리 이력 조회
   */
  async getByEmployeeIdAndCategory(
    employeeId: string,
    category: HistoryCategory
  ): Promise<EmployeeHistory[]> {
    await delay(100);
    const allHistory = getStoredHistory();
    return allHistory
      .filter((h) => h.employeeId === employeeId && h.category === category)
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  },

  /**
   * 이력 추가
   */
  async create(dto: CreateEmployeeHistoryDto): Promise<EmployeeHistory> {
    await delay(50);

    // 변경사항이 없으면 저장하지 않음
    if (dto.changes.length === 0) {
      throw new Error('변경사항이 없습니다.');
    }

    const newHistory: EmployeeHistory = {
      id: uuidv4(),
      employeeId: dto.employeeId,
      category: dto.category,
      categoryName: dto.categoryName,
      changes: dto.changes,
      modifiedBy: dto.modifiedBy,
      modifiedAt: new Date().toISOString(),
    };

    const allHistory = getStoredHistory();
    allHistory.push(newHistory);
    saveHistory(allHistory);

    return newHistory;
  },

  /**
   * 모든 이력 삭제 (개발/테스트용)
   */
  async deleteAll(): Promise<void> {
    await delay(50);
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * 특정 직원의 모든 이력 삭제
   */
  async deleteByEmployeeId(employeeId: string): Promise<void> {
    await delay(50);
    const allHistory = getStoredHistory();
    const filtered = allHistory.filter((h) => h.employeeId !== employeeId);
    saveHistory(filtered);
  },
};
