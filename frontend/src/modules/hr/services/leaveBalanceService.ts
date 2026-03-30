import { v4 as uuidv4 } from 'uuid';
import type { LeaveBalance, LeaveBalanceSummary } from '../types/leave';
import type { Employee } from '../types/employee';
import { calculateAnnualLeave } from '../utils/leaveCalculation';
import { leaveSettingsService } from './leaveSettingsService';
import { leaveRequestService } from './leaveRequestService';

const STORAGE_KEY = 'biskit_leave_balances';

function getStoredData(): LeaveBalance[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: LeaveBalance[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const leaveBalanceService = {
  /**
   * 직원의 특정 연도 연차 잔액 조회
   * 없으면 자동 생성, 있으면 실시간 재계산 (자동 계산 방식)
   */
  async getByEmployeeAndYear(
    employeeId: string,
    year: number,
    employee: Employee
  ): Promise<LeaveBalance> {
    await delay(50);
    const data = getStoredData();
    let balance = data.find((b) => b.employeeId === employeeId && b.year === year);

    // 없으면 생성
    if (!balance) {
      balance = await this.createBalance(employee, year);
    } else {
      // 있으면 실시간 재계산 (usedDays, totalDays)
      const settings = await leaveSettingsService.get();
      const totalDays = calculateAnnualLeave(
        employee,
        year,
        settings.grantType,
        settings.roundingMethod
      );
      const usedDays = await this.calculateUsedDays(employee.id, year);

      balance.totalDays = totalDays;
      balance.usedDays = usedDays;
      balance.remainingDays = totalDays - usedDays;
      balance.updatedAt = new Date().toISOString();

      // 저장
      const index = data.findIndex((b) => b.id === balance?.id);
      if (index !== -1 && balance) {
        data[index] = balance;
        saveData(data);
      }
    }

    if (!balance) {
      throw new Error('잔액 계산에 실패했습니다.');
    }

    return balance;
  },

  /**
   * 연차 잔액 생성 (자동 계산)
   */
  async createBalance(employee: Employee, year: number): Promise<LeaveBalance> {
    await delay(50);

    // 설정 조회
    const settings = await leaveSettingsService.get();

    // 연차 자동 계산
    const totalDays = calculateAnnualLeave(
      employee,
      year,
      settings.grantType,
      settings.roundingMethod
    );

    // 사용일수 계산 (승인된 신청만)
    const usedDays = await this.calculateUsedDays(employee.id, year);

    const balance: LeaveBalance = {
      id: uuidv4(),
      employeeId: employee.id,
      year,
      totalDays,
      usedDays,
      remainingDays: totalDays - usedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = getStoredData();
    data.push(balance);
    saveData(data);

    return balance;
  },

  /**
   * 사용일수 계산 (승인된 신청만)
   */
  async calculateUsedDays(employeeId: string, year: number): Promise<number> {
    const requests = await leaveRequestService.getByEmployee(employeeId);
    const approvedRequests = requests.filter(
      (r) => r.status === 'approved' && r.startDate.startsWith(String(year))
    );
    return approvedRequests.reduce((sum, r) => sum + r.workingDays, 0);
  },

  /**
   * 연차 잔액 재계산 (모든 직원)
   */
  async recalculateAll(employees: Employee[]): Promise<void> {
    await delay(100);
    const currentYear = new Date().getFullYear();

    // 기존 데이터 삭제
    saveData([]);

    // 모든 직원의 연차 재생성
    for (const employee of employees) {
      await this.createBalance(employee, currentYear);
    }
  },

  /**
   * 연차 잔액 업데이트
   */
  async update(balance: LeaveBalance): Promise<void> {
    await delay(50);
    const data = getStoredData();
    const index = data.findIndex((b) => b.id === balance.id);
    if (index !== -1) {
      data[index] = { ...balance, updatedAt: new Date().toISOString() };
      saveData(data);
    }
  },

  /**
   * 연차 잔액 요약 (대기중 포함)
   */
  async getSummary(
    employeeId: string,
    year: number,
    employee: Employee
  ): Promise<LeaveBalanceSummary> {
    const balance = await this.getByEmployeeAndYear(employeeId, year, employee);

    // 대기중인 신청 일수
    const requests = await leaveRequestService.getByEmployee(employeeId);
    const pendingRequests = requests.filter(
      (r) => r.status === 'pending' && r.startDate.startsWith(String(year))
    );
    const pendingDays = pendingRequests.reduce((sum, r) => sum + r.workingDays, 0);

    return {
      year: balance.year,
      totalDays: balance.totalDays,
      usedDays: balance.usedDays,
      remainingDays: balance.remainingDays,
      pendingDays,
    };
  },
};
