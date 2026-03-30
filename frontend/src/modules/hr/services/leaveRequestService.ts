import { v4 as uuidv4 } from 'uuid';
import type {
  LeaveRequest,
  CreateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
} from '../types/leave';
import { calculateWorkingDays } from '../utils/dateUtils';
import { holidayService } from './holidayService';
import { leaveTypeService } from './leaveTypeService';
import { leaveHistoryService } from './leaveHistoryService';
import { formatDate } from '../types/employee';

const STORAGE_KEY = 'biskit_leave_requests';

function getStoredData(): LeaveRequest[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: LeaveRequest[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const leaveRequestService = {
  /**
   * 전체 신청 목록 조회
   */
  async getAll(): Promise<LeaveRequest[]> {
    await delay(50);
    const data = getStoredData();
    return data.sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
  },

  /**
   * 직원별 신청 목록 조회
   */
  async getByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    await delay(50);
    const data = getStoredData();
    return data
      .filter((r) => r.employeeId === employeeId)
      .sort(
        (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
  },

  /**
   * ID로 조회
   */
  async getById(id: string): Promise<LeaveRequest | null> {
    await delay(50);
    const data = getStoredData();
    return data.find((r) => r.id === id) || null;
  },

  /**
   * 휴가 신청
   */
  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    await delay(100);

    // 공휴일 목록 조회
    const holidays = await holidayService.getAll();

    // 평일 일수 계산 (주말/공휴일 제외)
    let workingDays = calculateWorkingDays(dto.startDate, dto.endDate, holidays);

    // 반차인 경우 0.5일로 고정
    const leaveType = await leaveTypeService.getById(dto.leaveTypeId);
    if (leaveType && leaveType.deductionDays === 0.5) {
      workingDays = 0.5;
    }

    const newRequest: LeaveRequest = {
      id: uuidv4(),
      ...dto,
      workingDays,
      status: 'pending',
      rejectionReason: null,
      requestedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = getStoredData();
    data.push(newRequest);
    saveData(data);

    return newRequest;
  },

  /**
   * 휴가 승인
   */
  async approve(id: string, dto: ApproveLeaveRequestDto): Promise<LeaveRequest> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('신청을 찾을 수 없습니다.');
    }

    const request = data[index];

    data[index] = {
      ...request,
      status: 'approved',
      approvedBy: dto.approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveData(data);

    // 연차 이력 추가 (사용)
    const year = parseInt(request.startDate.slice(0, 4));
    const dateRange = request.startDate === request.endDate
      ? formatDate(request.startDate)
      : `${formatDate(request.startDate)} ~ ${formatDate(request.endDate)}`;

    await leaveHistoryService.create(
      request.employeeId,
      year,
      'use',
      -request.workingDays, // 마이너스로 차감
      `휴가 사용 (${dateRange})`,
      request.id
    );

    return data[index];
  },

  /**
   * 휴가 반려
   */
  async reject(id: string, dto: RejectLeaveRequestDto): Promise<LeaveRequest> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('신청을 찾을 수 없습니다.');
    }

    data[index] = {
      ...data[index],
      status: 'rejected',
      rejectionReason: dto.rejectionReason,
      approvedBy: dto.rejectedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveData(data);
    return data[index];
  },

  /**
   * 휴가 신청 취소 (대기중인 것만)
   */
  async cancel(id: string): Promise<void> {
    await delay(50);
    const data = getStoredData();
    const request = data.find((r) => r.id === id);

    if (!request) {
      throw new Error('신청을 찾을 수 없습니다.');
    }

    if (request.status !== 'pending') {
      throw new Error('대기중인 신청만 취소할 수 있습니다.');
    }

    const filtered = data.filter((r) => r.id !== id);
    saveData(filtered);
  },

  /**
   * 대기중인 신청 목록 조회
   */
  async getPending(): Promise<LeaveRequest[]> {
    await delay(50);
    const data = getStoredData();
    return data
      .filter((r) => r.status === 'pending')
      .sort(
        (a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
      );
  },

  /**
   * 승인 취소 (승인된 것을 취소하여 연차 복원)
   */
  async cancelApproval(id: string): Promise<LeaveRequest> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('신청을 찾을 수 없습니다.');
    }

    const request = data[index];

    if (request.status !== 'approved') {
      throw new Error('승인된 신청만 취소할 수 있습니다.');
    }

    // 상태를 cancelled로 변경
    data[index] = {
      ...request,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    };

    saveData(data);

    // 연차 이력 추가 (복원)
    const year = parseInt(request.startDate.slice(0, 4));
    const dateRange = request.startDate === request.endDate
      ? formatDate(request.startDate)
      : `${formatDate(request.startDate)} ~ ${formatDate(request.endDate)}`;

    await leaveHistoryService.create(
      request.employeeId,
      year,
      'cancel',
      request.workingDays, // 양수로 복원
      `휴가 승인 취소 (${dateRange})`,
      request.id
    );

    return data[index];
  },

  /**
   * 반려되거나 승인취소된 신청을 승인
   */
  async approveRejected(id: string, dto: ApproveLeaveRequestDto): Promise<LeaveRequest> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('신청을 찾을 수 없습니다.');
    }

    const request = data[index];

    if (request.status !== 'rejected' && request.status !== 'cancelled') {
      throw new Error('반려되거나 승인취소된 신청만 승인할 수 있습니다.');
    }

    data[index] = {
      ...request,
      status: 'approved',
      approvedBy: dto.approvedBy,
      approvedAt: new Date().toISOString(),
      rejectionReason: null,
      updatedAt: new Date().toISOString(),
    };

    saveData(data);

    // 연차 이력 추가 (사용)
    const year = parseInt(request.startDate.slice(0, 4));
    const dateRange = request.startDate === request.endDate
      ? formatDate(request.startDate)
      : `${formatDate(request.startDate)} ~ ${formatDate(request.endDate)}`;

    await leaveHistoryService.create(
      request.employeeId,
      year,
      'use',
      -request.workingDays, // 마이너스로 차감
      `휴가 사용 (${dateRange})`,
      request.id
    );

    return data[index];
  },
};
