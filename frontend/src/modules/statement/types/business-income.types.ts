export interface IndustryCode {
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessIncome {
  id: string;
  attributionYear: number;
  attributionMonth: number;
  paymentYear: number;
  paymentMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  industryCode: string;
  paymentSum: number;
  taxRate: number;
  incomeTax: number;
  localIncomeTax: number;
  actualPayment: number;
  reportFileGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessIncomeSummaryItem {
  month: number;
  count: number;
  totalPaymentSum: number;
  totalIncomeTax: number;
  totalLocalIncomeTax: number;
  totalActualPayment: number;
  reportFileGeneratedAt: string | null;
  // 12월 예외 행 관련 필드
  isExceptionRow?: boolean; // 12월 예외 행 여부
  exceptionLabel?: string; // "2026년 지급" 또는 "2026년 이후 지급"
}

export interface GroupedBusinessIncome {
  id: string; // 대표 레코드의 ID (첫 번째 레코드)
  attributionYear: number;
  attributionMonth: number;
  paymentYear: number;
  paymentMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  industryCode: string;
  paymentSum: number;
  taxRate: number;
  incomeTax: number;
  localIncomeTax: number;
  actualPayment: number;
  reportFileGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 합산 관련 필드
  isGrouped: boolean; // 합산 행 여부
  groupedCount: number; // 합산된 레코드 수 (1이면 개별 행)
  groupedIds: string[]; // 합산된 모든 레코드의 ID
  records: BusinessIncome[]; // 합산된 모든 레코드
}

export interface BusinessIncomeListResponse {
  data: GroupedBusinessIncome[];
  total: number; // 합산 후 행 개수
  totalRecords: number; // 합산 전 총 레코드 개수
}

export interface CreateBusinessIncomeDto {
  attributionYear: number;
  attributionMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  industryCode: string;
  paymentSum: number;
  taxRate?: number;
}

export interface CreateAllBusinessIncomeDto {
  paymentYear: number;
  paymentMonth: number;
  attributionYear: number;
  attributionMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  industryCode: string;
  paymentSum: number;
  taxRate?: number;
}

export interface UpdateBusinessIncomeDto {
  attributionYear?: number;
  attributionMonth?: number;
  name?: string;
  iino?: string;
  isForeign?: boolean;
  industryCode?: string;
  paymentSum?: number;
  taxRate?: number;
}

export interface UpdateAllBusinessIncomeDto {
  paymentYear?: number;
  paymentMonth?: number;
  attributionYear?: number;
  attributionMonth?: number;
  name?: string;
  iino?: string;
  isForeign?: boolean;
  industryCode?: string;
  paymentSum?: number;
  taxRate?: number;
}

export interface DeleteManyResult {
  success: number;
  failed: number;
}

export const EXCEPTION_INDUSTRY_CODES = ['940906', '940907', '940908'] as const;

export function isExceptionIndustry(industryCode: string): boolean {
  return EXCEPTION_INDUSTRY_CODES.includes(
    industryCode as typeof EXCEPTION_INDUSTRY_CODES[number]
  );
}

export function calculateTaxes(params: {
  paymentSum: number;
  isForeign: boolean;
  industryCode: string;
  taxRate?: number;
}): {
  taxRate: number;
  incomeTax: number;
  localIncomeTax: number;
  actualPayment: number;
} {
  const { paymentSum, isForeign, industryCode, taxRate: providedTaxRate } = params;

  let taxRate = 3;

  if (industryCode === '940905') {
    taxRate = 5;
  } else if (isForeign && industryCode === '940904') {
    taxRate = providedTaxRate ?? 3;
  }

  let incomeTax = Math.floor(paymentSum * (taxRate / 100));

  if (incomeTax < 1000) {
    incomeTax = 0;
  }

  const localIncomeTax = incomeTax > 0 ? Math.floor(incomeTax * 0.1) : 0;

  const actualPayment = paymentSum - incomeTax - localIncomeTax;

  return {
    taxRate,
    incomeTax,
    localIncomeTax,
    actualPayment,
  };
}

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

export interface StatementCreationSummary {
  count: number; // 건수(소득자 건수)
  totalPaymentSum: number; // 총 지급액
  totalIncomeTax: number; // 총 소득세
  totalLocalIncomeTax: number; // 총 지방소득세
  totalActualPayment: number; // 총 실지급액
}

export function validateCheckDigit(iino: string): boolean {
  if (iino.length === 13) {
    return validateResidentNumber(iino);
  } else if (iino.length === 10) {
    return validateBusinessNumber(iino);
  }
  return false;
}

function validateResidentNumber(rrn: string): boolean {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(rrn[i]!, 10) * weights[i]!;
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(rrn[12]!, 10);
}

function validateBusinessNumber(bn: string): boolean {
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    sum += parseInt(bn[i]!, 10) * weights[i]!;
  }

  sum += Math.floor((parseInt(bn[8]!, 10) * 5) / 10);

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(bn[9]!, 10);
}
