/**
 * 휴가 사용 단위
 */
export type UsageUnit = 'day' | 'half-day' | 'hour';

/**
 * 휴가 종류 (법정 휴가, 회사 휴가)
 */
export interface VacationType {
  id: string;
  name: string; // 휴가 이름
  isLegal: boolean; // 법정 휴가 여부
  days: number | null; // 일수 (null = 직원마다 부여)
  isPaid: boolean; // 유급 여부
  usageUnits: UsageUnit[]; // 사용 단위 (복수 선택 가능)
  isActive: boolean; // 활성 상태
  displayOrder: number; // 표시 순서
  description: string; // 설명
  deductionDays: number | null; // 연차 차감 일수 (null이면 차감 안 함)
  affectsLeaveBalance: boolean; // 연차 잔액에 영향 여부 (true: 연차/반차, false: 법정 휴가)
  createdAt: string;
  updatedAt: string;
}

/**
 * 휴가 종류 생성 DTO
 */
export interface CreateVacationTypeDto {
  name: string;
  days: number | null;
  isPaid: boolean;
  usageUnits: UsageUnit[];
  description: string;
  deductionDays: number | null;
  affectsLeaveBalance: boolean;
}

/**
 * 휴가 종류 수정 DTO
 */
export interface UpdateVacationTypeDto {
  name: string;
  days: number | null;
  isPaid: boolean;
  usageUnits: UsageUnit[];
  description: string;
  isActive: boolean;
  deductionDays: number | null;
  affectsLeaveBalance: boolean;
}
