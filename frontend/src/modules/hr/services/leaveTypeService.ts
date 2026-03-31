/**
 * leaveTypeService - vacationTypeService의 래퍼
 * @deprecated vacationTypeService를 직접 사용하세요
 */
import type { LeaveType } from '../types/leave';
import { vacationTypeService } from './vacationTypeService';

export const leaveTypeService = {
  /**
   * 전체 휴가 유형 목록 조회 (활성화된 것만)
   */
  async getAll(): Promise<LeaveType[]> {
    const allTypes = await vacationTypeService.getAll();
    return allTypes.filter((lt) => lt.isActive);
  },

  /**
   * ID로 조회
   */
  async getById(id: string): Promise<LeaveType | null> {
    return await vacationTypeService.getById(id);
  },
};
