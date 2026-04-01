import type { LeaveSettings } from '../types/leave';

const STORAGE_KEY = 'biskit_leave_settings';

/**
 * 기본 설정: 입사일 기준
 */
const DEFAULT_SETTINGS: LeaveSettings = {
  hourlyLeaveEnabled: true, // 기본값: 시간 단위 사용 활성화
  grantType: 'join_date',
  roundingMethod: 'floor', // 기본값: 버림
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

function getStoredData(): LeaveSettings {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
}

function saveData(settings: LeaveSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const leaveSettingsService = {
  /**
   * 현재 설정 조회
   */
  async get(): Promise<LeaveSettings> {
    await delay(50);
    return getStoredData();
  },

  /**
   * 설정 변경
   */
  async update(
    hourlyLeaveEnabled: boolean,
    grantType: 'join_date' | 'year_start',
    roundingMethod: 'floor' | 'ceil',
    updatedBy: string
  ): Promise<LeaveSettings> {
    await delay(50);
    const settings: LeaveSettings = {
      hourlyLeaveEnabled,
      grantType,
      roundingMethod,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };
    saveData(settings);
    return settings;
  },
};
