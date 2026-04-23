import { useState, useEffect, useRef } from 'react';
import { History, Search } from 'lucide-react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { employeeService } from '@/modules/hr/services/employeeService';
import { organizationService } from '@/modules/hr/services/organizationService';
import { SalaryContractEditDialog } from '../components/SalaryContractEditDialog';
import { salaryContractHistoryService } from '../services/salaryContractHistoryService';
import { companyPayrollItemService } from '../services/companyPayrollItemService';
import { type Employee, getEmploymentStatus, formatDate as formatEmployeeDate } from '@/modules/hr/types/employee';
import type { Organization } from '@/modules/hr/types/organization';
import type { SalaryContractHistoryRecord } from '../types/payroll';
import { formatNumber } from '@/shared/lib/utils';

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getOrgPath(orgId: string | null | undefined, orgs: Organization[]): string {
  if (!orgId) return '-';
  const path: string[] = [];
  let current: Organization | undefined = orgs.find((o) => o.id === orgId);
  while (current) {
    path.unshift(current.name);
    current = orgs.find((o) => o.id === current?.parentId);
  }
  return path.length > 0 ? path.join(' > ') : '-';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SalaryContractList(): JSX.Element {
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgsAll, setOrgsAll] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPopover, setShowPopover] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<Employee | null>(null);

  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);
  const [historyRecords, setHistoryRecords] = useState<SalaryContractHistoryRecord[]>([]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [result, orgs] = await Promise.all([
          employeeService.getAll({ limit: 99999 }),
          organizationService.getAll(),
        ]);
        const active = result.data.filter((e) => !e.leaveDate || e.leaveDate >= new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        setEmployees(active);
        setOrgsAll(orgs as Organization[]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (): void => {
    setSearch(searchInput.trim());
  };

  const filtered = employees.filter(
    (e) =>
      e.name.includes(search) || e.employeeNumber.includes(search)
  );

  const handleSelectAll = (checked: boolean): void => {
    setSelectedIds(checked ? new Set(filtered.map((e) => e.id)) : new Set());
  };

  const handleSelectOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleRowClick = (emp: Employee): void => {
    setEditingSnapshot(emp);
    setEditingEmployee(emp);
  };

  const handleEditSuccess = async (): Promise<void> => {
    if (!editingSnapshot) return;
    try {
      const updated = await employeeService.getById(editingSnapshot.id);
      const companyItems = companyPayrollItemService.getPayItems(currentYear);

      const oldMap = new Map(editingSnapshot.payrollTemplate.map((t) => [t.itemId, t.amount]));
      const newMap = new Map(updated.payrollTemplate.map((t) => [t.itemId, t.amount]));
      const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

      const changes: SalaryContractHistoryRecord['changes'] = [];
      for (const itemId of allIds) {
        const oldAmt = oldMap.get(itemId) ?? null;
        const newAmt = newMap.get(itemId) ?? null;
        if (oldAmt !== newAmt) {
          const item = companyItems.find((ci) => ci.id === itemId);
          changes.push({
            itemId,
            itemName: item?.name ?? itemId,
            oldAmount: oldAmt,
            newAmount: newAmt,
          });
        }
      }

      if (changes.length > 0 || updated.annualSalary !== editingSnapshot.annualSalary) {
        salaryContractHistoryService.create({
          employeeId: updated.id,
          employeeNo: updated.employeeNumber,
          employeeName: updated.name,
          changes,
          oldAnnualSalary: editingSnapshot.annualSalary ?? null,
          newAnnualSalary: updated.annualSalary ?? null,
        });
      }

      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      // reload fallback
      const result = await employeeService.getAll({ limit: 99999 });
      setEmployees(result.data.filter((e) => !e.leaveDate || e.leaveDate >= new Date().toISOString().slice(0, 10).replace(/-/g, '')));
    }
  };

  const handleOpenHistory = (e: React.MouseEvent, emp: Employee): void => {
    e.stopPropagation();
    setHistoryEmployee(emp);
    setHistoryRecords(salaryContractHistoryService.getByEmployeeId(emp.id));
  };

  const handleBulkAll = (): void => {
    setShowPopover(false);
    if (filtered.length === 0) { alert('대상자가 없습니다.'); return; }
    const ids = filtered.map((e) => e.id).join(',');
    navigate(`/payroll/salary-contract/bulk-edit?ids=${ids}`);
  };

  const handleBulkSelected = (): void => {
    setShowPopover(false);
    if (selectedIds.size === 0) { alert('선택된 대상자가 없습니다.'); return; }
    const ids = [...selectedIds].join(',');
    navigate(`/payroll/salary-contract/bulk-edit?ids=${ids}`);
  };

  const allChecked = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
  const someChecked = filtered.some((e) => selectedIds.has(e.id));

  return (
    <div className="space-y-6">
      <PageHeader title="급여계약 관리" showBackButton={false} />

      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={searchInputRef}
            placeholder="이름 또는 사번을 입력해주세요."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="w-full pl-9"
          />
        </div>
        <Button onClick={handleSearch} onMouseDown={(e) => e.preventDefault()}>검색</Button>
        <div className="ml-auto">
          <Popover open={showPopover} onOpenChange={setShowPopover}>
            <PopoverTrigger asChild>
              <Button variant="default">일괄수정</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="end">
              <button
                onClick={handleBulkAll}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                조회된 전체 대상자({filtered.length}건)
              </button>
              <button
                onClick={handleBulkSelected}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                선택 대상자({selectedIds.size}건)
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]">
                  <Checkbox
                    checked={allChecked}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    ref={someChecked && !allChecked ? (el) => { if (el) el.indeterminate = true; } : undefined}
                  />
                </TableHead>
                <TableHead className="w-[150px]">사번</TableHead>
                <TableHead className="w-[150px]">성명</TableHead>
                <TableHead className="w-[150px]">재직상태</TableHead>
                <TableHead className="w-[150px]">입사일</TableHead>
                <TableHead className="text-right w-[160px]">연봉</TableHead>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>부서</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">불러오는 중...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">직원이 없습니다.</TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(emp)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(emp.id)}
                        onChange={(e) => handleSelectOne(emp.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{emp.employeeNumber}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const status = getEmploymentStatus(emp.leaveDate);
                        return (
                          <span className={status === '재직중' ? 'text-green-600' : 'text-gray-500'}>
                            {status}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{formatEmployeeDate(emp.joinDate)}</TableCell>
                    <TableCell className="text-right">
                      {emp.annualSalary ? `${formatNumber(emp.annualSalary)}원` : '-'}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {getOrgPath(emp.departmentId, orgsAll)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleOpenHistory(e, emp)}
                        title="계약이력"
                      >
                        <History className="h-4 w-4 text-gray-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

      {editingEmployee && (
        <SalaryContractEditDialog
          open={!!editingEmployee}
          onOpenChange={(open) => { if (!open) setEditingEmployee(null); }}
          employee={editingEmployee}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 계약이력 다이얼로그 */}
      <Dialog open={!!historyEmployee} onOpenChange={(open) => { if (!open) setHistoryEmployee(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{historyEmployee?.name} 계약이력</DialogTitle>
          </DialogHeader>
          <div className="max-h-[480px] overflow-y-auto space-y-3 py-2">
            {historyRecords.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">이력이 없습니다.</p>
            ) : (
              historyRecords.map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(record.changedAt)}</span>
                    <span>{record.changedBy}</span>
                  </div>
                  {(record.oldAnnualSalary !== record.newAnnualSalary) && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">연봉</span>
                      <span className="ml-2 text-gray-400 line-through">
                        {record.oldAnnualSalary ? `${formatNumber(record.oldAnnualSalary)}원` : '-'}
                      </span>
                      <span className="ml-1 text-gray-800">
                        → {record.newAnnualSalary ? `${formatNumber(record.newAnnualSalary)}원` : '-'}
                      </span>
                    </div>
                  )}
                  {record.changes.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-medium text-gray-700">{c.itemName}</span>
                      <span className="ml-2 text-gray-400 line-through">
                        {c.oldAmount !== null ? `${formatNumber(c.oldAmount)}원` : '-'}
                      </span>
                      <span className="ml-1 text-gray-800">
                        → {c.newAmount !== null ? `${formatNumber(c.newAmount)}원` : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
