import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { useToast } from '@/shared/hooks/use-toast';
import { PayrollItemCombobox } from '../components/PayrollItemCombobox';
import {
  companyPayrollItemService,
  FIXED_DEDUCTION_ITEMS,
  getAvailableYears,
  getTaxItemsByYear,
} from '../services/companyPayrollItemService';
import { CompanyPayItem, CompanyDeductionItem } from '../types/payroll';
import { payrollLedgerService } from '../services/payrollLedgerService';
import { employeeService } from '@/modules/hr/services/employeeService';
import { employeeHistoryService } from '@/modules/hr/services/employeeHistoryService';
import type { PayrollTemplateItem } from '@/modules/hr/types/employee';

const AVAILABLE_YEARS = getAvailableYears();
const DEFAULT_YEAR = Math.max(2026, Math.min(new Date().getFullYear(), AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1] ?? 2026));

export function PayrollItems(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_YEAR);
  const [payItems, setPayItems] = useState<CompanyPayItem[]>(() =>
    companyPayrollItemService.getPayItems(DEFAULT_YEAR)
  );
  const [deductionItems, setDeductionItems] = useState<CompanyDeductionItem[]>(() =>
    companyPayrollItemService.getDeductionItems(DEFAULT_YEAR)
  );
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [pendingDeletePayItemId, setPendingDeletePayItemId] = useState<string | null>(null);
  const { toast } = useToast();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPayItemName, setNewPayItemName] = useState('');
  const [newPayItemTaxId, setNewPayItemTaxId] = useState('');
  const [newPaymentType, setNewPaymentType] = useState<'monthly' | 'irregular'>('monthly');
  const [newPaymentMonths, setNewPaymentMonths] = useState<number[]>([]);
  const [newDeductionName, setNewDeductionName] = useState('');

  // 수정 다이얼로그 state
  const [editingItem, setEditingItem] = useState<CompanyPayItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editTaxId, setEditTaxId] = useState('');
  const [editPaymentType, setEditPaymentType] = useState<'monthly' | 'irregular'>('monthly');
  const [editPaymentMonths, setEditPaymentMonths] = useState<number[]>([]);
  const [editReplacedByItemId, setEditReplacedByItemId] = useState('');

  // 마이그레이션 확인 다이얼로그
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const taxItems = getTaxItemsByYear(selectedYear);
  const allTaxItems = [...taxItems.taxableItems, ...taxItems.nonTaxableItems];
  const nonTaxableItemMap = Object.fromEntries(
    taxItems.nonTaxableItems.map((item) => [item.id, item])
  );

  const handleYearChange = (year: number): void => {
    setSelectedYear(year);
    setPayItems(companyPayrollItemService.getPayItems(year));
    setDeductionItems(companyPayrollItemService.getDeductionItems(year));
    setNewPayItemName('');
    setNewPayItemTaxId('');
    setNewDeductionName('');
  };

  const handleAddPayItem = (): void => {
    const trimmed = newPayItemName.trim();
    if (!trimmed || !newPayItemTaxId) return;

    const taxItem = allTaxItems.find((item) => item.id === newPayItemTaxId);
    if (!taxItem) return;

    const added = companyPayrollItemService.addPayItem(
      selectedYear,
      trimmed,
      taxItem.id,
      taxItem.name,
      taxItem.category,
      newPaymentType,
      newPaymentType === 'irregular' ? newPaymentMonths : undefined
    );
    setPayItems((prev) => [...prev, added]);
    setNewPayItemName('');
    setNewPayItemTaxId('');
    setNewPaymentType('monthly');
    setNewPaymentMonths([]);
    setShowAddDialog(false);
    toast({ description: '급여항목이 추가되었습니다.' });
  };

  const handleToggleNewPaymentMonth = (month: number, checked: boolean): void => {
    setNewPaymentMonths((prev) =>
      checked ? [...prev, month].sort((a, b) => a - b) : prev.filter((m) => m !== month)
    );
  };

  const handleDeletePayItem = async (id: string): Promise<void> => {
    const allLedgers = payrollLedgerService.getLedgersByYear(selectedYear);
    const confirmedLedgers = allLedgers.filter((l) => l.isConfirmed);
    for (const ledger of confirmedLedgers) {
      const rows = payrollLedgerService.getRowsByLedgerId(ledger.id);
      if (rows.some((row) => id in row.payItems)) {
        alert('확정된 급여대장에서 사용 중인 급여항목은 삭제할 수 없습니다.');
        return;
      }
    }
    const unconfirmedLedgers = allLedgers.filter((l) => !l.isConfirmed);
    const usedInUnconfirmed = unconfirmedLedgers.some((ledger) =>
      payrollLedgerService.getRowsByLedgerId(ledger.id).some((row) => id in row.payItems)
    );
    if (usedInUnconfirmed) {
      setPendingDeletePayItemId(id);
      return;
    }
    const result = await employeeService.getAll({ limit: 99999 });
    const usedInEmployee = result.data.some((emp) => emp.payrollTemplate.some((t) => t.itemId === id));
    if (usedInEmployee) {
      setPendingDeletePayItemId(id);
      return;
    }
    executeDeletePayItem(id);
  };

  const executeDeletePayItem = async (id: string): Promise<void> => {
    const unconfirmedLedgers = payrollLedgerService.getLedgersByYear(selectedYear).filter((l) => !l.isConfirmed);
    for (const ledger of unconfirmedLedgers) {
      const rows = payrollLedgerService.getRowsByLedgerId(ledger.id);
      for (const row of rows) {
        if (id in row.payItems) {
          const newPayItems = { ...row.payItems };
          delete newPayItems[id];
          payrollLedgerService.updateRow({ ...row, payItems: newPayItems });
        }
      }
    }
    const result = await employeeService.getAll({ limit: 99999 });
    for (const emp of result.data) {
      const deletedItem = emp.payrollTemplate.find((t) => t.itemId === id);
      if (!deletedItem) continue;
      const newTemplate = emp.payrollTemplate.filter((t) => t.itemId !== id);
      await employeeService.update(emp.id, { payrollTemplate: newTemplate });
      await employeeHistoryService.create({
        employeeId: emp.id,
        category: 'salary',
        categoryName: '급여정보',
        changes: [
          {
            fieldName: '급여항목 삭제',
            fieldKey: 'payrollTemplate',
            oldValue: deletedItem.itemName,
            newValue: null,
            displayOldValue: `${deletedItem.itemName} (${deletedItem.amount.toLocaleString()}원)`,
            displayNewValue: '-',
          },
        ],
        modifiedBy: '관리자',
      });
    }
    companyPayrollItemService.deletePayItem(selectedYear, id);
    setPayItems((prev) => prev.filter((item) => item.id !== id));
    setPendingDeletePayItemId(null);
    toast({ description: '급여항목을 삭제했습니다.' });
  };

  const handleAddDeductionItem = (): void => {
    if (!newDeductionName) return;
    const added = companyPayrollItemService.addDeductionItem(selectedYear, newDeductionName);
    setDeductionItems((prev) => [...prev, added]);
    setNewDeductionName('');
  };

  const handleDeleteDeductionItem = (id: string): void => {
    companyPayrollItemService.deleteDeductionItem(selectedYear, id);
    setDeductionItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditOpen = (item: CompanyPayItem): void => {
    setEditingItem(item);
    setEditName(item.name);
    setEditTaxId(item.taxItemId);
    setEditPaymentType(item.paymentType);
    setEditPaymentMonths(item.paymentMonths ?? []);
    setEditReplacedByItemId(item.replacedByItemId ?? '');
  };

  const handleEditSave = (): void => {
    if (!editingItem || !editName.trim()) return;
    // 사용중단 항목이고 교체할 급여항목이 설정된 경우 마이그레이션 확인
    if (editingItem.isDeprecated && editReplacedByItemId) {
      setShowMigrationConfirm(true);
      return;
    }
    // 일반 항목에서 교체항목이 새로 설정된 경우 마이그레이션 확인
    if (editReplacedByItemId && editReplacedByItemId !== (editingItem.replacedByItemId ?? '')) {
      setShowMigrationConfirm(true);
      return;
    }
    executeSave(false);
  };

  const executeSave = async (migrate: boolean): Promise<void> => {
    if (!editingItem) return;
    setIsMigrating(true);
    try {
      const isMigration = migrate && editReplacedByItemId;
      const replacementTaxItem = isMigration
        ? allTaxItems.find((t) => t.id === editReplacedByItemId) ?? null
        : null;

      const taxItem = allTaxItems.find((t) => t.id === editTaxId);
      const updated = companyPayrollItemService.updatePayItem(selectedYear, editingItem.id, {
        name: editName.trim(),
        taxItemId: replacementTaxItem?.id ?? taxItem?.id ?? editingItem.taxItemId,
        taxItemName: replacementTaxItem?.name ?? taxItem?.name ?? editingItem.taxItemName,
        taxItemCategory: replacementTaxItem?.category ?? taxItem?.category ?? editingItem.taxItemCategory,
        paymentType: editPaymentType,
        paymentMonths: editPaymentType === 'irregular' ? editPaymentMonths : undefined,
        isDeprecated: isMigration ? false : editingItem.isDeprecated,
        replacedByItemId: isMigration ? undefined : (editReplacedByItemId || undefined),
      });

      if (isMigration) {
        const result = await employeeService.getAll({ limit: 99999 });
        for (const emp of result.data) {
          const oldItem = emp.payrollTemplate.find((t) => t.itemId === editingItem.id);
          if (!oldItem) continue;

          const newTemplate: PayrollTemplateItem[] = emp.payrollTemplate.map((t) => {
            if (t.itemId !== editingItem.id) return t;
            return {
              ...t,
              itemCode: updated.taxItemId,
              itemName: updated.name,
              category: updated.taxItemCategory,
            };
          });

          await employeeService.update(emp.id, { payrollTemplate: newTemplate });
          await employeeHistoryService.create({
            employeeId: emp.id,
            category: 'salary',
            categoryName: '급여정보',
            changes: [
              {
                fieldName: '급여항목 교체',
                fieldKey: 'payrollTemplate',
                oldValue: editingItem.taxItemName,
                newValue: updated.taxItemName,
                displayOldValue: `${editingItem.name} (${editingItem.taxItemName})`,
                displayNewValue: `${updated.name} (${updated.taxItemName}) (급여항목 마이그레이션)`,
              },
            ],
            modifiedBy: '관리자',
          });
        }
      }

      setPayItems((prev) => prev.map((pi) => (pi.id === updated.id ? updated : pi)));
      setEditingItem(null);
      setShowMigrationConfirm(false);
      toast({ description: migrate ? '급여항목이 수정되고 직원 급여정보 및 급여대장에 반영되었습니다.' : '급여항목이 수정되었습니다.' });
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleToggleEditPaymentMonth = (month: number, checked: boolean): void => {
    setEditPaymentMonths((prev) =>
      checked ? [...prev, month].sort((a, b) => a - b) : prev.filter((m) => m !== month)
    );
  };

  const handleAddDeprecatedTest = (): void => {
    const alreadyExists = payItems.some((pi) => pi.taxItemId === 'non-taxable-2025-Q01');
    if (alreadyExists) {
      toast({ description: '이미 출산보육수당 항목이 있습니다.' });
      return;
    }
    const added = companyPayrollItemService.addPayItem(
      selectedYear,
      '출산보육수당',
      'non-taxable-2025-Q01',
      '출산보육수당',
      'non-taxable'
    );
    companyPayrollItemService.updatePayItem(selectedYear, added.id, { isDeprecated: true });
    setPayItems(companyPayrollItemService.getPayItems(selectedYear));
    toast({ description: '출산보육수당(사용중단) 항목이 추가되었습니다.' });
  };

  const handleCopyFromLastYear = (): void => {
    companyPayrollItemService.copyFromLastYear(selectedYear);
    setPayItems(companyPayrollItemService.getPayItems(selectedYear));
    setDeductionItems(companyPayrollItemService.getDeductionItems(selectedYear));
    setShowCopyConfirm(false);
    toast({ description: '작년 항목을 불러왔습니다.' });
  };

  const addedDeductionNames = new Set(deductionItems.map((item) => item.name));
  const remainingDeductionItems = FIXED_DEDUCTION_ITEMS.filter(
    (name) => !addedDeductionNames.has(name)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>급여항목 관리</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => handleYearChange(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[160px] text-base font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        showBackButton={false}
      />

      <Tabs defaultValue="pay" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pay">지급항목 ({payItems.length})</TabsTrigger>
            <TabsTrigger value="deduction">공제항목 ({deductionItems.length})</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAddDeprecatedTest}
            >
              사용중단항목 테스트
            </Button>

            <Button variant="default" onClick={() => {
              setNewPayItemName('');
              setNewPayItemTaxId('');
              setNewPaymentType('monthly');
              setNewPaymentMonths([]);
              setShowAddDialog(true);
            }}>
              급여항목 추가
            </Button>
          </div>
        </div>

        {/* 지급항목 탭 */}
        <TabsContent value="pay" className="space-y-4">
          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">번호</TableHead>
                    <TableHead>항목명</TableHead>
                    <TableHead className="w-[220px]">지급주기</TableHead>
                    <TableHead className="w-[260px]">급여유형</TableHead>
                    <TableHead className="w-[100px]">과세구분</TableHead>
                    <TableHead className="w-[200px]">한도금액</TableHead>
                    <TableHead className="w-[120px] text-center">지급명세서</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...payItems].sort((a, b) => {
                    if (a.taxItemCategory === b.taxItemCategory) return 0;
                    return a.taxItemCategory === 'taxable' ? -1 : 1;
                  }).map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer ${item.isDeprecated ? 'bg-gray-100 text-gray-400' : ''}`}
                      onClick={() => handleEditOpen(item)}
                    >
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.isDeprecated && (
                            <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">
                              사용 중단
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.paymentType === 'monthly' ? (
                          <span className={item.isDeprecated ? 'text-gray-400' : 'text-gray-600'}>매월지급</span>
                        ) : (item.paymentMonths?.length ?? 0) > 0 ? (
                          <span className={item.isDeprecated ? 'text-gray-400' : 'text-blue-600'}>
                            {item.paymentMonths!.map((m) => `${m}월`).join(', ')}
                          </span>
                        ) : (
                          <span className={item.isDeprecated ? 'text-gray-400' : 'text-blue-600'}>비정기 (직원별 설정)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.taxItemCategory === 'non-taxable' && (
                            <Badge variant="outline" className={`font-mono text-xs ${item.isDeprecated ? 'text-gray-400 border-gray-300' : ''}`}>
                              {item.taxItemId.split('-')[3]}
                            </Badge>
                          )}
                          {item.taxItemName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.taxItemCategory === 'taxable' ? 'default' : 'secondary'}
                          className={item.isDeprecated ? 'opacity-50' : ''}
                        >
                          {item.taxItemCategory === 'taxable' ? '과세' : '비과세'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const nt = nonTaxableItemMap[item.taxItemId];
                          if (!nt) return '-';
                          const parts = [nt.monthlyLimit, nt.yearlyLimit].filter(Boolean);
                          return parts.length > 0 ? parts.join(' / ') : '-';
                        })()}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.taxItemCategory === 'non-taxable'
                          ? nonTaxableItemMap[item.taxItemId]?.includeInStatement
                            ? 'O'
                            : 'X'
                          : '-'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePayItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        등록된 지급항목이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
        </TabsContent>

        {/* 공제항목 탭 */}
        <TabsContent value="deduction" className="space-y-4">
          <div className="flex items-center gap-3">
                <Select
                  value={newDeductionName}
                  onValueChange={setNewDeductionName}
                  disabled={remainingDeductionItems.length === 0}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="공제항목 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {remainingDeductionItems.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="default" onClick={handleAddDeductionItem} disabled={!newDeductionName}>
                  추가
                </Button>
          </div>

          <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">번호</TableHead>
                    <TableHead>항목명</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDeductionItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deductionItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                        등록된 공제항목이 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
        </TabsContent>
      </Tabs>

      {/* 급여항목 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          setNewPayItemName('');
          setNewPayItemTaxId('');
          setNewPaymentType('monthly');
          setNewPaymentMonths([]);
        }
        setShowAddDialog(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>급여항목 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>급여유형</Label>
              <PayrollItemCombobox value={newPayItemTaxId} onChange={setNewPayItemTaxId} year={selectedYear} />
              {nonTaxableItemMap[newPayItemTaxId] && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">한도금액</p>
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-default text-sm h-8"
                      value={(() => {
                        const nt = nonTaxableItemMap[newPayItemTaxId]!;
                        const parts = [nt.monthlyLimit, nt.yearlyLimit].filter(Boolean);
                        return parts.length > 0 ? parts.join(' / ') : '-';
                      })()}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">지급명세서 기재여부</p>
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-default text-sm h-8"
                      value={nonTaxableItemMap[newPayItemTaxId]!.includeInStatement ? 'O (기재)' : 'X (미기재)'}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>항목명</Label>
              <Input
                placeholder="항목명 입력"
                value={newPayItemName}
                onChange={(e) => setNewPayItemName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPayItem(); }}
              />
            </div>
            <div className="space-y-2">
              <Label>지급주기</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="newPaymentType"
                    checked={newPaymentType === 'monthly'}
                    onChange={() => { setNewPaymentType('monthly'); setNewPaymentMonths([]); }}
                    className="accent-primary"
                  />
                  매월지급
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="newPaymentType"
                    checked={newPaymentType === 'irregular'}
                    onChange={() => setNewPaymentType('irregular')}
                    className="accent-primary"
                  />
                  비정기지급
                </label>
              </div>
            </div>
            {newPaymentType === 'irregular' && (
              <div className="flex items-center gap-2 flex-wrap pl-1">
                <span className="text-sm text-gray-500">지급월 (미선택 시 직원별 설정):</span>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <label key={m} className="flex items-center gap-1 cursor-pointer">
                    <Checkbox
                      checked={newPaymentMonths.includes(m)}
                      onChange={(e) => handleToggleNewPaymentMonth(m, e.target.checked)}
                    />
                    <span className="text-sm">{m}월</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>취소</Button>
            <Button
              variant="default"
              onClick={handleAddPayItem}
              disabled={!newPayItemName.trim() || !newPayItemTaxId}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 급여항목 수정 다이얼로그 */}
      <Dialog open={editingItem !== null} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>급여항목 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>급여유형</Label>
              {editingItem?.isDeprecated ? (
                <Input
                  readOnly
                  className="bg-gray-50 cursor-default"
                  value={(() => {
                    const taxItem = allTaxItems.find((t) => t.id === editTaxId);
                    const name = taxItem?.name ?? editingItem.taxItemName ?? '';
                    const code = editingItem.taxItemCategory === 'non-taxable'
                      ? editingItem.taxItemId.split('-').slice(3).join('-')
                      : null;
                    return code ? `${code} - ${name}` : name;
                  })()}
                />
              ) : (
                <PayrollItemCombobox value={editTaxId} onChange={setEditTaxId} year={selectedYear} />
              )}
              {nonTaxableItemMap[editTaxId] && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">한도금액</p>
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-default text-sm h-8"
                      value={(() => {
                        const nt = nonTaxableItemMap[editTaxId]!;
                        const parts = [nt.monthlyLimit, nt.yearlyLimit].filter(Boolean);
                        return parts.length > 0 ? parts.join(' / ') : '-';
                      })()}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">지급명세서 기재여부</p>
                    <Input
                      readOnly
                      className="bg-gray-50 cursor-default text-sm h-8"
                      value={nonTaxableItemMap[editTaxId]!.includeInStatement ? 'O (기재)' : 'X (미기재)'}
                    />
                  </div>
                </div>
              )}
              {editingItem?.isDeprecated && (
                <div className="space-y-2 pt-1">
                  <Label className="text-sm text-gray-600">교체할 급여항목</Label>
                  <PayrollItemCombobox
                    value={editReplacedByItemId}
                    year={selectedYear}
                    onChange={setEditReplacedByItemId}
                  />
                  {editReplacedByItemId && (
                    <p className="text-xs text-orange-600">
                      저장 시 해당 항목을 사용 중인 모든 직원의 급여정보가 선택한 항목으로 교체됩니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>항목명</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="항목명 입력"
              />
            </div>

            <div className="space-y-2">
              <Label>지급주기</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="editPaymentType"
                    checked={editPaymentType === 'monthly'}
                    onChange={() => { setEditPaymentType('monthly'); setEditPaymentMonths([]); }}
                    className="accent-primary"
                  />
                  매월지급
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="editPaymentType"
                    checked={editPaymentType === 'irregular'}
                    onChange={() => setEditPaymentType('irregular')}
                    className="accent-primary"
                  />
                  비정기지급
                </label>
              </div>
            </div>

            {editPaymentType === 'irregular' && (
              <div className="flex items-center gap-2 pl-1">
                <span className="text-sm text-gray-500">지급월 (미선택 시 직원별 설정):</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-sm">
                      {editPaymentMonths.length === 0
                        ? '지급월 선택'
                        : editPaymentMonths.slice().sort((a, b) => a - b).join(', ') + '월'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1" align="start">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer">
                        <Checkbox
                          checked={editPaymentMonths.includes(m)}
                          onChange={(e) => handleToggleEditPaymentMonth(m, e.target.checked)}
                        />
                        <span className="text-sm">{m}월</span>
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>취소</Button>
            <Button
              variant="default"
              onClick={handleEditSave}
              disabled={!editName.trim()}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 마이그레이션 확인 다이얼로그 */}
      <Dialog open={showMigrationConfirm} onOpenChange={(open) => { if (!open) setShowMigrationConfirm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>급여항목 교체</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            해당 항목을 사용 중인 모든 직원의 급여정보에 반영하시겠습니까?
            <br /><br />
            <span className="text-orange-600">반영 시 직원별 급여정보 수정 이력에 기록됩니다.</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrationConfirm(false)} disabled={isMigrating}>취소</Button>
            <Button variant="default" onClick={() => executeSave(true)} disabled={isMigrating}>
              {isMigrating ? '처리 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 급여항목 삭제 확인 다이얼로그 */}
      <Dialog open={!!pendingDeletePayItemId} onOpenChange={(open) => { if (!open) setPendingDeletePayItemId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>급여항목 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            급여항목 삭제 시,
            <br />
            직원의 급여정보와 급여대장에 저장된 데이터가 모두 삭제됩니다.
            <br /><br />
            급여항목을 삭제하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeletePayItemId(null)}>취소</Button>
            <Button
              variant="default"
              onClick={() => { if (pendingDeletePayItemId) executeDeletePayItem(pendingDeletePayItemId); }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 작년 항목 불러오기 확인 다이얼로그 */}
      <Dialog open={showCopyConfirm} onOpenChange={setShowCopyConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>작년 항목 불러오기</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {selectedYear - 1}년 항목을 불러오면 {selectedYear}년의 기존 항목이 모두 삭제되고
            교체됩니다.
            <br />
            계속하시겠습니까?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyConfirm(false)}>
              취소
            </Button>
            <Button variant="default" onClick={handleCopyFromLastYear}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
