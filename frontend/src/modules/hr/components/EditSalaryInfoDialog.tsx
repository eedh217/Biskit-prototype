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
import { employeeService } from '../services/employeeService';
import { employeeHistoryService } from '../services/employeeHistoryService';
import type { Employee } from '../types/employee';
import type { EmployeeHistoryChange } from '../types/employeeHistory';
import { BANKS } from '@/shared/constants/banks';
import { toast } from '@/shared/hooks/use-toast';
import { formatNumberInput, parseFormattedNumber, formatNumber } from '@/shared/lib/utils';

interface EditSalaryInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess: () => void;
}

interface FormData {
  salaryType: '연봉' | '시급' | '';
  salaryAmount: string;
  mealAllowance: string;
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

  // 초기값 설정
  const getInitialFormData = (): FormData => {
    return {
      salaryType: (employee.salaryType as '연봉' | '시급') || '',
      salaryAmount: employee.salaryAmount ? employee.salaryAmount.toLocaleString() : '',
      mealAllowance: employee.mealAllowance ? employee.mealAllowance.toLocaleString() : '',
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
    }
  }, [open, employee]);

  const handleChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  // 급여 금액 입력 핸들러 (양수만, 천 단위 콤마)
  const handleSalaryAmountChange = (value: string): void => {
    const formatted = formatNumberInput(value);
    handleChange('salaryAmount', formatted);
  };

  // 식대 입력 핸들러 (양수만, 천 단위 콤마)
  const handleMealAllowanceChange = (value: string): void => {
    const formatted = formatNumberInput(value);
    handleChange('mealAllowance', formatted);
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
    setIsSubmitting(true);

    try {
      // 변경 이력 추적
      const changes: EmployeeHistoryChange[] = [];

      const newSalaryType = formData.salaryType || null;
      const newSalaryAmount = formData.salaryAmount
        ? parseFormattedNumber(formData.salaryAmount)
        : null;
      const newMealAllowance = formData.mealAllowance
        ? parseFormattedNumber(formData.mealAllowance)
        : null;
      const newBankName = formData.bankName || null;
      const newAccountHolder = formData.accountHolder || null;
      const newAccountNumber = formData.accountNumber || null;

      // 계약급여 타입
      if (newSalaryType !== employee.salaryType) {
        changes.push({
          fieldName: '계약급여 타입',
          fieldKey: 'salaryType',
          oldValue: employee.salaryType,
          newValue: newSalaryType,
          displayOldValue: employee.salaryType || '-',
          displayNewValue: newSalaryType || '-',
        });
      }

      // 계약급여 금액
      if (newSalaryAmount !== employee.salaryAmount) {
        changes.push({
          fieldName: '계약급여 금액',
          fieldKey: 'salaryAmount',
          oldValue: employee.salaryAmount,
          newValue: newSalaryAmount,
          displayOldValue: employee.salaryAmount ? `${formatNumber(employee.salaryAmount)}원` : '-',
          displayNewValue: newSalaryAmount ? `${formatNumber(newSalaryAmount)}원` : '-',
        });
      }

      // 식대
      if (newMealAllowance !== employee.mealAllowance) {
        const getMealLabel = (amount: number | null, type: string | null): string => {
          if (!amount) return '-';
          if (type === '연봉') return `${formatNumber(amount)}원 (월)`;
          if (type === '시급') return `${formatNumber(amount)}원 (일)`;
          return `${formatNumber(amount)}원`;
        };
        changes.push({
          fieldName: '식대',
          fieldKey: 'mealAllowance',
          oldValue: employee.mealAllowance,
          newValue: newMealAllowance,
          displayOldValue: getMealLabel(employee.mealAllowance, employee.salaryType),
          displayNewValue: getMealLabel(newMealAllowance, newSalaryType),
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

      // 직원 정보 업데이트
      await employeeService.update(employee.id, {
        salaryType: newSalaryType,
        salaryAmount: newSalaryAmount,
        mealAllowance: newMealAllowance,
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
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* 계약급여 */}
            <div className="space-y-2">
              <Label>계약급여</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.salaryType}
                  onValueChange={(value: '연봉' | '시급') => {
                    handleChange('salaryType', value);
                    // 급여 타입 변경 시 식대 초기화
                    handleChange('mealAllowance', '');
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="연봉">연봉</SelectItem>
                    <SelectItem value="시급">시급</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={formData.salaryAmount}
                  onChange={(e) => handleSalaryAmountChange(e.target.value)}
                  placeholder="금액 입력"
                  className="flex-1"
                />
              </div>
            </div>

            {/* 식대 */}
            <div className="space-y-2">
              <Label>
                {formData.salaryType === '연봉'
                  ? '식대 (월)'
                  : formData.salaryType === '시급'
                  ? '식대 (일)'
                  : '식대'}
              </Label>
              <Input
                value={formData.mealAllowance}
                onChange={(e) => handleMealAllowanceChange(e.target.value)}
                placeholder="금액 입력"
                disabled={!formData.salaryType}
              />
            </div>

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
