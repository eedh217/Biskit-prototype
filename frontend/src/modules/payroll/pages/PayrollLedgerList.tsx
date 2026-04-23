import { useState, useMemo, useEffect } from 'react';
import { Settings, Plus, MoreHorizontal, Pencil, Copy, Trash2 } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { useToast } from '@/shared/hooks/use-toast';
import { employeeService } from '@/modules/hr/services/employeeService';
import { Employee } from '@/modules/hr/types/employee';
import { payrollLedgerService } from '../services/payrollLedgerService';
import { companyPayrollItemService, getAvailableYears } from '../services/companyPayrollItemService';
import { PayrollLedger } from '../types/payroll';

function getDefaultPayDate(year: number, month: number, payDay: number | null, payMonthType: 'current' | 'next'): string {
  if (!payDay) return '';
  const targetDate = new Date(year, payMonthType === 'next' ? month : month - 1, payDay);
  const y = targetDate.getFullYear();
  const m = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const d = targetDate.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isActiveInMonth(emp: Employee, year: number, month: number): boolean {
  const firstDay = `${year}${month.toString().padStart(2, '0')}01`;
  const lastDate = new Date(year, month, 0);
  const lastDay = `${year}${month.toString().padStart(2, '0')}${lastDate.getDate().toString().padStart(2, '0')}`;
  return emp.joinDate <= lastDay && (!emp.leaveDate || emp.leaveDate >= firstDay);
}
import { PaySettingsDialog } from '../components/PaySettingsDialog';
import { CreateLedgerDialog } from '../components/CreateLedgerDialog';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const AVAILABLE_YEARS = getAvailableYears();
const lastAvailableYear = AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1] ?? 2026;
const DEFAULT_YEAR = Math.max(2026, Math.min(new Date().getFullYear(), lastAvailableYear));

const formatAmount = (n: number): string => n.toLocaleString('ko-KR');

function navigate(path: string): void {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function PayrollLedgerList(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR);
  const [ledgers, setLedgers] = useState<PayrollLedger[]>(() =>
    payrollLedgerService.getLedgersByYear(DEFAULT_YEAR)
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingLedger, setDeletingLedger] = useState<PayrollLedger | null>(null);
  const [copyingLedger, setCopyingLedger] = useState<PayrollLedger | null>(null);
  const [copyName, setCopyName] = useState('');
  const [copyYear, setCopyYear] = useState(DEFAULT_YEAR);
  const [copyMonth, setCopyMonth] = useState(1);
  const [copyPayDate, setCopyPayDate] = useState('');
  const [inactiveWarning, setInactiveWarning] = useState<{
    employees: { name: string; employeeNo: string; employeeId: string }[];
    action: 'edit' | 'copy';
    ledger: PayrollLedger;
  } | null>(null);
  const [payItemWarning, setPayItemWarning] = useState<{
    invalidItems: { id: string; name: string }[];
    action: 'edit' | 'copy';
    ledger: PayrollLedger;
  } | null>(null);
  const [pendingExcludePayItemIds, setPendingExcludePayItemIds] = useState<string[]>([]);
  const [editingLedger, setEditingLedger] = useState<PayrollLedger | null>(null);
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState(DEFAULT_YEAR);
  const [editMonth, setEditMonth] = useState(1);
  const [editPayDate, setEditPayDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!copyingLedger) return;
    const settings = payrollLedgerService.getSettings();
    setCopyPayDate(getDefaultPayDate(copyYear, copyMonth, settings.defaultPayDay, settings.payMonthType ?? 'current'));
  }, [copyYear, copyMonth, copyingLedger]);

  const getInvalidPayItems = (
    ledger: PayrollLedger,
    targetYear: number
  ): { id: string; name: string }[] => {
    const sourceItems = companyPayrollItemService.getPayItems(ledger.year);
    const targetItems = companyPayrollItemService.getPayItems(targetYear);
    const targetTaxIds = new Set(targetItems.map((i) => i.taxItemId));
    const ledgerItemIds = ledger.activePayItemIds
      ? ledger.activePayItemIds
      : [...new Set(payrollLedgerService.getRowsByLedgerId(ledger.id).flatMap((r) => Object.keys(r.payItems)))];
    return ledgerItemIds
      .filter((id) => {
        const src = sourceItems.find((i) => i.id === id);
        return !src || !targetTaxIds.has(src.taxItemId);
      })
      .map((id) => {
        const src = sourceItems.find((i) => i.id === id);
        return { id, name: src?.name ?? id };
      });
  };

  const getInactiveEmployees = async (
    ledgerId: string,
    year: number,
    month: number
  ): Promise<{ name: string; employeeNo: string; employeeId: string }[]> => {
    const rows = payrollLedgerService.getRowsByLedgerId(ledgerId);
    const result = await employeeService.getAll({ limit: 99999 });
    const empMap = new Map(result.data.map((e) => [e.id, e]));
    return rows
      .filter((row) => {
        const emp = empMap.get(row.employeeId);
        return !emp || !isActiveInMonth(emp, year, month);
      })
      .map((row) => ({ name: row.employeeName, employeeNo: row.employeeNo, employeeId: row.employeeId }));
  };

  const handleYearChange = (val: string): void => {
    const y = parseInt(val, 10);
    setSelectedYear(y);
    setLedgers(payrollLedgerService.getLedgersByYear(y));
  };

  const handleDelete = (): void => {
    if (!deletingLedger) return;
    payrollLedgerService.deleteLedger(deletingLedger.id);
    setLedgers((prev) => prev.filter((l) => l.id !== deletingLedger.id));
    setDeletingLedger(null);
    toast({ description: '급여대장을 삭제했습니다.' });
  };

  const handleOpenEdit = (ledger: PayrollLedger): void => {
    setEditingLedger(ledger);
    setEditName(ledger.name);
    setEditYear(ledger.year);
    setEditMonth(ledger.month);
    setEditPayDate(ledger.payDate ?? '');
  };

  const executeEdit = (ledger: PayrollLedger, excludeEmployeeIds: string[], excludePayItemIds: string[] = []): void => {
    if (excludeEmployeeIds.length > 0) {
      payrollLedgerService.deleteRowsByEmployeeIds(ledger.id, excludeEmployeeIds);
    }
    if (excludePayItemIds.length > 0) {
      const excludeSet = new Set(excludePayItemIds);
      const rows = payrollLedgerService.getRowsByLedgerId(ledger.id);
      for (const row of rows) {
        const newPayItems = Object.fromEntries(
          Object.entries(row.payItems).filter(([id]) => !excludeSet.has(id))
        );
        payrollLedgerService.updateRow({ ...row, payItems: newPayItems });
      }
      const newActiveIds = (ledger.activePayItemIds ?? []).filter((id) => !excludeSet.has(id));
      payrollLedgerService.updateLedger(ledger.id, { activePayItemIds: newActiveIds });
    }
    payrollLedgerService.updateLedger(ledger.id, {
      name: editName.trim(),
      year: editYear,
      month: editMonth,
      payDate: editPayDate,
    });
    setLedgers((prev) =>
      prev.map((l) =>
        l.id === ledger.id
          ? { ...l, name: editName.trim(), year: editYear, month: editMonth, payDate: editPayDate }
          : l
      )
    );
    setEditingLedger(null);
    setInactiveWarning(null);
    setPayItemWarning(null);
    setPendingExcludePayItemIds([]);
    toast({ description: '급여대장을 수정했습니다.' });
  };

  const handleEdit = async (): Promise<void> => {
    if (!editingLedger || !editName.trim()) return;
    setPendingExcludePayItemIds([]);
    if (editYear !== editingLedger.year) {
      const invalid = getInvalidPayItems(editingLedger, editYear);
      if (invalid.length > 0) {
        setPayItemWarning({ invalidItems: invalid, action: 'edit', ledger: editingLedger });
        return;
      }
    }
    const yearMonthChanged = editYear !== editingLedger.year || editMonth !== editingLedger.month;
    if (yearMonthChanged) {
      const inactive = await getInactiveEmployees(editingLedger.id, editYear, editMonth);
      if (inactive.length > 0) {
        setInactiveWarning({ employees: inactive, action: 'edit', ledger: editingLedger });
        return;
      }
    }
    executeEdit(editingLedger, []);
  };

  const executeCopy = (ledger: PayrollLedger, excludeEmployeeIds: string[], excludePayItemIds: string[] = []): void => {
    const copied = payrollLedgerService.copyLedger(
      ledger.id,
      { name: copyName.trim(), year: copyYear, month: copyMonth, payDate: copyPayDate },
      excludeEmployeeIds
    );
    if (copied) {
      if (excludePayItemIds.length > 0) {
        const excludeSet = new Set(excludePayItemIds);
        const rows = payrollLedgerService.getRowsByLedgerId(copied.id);
        for (const row of rows) {
          const newPayItems = Object.fromEntries(
            Object.entries(row.payItems).filter(([id]) => !excludeSet.has(id))
          );
          payrollLedgerService.updateRow({ ...row, payItems: newPayItems });
        }
        const newActiveIds = (copied.activePayItemIds ?? []).filter((id) => !excludeSet.has(id));
        payrollLedgerService.updateLedger(copied.id, { activePayItemIds: newActiveIds });
      }
      if (copied.year === selectedYear) {
        setLedgers((prev) => [...prev, copied]);
      }
    }
    setCopyingLedger(null);
    setInactiveWarning(null);
    setPayItemWarning(null);
    setPendingExcludePayItemIds([]);
    toast({ description: '급여대장을 복사했습니다.' });
  };

  const handleCopy = async (): Promise<void> => {
    if (!copyingLedger || !copyName.trim()) return;
    setPendingExcludePayItemIds([]);
    if (copyYear !== copyingLedger.year) {
      const invalid = getInvalidPayItems(copyingLedger, copyYear);
      if (invalid.length > 0) {
        setPayItemWarning({ invalidItems: invalid, action: 'copy', ledger: copyingLedger });
        return;
      }
    }
    const yearMonthChanged = copyYear !== copyingLedger.year || copyMonth !== copyingLedger.month;
    if (yearMonthChanged) {
      const inactive = await getInactiveEmployees(copyingLedger.id, copyYear, copyMonth);
      if (inactive.length > 0) {
        setInactiveWarning({ employees: inactive, action: 'copy', ledger: copyingLedger });
        return;
      }
    }
    executeCopy(copyingLedger, []);
  };

  const handleCreated = (ledger: PayrollLedger): void => {
    navigate(`/payroll/ledger/detail?id=${ledger.id}`);
  };

  const sortedLedgers = useMemo(
    () => [...ledgers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [ledgers]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>급여대장</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-[160px] text-base font-bold">
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
          </div>
        }
        showBackButton={false}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-1" />
              설정
            </Button>
            <Button variant="default" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              급여대장 생성
            </Button>
          </div>
        }
      />

      {sortedLedgers.length === 0 ? (
        <p className="py-16 text-center text-gray-400">등록된 급여대장이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>급여대장명</TableHead>
              <TableHead className="w-[150px]">귀속연월</TableHead>
              <TableHead className="w-[150px]">지급일</TableHead>
              <TableHead className="w-[130px] text-right">대상자수</TableHead>
              <TableHead className="w-[170px] text-right">총 지급액</TableHead>
              <TableHead className="w-[170px] text-right">총 공제액</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLedgers.map((ledger) => {
              const summary = payrollLedgerService.getLedgerSummary(ledger.id);
              return (
                <TableRow
                  key={ledger.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/payroll/ledger/detail?id=${ledger.id}`)}
                >
                  <TableCell className="font-medium">{ledger.name}</TableCell>
                  <TableCell>
                    {ledger.year}.{ledger.month.toString().padStart(2, '0')}
                  </TableCell>
                  <TableCell>
                    {ledger.payDate ? ledger.payDate.replace(/-/g, '.') : '-'}
                  </TableCell>
                  <TableCell className="text-right">{summary.count}명</TableCell>
                  <TableCell className="text-right">{formatAmount(summary.totalPay)}원</TableCell>
                  <TableCell className="text-right">{formatAmount(summary.totalDeduction)}원</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          if (ledger.isConfirmed) {
                            alert('확정된 급여대장은 수정하실 수 없습니다. 급여확정 해제 후 수정 가능합니다.');
                            return;
                          }
                          handleOpenEdit(ledger);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setCopyingLedger(ledger);
                          setCopyName(ledger.name);
                          setCopyYear(ledger.year);
                          setCopyMonth(ledger.month);
                          setCopyPayDate(ledger.payDate ?? '');
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          복사
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            if (ledger.isConfirmed) {
                              alert('확정된 급여대장은 삭제하실 수 없습니다. 급여확정 해제 후 삭제 가능합니다.');
                              return;
                            }
                            setDeletingLedger(ledger);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* 복사 다이얼로그 */}
      <Dialog open={!!copyingLedger} onOpenChange={(open) => { if (!open) setCopyingLedger(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>급여대장 복사</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>급여대장명</Label>
              <Input value={copyName} onChange={(e) => setCopyName(e.target.value)} placeholder="급여대장명 입력" />
            </div>
            <div className="space-y-2">
              <Label>귀속연월</Label>
              <div className="flex items-center gap-2">
                <Select value={copyYear.toString()} onValueChange={(v) => setCopyYear(parseInt(v, 10))}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={copyMonth.toString()} onValueChange={(v) => setCopyMonth(parseInt(v, 10))}>
                  <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>지급일</Label>
              <Input type="date" value={copyPayDate} onChange={(e) => setCopyPayDate(e.target.value)} />
              {copyPayDate && copyPayDate < `${copyYear}-${copyMonth.toString().padStart(2, '0')}-01` && (
                <p className="text-xs text-red-500">지급일자는 귀속연월보다 이후 날짜여야합니다.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyingLedger(null)}>취소</Button>
            <Button
              variant="default"
              onClick={handleCopy}
              disabled={!copyName.trim() || (!!copyPayDate && copyPayDate < `${copyYear}-${copyMonth.toString().padStart(2, '0')}-01`)}
            >
              복사
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingLedger} onOpenChange={(open) => { if (!open) setEditingLedger(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>급여대장 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>급여대장명</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>귀속연월</Label>
              <div className="flex items-center gap-2">
                <Select value={editYear.toString()} onValueChange={(v) => setEditYear(parseInt(v, 10))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editMonth.toString()} onValueChange={(v) => setEditMonth(parseInt(v, 10))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m} value={m.toString()}>{m}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>지급일</Label>
              <Input type="date" value={editPayDate} onChange={(e) => setEditPayDate(e.target.value)} />
              {editPayDate && editPayDate < `${editYear}-${editMonth.toString().padStart(2, '0')}-01` && (
                <p className="text-xs text-red-500">지급일자는 귀속연월보다 이후 날짜여야합니다.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLedger(null)}>취소</Button>
            <Button variant="default" onClick={handleEdit} disabled={!editName.trim() || (!!editPayDate && editPayDate < `${editYear}-${editMonth.toString().padStart(2, '0')}-01`)}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingLedger} onOpenChange={(open) => { if (!open) setDeletingLedger(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>급여대장 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            <span className="font-medium">{deletingLedger?.name}</span>을(를) 삭제하시겠습니까?
            <br />
            삭제 시 해당 급여대장의 모든 데이터가 함께 삭제됩니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLedger(null)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaySettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        onSaved={() => {}}
      />

      <CreateLedgerDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={handleCreated}
      />

      {/* 미등록 급여항목 경고 다이얼로그 */}
      <Dialog open={!!payItemWarning} onOpenChange={(open) => { if (!open) setPayItemWarning(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>급여항목 확인</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">
              선택한 귀속연도의 급여항목으로 등록되지 않은 급여항목이 있습니다.
              <br />
              해당 급여항목을 삭제 후 급여대장을{' '}
              <span className="font-medium">{payItemWarning?.action === 'copy' ? '복사' : '수정'}</span>하시겠습니까?
            </p>
            <div className="rounded-md border bg-gray-50 p-3 space-y-1">
              <p className="text-xs text-gray-500 mb-2">총 {payItemWarning?.invalidItems.length}개</p>
              {payItemWarning?.invalidItems.map((item) => (
                <p key={item.id} className="text-sm">{item.name}</p>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayItemWarning(null)}>취소</Button>
            <Button
              variant="default"
              onClick={async () => {
                if (!payItemWarning) return;
                const excludeIds = payItemWarning.invalidItems.map((i) => i.id);
                setPendingExcludePayItemIds(excludeIds);
                setPayItemWarning(null);
                if (payItemWarning.action === 'edit') {
                  const yearMonthChanged = editYear !== payItemWarning.ledger.year || editMonth !== payItemWarning.ledger.month;
                  if (yearMonthChanged) {
                    const inactive = await getInactiveEmployees(payItemWarning.ledger.id, editYear, editMonth);
                    if (inactive.length > 0) {
                      setInactiveWarning({ employees: inactive, action: 'edit', ledger: payItemWarning.ledger });
                      return;
                    }
                  }
                  executeEdit(payItemWarning.ledger, [], excludeIds);
                } else {
                  const yearMonthChanged = copyYear !== payItemWarning.ledger.year || copyMonth !== payItemWarning.ledger.month;
                  if (yearMonthChanged) {
                    const inactive = await getInactiveEmployees(payItemWarning.ledger.id, copyYear, copyMonth);
                    if (inactive.length > 0) {
                      setInactiveWarning({ employees: inactive, action: 'copy', ledger: payItemWarning.ledger });
                      return;
                    }
                  }
                  executeCopy(payItemWarning.ledger, [], excludeIds);
                }
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비활성 직원 경고 다이얼로그 */}
      <Dialog open={!!inactiveWarning} onOpenChange={(open) => { if (!open) setInactiveWarning(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>근무 이력 확인</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">
              선택한 귀속연월에 근무하지 않은 근로자가 포함되어 있습니다.
              <br />
              해당 근로자를 삭제 후 급여대장을{' '}
              <span className="font-medium">{inactiveWarning?.action === 'copy' ? '복사' : '수정'}</span>하시겠습니까?
            </p>
            <div className="rounded-md border bg-gray-50 p-3 space-y-1">
              <p className="text-xs text-gray-500 mb-2">총 {inactiveWarning?.employees.length}명</p>
              {inactiveWarning?.employees.map((emp) => (
                <p key={emp.employeeId} className="text-sm">
                  {emp.name}
                  <span className="text-gray-400 ml-1">({emp.employeeNo})</span>
                </p>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInactiveWarning(null)}>취소</Button>
            <Button
              variant="default"
              onClick={() => {
                if (!inactiveWarning) return;
                const excludeIds = inactiveWarning.employees.map((e) => e.employeeId);
                if (inactiveWarning.action === 'edit') executeEdit(inactiveWarning.ledger, excludeIds, pendingExcludePayItemIds);
                else executeCopy(inactiveWarning.ledger, excludeIds, pendingExcludePayItemIds);
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
