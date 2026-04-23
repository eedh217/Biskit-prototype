// 급여항목 타입

// 과세 항목
export interface TaxableItem {
  id: string;
  name: string;
  year: number;
  category: 'taxable';
}

// 비과세 항목
export interface NonTaxableItem {
  id: string;
  code: string; // A01, B01, ...
  name: string;
  monthlyLimit: string | null; // "월 200,000원"
  yearlyLimit: string | null; // "연 2,400,000원"
  includeInStatement: boolean; // 지급명세서 작성여부 (O: true, X: false)
  year: number;
  category: 'non-taxable';
}

// 급여항목 통합 타입
export type PayrollItem = TaxableItem | NonTaxableItem;

// 연도별 급여항목
export interface PayrollItemsByYear {
  year: number;
  taxableItems: TaxableItem[];
  nonTaxableItems: NonTaxableItem[];
}

// 회사 지급항목 (2계층 - 실제 급여대장에서 사용하는 항목)
export interface CompanyPayItem {
  id: string;
  name: string; // 항목명 (예: 점심식대)
  taxItemId: string; // 세법 급여항목 ID
  taxItemName: string; // 세법 급여항목명 (예: 식대)
  taxItemCategory: 'taxable' | 'non-taxable';
  paymentType: 'monthly' | 'irregular'; // 매월지급 / 비정기지급
  paymentMonths?: number[]; // 비정기지급 시 지급월 (1-12), 미설정 시 직원별 설정
  createdAt: string;
  isDeprecated?: boolean; // 사용 중단 여부
  replacedByItemId?: string; // 교체할 새 급여항목 ID (마이그레이션 완료 전까지 비어있음)
}

// 회사 공제항목
export interface CompanyDeductionItem {
  id: string;
  name: string; // 항목명 (예: 국민연금)
  createdAt: string;
}

// 급여대장
export interface PayrollLedger {
  id: string;
  name: string; // 급여대장명
  year: number;
  month: number; // 귀속 월 (1-12)
  payDate: string; // 지급일 YYYY-MM-DD
  createdAt: string;
  activePayItemIds?: string[];       // undefined = 전체 활성
  activeDeductionItemIds?: string[]; // undefined = 전체 활성
  isConfirmed?: boolean;             // 급여확정 여부
}

// 급여대장 직원별 행
export interface PayrollLedgerRow {
  id: string;
  ledgerId: string;
  employeeId: string;
  employeeNo: string; // 사번
  employeeName: string; // 성명
  payItems: Record<string, number>; // companyPayItemId -> 금액
  deductionItems: Record<string, number>; // companyDeductionItemId -> 금액
}

// 지급일 설정
export interface PaySettings {
  defaultPayDay: number | null; // 기본 지급일 (1-31)
  payMonthType: 'current' | 'next'; // 당월 / 익월
}

// 불일치 항목
export interface MismatchItem {
  itemId: string;
  itemName: string;
  category: 'taxable' | 'non-taxable';
  cannotAdd?: boolean; // 해당 연도 세법에 없는 항목 — 추가 불가
}

// 급여계약 이력
export interface SalaryContractHistoryRecord {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  changedAt: string;
  changedBy: string;
  changes: {
    itemId: string;
    itemName: string;
    oldAmount: number | null;
    newAmount: number | null;
  }[];
  oldAnnualSalary: number | null;
  newAnnualSalary: number | null;
}
