import { v4 as uuidv4 } from 'uuid';
import { PayrollLedger, PayrollLedgerRow, PaySettings } from '../types/payroll';

const LEDGERS_KEY = 'biskit_payroll_ledgers';
const ROWS_KEY = 'biskit_payroll_ledger_rows';
const SETTINGS_KEY = 'biskit_pay_settings';

function getLedgers(): PayrollLedger[] {
  const data = localStorage.getItem(LEDGERS_KEY);
  return data ? (JSON.parse(data) as PayrollLedger[]) : [];
}

function saveLedgers(ledgers: PayrollLedger[]): void {
  localStorage.setItem(LEDGERS_KEY, JSON.stringify(ledgers));
}

function getAllRows(): PayrollLedgerRow[] {
  const data = localStorage.getItem(ROWS_KEY);
  return data ? (JSON.parse(data) as PayrollLedgerRow[]) : [];
}

function saveAllRows(rows: PayrollLedgerRow[]): void {
  localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
}

export const payrollLedgerService = {
  getLedgersByYear(year: number): PayrollLedger[] {
    return getLedgers().filter((l) => l.year === year);
  },

  getLedgerById(id: string): PayrollLedger | undefined {
    return getLedgers().find((l) => l.id === id);
  },

  createLedger(dto: Omit<PayrollLedger, 'id' | 'createdAt'>): PayrollLedger {
    const ledgers = getLedgers();
    const newLedger: PayrollLedger = {
      id: uuidv4(),
      ...dto,
      createdAt: new Date().toISOString(),
    };
    ledgers.push(newLedger);
    saveLedgers(ledgers);
    return newLedger;
  },

  updateLedger(id: string, updates: Partial<Omit<PayrollLedger, 'id' | 'createdAt'>>): void {
    const ledgers = getLedgers();
    const idx = ledgers.findIndex((l) => l.id === id);
    if (idx !== -1) {
      ledgers[idx] = { ...ledgers[idx]!, ...updates };
      saveLedgers(ledgers);
    }
  },

  copyLedger(
    id: string,
    overrides?: { name?: string; year?: number; month?: number; payDate?: string },
    excludeEmployeeIds?: string[]
  ): PayrollLedger | null {
    const ledgers = getLedgers();
    const src = ledgers.find((l) => l.id === id);
    if (!src) return null;
    const newLedger: PayrollLedger = {
      ...src,
      id: uuidv4(),
      name: overrides?.name ?? src.name,
      year: overrides?.year ?? src.year,
      month: overrides?.month ?? src.month,
      payDate: overrides?.payDate ?? src.payDate,
      isConfirmed: false,
      createdAt: new Date().toISOString(),
    };
    ledgers.push(newLedger);
    saveLedgers(ledgers);
    const excludeSet = new Set(excludeEmployeeIds ?? []);
    const srcRows = getAllRows().filter((r) => r.ledgerId === id && !excludeSet.has(r.employeeId));
    const newRows: PayrollLedgerRow[] = srcRows.map((r) => ({ ...r, id: uuidv4(), ledgerId: newLedger.id }));
    saveAllRows([...getAllRows(), ...newRows]);
    return newLedger;
  },

  deleteLedger(id: string): void {
    saveLedgers(getLedgers().filter((l) => l.id !== id));
    saveAllRows(getAllRows().filter((r) => r.ledgerId !== id));
  },

  getRowsByLedgerId(ledgerId: string): PayrollLedgerRow[] {
    return getAllRows().filter((r) => r.ledgerId === ledgerId);
  },

  addRow(row: Omit<PayrollLedgerRow, 'id'>): PayrollLedgerRow {
    const rows = getAllRows();
    const newRow: PayrollLedgerRow = { id: uuidv4(), ...row };
    rows.push(newRow);
    saveAllRows(rows);
    return newRow;
  },

  addRows(rows: Omit<PayrollLedgerRow, 'id'>[]): PayrollLedgerRow[] {
    const allRows = getAllRows();
    const newRows: PayrollLedgerRow[] = rows.map((r) => ({ id: uuidv4(), ...r }));
    saveAllRows([...allRows, ...newRows]);
    return newRows;
  },

  updateRow(updatedRow: PayrollLedgerRow): void {
    const rows = getAllRows();
    const idx = rows.findIndex((r) => r.id === updatedRow.id);
    if (idx !== -1) {
      rows[idx] = updatedRow;
      saveAllRows(rows);
    }
  },

  deleteRow(id: string): void {
    saveAllRows(getAllRows().filter((r) => r.id !== id));
  },

  deleteRowsByEmployeeIds(ledgerId: string, employeeIds: string[]): void {
    const idSet = new Set(employeeIds);
    saveAllRows(getAllRows().filter((r) => !(r.ledgerId === ledgerId && idSet.has(r.employeeId))));
  },

  getLedgerSummary(ledgerId: string): {
    count: number;
    totalPay: number;
    totalDeduction: number;
  } {
    const rows = getAllRows().filter((r) => r.ledgerId === ledgerId);
    const totalPay = rows.reduce(
      (sum, row) => sum + Object.values(row.payItems).reduce((s, v) => s + v, 0),
      0
    );
    const totalDeduction = rows.reduce(
      (sum, row) => sum + Object.values(row.deductionItems).reduce((s, v) => s + v, 0),
      0
    );
    return { count: rows.length, totalPay, totalDeduction };
  },

  getSettings(): PaySettings {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? (JSON.parse(data) as PaySettings) : { defaultPayDay: null, payMonthType: 'current' };
  },

  saveSettings(settings: PaySettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};
