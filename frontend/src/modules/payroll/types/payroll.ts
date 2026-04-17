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
