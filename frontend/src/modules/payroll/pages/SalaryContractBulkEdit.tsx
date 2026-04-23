import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { employeeService } from '@/modules/hr/services/employeeService';
import { companyPayrollItemService } from '../services/companyPayrollItemService';
import { salaryContractHistoryService } from '../services/salaryContractHistoryService';
import { SalaryContractEditDialog } from '../components/SalaryContractEditDialog';
import { employeeHistoryService } from '@/modules/hr/services/employeeHistoryService';
import type { EmployeeHistoryChange } from '@/modules/hr/types/employeeHistory';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { Employee, PayrollTemplateItem } from '@/modules/hr/types/employee';
import type { CompanyPayItem } from '../types/payroll';
import { formatNumberInput, parseFormattedNumber, formatNumber } from '@/shared/lib/utils';
import { toast } from '@/shared/hooks/use-toast';
import { setNavigationGuard } from '@/shared/utils/navigationGuard';

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function sortItemIds(ids: string[], companyItems: CompanyPayItem[]): string[] {
  return [...ids].sort((a, b) => {
    const ciA = companyItems.find((c) => c.id === a);
    const ciB = companyItems.find((c) => c.id === b);
    const catA = ciA?.taxItemCategory === 'taxable' ? 0 : 1;
    const catB = ciB?.taxItemCategory === 'taxable' ? 0 : 1;
    if (catA !== catB) return catA - catB;
    return companyItems.findIndex((c) => c.id === a) - companyItems.findIndex((c) => c.id === b);
  });
}

function calcAnnualSalary(template: PayrollTemplateItem[], companyItems: CompanyPayItem[]): number {
  return template
    .filter((t) => t.includeInAnnual)
    .reduce((sum, t) => {
      const ci = companyItems.find((c) => c.id === t.itemId);
      const isIrregular = ci?.paymentType === 'irregular';
      const months = isIrregular
        ? ((ci?.paymentMonths?.length ?? 0) > 0 ? ci!.paymentMonths! : (t.paymentMonths ?? [])).length
        : 12;
      return sum + t.amount * months;
    }, 0);
}

export function SalaryContractBulkEdit(): JSX.Element {
  const currentYear = Math.max(2026, new Date().getFullYear());
  const searchParams = new URLSearchParams(window.location.search);
  const ids = (searchParams.get('ids') ?? '').split(',').filter(Boolean);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companyItems, setCompanyItems] = useState<CompanyPayItem[]>([]);
  // activeItemIds: 스프레드시트에 표시할 컬럼 itemId 목록
  const [activeItemIds, setActiveItemIds] = useState<string[]>([]);
  // data: employeeId -> itemId -> amount
  const [data, setData] = useState<Record<string, Record<string, number>>>({});
  // includeInAnnual: employeeId -> itemId -> boolean (per-item per-employee)
  const [includeInAnnual, setIncludeInAnnual] = useState<Record<string, Record<string, boolean>>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showItemManager, setShowItemManager] = useState(false);
  const [pendingActiveIds, setPendingActiveIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const originalTemplatesRef = useRef<Record<string, PayrollTemplateItem[]>>({});
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const items = companyPayrollItemService.getPayItems(currentYear);
        setCompanyItems(items);

        const emps = await Promise.all(ids.map((id) => employeeService.getById(id)));
        setEmployees(emps);

        // 전체 직원이 가진 급여항목 union
        const allItemIds = new Set<string>();
        emps.forEach((emp) => emp.payrollTemplate.forEach((t) => { if (t.itemId) allItemIds.add(t.itemId); }));
        // 회사 등록 항목 기준으로 필터
        const validIds = [...allItemIds].filter((id) => items.some((ci) => ci.id === id));
        setActiveItemIds(sortItemIds(validIds, items));

        const initData: Record<string, Record<string, number>> = {};
        const initInclude: Record<string, Record<string, boolean>> = {};
        emps.forEach((emp) => {
          initData[emp.id] = {};
          initInclude[emp.id] = {};
          emp.payrollTemplate.forEach((t) => {
            if (t.itemId) {
              initData[emp.id]![t.itemId] = t.amount;
              initInclude[emp.id]![t.itemId] = t.includeInAnnual ?? true;
            }
          });
        });
        setData(initData);
        setIncludeInAnnual(initInclude);
        originalTemplatesRef.current = Object.fromEntries(emps.map((emp) => [emp.id, [...emp.payrollTemplate]]));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAmountChange = (empId: string, itemId: string, value: string): void => {
    const formatted = formatNumberInput(value);
    const amount = parseFormattedNumber(formatted);

    setIsDirty(true);
    isDirtyRef.current = true;

    setData((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [itemId]: amount },
    }));

    setEmployees((prev) => prev.map((emp) => {
      if (emp.id !== empId) return emp;
      const ci = companyItems.find((c) => c.id === itemId);
      if (!ci) return emp;
      const exists = emp.payrollTemplate.some((t) => t.itemId === itemId);
      if (exists) {
        return { ...emp, payrollTemplate: emp.payrollTemplate.map((t) => t.itemId === itemId ? { ...t, amount } : t) };
      } else {
        const newItem: PayrollTemplateItem = { itemId: ci.id, itemCode: ci.taxItemId, itemName: ci.name, amount, category: ci.taxItemCategory, includeInAnnual: true };
        setIncludeInAnnual((ia) => ({ ...ia, [empId]: { ...ia[empId], [itemId]: true } }));
        return { ...emp, payrollTemplate: [...emp.payrollTemplate, newItem] };
      }
    }));
  };

  // 새로고침 / 탭 닫기 이탈 방지
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // 메뉴/사이드바 클릭 이탈 방지
  useEffect(() => {
    if (isDirty) {
      setNavigationGuard(() => window.confirm('급여계약 일괄수정을 취소하시겠습니까?'));
    } else {
      setNavigationGuard(null);
    }
    return () => setNavigationGuard(null);
  }, [isDirty]);

  const handleEditSuccess = async (): Promise<void> => {
    if (!editingEmployee) return;
    const updated = await employeeService.getById(editingEmployee.id);
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setData((prev) => {
      const next = { ...prev };
      next[updated.id] = {};
      updated.payrollTemplate.forEach((t) => { if (t.itemId) next[updated.id]![t.itemId] = t.amount; });
      return next;
    });
    setIncludeInAnnual((prev) => {
      const next = { ...prev };
      next[updated.id] = {};
      updated.payrollTemplate.forEach((t) => { if (t.itemId) next[updated.id]![t.itemId] = t.includeInAnnual ?? true; });
      return next;
    });
  };

  const handleOpenItemManager = (): void => {
    setPendingActiveIds(new Set(activeItemIds));
    setShowItemManager(true);
  };

  const handleSaveItemManager = (): void => {
    const newIds = companyItems.map((ci) => ci.id).filter((id) => pendingActiveIds.has(id));
    setActiveItemIds(sortItemIds(newIds, companyItems));
    setData((prev) => {
      const next = { ...prev };
      employees.forEach((emp) => {
        next[emp.id] = { ...next[emp.id] };
        newIds.forEach((itemId) => {
          if (next[emp.id]![itemId] === undefined) next[emp.id]![itemId] = 0;
        });
      });
      return next;
    });
    setIncludeInAnnual((prev) => {
      const next = { ...prev };
      employees.forEach((emp) => {
        next[emp.id] = { ...next[emp.id] };
        newIds.forEach((itemId) => {
          if (next[emp.id]![itemId] === undefined) next[emp.id]![itemId] = true;
        });
      });
      return next;
    });
    setShowItemManager(false);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setShowSaveConfirm(false);
    try {
      for (const emp of employees) {
        const oldTemplate = originalTemplatesRef.current[emp.id] ?? emp.payrollTemplate;
        const newTemplate: PayrollTemplateItem[] = activeItemIds
          .map((itemId) => {
            const ci = companyItems.find((c) => c.id === itemId);
            if (!ci) return null;
            const amount = data[emp.id]?.[itemId] ?? 0;
            if (amount === 0) return null;
            return {
              itemId: ci.id,
              itemCode: ci.taxItemId,
              itemName: ci.name,
              amount,
              category: ci.taxItemCategory,
              includeInAnnual: includeInAnnual[emp.id]?.[itemId] ?? true,
              paymentMonths: emp.payrollTemplate.find((t) => t.itemId === itemId)?.paymentMonths ?? [],
            } as PayrollTemplateItem;
          })
          .filter((t): t is PayrollTemplateItem => t !== null);

        const newAnnual = calcAnnualSalary(newTemplate, companyItems) || null;

        await employeeService.update(emp.id, {
          payrollTemplate: newTemplate,
          annualSalary: newAnnual,
        });

        // 이력 저장
        const oldMap = new Map(oldTemplate.map((t) => [t.itemId, t.amount]));
        const newMap = new Map(newTemplate.map((t) => [t.itemId, t.amount]));
        const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);
        const changes: { itemId: string; itemName: string; oldAmount: number | null; newAmount: number | null }[] = [];
        for (const id of allIds) {
          const oldAmt = oldMap.get(id) ?? null;
          const newAmt = newMap.get(id) ?? null;
          if (oldAmt !== newAmt) {
            const ci = companyItems.find((c) => c.id === id);
            changes.push({ itemId: id, itemName: ci?.name ?? id, oldAmount: oldAmt, newAmount: newAmt });
          }
        }
        if (changes.length > 0 || newAnnual !== (emp.annualSalary ?? null)) {
          salaryContractHistoryService.create({
            employeeId: emp.id,
            employeeNo: emp.employeeNumber,
            employeeName: emp.name,
            changes,
            oldAnnualSalary: emp.annualSalary ?? null,
            newAnnualSalary: newAnnual,
          });

          const historyChanges: EmployeeHistoryChange[] = [];
          const oldTemplateStr = JSON.stringify(oldTemplate);
          const newTemplateStr = JSON.stringify(newTemplate);
          if (oldTemplateStr !== newTemplateStr) {
            const fmt = (t: PayrollTemplateItem[]): string =>
              t.filter((i) => i.itemId).map((i) => `${i.itemName} (${formatNumber(i.amount)}원)`).join(', ') || '-';
            historyChanges.push({ fieldName: '급여항목', fieldKey: 'payrollTemplate', oldValue: oldTemplate, newValue: newTemplate, displayOldValue: fmt(oldTemplate), displayNewValue: fmt(newTemplate) });
          }
          if (newAnnual !== (emp.annualSalary ?? null)) {
            historyChanges.push({ fieldName: '연봉', fieldKey: 'annualSalary', oldValue: emp.annualSalary, newValue: newAnnual, displayOldValue: emp.annualSalary ? `${formatNumber(emp.annualSalary)}원` : '-', displayNewValue: newAnnual ? `${formatNumber(newAnnual)}원` : '-' });
          }
          if (historyChanges.length > 0) {
            await employeeHistoryService.create({ employeeId: emp.id, category: 'salary', categoryName: '급여정보', changes: historyChanges, modifiedBy: '관리자' });
          }
        }
      }
      toast({ description: '급여계약 정보를 저장했습니다.' });
      setNavigationGuard(null);
      isDirtyRef.current = false;
      navigate('/payroll/salary-contract');
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const editableItemIds = activeItemIds.filter((id) => !companyItems.find((c) => c.id === id)?.isDeprecated);

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ): void => {
    const isNav =
      e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'Tab' || e.key === 'Enter';
    if (!isNav) return;

    const totalCols = editableItemIds.length;
    const totalRows = pagedEmployees.length;
    let r = rowIdx;
    let c = colIdx;

    if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      r = Math.max(0, r - 1);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      r = Math.min(totalRows - 1, r + 1);
    } else if (e.key === 'ArrowLeft') {
      if (c > 0) c -= 1;
      else { r = Math.max(0, r - 1); c = totalCols - 1; }
    } else if (e.key === 'ArrowRight') {
      if (c < totalCols - 1) c += 1;
      else { r = Math.min(totalRows - 1, r + 1); c = 0; }
    } else if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (c > 0) c -= 1;
        else { r = Math.max(0, r - 1); c = totalCols - 1; }
      } else {
        if (c < totalCols - 1) c += 1;
        else { r = Math.min(totalRows - 1, r + 1); c = 0; }
      }
    }

    const target = inputRefs.current.get(`${r}-${c}`);
    if (target) {
      e.preventDefault();
      target.focus();
      target.select();
    }
  };

  const totalPages = Math.max(1, Math.ceil(employees.length / pageSize));
  const pagedEmployees = employees.slice((page - 1) * pageSize, page * pageSize);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="space-y-2 px-6">
        <PageHeader
          title="급여계약 일괄수정"
          showBackButton={true}
          onBack={() => {
            if (isDirtyRef.current && !window.confirm('급여계약 일괄수정을 취소하시겠습니까?')) return;
            setNavigationGuard(null);
            isDirtyRef.current = false;
            navigate('/payroll/salary-contract');
          }}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleOpenItemManager}>
                급여항목 관리
              </Button>
              <Button variant="default" onClick={() => setShowSaveConfirm(true)} disabled={saving}>
                저장
              </Button>
            </div>
          }
        />
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="sticky top-0 z-30">
            <tr className="bg-gray-50 border-b">
              <th
                rowSpan={2}
                className="sticky left-0 z-40 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 w-[100px] min-w-[100px]"
              >
                사번
              </th>
              <th
                rowSpan={2}
                className="sticky left-[100px] z-40 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 w-[100px] min-w-[100px]"
              >
                성명
              </th>
              <th
                rowSpan={2}
                className="sticky left-[200px] z-40 bg-gray-50 px-3 py-2 w-[50px] min-w-[50px]"
              />
              <th
                rowSpan={2}
                className="sticky left-[250px] z-40 bg-gray-50 border-r px-3 py-2 text-right font-medium text-gray-600 w-[180px] min-w-[180px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]"
              >
                연봉
              </th>
              {activeItemIds.length > 0 && (
                <th
                  colSpan={activeItemIds.length}
                  className="border-r px-3 py-2 text-center font-medium text-blue-600 bg-blue-50"
                >
                  급여항목
                </th>
              )}
            </tr>
            <tr className="bg-white border-b">
              {activeItemIds.map((itemId) => {
                const ci = companyItems.find((c) => c.id === itemId);
                return (
                  <th key={itemId} className={`px-3 py-2 text-right font-medium truncate ${ci?.isDeprecated ? 'text-gray-400 bg-gray-50' : 'text-gray-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {ci?.isDeprecated && (
                        <span className="text-xs font-normal text-gray-400">사용중단</span>
                      )}
                      {ci?.name ?? itemId}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pagedEmployees.map((emp, rowIdx) => {
              const template: PayrollTemplateItem[] = activeItemIds
                .map((itemId) => {
                  const ci = companyItems.find((c) => c.id === itemId);
                  if (!ci) return null;
                  return {
                    itemId: ci.id,
                    itemCode: ci.taxItemId,
                    itemName: ci.name,
                    amount: data[emp.id]?.[itemId] ?? 0,
                    category: ci.taxItemCategory,
                    includeInAnnual: includeInAnnual[emp.id]?.[itemId] ?? true,
                  } as PayrollTemplateItem;
                })
                .filter((t): t is PayrollTemplateItem => t !== null);
              const annual = calcAnnualSalary(template, companyItems);

              return (
                <tr key={emp.id} className="border-b hover:bg-gray-50/50">
                  <td className="sticky left-0 z-20 bg-white px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{emp.employeeNumber}</td>
                  <td className="sticky left-[100px] z-20 bg-white px-3 py-2 font-medium whitespace-nowrap">{emp.name}</td>
                  <td className="sticky left-[200px] z-20 bg-white px-2 py-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingEmployee(emp)}>
                      수정
                    </Button>
                  </td>
                  <td className="sticky left-[250px] z-20 bg-white border-r px-3 py-2 text-right font-medium whitespace-nowrap w-[180px] min-w-[180px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                    {annual > 0 ? `${formatNumber(annual)}원` : '-'}
                  </td>
                  {activeItemIds.map((itemId) => {
                    const ci = companyItems.find((c) => c.id === itemId);
                    const isDeprecated = ci?.isDeprecated ?? false;
                    const colIdx = editableItemIds.indexOf(itemId);
                    const amount = data[emp.id]?.[itemId] ?? 0;
                    return (
                      <td key={itemId} className={`px-2 py-1${isDeprecated ? ' bg-gray-50' : ''}`}>
                        <input
                          type="text"
                          ref={!isDeprecated && colIdx !== -1 ? (el) => {
                            if (el) inputRefs.current.set(`${rowIdx}-${colIdx}`, el);
                            else inputRefs.current.delete(`${rowIdx}-${colIdx}`);
                          } : undefined}
                          value={amount > 0 ? formatNumberInput(amount.toString()) : ''}
                          readOnly={isDeprecated}
                          onFocus={(e) => { if (!isDeprecated) e.target.select(); }}
                          onChange={(e) => { if (!isDeprecated) handleAmountChange(emp.id, itemId, e.target.value); }}
                          onKeyDown={!isDeprecated && colIdx !== -1 ? (e) => handleCellKeyDown(e, rowIdx, colIdx) : undefined}
                          placeholder="0"
                          className={`w-full text-right bg-transparent outline-none rounded px-1 py-1 text-sm min-w-[100px] ${isDeprecated ? 'text-gray-400 cursor-not-allowed' : 'focus:bg-blue-50'}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* 합계 행 */}
            {employees.length > 0 && (
              <tr className="bg-gray-50 font-semibold border-t-2">
                <td
                  colSpan={3}
                  className="sticky left-0 z-20 bg-gray-50 border-r-0 px-3 py-2 w-[250px]"
                >
                  합계
                </td>
                <td className="sticky left-[250px] z-20 bg-gray-50 border-r px-3 py-2 w-[180px] min-w-[180px] text-right shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                  {(() => {
                    const total = employees.reduce((s, emp) => {
                      const template: PayrollTemplateItem[] = activeItemIds
                        .map((itemId) => {
                          const ci = companyItems.find((c) => c.id === itemId);
                          if (!ci) return null;
                          return { itemId: ci.id, itemCode: ci.taxItemId, itemName: ci.name, amount: data[emp.id]?.[itemId] ?? 0, category: ci.taxItemCategory, includeInAnnual: includeInAnnual[emp.id]?.[itemId] ?? true } as PayrollTemplateItem;
                        })
                        .filter((t): t is PayrollTemplateItem => t !== null);
                      return s + calcAnnualSalary(template, companyItems);
                    }, 0);
                    return total > 0 ? formatNumber(total) : '-';
                  })()}
                </td>
                {activeItemIds.map((itemId) => {
                  const ci = companyItems.find((c) => c.id === itemId);
                  const isDeprecated = ci?.isDeprecated ?? false;
                  const colSum = employees.reduce((s, emp) => s + (data[emp.id]?.[itemId] ?? 0), 0);
                  return (
                    <td key={itemId} className={`px-3 py-2 text-right ${isDeprecated ? 'text-gray-400 bg-gray-50' : 'text-blue-700'}`}>
                      {colSum > 0 ? formatNumber(colSum) : '-'}
                    </td>
                  );
                })}
              </tr>
            )}

            {employees.length === 0 && (
              <tr>
                <td colSpan={4 + activeItemIds.length} className="text-center text-gray-400 py-12">
                  대상 직원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {employees.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t px-2 py-3 z-10 flex items-center justify-between !mt-0">
          <div className="flex-1 text-sm text-muted-foreground">
            총 {employees.length}명
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">페이지당 항목</p>
              <Select value={`${pageSize}`} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[15, 30, 50, 100].map((s) => (
                    <SelectItem key={s} value={`${s}`}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              {page} / {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPage(1)} disabled={page === 1}>
                <span className="sr-only">첫 페이지</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <span className="sr-only">이전 페이지</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <span className="sr-only">다음 페이지</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <span className="sr-only">마지막 페이지</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingEmployee && (
        <SalaryContractEditDialog
          open={!!editingEmployee}
          onOpenChange={(open) => { if (!open) setEditingEmployee(null); }}
          employee={editingEmployee}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 저장 확인 다이얼로그 */}
      <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>급여계약 저장</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            {employees.length}명의 급여계약 정보를 저장합니다.
            <br />
            직원의 급여정보가 즉시 변경됩니다. 계속하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveConfirm(false)}>취소</Button>
            <Button variant="default" onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 급여항목 관리 다이얼로그 */}
      <Dialog open={showItemManager} onOpenChange={setShowItemManager}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>급여항목 관리</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto py-1">
            {companyItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">등록된 급여항목이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {[...companyItems].filter((item) => !item.isDeprecated).sort((a, b) => a.taxItemCategory === b.taxItemCategory ? 0 : a.taxItemCategory === 'taxable' ? -1 : 1).map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={pendingActiveIds.has(item.id)}
                      onChange={(e) => {
                        setPendingActiveIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                    />
                    <span className="text-sm flex-1">{item.name}</span>
                    <Badge variant={item.taxItemCategory === 'taxable' ? 'default' : 'secondary'} className="text-xs">
                      {item.taxItemCategory === 'taxable' ? '과세' : '비과세'}
                    </Badge>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemManager(false)}>취소</Button>
            <Button variant="default" onClick={handleSaveItemManager}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
