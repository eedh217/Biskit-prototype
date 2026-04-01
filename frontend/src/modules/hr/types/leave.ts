/**
 * 휴가 유형 (VacationType의 별칭)
 * @deprecated VacationType을 직접 사용하세요
 */
export type { VacationType as LeaveType } from './vacation';

/**
 * 휴가 신청
 */
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string; // 휴가유형 ID
  usageUnit?: string; // 사용 단위 (day, morning, afternoon, 1hour~8hour)
  startDate: string; // YYYYMMDD
  endDate: string; // YYYYMMDD
  workingDays: number; // 실제 차감 일수 (평일 기준, 공휴일 제외)
  reason: string; // 사유
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; // 대기중/승인/반려/승인취소
  rejectionReason: string | null; // 반려 사유
  requestedAt: string; // 신청일시
  approvedBy: string | null; // 승인자 ID
  approvedAt: string | null; // 승인일시
  createdAt: string;
  updatedAt: string;
}

/**
 * 연차 잔액 (직원별, 연도별)
 */
export interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number; // 연도
  totalDays: number; // 총 발생일수 (자동 계산)
  usedDays: number; // 사용일수 (계산)
  remainingDays: number; // 잔여일수 (계산)
  createdAt: string;
  updatedAt: string;
}

/**
 * 연차 이력
 */
export interface LeaveHistory {
  id: string;
  employeeId: string;
  year: number;
  type: 'grant' | 'use' | 'cancel' | 'adjust'; // 발생/사용/취소/조정
  days: number; // 연차 잔액 변동량 (+ or -, 차감 없으면 0)
  actualDays: number; // 실제 사용 일수 (표시용)
  leaveTypeName: string | null; // 휴가 이름 (표시용, 예: "배우자 출산휴가")
  usageUnit?: string; // 사용 단위 (day, morning, afternoon, 1hour~8hour)
  affectsLeaveBalance: boolean; // 연차 차감 여부 (색상 결정용)
  reason: string; // 사유
  leaveRequestId: string | null; // 연관된 신청 ID
  occurredAt: string; // 발생일시
  createdAt: string;
}

/**
 * 연차 발생 기준 설정
 */
export interface LeaveSettings {
  hourlyLeaveEnabled: boolean; // 시간 단위 연차/휴가 사용 여부
  grantType: 'join_date' | 'year_start'; // 입사일 기준 / 연초 기준
  roundingMethod: 'floor' | 'ceil'; // 비례부여 소수점 처리 (버림/올림)
  updatedAt: string;
  updatedBy: string; // 수정자 ID
}

/**
 * 공휴일 마스터
 */
export interface Holiday {
  id: string;
  date: string; // YYYYMMDD
  name: string; // 공휴일 이름
  year: number;
  createdAt: string;
}

/**
 * 휴가 신청 생성 DTO
 */
export interface CreateLeaveRequestDto {
  employeeId: string;
  leaveTypeId: string;
  usageUnit?: string; // 사용 단위 (day, morning, afternoon, 1hour~8hour)
  startDate: string;
  endDate: string;
  reason: string;
}

/**
 * 휴가 승인 DTO
 */
export interface ApproveLeaveRequestDto {
  approvedBy: string; // 승인자 ID
}

/**
 * 휴가 반려 DTO
 */
export interface RejectLeaveRequestDto {
  rejectionReason: string;
  rejectedBy: string; // 반려자 ID
}

/**
 * 연차 잔액 요약
 */
export interface LeaveBalanceSummary {
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number; // 대기중인 신청 일수
}
