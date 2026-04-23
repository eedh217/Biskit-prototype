import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { employeeService } from '@/modules/hr/services/employeeService';
import { Employee } from '@/modules/hr/types/employee';
import { payrollLedgerService } from '../services/payrollLedgerService';
import { companyPayrollItemService, getAvailableYears, getTaxItemsByYear } from '../services/companyPayrollItemService';
import { CompanyPayItem, MismatchItem, PayrollLedger, PayrollLedgerRow } from '../types/payroll';
import { MismatchItemsDialog } from './MismatchItemsDialog';

interface CreateLedgerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (ledger: PayrollLedger) => void;
}

const AVAILABLE_YEARS = getAvailableYears();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function isActiveInMonth(emp: Employee, year: number, month: number): boolean {
  const firstDay = `${year}${month.toString().padStart(2, '0')}01`;
  const lastDate = new Date(year, month, 0);
  const lastDay = `${year}${month.toString().padStart(2, '0')}${lastDate.getDate().toString().padStart(2, '0')}`;
  return emp.joinDate <= lastDay && (!emp.leaveDate || emp.leaveDate >= firstDay);
}

function getProRataFactor(emp: Employee, year: number, month: number): number {
  const firstDay = `${year}${month.toString().padStart(2, '0')}01`;
  if (emp.joinDate <= firstDay) return 1;
  const totalDays = new Date(year, month, 0).getDate();
  const joinDay = parseInt(emp.joinDate.substring(6, 8), 10);
  return (totalDays - joinDay + 1) / totalDays;
}

function getDefaultPayDate(
  year: number,
  month: number,
  payDay: number | null,
  payMonthType: 'current' | 'next'
): string {
  if (!payDay) return '';
  const targetDate = new Date(year, payMonthType === 'next' ? month : month - 1, payDay);
  const y = targetDate.getFullYear();
  const m = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const d = targetDate.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CreateLedgerDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateLedgerDialogProps): JSX.Element {
  const now = new Date();
  const [year, setYear] = useState(Math.max(2026, now.getFullYear()));
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [name, setName] = useState(`${Math.max(2026, now.getFullYear())}년 ${now.getMonth() + 1}월 급여대장`);
  const [payDate, setPayDate] = useState('');
  const [useEmployeeData, setUseEmployeeData] = useState(true);
  const [loading, setLoading] = useState(false);

  const [mismatches, setMismatches] = useState<MismatchItem[]>([]);
  const [showMismatch, setShowMismatch] = useState(false);
  const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);
  const [pendingPayItems, setPendingPayItems] = useState<CompanyPayItem[]>([]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }
    const settings = payrollLedgerService.getSettings();
    setPayDate(getDefaultPayDate(year, month, settings.defaultPayDay, settings.payMonthType ?? 'current'));
  }, [open, year, month]);

  const handleYearChange = (val: string): void => {
    setYear(parseInt(val, 10));
  };

  const handleMonthChange = (val: string): void => {
    setMonth(parseInt(val, 10));
  };

  const buildRows = (
    employees: Employee[],
    payItems: CompanyPayItem[],
    ledgerId: string,
    excludeMismatches: boolean,
    mismatchIds: Set<string>
  ): Omit<PayrollLedgerRow, 'id'>[] => {
    return employees.map((emp) => {
      const proRataFactor = getProRataFactor(emp, year, month);
      const payItemMap: Record<string, number> = {};
      for (const tpl of emp.payrollTemplate) {
        const mismatchKey = tpl.itemCode || tpl.itemId;
        if (excludeMismatches && mismatchIds.has(mismatchKey)) continue;
        const yearAdjustedCode = tpl.itemCode
          ? tpl.itemCode.replace(/-(20\d{2})-/, `-${year}-`)
          : null;
        const match =
          payItems.find((pi) => pi.id === tpl.itemId) ??
          payItems.find((pi) => pi.taxItemId === tpl.itemCode) ??
          payItems.find((pi) => pi.taxItemId === tpl.itemId) ??
          (yearAdjustedCode ? payItems.find((pi) => pi.taxItemId === yearAdjustedCode) : undefined);
        if (match) {
          if (match.paymentType === 'irregular') {
            const effectiveMonths =
              (match.paymentMonths?.length ?? 0) > 0
                ? match.paymentMonths!
                : (tpl.paymentMonths ?? []);
            if (effectiveMonths.length === 0 || !effectiveMonths.includes(month)) continue;
          }
          payItemMap[match.id] = Math.round(tpl.amount * proRataFactor);
        }
      }
      return {
        ledgerId,
        employeeId: emp.id,
        employeeNo: emp.employeeNumber,
        employeeName: emp.name,
        payItems: payItemMap,
        deductionItems: {},
      };
    });
  };

  const finishCreate = (
    employees: Employee[],
    payItems: CompanyPayItem[],
    excludeMismatches: boolean,
    mismatchIds: Set<string>
  ): void => {
    let activePayItemIds: string[] | undefined;
    let pendingRows: Omit<PayrollLedgerRow, 'id'>[] = [];

    if (useEmployeeData && employees.length > 0) {
      const tempRows = buildRows(employees, payItems, '__temp__', excludeMismatches, mismatchIds);
      const usedIds = [...new Set(tempRows.flatMap((r) => Object.keys(r.payItems)))];
      activePayItemIds = usedIds.length > 0 ? usedIds : undefined;
      pendingRows = tempRows;
    } else if (!useEmployeeData) {
      const allPayItems = companyPayrollItemService.getPayItems(year);
      activePayItemIds = allPayItems
        .filter((pi) => pi.paymentType === 'monthly' && !pi.isDeprecated && pi.taxItemCategory === 'taxable')
        .map((pi) => pi.id);
    }

    const ledger = payrollLedgerService.createLedger({ name, year, month, payDate, activePayItemIds });

    if (pendingRows.length > 0) {
      payrollLedgerService.addRows(pendingRows.map((r) => ({ ...r, ledgerId: ledger.id })));
    }

    onCreated(ledger);
    onOpenChange(false);
    resetForm();
  };

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (!useEmployeeData) {
        finishCreate([], [], false, new Set());
        return;
      }

      const result = await employeeService.getAll({ limit: 99999 });
      const activeEmps = result.data.filter((e) => isActiveInMonth(e, year, month));
      const allPayItems = companyPayrollItemService.getPayItems(year);

      // 사용중단 항목을 실제로 사용 중인 직원이 있으면 생성 차단
      const deprecatedItems = allPayItems.filter((pi) => pi.isDeprecated);
      if (deprecatedItems.length > 0) {
        const deprecatedIds = new Set(deprecatedItems.map((di) => di.id));
        const deprecatedTaxIds = new Set(deprecatedItems.map((di) => di.taxItemId));
        const hasDeprecatedUsage = activeEmps.some((emp) =>
          emp.payrollTemplate.some(
            (tpl) => deprecatedIds.has(tpl.itemId) || deprecatedTaxIds.has(tpl.itemCode ?? '')
          )
        );
        if (hasDeprecatedUsage) {
          alert(
            '사용중단된 급여항목이 있습니다.\n급여항목 관리에서 해당 항목을 처리한 후 급여대장을 생성해주세요.'
          );
          return;
        }
      }

      const activePayItems = allPayItems.filter((pi) => !pi.isDeprecated);

      const taxItems = getTaxItemsByYear(year);
      const taxItemIds = new Set([
        ...taxItems.taxableItems.map((t) => t.id),
        ...taxItems.nonTaxableItems.map((t) => t.id),
      ]);

      const mismatchMap = new Map<string, MismatchItem>();
      for (const emp of activeEmps) {
        for (const tpl of emp.payrollTemplate) {
          const isDeprecated = allPayItems.some(
            (pi) => (pi.id === tpl.itemId || pi.taxItemId === tpl.itemCode) && pi.isDeprecated
          );
          if (isDeprecated) continue;

          const yearAdjustedCode = tpl.itemCode
            ? tpl.itemCode.replace(/-(20\d{2})-/, `-${year}-`)
            : null;
          const match =
            activePayItems.find((pi) => pi.id === tpl.itemId) ??
            activePayItems.find((pi) => pi.taxItemId === tpl.itemCode) ??
            activePayItems.find((pi) => pi.taxItemId === tpl.itemId) ??
            (yearAdjustedCode ? activePayItems.find((pi) => pi.taxItemId === yearAdjustedCode) : undefined);
          if (!match) {
            const mismatchKey = tpl.itemCode || tpl.itemId;
            if (!mismatchMap.has(mismatchKey)) {
              const adjustedCode = yearAdjustedCode ?? mismatchKey;
              const cannotAdd = !taxItemIds.has(mismatchKey) && !taxItemIds.has(adjustedCode);
              mismatchMap.set(mismatchKey, {
                itemId: mismatchKey,
                itemName: tpl.itemName,
                category: tpl.category,
                cannotAdd,
              });
            }
          }
        }
      }

      if (mismatchMap.size > 0) {
        setMismatches(Array.from(mismatchMap.values()));
        setPendingEmployees(activeEmps);
        setPendingPayItems(activePayItems);
        setShowMismatch(true);
      } else {
        finishCreate(activeEmps, activePayItems, false, new Set());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMismatchExclude = (): void => {
    const mismatchIds = new Set(mismatches.map((m) => m.itemId));
    finishCreate(pendingEmployees, pendingPayItems, true, mismatchIds);
    setShowMismatch(false);
  };

  const handleMismatchAddItems = (): void => {
    const existingPayItems = companyPayrollItemService.getPayItems(year);
    for (const m of mismatches) {
      const alreadyExists = existingPayItems.some(
        (pi) => pi.taxItemId === m.itemId || pi.id === m.itemId
      );
      if (!alreadyExists) {
        companyPayrollItemService.addPayItem(year, m.itemName, m.itemId, m.itemName, m.category);
      }
    }
    const updatedPayItems = companyPayrollItemService.getPayItems(year);
    finishCreate(pendingEmployees, updatedPayItems, false, new Set());
    setShowMismatch(false);
  };

  const resetForm = (): void => {
    const n = new Date();
    const y = Math.max(2026, n.getFullYear());
    const mo = n.getMonth() + 1;
    setYear(y);
    setMonth(mo);
    setName(`${y}년 ${mo}월 급여대장`);
    setPayDate('');
    setUseEmployeeData(true);
    setMismatches([]);
    setPendingEmployees([]);
    setPendingPayItems([]);
  };

  return (
    <>
      <Dialog open={open && !showMismatch} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>급여대장 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>급여대장명</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="급여대장명 입력"
              />
            </div>

            <div className="space-y-2">
              <Label>귀속연월</Label>
              <div className="flex items-center gap-2">
                <Select value={year.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month.toString()} onValueChange={handleMonthChange}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>지급일</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
              {payDate && payDate < `${year}-${month.toString().padStart(2, '0')}-01` && (
                <p className="text-xs text-red-500">지급일자는 귀속연월보다 이후 날짜여야합니다.</p>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3 bg-gray-50">
              <Checkbox
                id="useEmployeeData"
                checked={useEmployeeData}
                onChange={(e) => setUseEmployeeData(e.target.checked)}
                className="mt-0.5"
              />
              <label htmlFor="useEmployeeData" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                직원 정보에 저장된 급여를 기준으로 재직중인 직원 급여대장을 만들어주세요.
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              variant="default"
              onClick={handleCreate}
              disabled={loading || !name.trim() || (!!payDate && payDate < `${year}-${month.toString().padStart(2, '0')}-01`)}
            >
              {loading ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MismatchItemsDialog
        open={showMismatch}
        mismatches={mismatches}
        year={year}
        onClose={() => { setShowMismatch(false); onOpenChange(false); }}
        onExclude={handleMismatchExclude}
        onAddItems={handleMismatchAddItems}
      />
    </>
  );
}
