import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
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
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  useOtherIncome,
  useUpdateOtherIncome,
  useDeleteOtherIncome,
} from '../hooks/useOtherIncome';
import {
  calculateOtherIncomeTaxes,
  formatCurrency,
} from '../types/other-income.types';
import { toast } from '@/shared/hooks/use-toast';

interface EditOtherIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherIncomeId: string | null;
  paymentYear: number;
  paymentMonth: number;
}

interface FormData {
  attributionYear: string;
  attributionMonth: string;
  name: string;
  iino: string;
  residentType: 'DOMESTIC' | 'FOREIGN';
  incomeType: 'ADVISORY' | 'OTHER_PERSONAL_SERVICE';
  paymentCount: string;
  paymentAmount: string;
  necessaryExpenses: string;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from(
  { length: currentYear - 2025 },
  (_, i) => 2026 + i
);
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

export function EditOtherIncomeDialog({
  open,
  onOpenChange,
  otherIncomeId,
  paymentYear,
  paymentMonth,
}: EditOtherIncomeDialogProps): JSX.Element {
  const { data: otherIncome, isLoading } = useOtherIncome(otherIncomeId || '');
  const updateMutation = useUpdateOtherIncome();
  const deleteMutation = useDeleteOtherIncome();
  const [showTooltip, setShowTooltip] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      attributionYear: '',
      attributionMonth: '',
      name: '',
      iino: '',
      residentType: 'DOMESTIC',
      incomeType: 'ADVISORY',
      paymentCount: '',
      paymentAmount: '',
      necessaryExpenses: '',
    },
  });

  const attributionYear = watch('attributionYear');
  const attributionMonth = watch('attributionMonth');
  const paymentAmountValue = watch('paymentAmount');
  const necessaryExpensesValue = watch('necessaryExpenses');

  // 기존 데이터 로드
  useEffect(() => {
    if (otherIncome && open) {
      reset({
        attributionYear: String(otherIncome.attributionYear),
        attributionMonth: String(otherIncome.attributionMonth),
        name: otherIncome.name,
        iino: otherIncome.iino,
        residentType: otherIncome.isForeign ? 'FOREIGN' : 'DOMESTIC',
        incomeType: otherIncome.incomeType,
        paymentCount: String(otherIncome.paymentCount),
        paymentAmount: String(otherIncome.paymentAmount),
        necessaryExpenses: String(otherIncome.necessaryExpenses),
      });
    }
  }, [otherIncome, open, reset]);

  // 실시간 자동 계산
  const paymentAmount = Number(paymentAmountValue.replace(/,/g, '')) || 0;
  const necessaryExpenses = Number(necessaryExpensesValue.replace(/,/g, '')) || 0;

  const calculatedValues = calculateOtherIncomeTaxes({
    paymentAmount,
    necessaryExpenses,
  });

  // 귀속연월 유효성 검증
  const validateAttributionDate = (): void => {
    if (attributionYear && attributionMonth) {
      const attrDate = new Date(
        Number(attributionYear),
        Number(attributionMonth) - 1
      );
      const payDate = new Date(paymentYear, paymentMonth - 1);

      if (attrDate > payDate) {
        setError('attributionYear', {
          type: 'manual',
          message: '귀속연월은 지급연월보다 이전 날짜여야합니다.',
        });
      } else {
        clearErrors('attributionYear');
      }
    }
  };

  useEffect(() => {
    validateAttributionDate();
  }, [attributionYear, attributionMonth]);

  // 필드 유효성 검증 (blur)
  const validateField = (
    field: keyof FormData,
    value: string
  ): string | undefined => {
    const trimmed = value.trim();

    // 필수값 검증
    if (!trimmed) {
      return '필수 입력 항목입니다.';
    }

    // 성명(상호) 허용 문자 검증
    if (field === 'name') {
      const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
      if (!allowedPattern.test(trimmed)) {
        return "한글, 영문, 숫자, 공백 및 특수문자(&, ', -, ., ·, (, ))만 입력 가능합니다.";
      }
      if (trimmed.length > 50) {
        return '최대 50자까지 입력 가능합니다.';
      }
    }

    // 주민(사업자)등록번호 자릿수 검증
    if (field === 'iino') {
      if (trimmed.length !== 10 && trimmed.length !== 13) {
        return '유효한 주민(사업자)등록번호가 아닙니다.';
      }
    }

    return undefined;
  };

  const handleFieldBlur = (field: keyof FormData, value: string): void => {
    const error = validateField(field, value);
    if (error) {
      setError(field, { type: 'manual', message: error });
    } else {
      clearErrors(field);
    }
  };

  // 천 단위 콤마 포맷팅
  const formatNumber = (value: string): string => {
    const number = value.replace(/,/g, '');
    if (!number) return '';
    return Number(number).toLocaleString('ko-KR');
  };

  const handleNumberInput = (
    field: 'paymentCount' | 'paymentAmount' | 'necessaryExpenses',
    value: string
  ): void => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (field === 'paymentCount' && cleaned.length > 10) return;
    if (
      (field === 'paymentAmount' || field === 'necessaryExpenses') &&
      cleaned.length > 12
    )
      return;

    if (field === 'paymentAmount' || field === 'necessaryExpenses') {
      setValue(field, cleaned ? formatNumber(cleaned) : '');
    } else {
      setValue(field, cleaned);
    }
  };

  const onSubmit = async (data: FormData): Promise<void> => {
    if (!otherIncomeId) return;

    // 최종 유효성 검사
    let hasError = false;

    Object.keys(data).forEach((key) => {
      const field = key as keyof FormData;
      const value = data[field];
      if (!value || value.trim() === '') {
        setError(field, { type: 'manual', message: '필수 입력 항목입니다.' });
        hasError = true;
      }
    });

    if (hasError) return;

    // 귀속연월 검증
    if (attributionYear && attributionMonth) {
      const attrDate = new Date(
        Number(attributionYear),
        Number(attributionMonth) - 1
      );
      const payDate = new Date(paymentYear, paymentMonth - 1);

      if (attrDate > payDate) {
        setError('attributionYear', {
          type: 'manual',
          message: '귀속연월은 지급연월보다 이전 날짜여야합니다.',
        });
        return;
      }
    }

    const paymentAmount = Number(data.paymentAmount.replace(/,/g, ''));
    const necessaryExpenses = Number(data.necessaryExpenses.replace(/,/g, ''));

    // 지급액이 0원인 경우
    if (paymentAmount === 0) {
      if (necessaryExpenses > 0) {
        setError('necessaryExpenses', {
          type: 'manual',
          message: '필요경비는 지급액보다 적어야 합니다.',
        });
        return;
      }
    } else {
      // 필요경비 검증
      if (necessaryExpenses < paymentAmount * 0.6) {
        setError('necessaryExpenses', {
          type: 'manual',
          message: '필요경비는 지급액의 60/100이상이어야 합니다.',
        });
        return;
      }

      if (necessaryExpenses > paymentAmount) {
        setError('necessaryExpenses', {
          type: 'manual',
          message: '필요경비는 지급액보다 적어야 합니다.',
        });
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({
        id: otherIncomeId,
        dto: {
          attributionYear: Number(data.attributionYear),
          attributionMonth: Number(data.attributionMonth),
          name: data.name.trim(),
          iino: data.iino,
          isForeign: data.residentType === 'FOREIGN',
          incomeType: data.incomeType,
          paymentCount: Number(data.paymentCount),
          paymentAmount,
          necessaryExpenses,
        },
      });

      const toastInstance = toast({
        title: '기타소득 수정을 완료했습니다.',
      });
      setTimeout(() => {
        toastInstance.dismiss();
      }, 1500);

      onOpenChange(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('이미 존재')) {
        alert(
          '지급연월, 귀속연월, 주민(사업자)등록번호, 소득구분이 동일한 기타소득이 존재합니다.'
        );
      } else {
        alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }
  };

  const handleDelete = (): void => {
    if (!otherIncomeId) return;

    const confirmed = window.confirm(
      '기타소득을 삭제하시겠습니까? 삭제한 정보는 복구할 수 없습니다.'
    );

    if (confirmed) {
      deleteMutation.mutate(otherIncomeId, {
        onSuccess: () => {
          const toastInstance = toast({
            title: '기타소득 삭제를 완료했습니다.',
          });
          setTimeout(() => {
            toastInstance.dismiss();
          }, 1500);
          onOpenChange(false);
        },
      });
    }
  };

  const handleClose = (): void => {
    if (isDirty) {
      const confirmed = window.confirm('기타소득 수정을 취소하시겠습니까?');
      if (confirmed) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-600">로딩 중...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!otherIncome) {
    return <></>;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>기타소득 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 귀속연도, 귀속월 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="attributionYear">
                귀속연도 <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="attributionYear"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value) clearErrors('attributionYear');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.attributionYear && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.attributionYear.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="attributionMonth">
                귀속월 <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="attributionMonth"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value) clearErrors('attributionMonth');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month} value={String(month)}>
                          {month}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.attributionMonth && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.attributionMonth.message}
                </p>
              )}
            </div>
          </div>

          {/* 성명(상호) */}
          <div>
            <Label htmlFor="name">
              성명(상호) <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="성명(상호)를 입력해주세요"
                  onChange={(e) => {
                    // 모든 입력 허용 (한글 조합 문제 방지)
                    field.onChange(e);
                  }}
                  onBlur={(e) => {
                    // blur 시 허용되지 않은 문자 제거
                    const value = e.target.value;
                    const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
                    if (!allowedPattern.test(value)) {
                      const filtered = value.replace(/[^가-힣a-zA-Z0-9\s&'\-.·()]/g, '');
                      setValue('name', filtered);
                    }
                    field.onBlur();
                    handleFieldBlur('name', value);
                  }}
                  maxLength={50}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* 주민(사업자)등록번호 */}
          <div>
            <Label htmlFor="iino">
              주민(사업자)등록번호 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="iino"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="숫자만 입력"
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, '');
                    if (value.length <= 13) {
                      field.onChange(value);
                    }
                  }}
                  onBlur={(e) => {
                    field.onBlur();
                    handleFieldBlur('iino', e.target.value);
                  }}
                  maxLength={13}
                />
              )}
            />
            {errors.iino && (
              <p className="text-sm text-red-500 mt-1">{errors.iino.message}</p>
            )}
          </div>

          {/* 내외국인 구분 */}
          <div>
            <Label>
              내외국인 구분 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="residentType"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex items-center gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="DOMESTIC" id="domestic" />
                    <Label htmlFor="domestic" className="cursor-pointer">
                      내국인
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FOREIGN" id="foreign" />
                    <Label htmlFor="foreign" className="cursor-pointer">
                      외국인
                    </Label>
                  </div>
                </RadioGroup>
              )}
            />
          </div>

          {/* 소득구분 */}
          <div>
            <Label>
              소득구분 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="incomeType"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-2 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ADVISORY" id="advisory" />
                    <Label htmlFor="advisory" className="cursor-pointer">
                      자문/고문
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 relative">
                    <RadioGroupItem
                      value="OTHER_PERSONAL_SERVICE"
                      id="other-service"
                    />
                    <Label htmlFor="other-service" className="cursor-pointer">
                      자문/고문 외 인적용역
                    </Label>
                    <button
                      type="button"
                      className="ml-1 text-blue-500 hover:text-blue-700"
                      onClick={() => setShowTooltip(!showTooltip)}
                    >
                      ℹ️
                    </button>
                    {showTooltip && (
                      <div className="absolute left-0 top-8 z-10 w-96 p-3 bg-white border border-gray-300 rounded shadow-lg text-sm">
                        <ul className="list-disc pl-4 space-y-1">
                          <li>
                            고용관계 없이 다수인에게 강연을 하고 강연료 등 대가를
                            받는 용역
                          </li>
                          <li>
                            라디오/텔리비전방송 등을 통하여 해설/계몽 또는 연기의
                            심사 등을 하고 보수 또는 이와 유사한 성질의 대가를
                            받는 용역
                          </li>
                          <li>
                            변호사/공인회계사/세무사 그 밖에 전문적 지식 또는
                            특별한 기능을 가진 자가 그 지식 또는 기능을 활용하여
                            보수 또는 그 밖의 대가를 받고 제공하는 용역
                          </li>
                          <li>
                            그 밖에 고용관계 없이 수당 또는 이와 유사한 성질의
                            대가를 받고 제공하는 용역
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              )}
            />
            {errors.incomeType && (
              <p className="text-sm text-red-500 mt-1">
                {errors.incomeType.message}
              </p>
            )}
          </div>

          {/* 지급건수 */}
          <div>
            <Label htmlFor="paymentCount">
              지급건수 <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="paymentCount"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="숫자만 입력"
                  onChange={(e) =>
                    handleNumberInput('paymentCount', e.target.value)
                  }
                  onBlur={(e) => {
                    field.onBlur();
                    if (!e.target.value) {
                      setError('paymentCount', {
                        type: 'manual',
                        message: '필수 입력 항목입니다.',
                      });
                    } else {
                      clearErrors('paymentCount');
                    }
                  }}
                />
              )}
            />
            {errors.paymentCount && (
              <p className="text-sm text-red-500 mt-1">
                {errors.paymentCount.message}
              </p>
            )}
          </div>

          {/* 지급액(A) */}
          <div>
            <Label htmlFor="paymentAmount">
              지급액(A) <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="paymentAmount"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="숫자만 입력 (원)"
                  onChange={(e) =>
                    handleNumberInput('paymentAmount', e.target.value)
                  }
                  onBlur={(e) => {
                    field.onBlur();
                    if (e.target.value === '') {
                      setError('paymentAmount', {
                        type: 'manual',
                        message: '필수 입력 항목입니다.',
                      });
                    } else {
                      clearErrors('paymentAmount');
                    }
                  }}
                />
              )}
            />
            {errors.paymentAmount && (
              <p className="text-sm text-red-500 mt-1">
                {errors.paymentAmount.message}
              </p>
            )}
          </div>

          {/* 필요경비(B) */}
          <div>
            <Label htmlFor="necessaryExpenses">
              필요경비(B) <span className="text-red-500">*</span>
            </Label>
            <Controller
              name="necessaryExpenses"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="숫자만 입력 (원)"
                  onChange={(e) =>
                    handleNumberInput('necessaryExpenses', e.target.value)
                  }
                  onBlur={(e) => {
                    field.onBlur();
                    if (e.target.value === '') {
                      setError('necessaryExpenses', {
                        type: 'manual',
                        message: '필수 입력 항목입니다.',
                      });
                    } else {
                      clearErrors('necessaryExpenses');
                    }
                  }}
                />
              )}
            />
            {errors.necessaryExpenses && (
              <p className="text-sm text-red-500 mt-1">
                {errors.necessaryExpenses.message}
              </p>
            )}
          </div>

          {/* 자동 계산 영역 */}
          <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded">
            <h3 className="font-semibold text-sm">자동 계산 결과</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">소득금액(A-B)</Label>
                <Input
                  value={formatCurrency(calculatedValues.incomeAmount)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">세율(%)</Label>
                <Input
                  value={`${calculatedValues.taxRate}%`}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">소득세</Label>
                <Input
                  value={formatCurrency(calculatedValues.incomeTax)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">지방소득세</Label>
                <Input
                  value={formatCurrency(calculatedValues.localIncomeTax)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-sm text-gray-600">실소득금액</Label>
                <Input
                  value={formatCurrency(calculatedValues.actualIncomeAmount)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="text-sm text-gray-600 space-y-1 bg-blue-50 p-3 rounded">
            <p>
              ※ 지급액과 필요경비 입력 시 소득금액이 자동 계산되며, 세율(20%)가
              자동 적용되어 소득세, 지방소득세, 실소득 금액이 제공됩니다.
            </p>
            <p>
              ※ 필요경비는 지급액의 60/100 이상이어야 하며, 지급액보다 클 수
              없습니다.
            </p>
            <p>
              ※ 소액부징수(소득세액이 1천원 미만)인 경우, 소득세가 면제됩니다.
            </p>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              삭제
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" variant="default">수정</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
