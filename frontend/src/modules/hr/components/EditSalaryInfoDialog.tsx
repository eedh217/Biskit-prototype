import { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import { employeeService } from '../services/employeeService';
import { employeeHistoryService } from '../services/employeeHistoryService';
import type { Employee, PayrollTemplateItem } from '../types/employee';
import type { EmployeeHistoryChange } from '../types/employeeHistory';
import { BANKS } from '@/shared/constants/banks';
import { PAYROLL_ITEMS_2026 } from '@/modules/payroll/constants/payrollItems2026';
import { PayrollItemCombobox } from '@/modules/payroll/components/PayrollItemCombobox';
import { toast } from '@/shared/hooks/use-toast';
import { formatNumberInput, parseFormattedNumber, formatNumber } from '@/shared/lib/utils';

interface EditSalaryInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess: () => void;
}

interface FormData {
  annualSalary: string; // 연봉 (입력용 문자열)
  payrollTemplate: PayrollTemplateItem[];
  bankName: string;
  accountHolder: string;
  accountNumber: string;
}

export function EditSalaryInfoDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditSalaryInfoDialogProps): JSX.Element {
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [payrollErrors, setPayrollErrors] = useState<Array<{ itemId: boolean; amount: boolean }>>([]);

  // 초기값 설정
  const getInitialFormData = (): FormData => {
    return {
      annualSalary: employee.annualSalary ? formatNumberInput(employee.annualSalary.toString()) : '',
      payrollTemplate: employee.payrollTemplate && employee.payrollTemplate.length > 0
        ? [...employee.payrollTemplate]
        : [
            {
              itemId: '',
              itemCode: '',
              itemName: '',
              amount: 0,
              category: 'taxable' as const,
            },
          ],
      bankName: employee.bankName || '',
      accountHolder: employee.accountHolder || '',
      accountNumber: employee.accountNumber || '',
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  // Dialog가 열릴 때마다 폼 데이터 초기화
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setIsModified(false);
      setPayrollErrors([]);
    }
  }, [open, employee]);

  const handleChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  // 급여항목 추가
  const handleAddPayrollItem = (): void => {
    setFormData((prev) => ({
      ...prev,
      payrollTemplate: [
        ...prev.payrollTemplate,
        {
          itemId: '',
          itemCode: '',
          itemName: '',
          amount: 0,
          category: 'taxable' as const,
        },
      ],
    }));
    setIsModified(true);
  };

  // 급여항목 삭제
  const handleRemovePayrollItem = (index: number): void => {
    setFormData((prev) => ({
      ...prev,
      payrollTemplate: prev.payrollTemplate.filter((_, i) => i !== index),
    }));
    setIsModified(true);
  };

  // 급여항목 선택 변경
  const handlePayrollItemChange = (index: number, itemId: string): void => {
    const allItems = [
      ...PAYROLL_ITEMS_2026.taxableItems,
      ...PAYROLL_ITEMS_2026.nonTaxableItems,
    ];
    const selectedItem = allItems.find((item) => item.id === itemId);

    if (selectedItem) {
      setFormData((prev) => {
        const newTemplate = [...prev.payrollTemplate];
        const currentAmount = newTemplate[index]?.amount ?? 0; // 기존 금액 유지
        newTemplate[index] = {
          itemId: selectedItem.id,
          itemCode: selectedItem.category === 'taxable'
            ? selectedItem.name
            : (selectedItem as { code: string }).code,
          itemName: selectedItem.name,
          amount: currentAmount,
          category: selectedItem.category,
        };
        return { ...prev, payrollTemplate: newTemplate };
      });
      setIsModified(true);
    }
  };

  // 급여항목 금액 변경
  const handlePayrollAmountChange = (index: number, value: string): void => {
    const formatted = formatNumberInput(value);
    setFormData((prev) => {
      const newTemplate = [...prev.payrollTemplate];
      const currentItem = newTemplate[index];
      if (currentItem) {
        newTemplate[index] = {
          ...currentItem,
          amount: parseFormattedNumber(formatted),
        };
      }
      return { ...prev, payrollTemplate: newTemplate };
    });
    setIsModified(true);
  };

  // 연봉 입력 핸들러
  const handleAnnualSalaryChange = (value: string): void => {
    const formatted = formatNumberInput(value);
    setFormData((prev) => {
      const numericValue = parseFormattedNumber(formatted);

      // "급여" 항목 찾기
      const salaryIndex = prev.payrollTemplate.findIndex(item => item.itemName === '급여');

      // 연봉이 입력되고 "급여" 항목이 있으면 자동 계산
      if (numericValue > 0 && salaryIndex !== -1) {
        const monthlySalary = Math.round(numericValue / 12);
        const newTemplate = [...prev.payrollTemplate];
        newTemplate[salaryIndex] = {
          ...newTemplate[salaryIndex]!,
          amount: monthlySalary,
        };
        setIsModified(true);
        return { ...prev, annualSalary: formatted, payrollTemplate: newTemplate };
      }

      setIsModified(true);
      return { ...prev, annualSalary: formatted };
    });
  };

  // 예금주 입력 핸들러 (특수문자 제거)
  const handleAccountHolderChange = (value: string): void => {
    // 조합 중이거나 빈 값이면 그대로 허용
    if (isComposing || value === '') {
      handleChange('accountHolder', value);
      return;
    }

    // 한글, 영문, 숫자, 공백만 허용 (특수문자 제거)
    const filtered = value
      .split('')
      .filter((char) => /^[가-힣a-zA-Z0-9\s]$/.test(char))
      .join('');

    handleChange('accountHolder', filtered);
  };

  // 계좌번호 입력 핸들러 (숫자와 - 만 허용)
  const handleAccountNumberChange = (value: string): void => {
    // 숫자와 하이픈만 허용
    const filtered = value.replace(/[^0-9-]/g, '');
    handleChange('accountNumber', filtered);
  };

  // Dialog 닫기 시도 시 confirm 체크
  const handleClose = (): void => {
    if (isModified) {
      const confirmed = window.confirm('급여정보 수정을 취소하시겠습니까?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  // Dialog의 onOpenChange override (ESC 키, 외부 영역 클릭 등)
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      if (isModified) {
        const confirmed = window.confirm('급여정보 수정을 취소하시겠습니까?');
        if (!confirmed) return;
      }
    }
    onOpenChange(open);
  };

  const handleSubmit = async (): Promise<void> => {
    // 급여항목 유효성 검증
    const newPayrollErrors = formData.payrollTemplate.map((item) => {
      const errors = { itemId: false, amount: false };

      // 둘 다 비어있으면 OK (빈 항목으로 무시됨)
      if (!item.itemId && item.amount === 0) {
        return errors;
      }

      // 급여항목만 선택하고 금액 미입력
      if (item.itemId && item.amount === 0) {
        errors.amount = true;
      }

      // 금액만 입력하고 급여항목 미선택
      if (!item.itemId && item.amount > 0) {
        errors.itemId = true;
      }

      return errors;
    });

    // 에러가 있으면 저장 중단
    if (newPayrollErrors.some(e => e.itemId || e.amount)) {
      setPayrollErrors(newPayrollErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // 변경 이력 추적
      const changes: EmployeeHistoryChange[] = [];

      const newBankName = formData.bankName || null;
      const newAccountHolder = formData.accountHolder || null;
      const newAccountNumber = formData.accountNumber || null;

      // 급여 템플릿 변경 (빈 항목 제외)
      const validPayrollTemplate = formData.payrollTemplate.filter(
        item => item.itemId && item.itemId !== ''
      );

      // 에러 상태 초기화
      setPayrollErrors([]);

      const oldTemplateStr = JSON.stringify(employee.payrollTemplate);
      const newTemplateStr = JSON.stringify(validPayrollTemplate);

      if (oldTemplateStr !== newTemplateStr) {
        const formatTemplateForDisplay = (template: PayrollTemplateItem[]): string => {
          if (!template || template.length === 0) return '-';
          return template
            .filter(item => item.itemId) // 선택된 항목만
            .map(item => `${item.itemName} (${formatNumber(item.amount)}원)`)
            .join(', ');
        };

        changes.push({
          fieldName: '급여항목',
          fieldKey: 'payrollTemplate',
          oldValue: employee.payrollTemplate,
          newValue: validPayrollTemplate,
          displayOldValue: formatTemplateForDisplay(employee.payrollTemplate),
          displayNewValue: formatTemplateForDisplay(validPayrollTemplate),
        });
      }

      // 은행
      if (newBankName !== employee.bankName) {
        changes.push({
          fieldName: '은행',
          fieldKey: 'bankName',
          oldValue: employee.bankName,
          newValue: newBankName,
          displayOldValue: employee.bankName || '-',
          displayNewValue: newBankName || '-',
        });
      }

      // 예금주
      if (newAccountHolder !== employee.accountHolder) {
        changes.push({
          fieldName: '예금주',
          fieldKey: 'accountHolder',
          oldValue: employee.accountHolder,
          newValue: newAccountHolder,
          displayOldValue: employee.accountHolder || '-',
          displayNewValue: newAccountHolder || '-',
        });
      }

      // 계좌번호
      if (newAccountNumber !== employee.accountNumber) {
        changes.push({
          fieldName: '계좌번호',
          fieldKey: 'accountNumber',
          oldValue: employee.accountNumber,
          newValue: newAccountNumber,
          displayOldValue: employee.accountNumber || '-',
          displayNewValue: newAccountNumber || '-',
        });
      }

      // 연봉
      const newAnnualSalary = parseFormattedNumber(formData.annualSalary) || null;
      if (newAnnualSalary !== employee.annualSalary) {
        changes.push({
          fieldName: '연봉',
          fieldKey: 'annualSalary',
          oldValue: employee.annualSalary,
          newValue: newAnnualSalary,
          displayOldValue: employee.annualSalary ? `${formatNumber(employee.annualSalary)}원` : '-',
          displayNewValue: newAnnualSalary ? `${formatNumber(newAnnualSalary)}원` : '-',
        });
      }

      // 직원 정보 업데이트
      await employeeService.update(employee.id, {
        annualSalary: parseFormattedNumber(formData.annualSalary) || null,
        payrollTemplate: validPayrollTemplate,
        bankName: newBankName,
        accountHolder: newAccountHolder,
        accountNumber: newAccountNumber,
      });

      // 이력 저장 (변경사항이 있을 때만)
      if (changes.length > 0) {
        await employeeHistoryService.create({
          employeeId: employee.id,
          category: 'salary',
          categoryName: '급여정보',
          changes,
          modifiedBy: '관리자',
        });
      }

      toast({
        title: '급여정보 수정을 완료했습니다.',
      });

      setIsModified(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('급여정보 수정에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>급여정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 연봉 */}
          <div className="space-y-2">
            <Label>연봉</Label>
            <Input
              type="text"
              value={formData.annualSalary}
              onChange={(e) => handleAnnualSalaryChange(e.target.value)}
              placeholder="연봉을 입력하세요"
            />
          </div>

          {/* 불일치 경고 */}
          {(() => {
            const annualSalaryNum = parseFormattedNumber(formData.annualSalary);
            const salaryItem = formData.payrollTemplate.find(item => item.itemName === '급여');
            const monthlySalary = salaryItem?.amount ?? 0;
            const isInconsistent = annualSalaryNum > 0 && monthlySalary > 0 && (monthlySalary * 12 !== annualSalaryNum);

            if (isInconsistent) {
              return (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    연봉({formatNumberInput(annualSalaryNum.toString())}원)과 월 급여({formatNumberInput(monthlySalary.toString())}원 × 12 = {formatNumberInput((monthlySalary * 12).toString())}원)가 일치하지 않습니다.
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {/* 급여항목 템플릿 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>급여항목</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPayrollItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                급여항목 추가
              </Button>
            </div>

            {formData.payrollTemplate.length === 0 && (
              <div className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-md">
                급여항목을 추가해주세요
              </div>
            )}

            {formData.payrollTemplate.map((item, index) => (
              <div key={index} className="grid grid-cols-2 gap-x-6">
                {/* 1열: 급여항목 선택 */}
                <PayrollItemCombobox
                  value={item.itemId}
                  onChange={(value) => {
                    handlePayrollItemChange(index, value);
                    // 에러 초기화
                    if (payrollErrors[index]?.itemId) {
                      const newErrors = [...payrollErrors];
                      newErrors[index] = { ...newErrors[index]!, itemId: false };
                      setPayrollErrors(newErrors);
                    }
                  }}
                  error={payrollErrors[index]?.itemId}
                />

                {/* 2열: 금액 입력 + 삭제 버튼 */}
                <div className="flex gap-2">
                  <Input
                    value={item.amount > 0 ? formatNumberInput(item.amount.toString()) : ''}
                    onChange={(e) => {
                      handlePayrollAmountChange(index, e.target.value);
                      // 에러 초기화
                      if (payrollErrors[index]?.amount) {
                        const newErrors = [...payrollErrors];
                        newErrors[index] = { ...newErrors[index]!, amount: false };
                        setPayrollErrors(newErrors);
                      }
                    }}
                    placeholder="금액 입력"
                    className={`flex-1 ${payrollErrors[index]?.amount ? 'border-red-500' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemovePayrollItem(index)}
                    className="h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 계좌정보 */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* 은행 */}
              <div className="space-y-2">
                <Label>은행</Label>
                <Select
                  value={formData.bankName}
                  onValueChange={(value) => handleChange('bankName', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="은행을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.name}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 예금주 */}
              <div className="space-y-2">
                <Label>예금주</Label>
                <Input
                  value={formData.accountHolder}
                  onChange={(e) => handleAccountHolderChange(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="예금주 이름을 입력하세요"
                />
              </div>

              {/* 계좌번호 */}
              <div className="col-span-2 space-y-2">
                <Label>계좌번호</Label>
                <Input
                  value={formData.accountNumber}
                  onChange={(e) => handleAccountNumberChange(e.target.value)}
                  placeholder="계좌번호를 입력하세요 (숫자와 - 만 입력 가능)"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button variant="default" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '수정 중...' : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
