import { v4 as uuidv4 } from 'uuid';
import type { LeaveHistory } from '../types/leave';

const STORAGE_KEY = 'biskit_leave_history';

function getStoredData(): LeaveHistory[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: LeaveHistory[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const leaveHistoryService = {
  /**
   * 직원별 이력 조회
   */
  async getByEmployee(employeeId: string, year?: number): Promise<LeaveHistory[]> {
    await delay(50);
    const data = getStoredData();
    let filtered = data.filter((h) => h.employeeId === employeeId);

    if (year) {
      filtered = filtered.filter((h) => h.year === year);
    }

    return filtered.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
  },

  /**
   * 이력 추가
   */
  async create(
    employeeId: string,
    year: number,
    type: 'grant' | 'use' | 'cancel' | 'adjust',
    days: number,
    reason: string,
    leaveRequestId: string | null = null,
    actualDays: number = 0,
    leaveTypeName: string | null = null,
    affectsLeaveBalance: boolean = true,
    usageUnit?: string
  ): Promise<LeaveHistory> {
    await delay(50);

    const history: LeaveHistory = {
      id: uuidv4(),
      employeeId,
      year,
      type,
      days,
      actualDays,
      leaveTypeName,
      usageUnit,
      affectsLeaveBalance,
      reason,
      leaveRequestId,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const data = getStoredData();
    data.push(history);
    saveData(data);

    return history;
  },

  /**
   * 모든 이력 삭제 (특정 직원)
   */
  async deleteByEmployee(employeeId: string): Promise<void> {
    await delay(50);
    const data = getStoredData();
    const filtered = data.filter((h) => h.employeeId !== employeeId);
    saveData(filtered);
  },
};
