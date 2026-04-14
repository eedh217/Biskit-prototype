import {
  WorkplaceInfo,
  InsuranceAcquisitionForm,
  InsuranceAcquisitionHistory,
  InsuranceLossHistory,
  InsuranceSalaryChangeHistory,
  EmployeeInsuranceInfo,
  EmployeeLossInfo,
  EmployeeSalaryChangeInfo,
} from '../types/insurance';

const WORKPLACE_STORAGE_KEY = 'biskit_insurance_workplace_info';
const TEMP_FORM_STORAGE_KEY = 'biskit_insurance_acquisition_temp';

// 신고/신청 내역 저장 키
const ACQUISITION_HISTORY_KEY = 'biskit_insurance_acquisition_history';
const LOSS_HISTORY_KEY = 'biskit_insurance_loss_history';
const SALARY_CHANGE_HISTORY_KEY = 'biskit_insurance_salary_change_history';

/**
 * 사업장 정보 저장
 */
export function saveWorkplaceInfo(info: WorkplaceInfo): void {
  localStorage.setItem(WORKPLACE_STORAGE_KEY, JSON.stringify(info));
}

/**
 * 사업장 정보 불러오기
 */
export function loadWorkplaceInfo(): WorkplaceInfo | null {
  const stored = localStorage.getItem(WORKPLACE_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * 임시 저장 - 자격취득 신고서 전체 데이터
 */
export function saveTempForm(form: InsuranceAcquisitionForm): void {
  const dataToSave = {
    ...form,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(TEMP_FORM_STORAGE_KEY, JSON.stringify(dataToSave));
}

/**
 * 임시 저장 데이터 불러오기
 */
export function loadTempForm(): InsuranceAcquisitionForm | null {
  const stored = localStorage.getItem(TEMP_FORM_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * 임시 저장 데이터 삭제
 */
export function clearTempForm(): void {
  localStorage.removeItem(TEMP_FORM_STORAGE_KEY);
}

// ==================== 자격취득 신고내역 관리 ====================

/**
 * 자격취득 신고내역 저장
 */
export function saveAcquisitionHistory(
  reportDate: string,
  workplace: WorkplaceInfo,
  employees: EmployeeInsuranceInfo[]
): InsuranceAcquisitionHistory {
  const history: InsuranceAcquisitionHistory = {
    id: crypto.randomUUID(),
    reportDate,
    workplace,
    employees,
    createdAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(ACQUISITION_HISTORY_KEY);
  const histories: InsuranceAcquisitionHistory[] = stored ? JSON.parse(stored) : [];
  histories.unshift(history); // 최신 내역을 앞에 추가
  localStorage.setItem(ACQUISITION_HISTORY_KEY, JSON.stringify(histories));

  return history;
}

/**
 * 자격취득 신고내역 조회
 */
export function getAcquisitionHistories(
  startDate?: string,
  endDate?: string,
  search?: string
): InsuranceAcquisitionHistory[] {
  const stored = localStorage.getItem(ACQUISITION_HISTORY_KEY);
  if (!stored) return [];

  try {
    let histories: InsuranceAcquisitionHistory[] = JSON.parse(stored);

    // 날짜 필터링
    if (startDate || endDate) {
      histories = histories.filter((h) => {
        if (startDate && h.reportDate < startDate) return false;
        if (endDate && h.reportDate > endDate) return false;
        return true;
      });
    }

    // 검색어 필터링 (사번 또는 성명)
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      histories = histories.filter((h) =>
        h.employees.some(
          (emp) =>
            emp.name.toLowerCase().includes(searchTerm) ||
            (emp.employeeNumber && emp.employeeNumber.toLowerCase().includes(searchTerm))
        )
      );
    }

    return histories;
  } catch {
    return [];
  }
}

// ==================== 자격상실 신고내역 관리 ====================

/**
 * 자격상실 신고내역 저장
 */
export function saveLossHistory(
  reportDate: string,
  workplace: WorkplaceInfo,
  employees: EmployeeLossInfo[]
): InsuranceLossHistory {
  const history: InsuranceLossHistory = {
    id: crypto.randomUUID(),
    reportDate,
    workplace,
    employees,
    createdAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(LOSS_HISTORY_KEY);
  const histories: InsuranceLossHistory[] = stored ? JSON.parse(stored) : [];
  histories.unshift(history);
  localStorage.setItem(LOSS_HISTORY_KEY, JSON.stringify(histories));

  return history;
}

/**
 * 자격상실 신고내역 조회
 */
export function getLossHistories(
  startDate?: string,
  endDate?: string,
  search?: string
): InsuranceLossHistory[] {
  const stored = localStorage.getItem(LOSS_HISTORY_KEY);
  if (!stored) return [];

  try {
    let histories: InsuranceLossHistory[] = JSON.parse(stored);

    if (startDate || endDate) {
      histories = histories.filter((h) => {
        if (startDate && h.reportDate < startDate) return false;
        if (endDate && h.reportDate > endDate) return false;
        return true;
      });
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      histories = histories.filter((h) =>
        h.employees.some(
          (emp) =>
            emp.name.toLowerCase().includes(searchTerm) ||
            (emp.employeeNumber && emp.employeeNumber.toLowerCase().includes(searchTerm))
        )
      );
    }

    return histories;
  } catch {
    return [];
  }
}

// ==================== 보수월액변경 신청내역 관리 ====================

/**
 * 보수월액변경 신청내역 저장
 */
export function saveSalaryChangeHistory(
  reportDate: string,
  workplace: WorkplaceInfo,
  employees: EmployeeSalaryChangeInfo[]
): InsuranceSalaryChangeHistory {
  const history: InsuranceSalaryChangeHistory = {
    id: crypto.randomUUID(),
    reportDate,
    workplace,
    employees,
    createdAt: new Date().toISOString(),
  };

  const stored = localStorage.getItem(SALARY_CHANGE_HISTORY_KEY);
  const histories: InsuranceSalaryChangeHistory[] = stored ? JSON.parse(stored) : [];
  histories.unshift(history);
  localStorage.setItem(SALARY_CHANGE_HISTORY_KEY, JSON.stringify(histories));

  return history;
}

/**
 * 보수월액변경 신청내역 조회
 */
export function getSalaryChangeHistories(
  startDate?: string,
  endDate?: string,
  search?: string
): InsuranceSalaryChangeHistory[] {
  const stored = localStorage.getItem(SALARY_CHANGE_HISTORY_KEY);
  if (!stored) return [];

  try {
    let histories: InsuranceSalaryChangeHistory[] = JSON.parse(stored);

    if (startDate || endDate) {
      histories = histories.filter((h) => {
        if (startDate && h.reportDate < startDate) return false;
        if (endDate && h.reportDate > endDate) return false;
        return true;
      });
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      histories = histories.filter((h) =>
        h.employees.some(
          (emp) =>
            emp.name.toLowerCase().includes(searchTerm) ||
            (emp.employeeNumber && emp.employeeNumber.toLowerCase().includes(searchTerm))
        )
      );
    }

    return histories;
  } catch {
    return [];
  }
}
