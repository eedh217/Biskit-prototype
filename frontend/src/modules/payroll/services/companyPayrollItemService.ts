import { v4 as uuidv4 } from 'uuid';
import { CompanyPayItem, CompanyDeductionItem } from '../types/payroll';
import { PAYROLL_ITEMS_2026 } from '../constants/payrollItems2026';
import { PAYROLL_ITEMS_2025 } from '../constants/payrollItems2025';
import { PayrollItemsByYear } from '../types/payroll';

export const FIXED_DEDUCTION_ITEMS = [
  '국민연금',
  '건강보험',
  '고용보험',
  '소득세',
  '지방소득세',
  '농어촌특별세',
  '외국납부세액',
  '사내기부금',
  '공무원연금',
  '군인연금',
  '사립학교교직원연금',
  '별정우체국연금',
  '연말정산 소득세',
  '연말정산 지방소득세',
  '연말정산 농어촌특별세',
] as const;

const DEFAULT_DEDUCTION_NAMES = ['국민연금', '건강보험', '고용보험', '소득세', '지방소득세'];

function payItemsKey(year: number): string {
  return `biskit_company_pay_items_${year}`;
}

function deductionItemsKey(year: number): string {
  return `biskit_company_deduction_items_${year}`;
}

function makeDefaultPayItems(year: number): CompanyPayItem[] {
  const items: CompanyPayItem[] = [
    {
      id: uuidv4(),
      name: '급여',
      taxItemId: `taxable-${year}-1`,
      taxItemName: '급여',
      taxItemCategory: 'taxable',
      paymentType: 'monthly',
      createdAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: '식대',
      taxItemId: `non-taxable-${year}-P01`,
      taxItemName: '식대',
      taxItemCategory: 'non-taxable',
      paymentType: 'monthly',
      createdAt: new Date().toISOString(),
    },
    ...(year <= 2025 ? [{
      id: uuidv4(),
      name: '출산보육수당',
      taxItemId: 'non-taxable-2025-Q01',
      taxItemName: '출산보육수당',
      taxItemCategory: 'non-taxable' as const,
      paymentType: 'monthly' as const,
      createdAt: new Date().toISOString(),
    }] : []),
  ];
  return items;
}

function makeDefaultDeductionItems(): CompanyDeductionItem[] {
  return DEFAULT_DEDUCTION_NAMES.map((name) => ({
    id: uuidv4(),
    name,
    createdAt: new Date().toISOString(),
  }));
}

function getPayItems(year: number): CompanyPayItem[] {
  const data = localStorage.getItem(payItemsKey(year));
  if (data === null) {
    const defaults = makeDefaultPayItems(year);
    localStorage.setItem(payItemsKey(year), JSON.stringify(defaults));
    return defaults;
  }
  let items = JSON.parse(data) as CompanyPayItem[];
  items = items.map((item) => ({ ...item, paymentType: item.paymentType ?? 'monthly' }));

  // Q01 마이그레이션: 연도별 1회 실행, Q01이 없으면 추가
  const migrationKey = `biskit_q01_migration_${year}`;
  if (!localStorage.getItem(migrationKey)) {
    const hasQ01 = items.some((item) => item.taxItemId === 'non-taxable-2025-Q01');
    if (!hasQ01) {
      items.push({
        id: uuidv4(),
        name: '출산보육수당',
        taxItemId: 'non-taxable-2025-Q01',
        taxItemName: '출산보육수당',
        taxItemCategory: 'non-taxable',
        paymentType: 'monthly',
        createdAt: new Date().toISOString(),
        isDeprecated: year >= 2026,
      });
      savePayItems(year, items);
    }
    localStorage.setItem(migrationKey, '1');
  }

  return items;
}

function savePayItems(year: number, items: CompanyPayItem[]): void {
  localStorage.setItem(payItemsKey(year), JSON.stringify(items));
}

function getDeductionItems(year: number): CompanyDeductionItem[] {
  const data = localStorage.getItem(deductionItemsKey(year));
  if (data === null) {
    const defaults = makeDefaultDeductionItems();
    localStorage.setItem(deductionItemsKey(year), JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(data) as CompanyDeductionItem[];
}

function saveDeductionItems(year: number, items: CompanyDeductionItem[]): void {
  localStorage.setItem(deductionItemsKey(year), JSON.stringify(items));
}

export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2025; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years;
}

// 연도에 해당하는 세법 급여항목 반환
export function getTaxItemsByYear(year: number): PayrollItemsByYear {
  if (year <= 2025) return PAYROLL_ITEMS_2025;
  return PAYROLL_ITEMS_2026;
}

export const companyPayrollItemService = {
  getPayItems(year: number): CompanyPayItem[] {
    return getPayItems(year);
  },

  addPayItem(
    year: number,
    name: string,
    taxItemId: string,
    taxItemName: string,
    taxItemCategory: 'taxable' | 'non-taxable',
    paymentType: 'monthly' | 'irregular' = 'monthly',
    paymentMonths?: number[]
  ): CompanyPayItem {
    const items = getPayItems(year);
    const newItem: CompanyPayItem = {
      id: uuidv4(),
      name,
      taxItemId,
      taxItemName,
      taxItemCategory,
      paymentType,
      paymentMonths: paymentType === 'irregular' ? (paymentMonths ?? []) : undefined,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    savePayItems(year, items);
    return newItem;
  },

  deletePayItem(year: number, id: string): void {
    savePayItems(year, getPayItems(year).filter((item) => item.id !== id));
  },

  updatePayItem(
    year: number,
    id: string,
    updates: Partial<Omit<CompanyPayItem, 'id' | 'createdAt'>>
  ): CompanyPayItem {
    const items = getPayItems(year);
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Item not found');
    const updated = { ...items[index]!, ...updates };
    items[index] = updated;
    savePayItems(year, items);
    return updated;
  },

  getDeductionItems(year: number): CompanyDeductionItem[] {
    return getDeductionItems(year);
  },

  addDeductionItem(year: number, name: string): CompanyDeductionItem {
    const items = getDeductionItems(year);
    const newItem: CompanyDeductionItem = {
      id: uuidv4(),
      name,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    saveDeductionItems(year, items);
    return newItem;
  },

  deleteDeductionItem(year: number, id: string): void {
    saveDeductionItems(year, getDeductionItems(year).filter((item) => item.id !== id));
  },

  copyFromLastYear(year: number): void {
    const lastYear = year - 1;
    const newYearTaxItems = getTaxItemsByYear(year);
    const allNewTaxItems = [
      ...newYearTaxItems.taxableItems,
      ...newYearTaxItems.nonTaxableItems,
    ];
    const newTaxItemMap = new Map(allNewTaxItems.map((t) => [t.id, t]));

    const lastPayItems = getPayItems(lastYear).map((item) => {
      const candidateId = item.taxItemId.replace(`-${lastYear}-`, `-${year}-`);
      const newTaxItem = newTaxItemMap.get(candidateId);
      if (newTaxItem) {
        return {
          ...item,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          taxItemId: newTaxItem.id,
          taxItemName: newTaxItem.name,
          isDeprecated: false,
          replacedByItemId: undefined,
        };
      }
      return {
        ...item,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        isDeprecated: true,
      };
    });

    const lastDeductionItems = getDeductionItems(lastYear).map((item) => ({
      ...item,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    }));
    savePayItems(year, lastPayItems);
    saveDeductionItems(year, lastDeductionItems);
  },
};
