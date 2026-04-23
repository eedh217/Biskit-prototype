import { v4 as uuidv4 } from 'uuid';
import { SalaryContractHistoryRecord } from '../types/payroll';

const STORAGE_KEY = 'biskit_salary_contract_history';
const CHANGED_BY = '홍길동';

function getStoredData(): SalaryContractHistoryRecord[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? (JSON.parse(data) as SalaryContractHistoryRecord[]) : [];
}

function saveData(data: SalaryContractHistoryRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const salaryContractHistoryService = {
  create(
    record: Omit<SalaryContractHistoryRecord, 'id' | 'changedAt' | 'changedBy'>
  ): SalaryContractHistoryRecord {
    const data = getStoredData();
    const newRecord: SalaryContractHistoryRecord = {
      id: uuidv4(),
      changedAt: new Date().toISOString(),
      changedBy: CHANGED_BY,
      ...record,
    };
    data.push(newRecord);
    saveData(data);
    return newRecord;
  },

  getByEmployeeId(employeeId: string): SalaryContractHistoryRecord[] {
    return getStoredData()
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  },
};
