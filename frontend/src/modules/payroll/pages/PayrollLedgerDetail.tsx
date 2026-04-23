import { useState, useMemo, useRef, useEffect } from 'react';
import { UserPlus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, LockOpen, Settings2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useToast } from '@/shared/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { employeeService } from '@/modules/hr/services/employeeService';
import { payrollLedgerService } from '../services/payrollLedgerService';
import { companyPayrollItemService, getTaxItemsByYear } from '../services/companyPayrollItemService';
import { PayrollLedger, PayrollLedgerRow, CompanyPayItem, CompanyDeductionItem, NonTaxableItem } from '../types/payroll';
import { AddEmployeeToLedgerDialog } from '../components/AddEmployeeToLedgerDialog';
import { LedgerPayItemsDialog } from '../components/LedgerPayItemsDialog';

interface PayrollLedgerDetailProps {
  ledgerId: string;
}

const formatAmount = (n: number): string => n.toLocaleString('ko-KR');

function parseLimitAmount(limitStr: string | null): number | null {
  if (!limitStr) return null;
  const digits = limitStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : null;
}

function isOverLimit(item: CompanyPayItem, amount: number, ntMap: Record<string, NonTaxableItem>): boolean {
  if (item.taxItemCategory !== 'non-taxable') return false;
  const nt = ntMap[item.taxItemId];
  if (!nt) return false;
  const monthly = parseLimitAmount(nt.monthlyLimit);
  if (monthly !== null) return amount > monthly;
  const yearly = parseLimitAmount(nt.yearlyLimit);
  if (yearly !== null) return amount > Math.floor(yearly / 12);
  return false;
}

function getLimitTooltip(item: CompanyPayItem, ntMap: Record<string, NonTaxableItem>): string | null {
  if (item.taxItemCategory !== 'non-taxable') return null;
  const nt = ntMap[item.taxItemId];
  if (!nt) return null;
  if (nt.monthlyLimit) return `월한도를 초과하였습니다. (${nt.monthlyLimit})`;
  if (nt.yearlyLimit) return `연한도를 초과하였습니다. (${nt.yearlyLimit})`;
  return null;
}

const calcPayTotal = (row: PayrollLedgerRow, visibleIds: Set<string>): number =>
  [...visibleIds].reduce((s, id) => s + (row.payItems[id] ?? 0), 0);

const calcDeductionTotal = (row: PayrollLedgerRow): number =>
  Object.values(row.deductionItems).reduce((s, v) => s + v, 0);

export function PayrollLedgerDetail({ ledgerId }: PayrollLedgerDetailProps): JSX.Element {
  const [ledger, setLedger] = useState<PayrollLedger | undefined>(
    () => payrollLedgerService.getLedgerById(ledgerId)
  );
  const [rows, setRows] = useState<PayrollLedgerRow[]>(() =>
    payrollLedgerService.getRowsByLedgerId(ledgerId)
  );
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showPayItemsDialog, setShowPayItemsDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const { toast } = useToast();

  const handleDeleteSelected = (): void => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`총 ${selectedIds.size}명을 삭제하시겠습니까?`);
    if (!confirmed) return;
    const count = selectedIds.size;
    selectedIds.forEach((id) => payrollLedgerService.deleteRow(id));
    setRows((prev) => {
      const next = prev.filter((r) => !selectedIds.has(r.id));
      const newTotalPages = Math.max(1, Math.ceil(next.length / pageSize));
      if (page > newTotalPages) setPage(newTotalPages);
      return next;
    });
    setSelectedIds(new Set());
    toast({ description: `${count}명을 삭제했습니다.` });
  };

  const handleExcelDownload = (): void => {
    toast({ title: '엑셀 다운로드', description: '엑셀 다운로드 기능은 준비 중입니다.' });
  };

  const handleConfirm = (): void => {
    if (deprecatedPayItemsInRows.length > 0) {
      alert(
        '사용중단된 급여항목이 있습니다.\n급여항목 관리에서 해당 항목을 처리한 후 급여확정을 진행해주세요.'
      );
      return;
    }
    const ok = window.confirm('급여를 확정하시겠습니까?\n급여확정 시, 급여내역 추가/수정/삭제가 제한됩니다.');
    if (!ok) return;
    payrollLedgerService.updateLedger(ledger!.id, { isConfirmed: true });
    setLedger((prev) => prev ? { ...prev, isConfirmed: true } : prev);
    toast({ description: '급여가 확정되었습니다.' });
  };

  const handleUnconfirm = (): void => {
    const ok = window.confirm('급여확정을 해제하시겠습니까?');
    if (!ok) return;
    payrollLedgerService.updateLedger(ledger!.id, { isConfirmed: false });
    setLedger((prev) => prev ? { ...prev, isConfirmed: false } : prev);
    toast({ description: '급여확정이 해제되었습니다.' });
  };

  const allPayItemsIncludingDeprecated: CompanyPayItem[] = useMemo(
    () => companyPayrollItemService.getPayItems(ledger?.year ?? new Date().getFullYear()),
    [ledger]
  );

  const allPayItems: CompanyPayItem[] = useMemo(
    () => allPayItemsIncludingDeprecated.filter((item) => !item.isDeprecated),
    [allPayItemsIncludingDeprecated]
  );

  const deprecatedPayItemsInRows: CompanyPayItem[] = useMemo(() => {
    const deprecated = allPayItemsIncludingDeprecated.filter((item) => item.isDeprecated);
    if (deprecated.length === 0) return [];
    const rowPayItemIds = new Set(rows.flatMap((row) => Object.keys(row.payItems)));
    return deprecated.filter((item) => rowPayItemIds.has(item.id));
  }, [allPayItemsIncludingDeprecated, rows]);
  const allDeductionItems: CompanyDeductionItem[] = useMemo(
    () => companyPayrollItemService.getDeductionItems(ledger?.year ?? new Date().getFullYear()),
    [ledger]
  );

  const payItems: CompanyPayItem[] = useMemo(() => {
    const items = !ledger?.activePayItemIds
      ? allPayItems
      : allPayItems.filter((i) => new Set(ledger.activePayItemIds).has(i.id));
    return [...items].sort((a, b) =>
      a.taxItemCategory === b.taxItemCategory ? 0 : a.taxItemCategory === 'taxable' ? -1 : 1
    );
  }, [allPayItems, ledger?.activePayItemIds]);

  const deductionItems: CompanyDeductionItem[] = useMemo(() => {
    if (!ledger?.activeDeductionItemIds) return allDeductionItems;
    const activeSet = new Set(ledger.activeDeductionItemIds);
    return allDeductionItems.filter((i) => activeSet.has(i.id));
  }, [allDeductionItems, ledger?.activeDeductionItemIds]);

  const nonTaxableItemMap = useMemo((): Record<string, NonTaxableItem> => {
    const { nonTaxableItems } = getTaxItemsByYear(ledger?.year ?? new Date().getFullYear());
    return Object.fromEntries(nonTaxableItems.map((i) => [i.id, i]));
  }, [ledger?.year]);

  const existingEmployeeIds = useMemo(
    () => new Set(rows.map((r) => r.employeeId)),
    [rows]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const allSelected = pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id));
  const someSelected = pagedRows.some((r) => selectedIds.has(r.id)) && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleSelectAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pagedRows.forEach((r) => {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      });
      return next;
    });
  };

  const handleSelectRow = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handlePayItemChange = (rowId: string, itemId: string, value: string): void => {
    const amount = Math.max(0, parseInt(value, 10) || 0);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated: PayrollLedgerRow = {
          ...row,
          payItems: { ...row.payItems, [itemId]: amount },
        };
        payrollLedgerService.updateRow(updated);
        return updated;
      })
    );
  };

  const handleDeductionItemChange = (rowId: string, itemId: string, value: string): void => {
    const amount = Math.max(0, parseInt(value, 10) || 0);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated: PayrollLedgerRow = {
          ...row,
          deductionItems: { ...row.deductionItems, [itemId]: amount },
        };
        payrollLedgerService.updateRow(updated);
        return updated;
      })
    );
  };

  const handlePageSizeChange = (val: string): void => {
    setPageSize(Number(val));
    setPage(1);
  };

  const visiblePayIds = useMemo(
    () => new Set([...payItems.map((i) => i.id), ...deprecatedPayItemsInRows.map((i) => i.id)]),
    [payItems, deprecatedPayItemsInRows]
  );
  const totalPaySum = rows.reduce((s, r) => s + calcPayTotal(r, visiblePayIds), 0);
  const totalDeductionSum = rows.reduce((s, r) => s + calcDeductionTotal(r), 0);
  const totalNetPay = totalPaySum - totalDeductionSum;
  const isConfirmed = !!ledger?.isConfirmed;

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

    const totalCols = payItems.length + deductionItems.length;
    const totalRows = pagedRows.length;
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

  if (!ledger) {
    return (
      <div className="space-y-6">
        <PageHeader title="급여대장" showBackButton={true} />
        <div className="py-16 text-center text-gray-400">
          급여대장을 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-2 px-6">
        <PageHeader
          title={
            <div className="flex items-center gap-2">
              <span>{ledger.name}</span>
              {isConfirmed && (
                <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">급여확정</Badge>
              )}
            </div>
          }
          showBackButton={true}
          actions={
            isConfirmed ? (
              <Button variant="outline" onClick={handleUnconfirm}>
                <LockOpen className="h-4 w-4 mr-1" />
                급여확정 해제
              </Button>
            ) : (
              <Button variant="default" onClick={handleConfirm}>
                <Lock className="h-4 w-4 mr-1" />
                급여확정
              </Button>
            )
          }
        />

        {/* 요약 정보 + 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span><span className="text-gray-400 mr-1">귀속연월</span>{ledger.year}.{ledger.month.toString().padStart(2, '0')}</span>
            <span><span className="text-gray-400 mr-1">지급일</span>{ledger.payDate ? ledger.payDate.replace(/-/g, '.') : '-'}</span>
            <span><span className="text-gray-400 mr-1">대상자수</span>{rows.length}명</span>
            <span><span className="text-gray-400 mr-1">총 지급액</span>{formatAmount(totalPaySum)}원</span>
            <span><span className="text-gray-400 mr-1">총 공제액</span>{formatAmount(totalDeductionSum)}원</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={handleDeleteSelected} disabled={isConfirmed || selectedIds.size === 0}>
              선택 삭제
            </Button>
            <Button variant="outline" onClick={handleExcelDownload}>엑셀 다운로드</Button>
            <Button variant="outline" onClick={() => setShowPayItemsDialog(true)} disabled={isConfirmed}>
              <Settings2 className="h-4 w-4 mr-1" />
              급여항목 관리
            </Button>
            <Button variant="outline" onClick={() => setShowAddEmployee(true)} disabled={isConfirmed}>
              <UserPlus className="h-4 w-4 mr-1" />
              직원 추가
            </Button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-gray-50 border-b">
                <th
                  rowSpan={2}
                  className="w-[50px] min-w-[50px] px-3 py-2 bg-gray-50"
                >
                  <Checkbox
                    ref={selectAllRef}
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={isConfirmed}
                  />
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600 w-[100px] min-w-[100px]"
                >
                  사번
                </th>
                <th
                  rowSpan={2}
                  className="sticky left-[100px] z-20 bg-gray-50 border-r px-3 py-2 text-left font-medium text-gray-600 w-[100px] min-w-[100px] shadow-[2px_0_4px_rgba(0,0,0,0.06)]"
                >
                  성명
                </th>
                {(payItems.length > 0 || deprecatedPayItemsInRows.length > 0) && (
                  <th
                    colSpan={payItems.length + deprecatedPayItemsInRows.length + 1}
                    className="border-r px-3 py-2 text-center font-medium text-blue-600 bg-blue-50"
                  >
                    지급항목
                  </th>
                )}
                {deductionItems.length > 0 && (
                  <th
                    colSpan={deductionItems.length + 1}
                    className="border-r px-3 py-2 text-center font-medium text-red-600 bg-red-50"
                  >
                    공제항목
                  </th>
                )}
                <th
                  rowSpan={2}
                  className="px-3 py-2 text-right font-medium text-gray-600 bg-gray-50 w-[120px] min-w-[120px]"
                >
                  실수령액
                </th>
              </tr>
              <tr className="bg-white border-b">
                {payItems.map((item) => (
                  <th
                    key={item.id}
                    className="px-3 py-2 text-right font-medium text-gray-600 w-[120px] min-w-[120px] whitespace-nowrap"
                  >
                    {item.name}
                  </th>
                ))}
                {deprecatedPayItemsInRows.map((item) => (
                  <th
                    key={item.id}
                    className="px-3 py-2 text-right font-medium text-gray-400 w-[120px] min-w-[120px] whitespace-nowrap bg-red-50/40"
                  >
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-end gap-1 cursor-default">
                            <span>{item.name}</span>
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          사용중단된 항목입니다. 급여항목 관리에서 처리해주세요.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </th>
                ))}
                {(payItems.length > 0 || deprecatedPayItemsInRows.length > 0) && (
                  <th className="px-3 py-2 text-right font-medium text-blue-600 border-r w-[120px] min-w-[120px]">
                    합계
                  </th>
                )}
                {deductionItems.map((item) => (
                  <th
                    key={item.id}
                    className="px-3 py-2 text-right font-medium text-gray-600 w-[120px] min-w-[120px] whitespace-nowrap"
                  >
                    {item.name}
                  </th>
                ))}
                {deductionItems.length > 0 && (
                  <th className="px-3 py-2 text-right font-medium text-red-600 border-r w-[120px] min-w-[120px]">
                    합계
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, rowIdx) => {
                const payTotal = calcPayTotal(row, visiblePayIds);
                const deductionTotal = calcDeductionTotal(row);
                const netPay = payTotal - deductionTotal;
                return (
                  <tr key={row.id} className="border-b hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-center">
                      <Checkbox
                        checked={selectedIds.has(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                        disabled={isConfirmed}
                      />
                    </td>
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 text-gray-500 text-xs whitespace-nowrap">
                      {row.employeeNo}
                    </td>
                    <td className="sticky left-[100px] z-10 bg-white border-r px-3 py-2 font-medium whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                      {row.employeeName}
                    </td>
                    {payItems.map((item, colIdx) => {
                      const amount = row.payItems[item.id] ?? 0;
                      const over = isOverLimit(item, amount, nonTaxableItemMap);
                      const tooltip = over ? getLimitTooltip(item, nonTaxableItemMap) : null;
                      return (
                        <td key={item.id} className="px-2 py-1">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="relative">
                                  <input
                                    type="text"
                                    ref={(el) => {
                                      if (el) inputRefs.current.set(`${rowIdx}-${colIdx}`, el);
                                      else inputRefs.current.delete(`${rowIdx}-${colIdx}`);
                                    }}
                                    value={amount.toLocaleString('ko-KR')}
                                    readOnly={isConfirmed}
                                    onFocus={(e) => { if (!isConfirmed) e.target.select(); }}
                                    onChange={(e) => {
                                      if (isConfirmed) return;
                                      handlePayItemChange(row.id, item.id, e.target.value.replace(/[^0-9]/g, '') || '0');
                                    }}
                                    onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                                    className={`w-full text-right bg-transparent outline-none rounded py-1 text-sm min-w-[100px] ${isConfirmed ? 'cursor-default' : 'focus:bg-blue-50'} ${over ? 'pl-1 pr-4' : 'px-1'}`}
                                  />
                                  {over && (
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              {tooltip && (
                                <TooltipContent side="top">
                                  {tooltip}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })}
                    {deprecatedPayItemsInRows.map((item) => {
                      const amount = row.payItems[item.id] ?? 0;
                      return (
                        <td key={item.id} className="px-2 py-1 bg-red-50/20">
                          <input
                            type="text"
                            value={amount.toLocaleString('ko-KR')}
                            readOnly
                            className="w-full text-right bg-transparent outline-none rounded px-1 py-1 text-sm min-w-[100px] text-gray-400 cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                    {(payItems.length > 0 || deprecatedPayItemsInRows.length > 0) && (
                      <td className="px-3 py-2 text-right font-medium text-blue-700 border-r whitespace-nowrap">
                        {formatAmount(payTotal)}
                      </td>
                    )}
                    {deductionItems.map((item, dIdx) => {
                      const colIdx = payItems.length + dIdx;
                      return (
                        <td key={item.id} className="px-2 py-1">
                          <input
                            type="text"
                            ref={(el) => {
                              if (el) inputRefs.current.set(`${rowIdx}-${colIdx}`, el);
                              else inputRefs.current.delete(`${rowIdx}-${colIdx}`);
                            }}
                            value={(row.deductionItems[item.id] ?? 0).toLocaleString('ko-KR')}
                            readOnly={isConfirmed}
                            onFocus={(e) => { if (!isConfirmed) e.target.select(); }}
                            onChange={(e) => {
                              if (isConfirmed) return;
                              handleDeductionItemChange(row.id, item.id, e.target.value.replace(/[^0-9]/g, '') || '0');
                            }}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                            className={`w-full text-right bg-transparent outline-none rounded px-1 py-1 text-sm min-w-[100px] ${isConfirmed ? 'cursor-default' : 'focus:bg-red-50'}`}
                          />
                        </td>
                      );
                    })}
                    {deductionItems.length > 0 && (
                      <td className="px-3 py-2 text-right font-medium text-red-700 border-r whitespace-nowrap">
                        {formatAmount(deductionTotal)}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                      {formatAmount(netPay)}
                    </td>
                  </tr>
                );
              })}

              {/* 합계 행 */}
              {rows.length > 0 && (
                <tr className="bg-gray-50 font-semibold border-t-2">
                  <td className="px-3 py-2 bg-gray-50" />
                  <td
                    colSpan={2}
                    className="sticky left-0 z-10 bg-gray-50 border-r px-3 py-2 shadow-[2px_0_4px_rgba(0,0,0,0.06)]"
                  >
                    합계
                  </td>
                  {payItems.map((item) => {
                    const colSum = rows.reduce(
                      (s, r) => s + (r.payItems[item.id] ?? 0),
                      0
                    );
                    return (
                      <td key={item.id} className="px-3 py-2 text-right text-blue-700">
                        {formatAmount(colSum)}
                      </td>
                    );
                  })}
                  {deprecatedPayItemsInRows.map((item) => {
                    const colSum = rows.reduce((s, r) => s + (r.payItems[item.id] ?? 0), 0);
                    return (
                      <td key={item.id} className="px-3 py-2 text-right text-gray-400 bg-red-50/20">
                        {formatAmount(colSum)}
                      </td>
                    );
                  })}
                  {(payItems.length > 0 || deprecatedPayItemsInRows.length > 0) && (
                    <td className="px-3 py-2 text-right text-blue-700 border-r">
                      {formatAmount(totalPaySum)}
                    </td>
                  )}
                  {deductionItems.map((item) => {
                    const colSum = rows.reduce(
                      (s, r) => s + (r.deductionItems[item.id] ?? 0),
                      0
                    );
                    return (
                      <td key={item.id} className="px-3 py-2 text-right text-red-700">
                        {formatAmount(colSum)}
                      </td>
                    );
                  })}
                  {deductionItems.length > 0 && (
                    <td className="px-3 py-2 text-right text-red-700 border-r">
                      {formatAmount(totalDeductionSum)}
                    </td>
                  )}
                  <td className="px-3 py-2 text-right">{formatAmount(totalNetPay)}</td>
                </tr>
              )}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + payItems.length + deprecatedPayItemsInRows.length + ((payItems.length + deprecatedPayItemsInRows.length) > 0 ? 1 : 0) + deductionItems.length + (deductionItems.length > 0 ? 1 : 0) + 1}
                    className="text-center text-gray-400 py-12"
                  >
                    등록된 직원이 없습니다. 직원 추가 버튼을 눌러 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
      </div>

      {/* 페이지네이션 */}
      {rows.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t px-2 py-3 z-10 flex items-center justify-between !mt-0">
          <div className="flex-1 text-sm text-muted-foreground">
            {selectedIds.size > 0 ? `${rows.length}명 중 ${selectedIds.size}명 선택됨` : `총 ${rows.length}명`}
          </div>
          <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">페이지당 항목</p>
              <Select value={`${pageSize}`} onValueChange={handlePageSizeChange}>
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
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <span className="sr-only">첫 페이지</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <span className="sr-only">이전 페이지</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <span className="sr-only">다음 페이지</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <span className="sr-only">마지막 페이지</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddEmployeeToLedgerDialog
        open={showAddEmployee}
        onOpenChange={setShowAddEmployee}
        ledger={ledger}
        existingEmployeeIds={existingEmployeeIds}
        onAdded={(newRows) => {
          setRows((prev) => {
            const updated = [...prev, ...newRows];
            setPage(Math.ceil(updated.length / pageSize));
            return updated;
          });
        }}
      />

      <LedgerPayItemsDialog
        open={showPayItemsDialog}
        onOpenChange={setShowPayItemsDialog}
        ledger={ledger}
        payItems={allPayItemsIncludingDeprecated}
        deductionItems={allDeductionItems}
        onSaved={async (updatedLedger) => {
          const oldPayIds = new Set(ledger.activePayItemIds ?? allPayItems.map((i) => i.id));
          const newPayIds = new Set(updatedLedger.activePayItemIds ?? allPayItems.map((i) => i.id));
          const removedPayIds = [...oldPayIds].filter((id) => !newPayIds.has(id));
          const addedPayIds = [...newPayIds].filter((id) => !oldPayIds.has(id));

          const oldDeductionIds = new Set(ledger.activeDeductionItemIds ?? allDeductionItems.map((i) => i.id));
          const newDeductionIds = new Set(updatedLedger.activeDeductionItemIds ?? allDeductionItems.map((i) => i.id));
          const removedDeductionIds = [...oldDeductionIds].filter((id) => !newDeductionIds.has(id));

          // 새로 추가된 항목이 있으면 직원 급여정보에서 금액 가져오기
          let employeeMap: Map<string, import('@/modules/hr/types/employee').Employee> = new Map();
          if (addedPayIds.length > 0) {
            const result = await employeeService.getAll({ limit: 99999 });
            result.data.forEach((e) => employeeMap.set(e.id, e));
          }

          setRows((prev) =>
            prev.map((row) => {
              const newPayItems = { ...row.payItems };
              const newDeductionItems = { ...row.deductionItems };

              removedPayIds.forEach((id) => delete newPayItems[id]);
              removedDeductionIds.forEach((id) => delete newDeductionItems[id]);

              if (addedPayIds.length > 0) {
                const emp = employeeMap.get(row.employeeId);
                if (emp) {
                  for (const addedId of addedPayIds) {
                    const companyItem = allPayItems.find((pi) => pi.id === addedId);
                    if (!companyItem) continue;
                    const tpl = emp.payrollTemplate.find(
                      (t) => t.itemId === addedId || t.itemCode === companyItem.taxItemId
                    );
                    if (tpl) {
                      newPayItems[addedId] = tpl.amount;
                    }
                  }
                }
              }

              const updated = { ...row, payItems: newPayItems, deductionItems: newDeductionItems };
              payrollLedgerService.updateRow(updated);
              return updated;
            })
          );

          setLedger(updatedLedger);
        }}
      />
    </div>
  );
}
