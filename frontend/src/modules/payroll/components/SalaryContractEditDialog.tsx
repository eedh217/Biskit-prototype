import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Trash2, Plus, ArrowDown, ArrowUp, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { employeeService } from '@/modules/hr/services/employeeService';
import { employeeHistoryService } from '@/modules/hr/services/employeeHistoryService';
import type { Employee, PayrollTemplateItem } from '@/modules/hr/types/employee';
import type { EmployeeHistoryChange } from '@/modules/hr/types/employeeHistory';
import { companyPayrollItemService } from '../services/companyPayrollItemService';
import { CompanyPayItemCombobox } from './CompanyPayItemCombobox';
import { toast } from '@/shared/hooks/use-toast';
import { formatNumberInput, parseFormattedNumber, formatNumber } from '@/shared/lib/utils';
import type { CompanyPayItem } from '../types/payroll';

interface SalaryContractEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess: () => void;
}

interface FormData {
  payrollTemplate: PayrollTemplateItem[];
}

function calcAnnual(template: PayrollTemplateItem[], companyItems: CompanyPayItem[]): number {
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

export function SalaryContractEditDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: SalaryContractEditDialogProps): JSX.Element {
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [allCompanyItems] = useState(() => companyPayrollItemService.getPayItems(currentYear));
  const [companyItems] = useState(() => allCompanyItems.filter((item) => !item.isDeprecated));
  const deprecatedItemIds = new Set(allCompanyItems.filter((i) => i.isDeprecated).map((i) => i.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [payrollErrors, setPayrollErrors] = useState<Array<{ itemId: boolean; amount: boolean }>>([]);

  const getInitialFormData = (): FormData => {
    const editableItems = (employee.payrollTemplate ?? []).filter((t) => !deprecatedItemIds.has(t.itemId));
    return {
      payrollTemplate: editableItems.length > 0
        ? [...editableItems]
        : [{ itemId: '', itemCode: '', itemName: '', amount: 0, category: 'taxable' as const, includeInAnnual: true }],
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setIsModified(false);
      setPayrollErrors([]);
    }
  }, [open, employee]);

  const inAnnual = formData.payrollTemplate.filter((t) => t.includeInAnnual);
  const notInAnnual = formData.payrollTemplate.filter((t) => !t.includeInAnnual);

  const updateTemplate = (newTemplate: PayrollTemplateItem[]): void => {
    setFormData((prev) => ({ ...prev, payrollTemplate: newTemplate }));
    setIsModified(true);
  };

  const handleMoveToNotAnnual = (itemId: string): void => {
    updateTemplate(
      formData.payrollTemplate.map((t) =>
        t.itemId === itemId ? { ...t, includeInAnnual: false } : t
      )
    );
  };

  const handleMoveToAnnual = (itemId: string): void => {
    updateTemplate(
      formData.payrollTemplate.map((t) =>
        t.itemId === itemId ? { ...t, includeInAnnual: true } : t
      )
    );
  };

  const handleAddItem = (includeInAnnual: boolean): void => {
    updateTemplate([
      ...formData.payrollTemplate,
      { itemId: '', itemCode: '', itemName: '', amount: 0, category: 'taxable' as const, includeInAnnual },
    ]);
  };

  const handleRemoveItem = (index: number): void => {
    updateTemplate(formData.payrollTemplate.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemId: string): void => {
    const ci = companyItems.find((pi) => pi.id === itemId);
    if (!ci) return;
    const current = formData.payrollTemplate[index];
    updateTemplate(
      formData.payrollTemplate.map((t, i) =>
        i === index
          ? {
              itemId: ci.id,
              itemCode: ci.taxItemId,
              itemName: ci.name,
              amount: current?.amount ?? 0,
              category: ci.taxItemCategory,
              includeInAnnual: current?.includeInAnnual ?? true,
              paymentMonths: [],
            }
          : t
      )
    );
  };

  const handleAmountChange = (index: number, value: string): void => {
    const formatted = formatNumberInput(value);
    setFormData((prev) => {
      const newTemplate = [...prev.payrollTemplate];
      const cur = newTemplate[index];
      if (cur) newTemplate[index] = { ...cur, amount: parseFormattedNumber(formatted) };
      return { ...prev, payrollTemplate: newTemplate };
    });
    setIsModified(true);
  };

  const handlePaymentMonthChange = (index: number, month: number, checked: boolean): void => {
    setFormData((prev) => {
      const newTemplate = [...prev.payrollTemplate];
      const item = newTemplate[index]!;
      const months = item.paymentMonths ?? [];
      newTemplate[index] = {
        ...item,
        paymentMonths: checked ? [...months, month].sort((a, b) => a - b) : months.filter((m) => m !== month),
      };
      return { ...prev, payrollTemplate: newTemplate };
    });
    setIsModified(true);
  };


  const handleClose = (): void => {
    if (isModified && !window.confirm('급여정보 수정을 취소하시겠습니까?')) return;
    onOpenChange(false);
  };

  const handleOpenChange = (o: boolean): void => {
    if (!o && isModified && !window.confirm('급여정보 수정을 취소하시겠습니까?')) return;
    onOpenChange(o);
  };

  const handleSubmit = async (): Promise<void> => {
    for (const item of formData.payrollTemplate) {
      if (!item.itemId) continue;
      const ci = companyItems.find((c) => c.id === item.itemId);
      if (ci?.paymentType === 'irregular' && (ci.paymentMonths?.length ?? 0) === 0 && (item.paymentMonths?.length ?? 0) === 0) {
        alert(`${item.itemName} 항목의 지급월을 선택해주세요.`);
        return;
      }
    }

    const newPayrollErrors = formData.payrollTemplate.map((item) => {
      const err = { itemId: false, amount: false };
      if (!item.itemId && item.amount === 0) return err;
      if (item.itemId && item.amount === 0) err.amount = true;
      if (!item.itemId && item.amount > 0) err.itemId = true;
      return err;
    });
    if (newPayrollErrors.some((e) => e.itemId || e.amount)) {
      setPayrollErrors(newPayrollErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const deprecatedItems = (employee.payrollTemplate ?? []).filter((t) => deprecatedItemIds.has(t.itemId));
      const editableValid = formData.payrollTemplate.filter((t) => t.itemId);
      const validTemplate = [...editableValid, ...deprecatedItems];
      setPayrollErrors([]);
      const newAnnual = calcAnnual([...editableValid, ...deprecatedItems], allCompanyItems) || null;

      const changes: EmployeeHistoryChange[] = [];
      const oldEditableStr = JSON.stringify((employee.payrollTemplate ?? []).filter((t) => !deprecatedItemIds.has(t.itemId)));
      const newEditableStr = JSON.stringify(editableValid);
      if (oldEditableStr !== newEditableStr) {
        const fmt = (t: PayrollTemplateItem[]): string =>
          t.filter((i) => i.itemId && !deprecatedItemIds.has(i.itemId)).map((i) => `${i.itemName} (${formatNumber(i.amount)}원)`).join(', ') || '-';
        changes.push({ fieldName: '급여항목', fieldKey: 'payrollTemplate', oldValue: employee.payrollTemplate, newValue: validTemplate, displayOldValue: fmt(employee.payrollTemplate ?? []), displayNewValue: fmt(validTemplate) });
      }
      if (newAnnual !== employee.annualSalary) changes.push({ fieldName: '연봉', fieldKey: 'annualSalary', oldValue: employee.annualSalary, newValue: newAnnual, displayOldValue: employee.annualSalary ? `${formatNumber(employee.annualSalary)}원` : '-', displayNewValue: newAnnual ? `${formatNumber(newAnnual)}원` : '-' });

      await employeeService.update(employee.id, {
        annualSalary: newAnnual,
        payrollTemplate: validTemplate,
      });

      if (changes.length > 0) {
        await employeeHistoryService.create({ employeeId: employee.id, category: 'salary', categoryName: '급여정보', changes, modifiedBy: '관리자' });
      }

      toast({ title: '급여정보 수정을 완료했습니다.' });
      setIsModified(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : '급여정보 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = (item: PayrollTemplateItem, globalIndex: number, isAnnual: boolean): JSX.Element => {
    const ci = companyItems.find((c) => c.id === item.itemId);
    const err = payrollErrors[globalIndex];
    return (
      <div key={globalIndex} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-start">
        <CompanyPayItemCombobox
          value={item.itemId}
          items={companyItems}
          onChange={(v) => {
            handleItemChange(globalIndex, v);
            if (err?.itemId) {
              const next = [...payrollErrors];
              next[globalIndex] = { ...next[globalIndex]!, itemId: false };
              setPayrollErrors(next);
            }
          }}
          error={err?.itemId}
        />
        <div className="space-y-1">
          <Input
            value={item.amount > 0 ? formatNumberInput(item.amount.toString()) : ''}
            onChange={(e) => {
              handleAmountChange(globalIndex, e.target.value);
              if (err?.amount) {
                const next = [...payrollErrors];
                next[globalIndex] = { ...next[globalIndex]!, amount: false };
                setPayrollErrors(next);
              }
            }}
            placeholder="금액 입력"
            className={err?.amount ? 'border-red-500' : ''}
          />
          {ci?.paymentType === 'irregular' && (
            (ci.paymentMonths?.length ?? 0) > 0 ? (
              <Button type="button" variant="outline" size="sm" className="h-8 w-full text-sm" disabled>
                {ci.paymentMonths!.sort((a, b) => a - b).join(', ')}월 (회사 설정)
              </Button>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 w-full text-sm">
                    {(item.paymentMonths ?? []).length === 0
                      ? '지급월 선택'
                      : (item.paymentMonths ?? []).sort((a, b) => a - b).join(', ') + '월'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1" align="start">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-pointer">
                      <Checkbox
                        checked={(item.paymentMonths ?? []).includes(m)}
                        onChange={(e) => handlePaymentMonthChange(globalIndex, m, e.target.checked)}
                      />
                      <span className="text-sm">{m}월</span>
                    </label>
                  ))}
                </PopoverContent>
              </Popover>
            )
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          title={isAnnual ? '연봉 미포함으로 이동' : '연봉 포함으로 이동'}
          onClick={() => isAnnual ? handleMoveToNotAnnual(item.itemId) : handleMoveToAnnual(item.itemId)}
          disabled={!item.itemId}
        >
          {isAnnual ? <ArrowDown className="h-4 w-4 text-gray-400" /> : <ArrowUp className="h-4 w-4 text-gray-400" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => handleRemoveItem(globalIndex)}
        >
          <Trash2 className="h-4 w-4 text-gray-400" />
        </Button>
      </div>
    );
  };

  const deprecatedTemplateItems = (employee.payrollTemplate ?? []).filter((t) => deprecatedItemIds.has(t.itemId));
  const annual = calcAnnual([...formData.payrollTemplate, ...deprecatedTemplateItems], allCompanyItems);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>급여정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 연봉 포함 섹션 */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-600">연봉 포함</span>
                <span className="text-sm text-slate-500">
                  {annual > 0 ? `${formatNumber(annual)}원` : '-'}
                </span>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAddItem(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                항목 추가
              </Button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {inAnnual.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">항목이 없습니다.</p>
              ) : (
                inAnnual.map((item) => {
                  const globalIndex = formData.payrollTemplate.indexOf(item);
                  return renderItem(item, globalIndex, true);
                })
              )}
            </div>
          </div>

          {/* 연봉 미포함 섹션 */}
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-500">연봉 미포함</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleAddItem(false)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                항목 추가
              </Button>
            </div>
            <div className="px-4 py-3 space-y-3">
              {notInAnnual.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">항목이 없습니다.</p>
              ) : (
                notInAnnual.map((item) => {
                  const globalIndex = formData.payrollTemplate.indexOf(item);
                  return renderItem(item, globalIndex, false);
                })
              )}
            </div>
          </div>

          {/* 사용중단된 항목 섹션 (읽기전용) */}
          {(() => {
            const deprecatedItems = (employee.payrollTemplate ?? []).filter((t) => deprecatedItemIds.has(t.itemId));
            if (deprecatedItems.length === 0) return null;
            return (
              <div className="rounded-lg border border-red-200 overflow-hidden">
                <div className="flex items-center justify-between gap-2 bg-red-50 px-4 py-2 border-b border-red-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-sm font-semibold text-red-600">사용중단된 항목</span>
                  </div>
                  <span className="text-xs text-red-500">[급여항목 관리] 메뉴에서 급여유형을 변경하거나 급여항목을 삭제해주세요.</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {deprecatedItems.map((item) => {
                    const ci = allCompanyItems.find((c) => c.id === item.itemId);
                    const isIrregular = ci?.paymentType === 'irregular';
                    const paymentMonths = isIrregular
                      ? ((ci?.paymentMonths?.length ?? 0) > 0 ? ci!.paymentMonths! : (item.paymentMonths ?? []))
                      : [];
                    return (
                      <div key={item.itemId} className="grid grid-cols-[1fr_1fr_auto_auto] gap-x-2 items-center bg-red-50/60 -mx-4 px-4 py-1.5 rounded">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-red-700">{item.itemName}</span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 cursor-default" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                사용중단된 항목입니다. 급여항목 관리에서 처리해주세요.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-red-700">{formatNumber(item.amount)}원</span>
                          {isIrregular && (
                            <span className="text-xs text-red-400">
                              {paymentMonths.length > 0
                                ? paymentMonths.slice().sort((a, b) => a - b).join(', ') + '월 지급'
                                : '지급월 미설정'}
                            </span>
                          )}
                        </div>
                        <span className="h-10 w-10" />
                        <span className="h-10 w-10" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>취소</Button>
          <Button variant="default" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '수정 중...' : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
