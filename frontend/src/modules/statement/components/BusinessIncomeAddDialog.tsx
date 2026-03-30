import { useState, useEffect } from 'react';
import { useCreateBusinessIncome, useIndustryCodes } from '../hooks/useBusinessIncome';
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
  isExceptionIndustry,
  validateCheckDigit,
} from '../types/business-income.types';
import { useToast } from '@/shared/hooks/use-toast';
import { FormRadioGroup } from '@/shared/components/common/FormRadioGroup';

interface BusinessIncomeAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
}

interface FormErrors {
  attributionYear?: string;
  attributionMonth?: string;
  attributionYearMonth?: string;
  name?: string;
  iino?: string;
  industryCode?: string;
  paymentSum?: string;
  hospitalIndustry?: string;
}

interface FormData {
  attributionYear: number;
  attributionMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  industryCode: string;
  paymentSum: number;
  taxRate: number;
}

const INITIAL_FORM_DATA: FormData = {
  attributionYear: 0,
  attributionMonth: 0,
  name: '',
  iino: '',
  isForeign: false,
  industryCode: '',
  paymentSum: 0,
  taxRate: 3,
};

export function BusinessIncomeAddDialog({
  open,
  onOpenChange,
  year,
  month,
}: BusinessIncomeAddDialogProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const { data: industryCodes } = useIndustryCodes();
  const createMutation = useCreateBusinessIncome();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});
  const [paymentSumDisplay, setPaymentSumDisplay] = useState<string>(''); // 천 단위 콤마 표시용

  // 팝업이 열릴 때마다 초기화
  useEffect(() => {
    if (open) {
      setFormData(INITIAL_FORM_DATA);
      setErrors({});
      setPaymentSumDisplay('');
    }
  }, [open]);

  // 모든 필수값이 입력되었는지 확인
  const isAllRequiredFieldsFilled =
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

  // 세율 조건부 입력 여부 (외국인 + 직업운동가)
  const isTaxRateEditable = formData.isForeign && formData.industryCode === '940904';

  // 초기 상태 판정 (모든 입력값이 초기값과 동일한지)
  const isInitialState = (): boolean => {
    return (
      formData.attributionYear === INITIAL_FORM_DATA.attributionYear &&
      formData.attributionMonth === INITIAL_FORM_DATA.attributionMonth &&
      formData.name === INITIAL_FORM_DATA.name &&
      formData.iino === INITIAL_FORM_DATA.iino &&
      formData.isForeign === INITIAL_FORM_DATA.isForeign &&
      formData.industryCode === INITIAL_FORM_DATA.industryCode &&
      formData.paymentSum === INITIAL_FORM_DATA.paymentSum
    );
  };

  // 닫기 처리 (이탈 방지 로직 포함)
  const handleClose = (): void => {
    // 초기 상태이면 confirm 없이 바로 닫기
    if (isInitialState()) {
      onOpenChange(false);
      return;
    }

    // 입력된 상태이면 confirm 표시
    const confirmed = window.confirm('사업소득 추가를 취소하시겠습니까?');
    if (confirmed) {
      onOpenChange(false);
    }
  };

  // 허용 문자 검증 (성명)
  const validateNameCharacters = (value: string): boolean => {
    const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
    return allowedPattern.test(value);
  };

  // 천 단위 콤마 추가
  const addCommas = (value: string): string => {
    const number = value.replace(/,/g, '');
    if (!number) return '';
    return Number(number).toLocaleString('ko-KR');
  };


  // 지급액 입력 처리 (숫자만 허용, 천 단위 콤마)
  const handlePaymentSumChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/,/g, ''); // 콤마 제거

    // 숫자만 허용
    if (!/^\d*$/.test(value)) {
      return;
    }

    const numValue = value ? Number(value) : 0;

    setFormData({
      ...formData,
      paymentSum: numValue,
    });
    setPaymentSumDisplay(value ? addCommas(value) : '');
  };

  // 지급액 포커스 시 (콤마 제거)
  const handlePaymentSumFocus = (): void => {
    if (formData.paymentSum > 0) {
      setPaymentSumDisplay(formData.paymentSum.toString());
    }
  };

  // 지급액 blur 처리 (콤마 추가 + 검증)
  const handlePaymentSumBlur = (): void => {
    // 콤마 추가
    if (formData.paymentSum > 0) {
      setPaymentSumDisplay(addCommas(formData.paymentSum.toString()));
    }

    // 0원 검증
    if (formData.paymentSum === 0) {
      setErrors((prev) => ({ ...prev, paymentSum: '지급액은 1원 이상 입력해야 합니다.' }));
    } else {
      setErrors((prev) => ({ ...prev, paymentSum: undefined }));
    }
  };

  // 성명 blur 검증
  const handleNameBlur = (): void => {
    const trimmed = formData.name.trim();

    if (!trimmed) {
      setErrors((prev) => ({ ...prev, name: '필수 입력 항목입니다.' }));
    } else if (!validateNameCharacters(trimmed)) {
      setErrors((prev) => ({
        ...prev,
        name: '한글, 영문, 숫자, 공백 및 특수문자(&, \', -, ., ·, (, ))만 입력 가능합니다.',
      }));
    } else {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  // 주민등록번호 blur 검증
  const handleIinoBlur = (): void => {
    const iino = formData.iino;

    if (!iino) {
      setErrors((prev) => ({ ...prev, iino: '필수 입력 항목입니다.', hospitalIndustry: undefined }));
      return;
    }

    // 자릿수 검사
    if (iino.length !== 10 && iino.length !== 13) {
      setErrors((prev) => ({
        ...prev,
        iino: '주민(사업자)등록번호는 10자리 또는 13자리만 입력 가능합니다.',
        hospitalIndustry: undefined,
      }));
      return;
    }

    // 체크디짓 검사
    if (!validateCheckDigit(iino)) {
      setErrors((prev) => ({
        ...prev,
        iino: '유효하지 않은 주민(사업자)등록번호입니다.',
        hospitalIndustry: undefined,
      }));
      return;
    }

    // 병의원 업종 예외 검사
    if (formData.industryCode === '851101' && iino.length > 10) {
      setErrors((prev) => ({
        ...prev,
        hospitalIndustry: '병의원인 경우, 사업자등록번호만 입력하실 수 있습니다.',
        iino: undefined,
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, iino: undefined, hospitalIndustry: undefined }));
  };

  // 업종코드 blur 검증
  const handleIndustryCodeBlur = (): void => {
    if (!formData.industryCode) {
      setErrors((prev) => ({ ...prev, industryCode: '필수 입력 항목입니다.', hospitalIndustry: undefined }));
      return;
    }

    // 병의원 업종 예외 검사
    if (formData.industryCode === '851101' && formData.iino && formData.iino.length > 10) {
      setErrors((prev) => ({
        ...prev,
        hospitalIndustry: '병의원인 경우, 사업자등록번호만 입력하실 수 있습니다.',
        industryCode: undefined,
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, industryCode: undefined, hospitalIndustry: undefined }));
  };

  // 귀속연도 blur 검증
  const handleAttributionYearBlur = (): void => {
    if (!formData.attributionYear) {
      setErrors((prev) => ({ ...prev, attributionYear: '필수 입력 항목입니다.', attributionYearMonth: undefined }));
      return;
    }

    // 둘 다 선택된 경우에만 귀속연월 검증
    if (formData.attributionYear && formData.attributionMonth) {
      validateAttributionYearMonth();
    } else {
      setErrors((prev) => ({ ...prev, attributionYear: undefined, attributionYearMonth: undefined }));
    }
  };

  // 귀속월 blur 검증
  const handleAttributionMonthBlur = (): void => {
    if (!formData.attributionMonth) {
      setErrors((prev) => ({ ...prev, attributionMonth: '필수 입력 항목입니다.', attributionYearMonth: undefined }));
      return;
    }

    // 둘 다 선택된 경우에만 귀속연월 검증
    if (formData.attributionYear && formData.attributionMonth) {
      validateAttributionYearMonth();
    } else {
      setErrors((prev) => ({ ...prev, attributionMonth: undefined, attributionYearMonth: undefined }));
    }
  };

  // 귀속연월 유효성 검사
  const validateAttributionYearMonth = (): void => {
    if (!formData.attributionYear || !formData.attributionMonth) {
      return;
    }

    const attributionDate = new Date(formData.attributionYear, formData.attributionMonth - 1);
    const paymentDate = new Date(year, month - 1);

    if (attributionDate > paymentDate) {
      setErrors((prev) => ({
        ...prev,
        attributionYearMonth: '귀속연월은 지급연월보다 이전 날짜여야합니다.',
        attributionYear: undefined,
        attributionMonth: undefined,
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        attributionYearMonth: undefined,
        attributionYear: undefined,
        attributionMonth: undefined,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    // 모든 에러 체크
    if (Object.values(errors).some((error) => error !== undefined)) {
      return;
    }

    // 필수값 검증
    if (
      !formData.attributionYear ||
      !formData.attributionMonth ||
      !formData.name.trim() ||
      !formData.iino ||
      !formData.industryCode ||
      formData.paymentSum === 0
    ) {
      return;
    }

    // 귀속 기준 예외 규칙 확인
    const isException =
      isExceptionIndustry(formData.industryCode) &&
      formData.attributionYear !== year;

    if (isException) {
      const confirmed = window.confirm(
        `해당 데이터는 ${formData.attributionYear}년 12월 사업소득에 표시됩니다.`
      );
      if (!confirmed) {
        return;
      }
    }

    createMutation.mutate(
      {
        dto: {
          ...formData,
          name: formData.name.trim(), // trim 적용
        },
        year,
        month,
      },
      {
        onSuccess: () => {
          // 토스트 1.5초 노출
          const toastInstance = toast({
            title: '사업소득 추가를 완료했습니다.',
          });
          setTimeout(() => {
            toastInstance.dismiss();
          }, 1500);

          onOpenChange(false);

          // 폼 초기화는 useEffect에서 처리됨
        },
        onError: (error) => {
          // 에러 타입별 처리
          const errorMessage = error.message || '';

          // 1. 중복 검사 실패: 정확한 에러 메시지 표시
          if (errorMessage.includes('동일한 사업소득이 존재합니다')) {
            alert(errorMessage);
            return;
          }

          // 2. 특정 필드 관련 비즈니스 로직 실패: 필드 하단 에러 표시
          if (errorMessage.includes('주민(사업자)등록번호')) {
            setErrors((prev) => ({ ...prev, iino: errorMessage }));
            return;
          }

          if (errorMessage.includes('업종코드')) {
            setErrors((prev) => ({ ...prev, industryCode: errorMessage }));
            return;
          }

          if (errorMessage.includes('지급액')) {
            setErrors((prev) => ({ ...prev, paymentSum: errorMessage }));
            return;
          }

          // 3. 그 외 서버 에러 또는 알 수 없는 에러: 공통 에러 메시지
          alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleClose}
    >
      <DialogContent
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>사업소득 추가</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  *귀속연도
                </label>
                <Select
                  value={formData.attributionYear === 0 ? '' : formData.attributionYear.toString()}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      attributionYear: Number(value),
                    });
                    setErrors((prev) => ({ ...prev, attributionYear: undefined }));
                  }}
                >
                  <SelectTrigger onBlur={handleAttributionYearBlur}>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: currentYear - 2026 + 1 }, (_, i) => 2026 + i).map(
                      (yr) => (
                        <SelectItem key={yr} value={yr.toString()}>
                          {yr}년
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                {errors.attributionYear && (
                  <p className="text-sm text-red-600 mt-1">{errors.attributionYear}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">*귀속월</label>
                <Select
                  value={formData.attributionMonth === 0 ? '' : formData.attributionMonth.toString()}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      attributionMonth: Number(value),
                    });
                    setErrors((prev) => ({ ...prev, attributionMonth: undefined }));
                  }}
                >
                  <SelectTrigger onBlur={handleAttributionMonthBlur}>
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
                  <p className="text-sm text-red-600 mt-1">{errors.attributionMonth}</p>
                )}
              </div>
            </div>
            {errors.attributionYearMonth && (
              <p className="text-sm text-red-600 -mt-2">{errors.attributionYearMonth}</p>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">*성명(상호)</label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  // 모든 입력 허용 (한글 조합 문제 방지)
                  setFormData({ ...formData, name: e.target.value });
                  // 입력 시 에러 제거
                  if (errors.name) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.name;
                      return newErrors;
                    });
                  }
                }}
                onBlur={(e) => {
                  // blur 시 허용되지 않은 문자 제거
                  const value = e.target.value;
                  if (!validateNameCharacters(value)) {
                    const filtered = value.replace(/[^가-힣a-zA-Z0-9\s&'\-.·()]/g, '');
                    setFormData({ ...formData, name: filtered });
                  }
                  handleNameBlur();
                }}
                required
                maxLength={50}
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            <FormRadioGroup
              label="내외국인 구분"
              options={[
                { value: 'domestic', label: '내국인' },
                { value: 'foreign', label: '외국인' },
              ]}
              value={formData.isForeign ? 'foreign' : 'domestic'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  isForeign: value === 'foreign',
                  taxRate: value === 'foreign' ? formData.taxRate : 3,
                })
              }
              orientation="horizontal"
              required
            />

            <div>
              <label className="block text-sm font-medium mb-1">
                *주민(사업자)등록번호
              </label>
              <Input
                value={formData.iino}
                onChange={(e) =>
                  setFormData({ ...formData, iino: e.target.value.replace(/\D/g, '') })
                }
                onBlur={handleIinoBlur}
                required
                maxLength={13}
              />
              {errors.iino && (
                <p className="text-sm text-red-600 mt-1">{errors.iino}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*업종코드</label>
              <Select
                value={formData.industryCode}
                onValueChange={(value) => {
                  setFormData({ ...formData, industryCode: value });
                  setErrors((prev) => ({ ...prev, industryCode: undefined, hospitalIndustry: undefined }));
                }}
              >
                <SelectTrigger onBlur={handleIndustryCodeBlur}>
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
                <p className="text-sm text-red-600 mt-1">{errors.industryCode}</p>
              )}
              {errors.hospitalIndustry && (
                <p className="text-sm text-red-600 mt-1">{errors.hospitalIndustry}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*지급액</label>
              <Input
                type="text"
                value={paymentSumDisplay}
                onChange={handlePaymentSumChange}
                onFocus={handlePaymentSumFocus}
                onBlur={handlePaymentSumBlur}
                placeholder="0"
                required
              />
              {errors.paymentSum && (
                <p className="text-sm text-red-600 mt-1">{errors.paymentSum}</p>
              )}
            </div>

            {/* 자동 계산 영역 */}
            <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-sm">자동 계산 결과</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">세율(%)</Label>
                  {isTaxRateEditable ? (
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
              <p>※ 지급총액 입력 시 업종코드에 따라 세율이 자동 적용되어 소득세, 지방소득세가 계산됩니다.</p>
              <p>※ 소액부징수(소득세액이 1천원 미만)인 경우, 소득세가 면제됩니다.</p>
              <p>※ 직업운동가(940904) 중 프로스포츠 구단과의 계약기간이 3년 이하인 외국인 직업 운동가일 경우, 세율 20%</p>
              <p>※ 봉사료 수취자(940905) 중 「소득세법 시행령」제184조의2에 해당하는 봉사료 수입금액의 경우, 세율 5%</p>
            </div>
          </div>

          <DialogFooter className="mt-6">
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
