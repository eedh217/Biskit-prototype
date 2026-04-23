import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import { employeeService } from '@/modules/hr/services/employeeService';
import { organizationService } from '@/modules/hr/services/organizationService';
import { Employee } from '@/modules/hr/types/employee';
import type { Organization } from '@/modules/hr/types/organization';
import { CompanyPayItem, PayrollLedger, PayrollLedgerRow } from '../types/payroll';
import { companyPayrollItemService } from '../services/companyPayrollItemService';
import { payrollLedgerService } from '../services/payrollLedgerService';

interface AddEmployeeToLedgerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledger: PayrollLedger;
  existingEmployeeIds: Set<string>;
  onAdded: (rows: PayrollLedgerRow[]) => void;
}

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

export function AddEmployeeToLedgerDialog({
  open,
  onOpenChange,
  ledger,
  existingEmployeeIds,
  onAdded,
}: AddEmployeeToLedgerDialogProps): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [deptComboOpen, setDeptComboOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setSearch('');
    setSelectedDeptId('');
    Promise.all([
      employeeService.getAll({ limit: 99999 }),
      organizationService.getAll(),
    ]).then(([result, orgs]) => {
      const active = result.data.filter(
        (e) =>
          isActiveInMonth(e, ledger.year, ledger.month) &&
          !existingEmployeeIds.has(e.id)
      );
      setEmployees(active);
      setOrganizations(orgs);
    });
  }, [open, ledger, existingEmployeeIds]);

  // 선택한 부서 및 하위 부서 ID 집합
  const deptIdSet = useMemo(() => {
    if (!selectedDeptId) return null;
    const ids = new Set<string>();
    const queue = [selectedDeptId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      ids.add(cur);
      organizations.filter((o) => o.parentId === cur).forEach((o) => queue.push(o.id));
    }
    return ids;
  }, [selectedDeptId, organizations]);

  // 부서 표시 경로
  const getDeptLabel = (deptId: string): string => {
    const parts: string[] = [];
    let cur = organizations.find((o) => o.id === deptId);
    while (cur) {
      parts.unshift(cur.name);
      cur = organizations.find((o) => o.id === cur?.parentId);
    }
    return parts.join(' > ');
  };

  const filtered = employees.filter((e) => {
    const matchSearch = e.name.includes(search) || e.employeeNumber.includes(search);
    const matchDept = !deptIdSet || (e.departmentId !== null && deptIdSet.has(e.departmentId));
    return matchSearch && matchDept;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  const handleToggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        filtered.forEach((e) => next.add(e.id));
      } else {
        filtered.forEach((e) => next.delete(e.id));
      }
      return next;
    });
  };

  const handleToggle = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAdd = (): void => {
    const payItems = companyPayrollItemService.getPayItems(ledger.year);
    const newRows: PayrollLedgerRow[] = [];

    for (const emp of employees.filter((e) => selectedIds.has(e.id))) {
      const proRataFactor = getProRataFactor(emp, ledger.year, ledger.month);
      const payItemMap: Record<string, number> = {};

      for (const tpl of emp.payrollTemplate) {
        const match =
          payItems.find((pi: CompanyPayItem) => pi.id === tpl.itemId) ??
          payItems.find((pi: CompanyPayItem) => pi.taxItemId === tpl.itemCode) ??
          payItems.find((pi: CompanyPayItem) => pi.taxItemId === tpl.itemId);
        if (match && !match.isDeprecated) {
          if (match.paymentType === 'irregular') {
            const effectiveMonths =
              (match.paymentMonths?.length ?? 0) > 0
                ? match.paymentMonths!
                : (tpl.paymentMonths ?? []);
            if (effectiveMonths.length === 0 || !effectiveMonths.includes(ledger.month)) continue;
          }
          payItemMap[match.id] = Math.round(tpl.amount * proRataFactor);
        }
      }

      const newRow = payrollLedgerService.addRow({
        ledgerId: ledger.id,
        employeeId: emp.id,
        employeeNo: emp.employeeNumber,
        employeeName: emp.name,
        payItems: payItemMap,
        deductionItems: {},
      });
      newRows.push(newRow);
    }

    if (newRows.length > 0) {
      onAdded(newRows);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>직원 추가</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Popover open={deptComboOpen} onOpenChange={setDeptComboOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                <span className={cn(!selectedDeptId && 'text-muted-foreground')}>
                  {selectedDeptId ? getDeptLabel(selectedDeptId) : '부서 전체'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="부서 검색..." />
                <CommandList>
                  <CommandEmpty>부서를 찾을 수 없습니다.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="__all__" onSelect={() => { setSelectedDeptId(''); setDeptComboOpen(false); }}>
                      <Check className={cn('mr-2 h-4 w-4', !selectedDeptId ? 'opacity-100' : 'opacity-0')} />
                      전체
                    </CommandItem>
                    {organizations.map((org) => (
                      <CommandItem
                        key={org.id}
                        value={getDeptLabel(org.id)}
                        onSelect={() => { setSelectedDeptId(org.id); setDeptComboOpen(false); }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', selectedDeptId === org.id ? 'opacity-100' : 'opacity-0')} />
                        {getDeptLabel(org.id)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Input
            placeholder="사번 또는 성명 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                추가 가능한 직원이 없습니다.
              </p>
            ) : (
              <>
                <label className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={allFilteredSelected}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                  />
                  <span className="text-xs font-medium text-gray-500">전체 선택 ({filtered.length}명)</span>
                </label>
                {filtered.map((emp) => (
                  <label
                    key={emp.id}
                    className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(emp.id)}
                      onChange={(e) => handleToggle(emp.id, e.target.checked)}
                    />
                    <span className="text-xs text-gray-400 w-20">{emp.employeeNumber}</span>
                    <span className="text-sm font-medium">{emp.name}</span>
                  </label>
                ))}
              </>
            )}
          </div>
          {selectedIds.size > 0 && (
            <p className="text-xs text-gray-500">{selectedIds.size}명 선택됨</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button variant="default" onClick={handleAdd} disabled={selectedIds.size === 0}>
            추가 ({selectedIds.size}명)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
