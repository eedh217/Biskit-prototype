import { v4 as uuidv4 } from 'uuid';
import type { LeaveType } from '../types/leave';

const STORAGE_KEY = 'biskit_leave_types';

/**
 * 기본 휴가 유형 (연차, 반차 오전, 반차 오후)
 */
const DEFAULT_LEAVE_TYPES: Omit<LeaveType, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '연차',
    deductionDays: 1.0,
    code: 'annual',
    order: 1,
    isActive: true,
  },
  {
    name: '반차(오전)',
    deductionDays: 0.5,
    code: 'half_morning',
    order: 2,
    isActive: true,
  },
  {
    name: '반차(오후)',
    deductionDays: 0.5,
    code: 'half_afternoon',
    order: 3,
    isActive: true,
  },
];

function getStoredData(): LeaveType[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: LeaveType[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 초기 데이터 시드
 */
function seedLeaveTypes(): void {
  const existing = getStoredData();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    const leaveTypes: LeaveType[] = DEFAULT_LEAVE_TYPES.map((lt) => ({
      id: uuidv4(),
      ...lt,
      createdAt: now,
      updatedAt: now,
    }));
    saveData(leaveTypes);
  }
}

export const leaveTypeService = {
  /**
   * 전체 휴가 유형 목록 조회
   */
  async getAll(): Promise<LeaveType[]> {
    await delay(50);
    seedLeaveTypes();
    const data = getStoredData();
    return data.filter((lt) => lt.isActive).sort((a, b) => a.order - b.order);
  },

  /**
   * ID로 조회
   */
  async getById(id: string): Promise<LeaveType | null> {
    await delay(50);
    const data = getStoredData();
    return data.find((lt) => lt.id === id) || null;
  },
};
