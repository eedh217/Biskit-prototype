// 기타소득 소득구분
export type IncomeType = 'ADVISORY' | 'OTHER_PERSONAL_SERVICE'; // 자문/고문, 자문/고문 외 인적용역

export interface OtherIncome {
  id: string;
  attributionYear: number;
  attributionMonth: number;
  paymentYear: number;
  paymentMonth: number;
  name: string; // 성명(상호)
  iino: string; // 주민(사업자)등록번호
  isForeign: boolean; // 내외국인 구분 (false: 내국인, true: 외국인)
  incomeType: IncomeType; // 소득구분
  paymentCount: number; // 지급건수
  paymentAmount: number; // 지급액(A)
  necessaryExpenses: number; // 필요경비(B)
  incomeAmount: number; // 소득금액(A-B)
  taxRate: number; // 세율(%) - 20% 고정
  incomeTax: number; // 소득세
  localIncomeTax: number; // 지방소득세
  actualIncomeAmount: number; // 실소득금액
  reportFileGeneratedAt: string | null; // 신고파일 최종생성일
  createdAt: string;
  updatedAt: string;
}

export interface OtherIncomeSummaryItem {
  month: number;
  count: number; // 건수(소득자 건수)
  totalPaymentAmount: number; // 총 지급액
  totalNecessaryExpenses: number; // 총 필요경비
  totalIncomeAmount: number; // 총 소득금액
  totalIncomeTax: number; // 총 소득세
  totalLocalIncomeTax: number; // 총 지방소득세
  totalActualIncomeAmount: number; // 총 실소득금액
  reportFileGeneratedAt: string | null; // 신고파일 최종생성일
}

export interface OtherIncomeListResponse {
  data: OtherIncome[];
  total: number;
}

export interface CreateOtherIncomeDto {
  attributionYear: number;
  attributionMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  incomeType: IncomeType;
  paymentCount: number;
  paymentAmount: number;
  necessaryExpenses: number;
}

export interface CreateAllOtherIncomeDto extends CreateOtherIncomeDto {
  paymentYear: number;
  paymentMonth: number;
}

export interface UpdateOtherIncomeDto {
  attributionYear?: number;
  attributionMonth?: number;
  name?: string;
  iino?: string;
  isForeign?: boolean;
  incomeType?: IncomeType;
  paymentCount?: number;
  paymentAmount?: number;
  necessaryExpenses?: number;
}

export interface UpdateAllOtherIncomeDto extends UpdateOtherIncomeDto {
  paymentYear?: number;
  paymentMonth?: number;
}

export interface DeleteManyResult {
  success: number;
  failed: number;
}

// 세금 계산 함수 (정책: 세율 20% 고정, 소액부징수 1,000원 미만)
export function calculateOtherIncomeTaxes(params: {
  paymentAmount: number;
  necessaryExpenses: number;
}): {
  incomeAmount: number;
  taxRate: number;
  incomeTax: number;
  localIncomeTax: number;
  actualIncomeAmount: number;
} {
  const { paymentAmount, necessaryExpenses } = params;

  // 소득금액 = 지급액(A) - 필요경비(B)
  const incomeAmount = paymentAmount - necessaryExpenses;

  // 세율 20% 고정
  const taxRate = 20;

  // 소득세 = Math.floor(소득금액 × 0.2)
  let incomeTax = Math.floor(incomeAmount * 0.2);

  // 소액부징수: 소득세가 1,000원 미만인 경우 0원
  if (incomeTax < 1000) {
    incomeTax = 0;
  }

  // 지방소득세 = 소득세 = 0원 시 지방소득세 = 0원, 소득세 > 0원 시 Math.floor(소득세 × 0.1)
  const localIncomeTax = incomeTax > 0 ? Math.floor(incomeTax * 0.1) : 0;

  // 실소득금액 = 소득금액(A-B) - 소득세 - 지방소득세
  const actualIncomeAmount = incomeAmount - incomeTax - localIncomeTax;

  return {
    incomeAmount,
    taxRate,
    incomeTax,
    localIncomeTax,
    actualIncomeAmount,
  };
}

// 포맷 유틸리티 함수들
export function formatCurrency(value: number): string {
  return `${value.toLocaleString('ko-KR')}원`;
}

export function formatDate(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(date: string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const dateStr = formatDate(date);
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  return `${dateStr} ${timeStr}`;
}

// 소득구분 라벨 변환
export function getIncomeTypeLabel(incomeType: IncomeType): string {
  return incomeType === 'ADVISORY' ? '자문/고문' : '자문/고문 외 인적용역';
}

// 주민(사업자)등록번호 유효성 검사 (체크디지트 검증 제외)
export function validateIinoLength(iino: string): boolean {
  return iino.length === 10 || iino.length === 13;
}

// 간이지급명세서 생성 관련 타입
export interface StatementCreationSummary {
  count: number; // 건수(소득자 건수)
  totalPaymentAmount: number; // 총 지급액
  totalNecessaryExpenses: number; // 총 필요경비
  totalIncomeAmount: number; // 총 소득금액
}

export interface StatementCreationFormData {
  companyName: string; // 상호(법인명)
  ceoName: string; // 대표자 성명
  businessNumber: string; // 사업자등록번호
  corporateNumber: string; // 법인등록번호
  managerName: string; // 담당자 성명
  managerDepartment: string; // 담당자 부서
  managerPhone: string; // 담당자 전화번호
  hometaxId: string; // 홈택스ID
  taxOfficeCode: string; // 관할세무서 코드
  purpose: string; // 생성목적
}
