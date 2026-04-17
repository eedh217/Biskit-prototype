// 급여 템플릿 항목
export interface PayrollTemplateItem {
  itemId: string; // "taxable-2026-1", "non-taxable-2026-P01"
  itemCode: string; // "급여", "P01"
  itemName: string; // "급여", "식대"
  amount: number; // 3000000
  category: 'taxable' | 'non-taxable';
}

export interface Employee {
  id: string;
  employeeNumber: string; // 사번
  name: string; // 성명
  nationalityType: 'domestic' | 'foreign'; // 내외국인 여부
  residentRegistrationNumber: string | null; // 주민등록번호 (앞6자리-뒤7자리)
  foreignerRegistrationNumber: string | null; // 외국인등록번호 (앞6자리-뒤7자리)
  passportNumber: string | null; // 여권번호
  birthDate: string | null; // 생년월일 (YYYYMMDD) - 여권 선택 시
  gender: 'male' | 'female' | null; // 성별 - 여권 선택 시
  nationality: string | null; // 국적 (ISO 국가 코드) - 외국인 시
  residenceType: 'resident' | 'non-resident'; // 거주구분
  disabilityType: 'none' | 'disabled' | 'veteran' | 'severe'; // 장애여부
  email: string; // 이메일
  contact: string | null; // 연락처 (선택)
  phone: string | null; // 휴대폰번호 (3자리-4자리-4자리) (선택)
  zipCode: string | null; // 우편번호 (선택)
  address: string | null; // 주소 (선택)
  detailAddress: string | null; // 상세주소 (선택)
  joinDate: string; // 입사일 (YYYYMMDD)
  leaveDate: string | null; // 퇴사일 (YYYYMMDD or null)
  departmentId: string | null; // 부서 ID (Organization ID 참조)
  position: string | null; // 직급 ID (JobLevel ID 참조)
  employmentTypeId: string | null; // 근로형태 ID (EmploymentType ID 참조)
  isDepartmentHead: boolean; // 부서장 여부
  annualSalary: number | null; // 연봉 (계약 금액)
  payrollTemplate: PayrollTemplateItem[]; // 급여 템플릿 항목
  bankName: string | null; // 은행명
  accountHolder: string | null; // 예금주
  accountNumber: string | null; // 계좌번호
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
}

export interface CreateEmployeeDto {
  employeeNumber: string;
  name: string;
  nationalityType: 'domestic' | 'foreign';
  residentRegistrationNumber?: string | null;
  foreignerRegistrationNumber?: string | null;
  passportNumber?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | null;
  nationality?: string | null;
  residenceType: 'resident' | 'non-resident';
  disabilityType: 'none' | 'disabled' | 'veteran' | 'severe';
  email: string;
  contact?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  address?: string | null;
  detailAddress?: string | null;
  joinDate: string;
  leaveDate?: string | null;
  departmentId?: string | null;
  position?: string | null;
  employmentTypeId?: string | null;
  isDepartmentHead?: boolean;
  annualSalary?: number | null;
  payrollTemplate?: PayrollTemplateItem[];
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
}

export interface UpdateEmployeeDto {
  employeeNumber?: string;
  name?: string;
  nationalityType?: 'domestic' | 'foreign';
  residentRegistrationNumber?: string | null;
  foreignerRegistrationNumber?: string | null;
  passportNumber?: string | null;
  birthDate?: string | null;
  gender?: 'male' | 'female' | null;
  nationality?: string | null;
  residenceType?: 'resident' | 'non-resident';
  disabilityType?: 'none' | 'disabled' | 'veteran' | 'severe';
  email?: string;
  contact?: string | null;
  phone?: string | null;
  zipCode?: string | null;
  address?: string | null;
  detailAddress?: string | null;
  joinDate?: string;
  leaveDate?: string | null;
  departmentId?: string | null;
  position?: string | null;
  employmentTypeId?: string | null;
  isDepartmentHead?: boolean;
  annualSalary?: number | null;
  payrollTemplate?: PayrollTemplateItem[];
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
}

export interface DeleteManyResult {
  success: number;
  failed: number;
}

/**
 * 재직상태 계산
 * - 퇴사일이 없으면: 재직중
 * - 퇴사일이 있고 퇴사일이 지나지 않았으면: 재직중
 * - 퇴사일이 지났으면: 퇴사
 */
export function getEmploymentStatus(leaveDate: string | null): '재직중' | '퇴사' {
  if (!leaveDate) {
    return '재직중';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const leaveDateObj = parseDateString(leaveDate);
  leaveDateObj.setHours(0, 0, 0, 0);

  if (leaveDateObj > today) {
    return '재직중';
  }

  return '퇴사';
}

/**
 * 근속기간 계산 (N년 N개월 형식)
 * - 재직자: 입사일 ~ 현재
 * - 퇴사자: 입사일 ~ 퇴사일
 */
export function calculateTenure(joinDate: string, leaveDate: string | null): string {
  const startDate = parseDateString(joinDate);
  const endDate = leaveDate ? parseDateString(leaveDate) : new Date();

  const years = endDate.getFullYear() - startDate.getFullYear();
  const months = endDate.getMonth() - startDate.getMonth();

  let totalYears = years;
  let totalMonths = months;

  if (totalMonths < 0) {
    totalYears -= 1;
    totalMonths += 12;
  }

  // 일 단위 보정 (입사일보다 이전 날짜면 1개월 차감)
  if (endDate.getDate() < startDate.getDate()) {
    totalMonths -= 1;
    if (totalMonths < 0) {
      totalYears -= 1;
      totalMonths += 12;
    }
  }

  if (totalYears === 0 && totalMonths === 0) {
    return '1개월 미만';
  }

  if (totalYears === 0) {
    return `${totalMonths}개월`;
  }

  if (totalMonths === 0) {
    return `${totalYears}년`;
  }

  return `${totalYears}년 ${totalMonths}개월`;
}

/**
 * YYYYMMDD 형식의 문자열을 Date 객체로 변환
 */
function parseDateString(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-based
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
export function formatDate(dateStr: string): string {
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * 휴대폰번호 포맷팅 (010-1234-5678)
 */
export function formatPhone(phone: string | null): string {
  // null 또는 빈 값 체크
  if (!phone) {
    return '-';
  }

  // 숫자만 추출
  const digits = phone.replace(/\D/g, '');

  // 3-4-4 또는 3-3-4 형식으로 포맷팅
  if (digits.length === 11) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 7)}-${digits.substring(7)}`;
  } else if (digits.length === 10) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`;
  }

  return phone; // 포맷팅 불가능한 경우 원본 반환
}
