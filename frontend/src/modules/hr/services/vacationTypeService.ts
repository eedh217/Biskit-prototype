import { v4 as uuidv4 } from 'uuid';
import type { VacationType, CreateVacationTypeDto, UpdateVacationTypeDto } from '../types/vacation';
import { leaveRequestService } from './leaveRequestService';
import { leaveHistoryService } from './leaveHistoryService';
import { formatDate } from '../types/employee';

const STORAGE_KEY = 'biskit_vacation_types_v2';

/**
 * 법정 휴가 기본 데이터
 */
const DEFAULT_LEGAL_VACATIONS: Omit<VacationType, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '연차',
    isLegal: true,
    days: null, // 직원마다 부여
    isPaid: true,
    usageUnits: ['day', 'half-day', 'hour'], // 일, 반일, 시간 단위 모두 사용 가능
    isActive: true,
    displayOrder: 1,
    description: '직원마다 부여되는 연차입니다. 일 단위, 반일 단위, 시간 단위로 사용 가능합니다.',
    deductionDays: null, // 사용 단위에 따라 차감
    affectsLeaveBalance: true, // 연차 잔액에 영향
  },
  {
    name: '출산전후휴가',
    isLegal: true,
    days: 90,
    isPaid: true,
    usageUnits: ['day'],
    isActive: true,
    displayOrder: 2,
    description: '출산 전후 90일의 휴가입니다.',
    deductionDays: 0, // 차감 안 함
    affectsLeaveBalance: false, // 연차 잔액에 영향 없음
  },
  {
    name: '출산전후휴가(다태아)',
    isLegal: true,
    days: 120,
    isPaid: true,
    usageUnits: ['day'],
    isActive: true,
    displayOrder: 3,
    description: '다태아 출산 시 120일의 휴가입니다.',
    deductionDays: 0, // 차감 안 함
    affectsLeaveBalance: false, // 연차 잔액에 영향 없음
  },
  {
    name: '육아휴직',
    isLegal: true,
    days: 365,
    isPaid: false,
    usageUnits: ['day'],
    isActive: true,
    displayOrder: 4,
    description: '만 8세 이하 또는 초등학교 2학년 이하 자녀 양육을 위한 휴직입니다.',
    deductionDays: 0, // 차감 안 함
    affectsLeaveBalance: false, // 연차 잔액에 영향 없음
  },
  {
    name: '배우자 출산휴가',
    isLegal: true,
    days: 10,
    isPaid: true,
    usageUnits: ['day'],
    isActive: true,
    displayOrder: 5,
    description: '배우자 출산 시 10일의 유급휴가입니다.',
    deductionDays: 0, // 차감 안 함
    affectsLeaveBalance: false, // 연차 잔액에 영향 없음
  },
  {
    name: '가족돌봄휴가',
    isLegal: true,
    days: 10,
    isPaid: false,
    usageUnits: ['day'],
    isActive: true,
    displayOrder: 6,
    description: '가족의 질병, 사고, 노령 등으로 돌봄이 필요한 경우 연간 최대 10일까지 사용 가능합니다.',
    deductionDays: 0, // 차감 안 함
    affectsLeaveBalance: false, // 연차 잔액에 영향 없음
  },
  {
    name: '생리휴가',
    isLegal: true,
    days: 12,
    isPaid: false,
    usageUnits: ['day'],
    isActive: true,
    displayOrder: 7,
    description: '여성 근로자에게 월 1일씩 연간 12일이 부여됩니다.',
    deductionDays: 0, // 차감 안 함
    affectsLeaveBalance: false, // 연차 잔액에 영향 없음
  },
];

function getStoredData(): VacationType[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: VacationType[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 초기 데이터 시드
 */
function seedVacationTypes(): void {
  const existing = getStoredData();
  if (existing.length === 0) {
    const now = new Date().toISOString();
    const vacationTypes: VacationType[] = DEFAULT_LEGAL_VACATIONS.map((vt) => ({
      id: uuidv4(),
      ...vt,
      createdAt: now,
      updatedAt: now,
    }));
    saveData(vacationTypes);
  }
}

export const vacationTypeService = {
  /**
   * 전체 휴가 종류 목록 조회 (정렬된 순서)
   */
  async getAll(): Promise<VacationType[]> {
    await delay(100);
    seedVacationTypes();
    let data = getStoredData();

    // 데이터 마이그레이션: usageUnit -> usageUnits
    let needsMigration = false;
    data = data.map((vt) => {
      // @ts-ignore - 이전 스키마 체크
      if (vt.usageUnit && !vt.usageUnits) {
        needsMigration = true;
        // @ts-ignore
        const oldUnit = vt.usageUnit;
        return {
          ...vt,
          usageUnits: [oldUnit],
          // @ts-ignore - 이전 필드 제거
          usageUnit: undefined,
        };
      }
      return vt;
    });

    if (needsMigration) {
      saveData(data);
    }

    return data.sort((a, b) => a.displayOrder - b.displayOrder);
  },

  /**
   * ID로 조회
   */
  async getById(id: string): Promise<VacationType | null> {
    await delay(50);
    const data = getStoredData();
    return data.find((vt) => vt.id === id) || null;
  },

  /**
   * 휴가 종류 생성 (회사 휴가만 가능)
   */
  async create(dto: CreateVacationTypeDto): Promise<VacationType> {
    await delay(100);
    const data = getStoredData();

    // 마지막 displayOrder 찾기
    const maxOrder = data.reduce((max, vt) => Math.max(max, vt.displayOrder), 0);

    const now = new Date().toISOString();
    const newVacationType: VacationType = {
      id: uuidv4(),
      name: dto.name,
      isLegal: false, // 회사 휴가는 항상 false
      days: dto.days,
      isPaid: dto.isPaid,
      usageUnits: dto.usageUnits,
      isActive: true,
      displayOrder: maxOrder + 1,
      description: dto.description,
      deductionDays: dto.deductionDays,
      affectsLeaveBalance: dto.affectsLeaveBalance,
      createdAt: now,
      updatedAt: now,
    };

    data.push(newVacationType);
    saveData(data);
    return newVacationType;
  },

  /**
   * 휴가 종류 수정 (회사 휴가만 가능)
   */
  async update(id: string, dto: UpdateVacationTypeDto): Promise<VacationType> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((vt) => vt.id === id);

    if (index === -1) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    const vacationType = data[index];

    if (!vacationType) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    // 법정 휴가는 수정 불가
    if (vacationType.isLegal) {
      throw new Error('법정 휴가는 수정할 수 없습니다.');
    }

    // affectsLeaveBalance 변경 감지
    const oldAffectsLeaveBalance = vacationType.affectsLeaveBalance;
    const newAffectsLeaveBalance = dto.affectsLeaveBalance;
    const affectsLeaveBalanceChanged = oldAffectsLeaveBalance !== newAffectsLeaveBalance;

    const updated: VacationType = {
      ...vacationType,
      name: dto.name,
      days: dto.days,
      isPaid: dto.isPaid,
      usageUnits: dto.usageUnits,
      isActive: dto.isActive,
      description: dto.description,
      deductionDays: dto.deductionDays,
      affectsLeaveBalance: dto.affectsLeaveBalance,
      updatedAt: new Date().toISOString(),
    };

    data[index] = updated;
    saveData(data);

    // affectsLeaveBalance 변경 시 연차 재계산
    if (affectsLeaveBalanceChanged) {
      await this.recalculateLeaveBalances(id, oldAffectsLeaveBalance, newAffectsLeaveBalance, vacationType.name);
    }

    return updated;
  },

  /**
   * 연차 잔액 재계산 (affectsLeaveBalance 변경 시)
   */
  async recalculateLeaveBalances(
    vacationTypeId: string,
    oldAffects: boolean,
    newAffects: boolean,
    vacationTypeName: string
  ): Promise<void> {
    // 해당 휴가 유형의 승인된 신청 조회
    const allRequests = await leaveRequestService.getAll();
    const approvedRequests = allRequests.filter(
      (req) => req.leaveTypeId === vacationTypeId && req.status === 'approved'
    );

    // 각 신청에 대해 조정 이력 추가
    for (const request of approvedRequests) {
      const year = parseInt(request.startDate.slice(0, 4));

      // 날짜 범위 계산
      const dateRange =
        request.startDate === request.endDate
          ? formatDate(request.startDate)
          : `${formatDate(request.startDate)} ~ ${formatDate(request.endDate)}`;

      if (!oldAffects && newAffects) {
        // 케이스 1: 영향 없음 → 있음 (차감)
        await leaveHistoryService.create(
          request.employeeId,
          year,
          'adjust',
          -request.workingDays, // 마이너스 (차감)
          `${dateRange} (연차 차감 설정 변경으로 인한 조정)`,
          request.id,
          request.workingDays, // actualDays
          vacationTypeName,
          true, // affectsLeaveBalance
          request.usageUnit
        );
      } else if (oldAffects && !newAffects) {
        // 케이스 2: 영향 있음 → 없음 (복원)
        await leaveHistoryService.create(
          request.employeeId,
          year,
          'adjust',
          request.workingDays, // 플러스 (복원)
          `${dateRange} (연차 차감 설정 해제로 인한 복원)`,
          request.id,
          request.workingDays, // actualDays
          vacationTypeName,
          true, // affectsLeaveBalance
          request.usageUnit
        );
      }
    }
  },

  /**
   * 휴가 종류 삭제 (회사 휴가만 가능)
   */
  async delete(id: string): Promise<void> {
    await delay(100);
    const data = getStoredData();
    const vacationType = data.find((vt) => vt.id === id);

    if (!vacationType) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    // 법정 휴가는 삭제 불가
    if (vacationType.isLegal) {
      throw new Error('법정 휴가는 삭제할 수 없습니다.');
    }

    const filtered = data.filter((vt) => vt.id !== id);
    saveData(filtered);
  },

  /**
   * 순서 업데이트 (드래그앤드롭)
   */
  async updateOrder(orderedItems: VacationType[]): Promise<void> {
    await delay(100);
    const updated = orderedItems.map((item, index) => ({
      ...item,
      displayOrder: index + 1,
      updatedAt: new Date().toISOString(),
    }));
    saveData(updated);
  },

  /**
   * 활성/비활성 토글
   */
  async toggleActive(id: string): Promise<VacationType> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((vt) => vt.id === id);

    if (index === -1) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    const vacationType = data[index];
    if (!vacationType) {
      throw new Error('휴가 종류를 찾을 수 없습니다.');
    }

    const updated: VacationType = {
      ...vacationType,
      isActive: !vacationType.isActive,
      updatedAt: new Date().toISOString(),
    };

    data[index] = updated;
    saveData(data);
    return updated;
  },
};
