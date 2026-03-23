import { useState, useEffect } from 'react';
import { useCreateAllBusinessIncome, useIndustryCodes } from '../hooks/useBusinessIncome';
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
import {
  calculateTaxes,
  formatCurrency,
  validateCheckDigit,
  isExceptionIndustry,
} from '../types/business-income.types';
import { useToast } from '@/shared/hooks/use-toast';
import { FormRadioGroup } from '@/shared/components/common/FormRadioGroup';

interface AllBusinessIncomeAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllBusinessIncomeAddDialog({
  open,
  onOpenChange,
}: AllBusinessIncomeAddDialogProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const { data: industryCodes } = useIndustryCodes();
  const createMutation = useCreateAllBusinessIncome();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    paymentYear: 0,
    paymentMonth: 0,
    attributionYear: 0,
    attributionMonth: 0,
    name: '',
    iino: '',
    isForeign: false,
    industryCode: '',
    paymentSum: 0,
    taxRate: 3,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTaxRateSelection, setShowTaxRateSelection] = useState(false);
  const [hasInput, setHasInput] = useState(false);

  // 세율 선택 UI 표시 여부 판단
  useEffect(() => {
    const shouldShow = formData.isForeign && formData.industryCode === '940904';
    setShowTaxRateSelection(shouldShow);

    if (!shouldShow) {
      setFormData((prev) => ({ ...prev, taxRate: 3 }));
    }
  }, [formData.isForeign, formData.industryCode]);

  // 입력 여부 추적
  useEffect(() => {
    const hasAnyInput =
      formData.paymentYear !== 0 ||
      formData.paymentMonth !== 0 ||
      formData.attributionYear !== 0 ||
      formData.attributionMonth !== 0 ||
      formData.name !== '' ||
      formData.iino !== '' ||
      formData.industryCode !== '' ||
      formData.paymentSum !== 0;
    setHasInput(hasAnyInput);
  }, [formData]);

  // 모든 필수값이 입력되었는지 확인
  const isAllRequiredFieldsFilled =
    formData.paymentYear !== 0 &&
    formData.paymentMonth !== 0 &&
    formData.attributionYear !== 0 &&
    formData.attributionMonth !== 0 &&
    formData.name.trim() !== '' &&
    formData.iino !== '' &&
    formData.industryCode !== '' &&
    formData.paymentSum > 0;

  // 모든 필수값이 입력된 경우에만 자동 계산
  const taxes = isAllRequiredFieldsFilled
    ? calculateTaxes({
        paymentSum: formData.paymentSum,
        isForeign: formData.isForeign,
        industryCode: formData.industryCode,
        taxRate: formData.taxRate,
      })
    : {
        taxRate: 3,
        incomeTax: 0,
        localIncomeTax: 0,
        actualPayment: 0,
      };

  const validateField = (field: string, value: unknown): string | null => {
    if (field === 'paymentYear' && value === 0) {
      return '필수 입력 항목입니다.';
    }
    if (field === 'paymentMonth' && value === 0) {
      return '필수 입력 항목입니다.';
    }
    if (field === 'attributionYear' && value === 0) {
      return '필수 입력 항목입니다.';
    }
    if (field === 'attributionMonth' && value === 0) {
      return '필수 입력 항목입니다.';
    }
    if (field === 'name' && (value as string).trim() === '') {
      return '필수 입력 항목입니다.';
    }
    if (field === 'iino') {
      const iino = value as string;
      if (iino === '') {
        return '필수 입력 항목입니다.';
      }
      if (iino.length !== 10 && iino.length !== 13) {
        return '주민(사업자)등록번호는 10자리 또는 13자리만 입력 가능합니다.';
      }
      if (!validateCheckDigit(iino)) {
        return '유효하지 않은 주민(사업자)등록번호입니다.';
      }
      if (formData.industryCode === '851101' && iino.length > 10) {
        return '병의원인 경우, 사업자등록번호만 입력하실 수 있습니다.';
      }
    }
    if (field === 'industryCode') {
      if (value === '') {
        return '필수 입력 항목입니다.';
      }
      if (value === '851101' && formData.iino.length > 10) {
        return '병의원인 경우, 사업자등록번호만 입력하실 수 있습니다.';
      }
    }
    if (field === 'paymentSum') {
      if ((value as number) === 0) {
        return '지급액은 1원 이상 입력해야 합니다.';
      }
      if ((value as number).toString().replace(/,/g, '').length > 12) {
        return '지급액은 최대 12자리까지 입력 가능합니다.';
      }
    }
    if (
      field === 'attributionDate' &&
      formData.paymentYear !== 0 &&
      formData.paymentMonth !== 0 &&
      formData.attributionYear !== 0 &&
      formData.attributionMonth !== 0
    ) {
      const paymentDate = new Date(formData.paymentYear, formData.paymentMonth - 1);
      const attributionDate = new Date(formData.attributionYear, formData.attributionMonth - 1);
      if (attributionDate > paymentDate) {
        return '귀속연월은 지급연월보다 이전 날짜여야합니다.';
      }
    }
    return null;
  };

  const handleBlur = (field: string): void => {
    const value = formData[field as keyof typeof formData];
    const error = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: error ?? '' }));

    // 귀속연월 검증 (모든 날짜 필드가 입력되었을 때)
    if (['paymentYear', 'paymentMonth', 'attributionYear', 'attributionMonth'].includes(field)) {
      const dateError = validateField('attributionDate', null);
      setErrors((prev) => ({ ...prev, attributionDate: dateError ?? '' }));
    }
  };

  // onChange 시 해당 필드 에러 제거
  const clearFieldError = (field: string): void => {
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    // 전체 필드 검증
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(field, formData[field as keyof typeof formData]);
      if (error) newErrors[field] = error;
    });

    // 귀속연월 검증
    const dateError = validateField('attributionDate', null);
    if (dateError) newErrors.attributionDate = dateError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // 귀속 기준 예외 규칙 확인
    const isException =
      isExceptionIndustry(formData.industryCode) &&
      formData.attributionYear !== formData.paymentYear;

    if (isException) {
      const confirmed = window.confirm(
        `해당 데이터는 ${formData.attributionYear}년 12월 사업소득에 표시됩니다.`
      );
      if (!confirmed) {
        return;
      }
    }

    createMutation.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          paymentYear: 0,
          paymentMonth: 0,
          attributionYear: 0,
          attributionMonth: 0,
          name: '',
          iino: '',
          isForeign: false,
          industryCode: '',
          paymentSum: 0,
          taxRate: 3,
        });
        setErrors({});
        setHasInput(false);
        const toastInstance = toast({
          title: '사업소득 추가를 완료했습니다.',
        });
        setTimeout(() => {
          toastInstance.dismiss();
        }, 1500);
      },
      onError: (error) => {
        // 중복 검사 실패
        if (error.message.includes('동일한 사업소득이 존재')) {
          alert('지급연월, 귀속연월, 주민(사업자)등록번호, 업종코드가 동일한 사업소득이 존재합니다.');
        }
        // 서버 에러
        else if (error.message.includes('5') || error.message.includes('서버')) {
          alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
        // 기타 에러
        else {
          alert(error.message);
        }
      },
    });
  };

  const handleClose = (): void => {
    if (hasInput) {
      const confirmed = window.confirm('사업소득 추가를 취소하시겠습니까?');
      if (!confirmed) return;
    }
    onOpenChange(false);
    setFormData({
      paymentYear: 0,
      paymentMonth: 0,
      attributionYear: 0,
      attributionMonth: 0,
      name: '',
      iino: '',
      isForeign: false,
      industryCode: '',
      paymentSum: 0,
      taxRate: 3,
    });
    setErrors({});
    setHasInput(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>사업소득 추가</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">*지급연도</label>
                <Select
                  value={formData.paymentYear === 0 ? '' : formData.paymentYear.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, paymentYear: Number(value) });
                    clearFieldError('paymentYear');
                  }}
                >
                  <SelectTrigger onBlur={() => handleBlur('paymentYear')}>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: currentYear + 1 - 2025 + 1 },
                      (_, i) => 2025 + i
                    ).map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentYear && (
                  <p className="text-red-500 text-sm mt-1">{errors.paymentYear}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">*지급월</label>
                <Select
                  value={formData.paymentMonth === 0 ? '' : formData.paymentMonth.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, paymentMonth: Number(value) });
                    clearFieldError('paymentMonth');
                  }}
                >
                  <SelectTrigger onBlur={() => handleBlur('paymentMonth')}>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.paymentMonth && (
                  <p className="text-red-500 text-sm mt-1">{errors.paymentMonth}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">*귀속연도</label>
                <Select
                  value={formData.attributionYear === 0 ? '' : formData.attributionYear.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, attributionYear: Number(value) });
                    clearFieldError('attributionYear');
                    clearFieldError('attributionDate');
                  }}
                >
                  <SelectTrigger onBlur={() => handleBlur('attributionYear')}>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i).map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.attributionYear && (
                  <p className="text-red-500 text-sm mt-1">{errors.attributionYear}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">*귀속월</label>
                <Select
                  value={formData.attributionMonth === 0 ? '' : formData.attributionMonth.toString()}
                  onValueChange={(value) => {
                    setFormData({ ...formData, attributionMonth: Number(value) });
                    clearFieldError('attributionMonth');
                    clearFieldError('attributionDate');
                  }}
                >
                  <SelectTrigger onBlur={() => handleBlur('attributionMonth')}>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.attributionMonth && (
                  <p className="text-red-500 text-sm mt-1">{errors.attributionMonth}</p>
                )}
              </div>
            </div>

            {errors.attributionDate && (
              <p className="text-red-500 text-sm -mt-2">{errors.attributionDate}</p>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">*성명(상호)</label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  // 모든 입력 허용 (한글 조합 문제 방지)
                  setFormData({ ...formData, name: e.target.value });
                  clearFieldError('name');
                }}
                onBlur={(e) => {
                  // blur 시 허용되지 않은 문자 제거
                  const value = e.target.value;
                  const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
                  if (!allowedPattern.test(value)) {
                    const filtered = value.replace(/[^가-힣a-zA-Z0-9\s&'\-.·()]/g, '');
                    setFormData({ ...formData, name: filtered });
                  }
                  handleBlur('name');
                }}
                required
                maxLength={50}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <FormRadioGroup
              label="내외국인 구분"
              options={[
                { value: 'domestic', label: '내국인' },
                { value: 'foreign', label: '외국인' },
              ]}
              value={formData.isForeign ? 'foreign' : 'domestic'}
              onValueChange={(value) =>
                setFormData({ ...formData, isForeign: value === 'foreign' })
              }
              orientation="horizontal"
              required
            />

            <div>
              <label className="block text-sm font-medium mb-1">*주민(사업자)등록번호</label>
              <Input
                value={formData.iino}
                onChange={(e) => {
                  setFormData({ ...formData, iino: e.target.value.replace(/\D/g, '') });
                  clearFieldError('iino');
                }}
                onBlur={() => handleBlur('iino')}
                required
                maxLength={13}
              />
              {errors.iino && <p className="text-red-500 text-sm mt-1">{errors.iino}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*업종코드</label>
              <Select
                value={formData.industryCode}
                onValueChange={(value) => {
                  setFormData({ ...formData, industryCode: value });
                  clearFieldError('industryCode');
                }}
              >
                <SelectTrigger onBlur={() => handleBlur('industryCode')}>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {industryCodes?.map((code) => (
                    <SelectItem key={code.code} value={code.code}>
                      {code.name} ({code.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industryCode && (
                <p className="text-red-500 text-sm mt-1">{errors.industryCode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*지급액</label>
              <Input
                type="number"
                value={formData.paymentSum || ''}
                onChange={(e) => {
                  setFormData({ ...formData, paymentSum: Number(e.target.value) });
                  clearFieldError('paymentSum');
                }}
                onBlur={() => handleBlur('paymentSum')}
                required
                min={1}
                max={999999999999}
              />
              {errors.paymentSum && (
                <p className="text-red-500 text-sm mt-1">{errors.paymentSum}</p>
              )}
            </div>

            {/* 자동 계산 영역 */}
            <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-sm">자동 계산 결과</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">세율(%)</Label>
                  {showTaxRateSelection ? (
                    <FormRadioGroup
                      options={[
                        { value: '3', label: '3%' },
                        { value: '20', label: '20%' },
                      ]}
                      value={formData.taxRate.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, taxRate: Number(value) })
                      }
                      orientation="horizontal"
                    />
                  ) : (
                    <Input
                      value={`${taxes.taxRate}%`}
                      readOnly
                      className="bg-gray-100"
                    />
                  )}
                </div>

                <div>
                  <Label className="text-sm text-gray-600">소득세</Label>
                  <Input
                    value={formatCurrency(taxes.incomeTax)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">지방소득세</Label>
                  <Input
                    value={formatCurrency(taxes.localIncomeTax)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">실지급액</Label>
                  <Input
                    value={formatCurrency(taxes.actualPayment)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* 안내 문구 */}
            <div className="text-sm text-gray-600 space-y-1 bg-blue-50 p-3 rounded">
              <p>
                ※ 지급총액 입력 시 업종코드에 따라 세율이 자동 적용되어 소득세, 지방소득세가
                계산됩니다.
              </p>
              <p>※ 소액부징수(소득세액이 1천원 미만)인 경우, 소득세가 면제됩니다.</p>
              <p>
                ※ 직업운동가(940904) 중 프로스포츠 구단과의 계약기간이 3년 이하인 외국인 직업
                운동가일 경우, 세율 20%
              </p>
              <p>
                ※ 봉사료 수취자(940905) 중 「소득세법 시행령」제184조의2에 해당하는 봉사료
                수입금액의 경우, 세율 5%
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" variant="default">추가</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
