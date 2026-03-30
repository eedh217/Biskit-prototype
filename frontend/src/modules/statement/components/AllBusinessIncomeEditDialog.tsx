import { useState, useEffect } from 'react';
import {
  useUpdateAllBusinessIncome,
  useDeleteBusinessIncome,
  useIndustryCodes,
} from '../hooks/useBusinessIncome';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
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
import type { BusinessIncome } from '../types/business-income.types';
import { useToast } from '@/shared/hooks/use-toast';
import { FormRadioGroup } from '@/shared/components/common/FormRadioGroup';

// 헬퍼 함수: 천 단위 콤마 추가
function addCommas(value: number | string): string {
  const num = typeof value === 'string' ? value.replace(/,/g, '') : String(value);
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


// 헬퍼 함수: 성명 허용 문자 검증
function validateNameCharacters(value: string): boolean {
  // 허용 문자: 한글·영문·숫자·공백·허용 특수문자(&, ', -, ., ·, (, ))
  const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
  return allowedPattern.test(value);
}

// 에러 타입 판별 및 처리 헬퍼 함수
function handleErrorByType(
  error: unknown,
  setTabErrors?: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
  tabIndex?: number
): void {
  const err = error as Error & { status?: number; response?: { message?: string } };

  // 5xx 서버 에러
  if (err.status && err.status >= 500 && err.status < 600) {
    alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    return;
  }

  // 4xx 클라이언트 에러 - 필드별 에러로 표시
  if (err.status && err.status >= 400 && err.status < 500) {
    const errorMessage = err.response?.message || err.message || '입력 값을 확인해 주세요.';

    // 필드별 에러로 설정 (setTabErrors가 있고 tabIndex가 있는 경우)
    if (setTabErrors !== undefined && tabIndex !== undefined) {
      setTabErrors((prev) => ({
        ...prev,
        [tabIndex.toString()]: {
          ...prev[tabIndex.toString()],
          general: errorMessage,
        },
      }));
    } else {
      alert(errorMessage);
    }
    return;
  }

  // 네트워크 에러
  if (
    err instanceof TypeError ||
    err.message?.toLowerCase().includes('network') ||
    err.message?.toLowerCase().includes('fetch')
  ) {
    alert('네트워크 연결을 확인해 주세요.');
    return;
  }

  // 기타 에러 (LocalStorage 기반 validation 에러 등)
  alert(err.message || '알 수 없는 오류가 발생했습니다.');
}

interface AllBusinessIncomeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessIncomes: BusinessIncome[];
}

type FormData = {
  id: string;
  paymentYear: number;
  paymentMonth: number;
  attributionYear: number;
  attributionMonth: number;
  name: string;
  iino: string;
  isForeign: boolean;
  industryCode: string;
  paymentSum: number;
  paymentSumDisplay: string; // 천 단위 콤마 표시용
  taxRate: number;
};

export function AllBusinessIncomeEditDialog({
  open,
  onOpenChange,
  businessIncomes,
}: AllBusinessIncomeEditDialogProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const { data: industryCodes } = useIndustryCodes();
  const updateMutation = useUpdateAllBusinessIncome();
  const deleteMutation = useDeleteBusinessIncome();
  const { toast } = useToast();

  // 다건/단건 모드 판별 (실시간 레코드 개수 기준)
  const [records, setRecords] = useState<BusinessIncome[]>([]);
  const isMultiMode = records.length > 1;

  // 현재 활성 탭
  const [activeTab, setActiveTab] = useState<string>('0');

  // 탭별 formData, initialData, errors
  const [formsData, setFormsData] = useState<FormData[]>([]);
  const [initialFormsData, setInitialFormsData] = useState<FormData[]>([]);
  const [tabErrors, setTabErrors] = useState<Record<string, Record<string, string>>>({});
  const [showTaxRateSelection, setShowTaxRateSelection] = useState<Record<string, boolean>>({});

  // 레코드 초기화
  useEffect(() => {
    if (businessIncomes && businessIncomes.length > 0) {
      setRecords(businessIncomes);
      setActiveTab('0');
    }
  }, [businessIncomes]);

  // 폼 데이터 초기화
  useEffect(() => {
    if (records.length > 0) {
      const forms: FormData[] = records.map((record) => ({
        id: record.id,
        paymentYear: record.paymentYear,
        paymentMonth: record.paymentMonth,
        attributionYear: record.attributionYear,
        attributionMonth: record.attributionMonth,
        name: record.name,
        iino: record.iino,
        isForeign: record.isForeign,
        industryCode: record.industryCode,
        paymentSum: record.paymentSum,
        paymentSumDisplay: addCommas(record.paymentSum),
        taxRate: record.taxRate,
      }));
      setFormsData(forms);
      setInitialFormsData(JSON.parse(JSON.stringify(forms)));

      // 초기 세율 선택 UI 상태 설정
      const taxRateStates: Record<string, boolean> = {};
      forms.forEach((form, index) => {
        taxRateStates[index.toString()] =
          form.isForeign && form.industryCode === '940904';
      });
      setShowTaxRateSelection(taxRateStates);
    }
  }, [records]);

  // 현재 활성 탭의 데이터
  const currentFormData = formsData[Number(activeTab)] || null;

  // 세율 선택 UI 표시 여부 판단
  useEffect(() => {
    if (currentFormData) {
      const shouldShow =
        currentFormData.isForeign && currentFormData.industryCode === '940904';
      setShowTaxRateSelection((prev) => ({ ...prev, [activeTab]: shouldShow }));

      if (!shouldShow && currentFormData.industryCode === '940905') {
        updateFormData(Number(activeTab), 'taxRate', 5);
      } else if (!shouldShow) {
        updateFormData(Number(activeTab), 'taxRate', 3);
      }
    }
  }, [currentFormData?.isForeign, currentFormData?.industryCode, activeTab]);

  // FormData 업데이트 헬퍼
  const updateFormData = (tabIndex: number, field: keyof FormData, value: unknown): void => {
    setFormsData((prev) => {
      const updated = [...prev];
      if (updated[tabIndex]) {
        updated[tabIndex] = { ...updated[tabIndex], [field]: value };
      }
      return updated;
    });

    // 에러 제거 (재입력 시)
    setTabErrors((prev) => {
      const updated = { ...prev };
      const tabKey = tabIndex.toString();
      if (updated[tabKey] && updated[tabKey][field]) {
        delete updated[tabKey][field];
      }
      return updated;
    });
  };

  // 필드 검증
  const validateField = (
    tabIndex: number,
    field: string,
    value: unknown
  ): string | null => {
    const formData = formsData[tabIndex];
    if (!formData) return null;

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
    if (
      field === 'attributionDate' &&
      formData.paymentYear !== 0 &&
      formData.paymentMonth !== 0 &&
      formData.attributionYear !== 0 &&
      formData.attributionMonth !== 0
    ) {
      const paymentDate = new Date(formData.paymentYear, formData.paymentMonth - 1);
      const attributionDate = new Date(
        formData.attributionYear,
        formData.attributionMonth - 1
      );
      if (attributionDate > paymentDate) {
        return '귀속연월은 지급연월보다 이전 날짜여야합니다.';
      }
    }
    return null;
  };

  // Blur 핸들러
  const handleBlur = (tabIndex: number, field: string): void => {
    const formData = formsData[tabIndex];
    if (!formData) return;

    const value = formData[field as keyof FormData];
    const error = validateField(tabIndex, field, value);

    setTabErrors((prev) => ({
      ...prev,
      [tabIndex.toString()]: {
        ...prev[tabIndex.toString()],
        [field]: error ?? '',
      },
    }));

    // 귀속연월 검증
    if (['paymentYear', 'paymentMonth', 'attributionYear', 'attributionMonth'].includes(field)) {
      const dateError = validateField(tabIndex, 'attributionDate', null);
      setTabErrors((prev) => ({
        ...prev,
        [tabIndex.toString()]: {
          ...prev[tabIndex.toString()],
          attributionDate: dateError ?? '',
        },
      }));
    }
  };

  // 탭 에러 확인
  const hasTabErrors = (tabIndex: number): boolean => {
    const errors = tabErrors[tabIndex.toString()] || {};
    return Object.values(errors).some((error) => error !== '');
  };

  // 전체 에러 확인 (현재 사용되지 않지만 향후 사용 가능)
  // const hasAnyErrors = (): boolean => {
  //   return Object.keys(tabErrors).some((tabIndex) => hasTabErrors(Number(tabIndex)));
  // };

  // 변경 여부 확인 (전체)
  const hasChanges = (): boolean => {
    return formsData.some((formData, index) => {
      const initialData = initialFormsData[index];
      if (!initialData) return false;

      return (
        formData.paymentYear !== initialData.paymentYear ||
        formData.paymentMonth !== initialData.paymentMonth ||
        formData.attributionYear !== initialData.attributionYear ||
        formData.attributionMonth !== initialData.attributionMonth ||
        formData.name !== initialData.name ||
        formData.iino !== initialData.iino ||
        formData.isForeign !== initialData.isForeign ||
        formData.industryCode !== initialData.industryCode ||
        formData.paymentSum !== initialData.paymentSum ||
        formData.taxRate !== initialData.taxRate
      );
    });
  };

  // 특정 탭의 변경 여부 확인
  const hasTabChanges = (tabIndex: number): boolean => {
    const formData = formsData[tabIndex];
    const initialData = initialFormsData[tabIndex];
    if (!formData || !initialData) return false;

    return (
      formData.paymentYear !== initialData.paymentYear ||
      formData.paymentMonth !== initialData.paymentMonth ||
      formData.attributionYear !== initialData.attributionYear ||
      formData.attributionMonth !== initialData.attributionMonth ||
      formData.name !== initialData.name ||
      formData.iino !== initialData.iino ||
      formData.isForeign !== initialData.isForeign ||
      formData.industryCode !== initialData.industryCode ||
      formData.paymentSum !== initialData.paymentSum ||
      formData.taxRate !== initialData.taxRate
    );
  };

  // 탭 데이터 복원
  const restoreTabData = (tabIndex: number): void => {
    const initialData = initialFormsData[tabIndex];
    if (!initialData) return;

    setFormsData((prev) => {
      const updated = [...prev];
      updated[tabIndex] = JSON.parse(JSON.stringify(initialData));
      return updated;
    });

    // 에러 제거
    setTabErrors((prev) => {
      const updated = { ...prev };
      delete updated[tabIndex.toString()];
      return updated;
    });
  };

  // 현재 탭만 저장
  const saveCurrentTab = async (
    tabIndex: number,
    onSuccess?: () => void
  ): Promise<void> => {
    const formData = formsData[tabIndex];
    if (!formData) return;

    try {
      await updateMutation.mutateAsync({
        id: formData.id,
        dto: formData,
      });

      // 저장 성공 시 초기 데이터 업데이트
      setInitialFormsData((prev) => {
        const updated = [...prev];
        updated[tabIndex] = JSON.parse(JSON.stringify(formData));
        return updated;
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      handleErrorByType(error, setTabErrors, tabIndex);
      throw error;
    }
  };

  // 탭 전환 핸들러
  const handleTabChange = (newTab: string): void => {
    const currentTabIndex = Number(activeTab);
    const newTabIndex = Number(newTab);

    // 같은 탭이면 무시
    if (currentTabIndex === newTabIndex) return;

    // 1. 현재 탭에 에러가 있는 경우
    if (hasTabErrors(currentTabIndex)) {
      // 탭 전환 중단 (에러가 있으면 포커스는 자동으로 해당 필드에 있을 것)
      return;
    }

    // 2. 현재 탭에 수정사항이 있는 경우
    if (hasTabChanges(currentTabIndex)) {
      const confirmed = window.confirm('수정한 내용을 저장하시겠습니까?');
      if (confirmed) {
        // 저장 후 탭 전환
        saveCurrentTab(currentTabIndex, () => {
          setActiveTab(newTab);
        }).catch(() => {
          // 저장 실패 시 탭 전환하지 않음
        });
      } else {
        // 원래 상태로 복원 후 탭 전환
        restoreTabData(currentTabIndex);
        setActiveTab(newTab);
      }
    } else {
      // 3. 수정사항 없으면 즉시 전환
      setActiveTab(newTab);
    }
  };

  // 탭별 삭제 ("이 건 삭제")
  const handleDeleteTab = (tabIndex: number): void => {
    const record = records[tabIndex];
    if (!record) return;

    const confirmed = window.confirm(
      isMultiMode
        ? `${record.paymentYear}년 ${record.paymentMonth}월 지급 건을 삭제하시겠습니까? 삭제한 정보는 복구할 수 없습니다.`
        : '사업소득을 삭제하시겠습니까? 삭제한 정보는 복구할 수 없습니다.'
    );

    if (confirmed) {
      deleteMutation.mutate(record.id, {
        onSuccess: () => {
          // 레코드에서 제거
          const updatedRecords = records.filter((_, i) => i !== tabIndex);
          setRecords(updatedRecords);

          // 마지막 건 삭제 시 팝업 닫기
          if (updatedRecords.length === 0) {
            onOpenChange(false);
            toast({
              title: '사업소득 삭제를 완료했습니다.',
              duration: 1500,
            });
            return;
          }

          // 탭 전환 (삭제된 탭 이후 탭으로 이동)
          if (tabIndex === Number(activeTab)) {
            const newActiveTab = Math.max(0, tabIndex - 1).toString();
            setActiveTab(newActiveTab);
          } else if (tabIndex < Number(activeTab)) {
            setActiveTab((Number(activeTab) - 1).toString());
          }

          // 다건 모드에서는 팝업 내 토스트
          if (isMultiMode) {
            toast({
              title: '사업소득 삭제를 완료했습니다.',
              duration: 1500,
            });
          }
        },
        onError: (error) => {
          handleErrorByType(error);
        },
      });
    }
  };

  // 일괄 검증 (현재 사용되지 않지만 향후 사용 가능)
  // const validateAllTabs = (): { isValid: boolean; firstErrorTab: number | null } => {
  //   const newTabErrors: Record<string, Record<string, string>> = {};
  //   let firstErrorTab: number | null = null;
  //
  //   formsData.forEach((formData, tabIndex) => {
  //     const errors: Record<string, string> = {};
  //
  //     Object.keys(formData).forEach((field) => {
  //       const error = validateField(
  //         tabIndex,
  //         field,
  //         formData[field as keyof FormData]
  //       );
  //       if (error) errors[field] = error;
  //     });
  //
  //     // 귀속연월 검증
  //     const dateError = validateField(tabIndex, 'attributionDate', null);
  //     if (dateError) errors.attributionDate = dateError;
  //
  //     if (Object.keys(errors).length > 0) {
  //       newTabErrors[tabIndex.toString()] = errors;
  //       if (firstErrorTab === null) {
  //         firstErrorTab = tabIndex;
  //       }
  //     }
  //   });
  //
  //   setTabErrors(newTabErrors);
  //   return {
  //     isValid: Object.keys(newTabErrors).length === 0,
  //     firstErrorTab,
  //   };
  // };

  // 현재 탭만 저장
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const currentTabIndex = Number(activeTab);
    const formData = formsData[currentTabIndex];
    if (!formData) return;

    // 현재 탭만 검증
    const errors: Record<string, string> = {};

    Object.keys(formData).forEach((field) => {
      const error = validateField(
        currentTabIndex,
        field,
        formData[field as keyof FormData]
      );
      if (error) errors[field] = error;
    });

    // 귀속연월 검증
    const dateError = validateField(currentTabIndex, 'attributionDate', null);
    if (dateError) errors.attributionDate = dateError;

    if (Object.keys(errors).length > 0) {
      setTabErrors((prev) => ({
        ...prev,
        [currentTabIndex.toString()]: errors,
      }));
      return;
    }

    // 단건 모드에서 귀속 기준 예외 규칙 확인
    if (!isMultiMode) {
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
    }

    // 현재 탭만 저장
    try {
      await updateMutation.mutateAsync({
        id: formData.id,
        dto: formData,
      });

      onOpenChange(false);
      setTabErrors({});
      toast({
        title: '사업소득 수정을 완료했습니다.',
        duration: 1500,
      });
    } catch (error) {
      handleErrorByType(error, setTabErrors, currentTabIndex);
    }
  };

  // 팝업 닫기
  const handleClose = (): void => {
    if (hasChanges()) {
      const confirmed = window.confirm('사업소득 수정을 취소하시겠습니까?');
      if (!confirmed) return;
    }
    onOpenChange(false);
    setTabErrors({});
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // 팝업을 닫으려는 시도
        if (!isOpen) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>사업소득 수정</DialogTitle>
        </DialogHeader>

        {records.length === 0 || !currentFormData ? (
          <div className="py-8 text-center text-gray-500">데이터를 불러오는 중...</div>
        ) : (
          <>
            {isMultiMode ? (
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="w-full justify-start overflow-x-auto">
                  {records.map((record, index) => (
                    <TabsTrigger key={record.id} value={index.toString()}>
                      {`${record.paymentYear}.${String(record.paymentMonth).padStart(2, '0')} 지급`}
                      {hasTabErrors(index) && (
                        <span className="ml-1 text-red-500">!</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {records.map((_, index) => (
                  <TabsContent key={index} value={index.toString()}>
                    {renderForm(index)}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              renderForm(0)
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  function renderForm(tabIndex: number): JSX.Element {
    const formData = formsData[tabIndex];
    const errors = tabErrors[tabIndex.toString()] || {};
    const isTaxRateEditable = showTaxRateSelection[tabIndex.toString()] || false;

    if (!formData) return <></>;

    const tabTaxes = calculateTaxes({
      paymentSum: formData.paymentSum,
      isForeign: formData.isForeign,
      industryCode: formData.industryCode,
      taxRate: formData.taxRate,
    });

    return (
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* 일반 에러 메시지 (4xx 에러 등) */}
          {errors.general && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">*지급연도</label>
              <Select
                value={formData.paymentYear === 0 ? '' : formData.paymentYear.toString()}
                onValueChange={(value) =>
                  updateFormData(tabIndex, 'paymentYear', Number(value))
                }
              >
                <SelectTrigger onBlur={() => handleBlur(tabIndex, 'paymentYear')}>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: currentYear + 1 - 2026 + 1 },
                    (_, i) => 2026 + i
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
                onValueChange={(value) =>
                  updateFormData(tabIndex, 'paymentMonth', Number(value))
                }
              >
                <SelectTrigger onBlur={() => handleBlur(tabIndex, 'paymentMonth')}>
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
                onValueChange={(value) =>
                  updateFormData(tabIndex, 'attributionYear', Number(value))
                }
              >
                <SelectTrigger onBlur={() => handleBlur(tabIndex, 'attributionYear')}>
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
                <p className="text-red-500 text-sm mt-1">{errors.attributionYear}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*귀속월</label>
              <Select
                value={formData.attributionMonth === 0 ? '' : formData.attributionMonth.toString()}
                onValueChange={(value) =>
                  updateFormData(tabIndex, 'attributionMonth', Number(value))
                }
              >
                <SelectTrigger onBlur={() => handleBlur(tabIndex, 'attributionMonth')}>
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
                updateFormData(tabIndex, 'name', e.target.value);
              }}
              onBlur={(e) => {
                // blur 시 허용되지 않은 문자 제거
                const value = e.target.value;
                if (!validateNameCharacters(value)) {
                  const filtered = value.replace(/[^가-힣a-zA-Z0-9\s&'\-.·()]/g, '');
                  updateFormData(tabIndex, 'name', filtered);
                }
                handleBlur(tabIndex, 'name');
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
              updateFormData(tabIndex, 'isForeign', value === 'foreign')
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
                updateFormData(tabIndex, 'iino', e.target.value.replace(/\D/g, ''))
              }
              onBlur={() => handleBlur(tabIndex, 'iino')}
              required
              maxLength={13}
            />
            {errors.iino && <p className="text-red-500 text-sm mt-1">{errors.iino}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">*업종코드</label>
            <Select
              value={formData.industryCode}
              onValueChange={(value) =>
                updateFormData(tabIndex, 'industryCode', value)
              }
            >
              <SelectTrigger onBlur={() => handleBlur(tabIndex, 'industryCode')}>
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
              type="text"
              value={formData.paymentSumDisplay}
              onChange={(e) => {
                const value = e.target.value;
                // 숫자만 입력 가능
                const onlyNumbers = value.replace(/[^\d]/g, '');

                // 최대 12자리
                if (onlyNumbers.length <= 12) {
                  // 앞자리 0 제거
                  const numValue = onlyNumbers === '' ? 0 : Number(onlyNumbers);

                  // formData 업데이트
                  setFormsData((prev) => {
                    const updated = [...prev];
                    if (updated[tabIndex]) {
                      updated[tabIndex] = {
                        ...updated[tabIndex],
                        paymentSum: numValue,
                        paymentSumDisplay: onlyNumbers === '' ? '' : addCommas(numValue),
                      };
                    }
                    return updated;
                  });

                  // 에러 제거
                  setTabErrors((prev) => {
                    const updated = { ...prev };
                    const tabKey = tabIndex.toString();
                    if (updated[tabKey] && updated[tabKey]['paymentSum']) {
                      delete updated[tabKey]['paymentSum'];
                    }
                    return updated;
                  });
                }
              }}
              onBlur={() => handleBlur(tabIndex, 'paymentSum')}
              required
              placeholder="0"
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
                {isTaxRateEditable ? (
                  <FormRadioGroup
                    options={[
                      { value: '3', label: '3%' },
                      { value: '20', label: '20%' },
                    ]}
                    value={formData.taxRate.toString()}
                    onValueChange={(value) =>
                      updateFormData(tabIndex, 'taxRate', Number(value))
                    }
                    orientation="horizontal"
                  />
                ) : (
                  <Input
                    value={`${tabTaxes.taxRate}%`}
                    readOnly
                    className="bg-gray-100"
                  />
                )}
              </div>

              <div>
                <Label className="text-sm text-gray-600">소득세</Label>
                <Input
                  value={formatCurrency(tabTaxes.incomeTax)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">지방소득세</Label>
                <Input
                  value={formatCurrency(tabTaxes.localIncomeTax)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">실지급액</Label>
                <Input
                  value={formatCurrency(tabTaxes.actualPayment)}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="text-sm text-gray-600 space-y-1 bg-blue-50 p-3 rounded">
            <p>
              ※ 지급총액 입력 시 업종코드에 따라 세율이 자동 적용되어 소득세,
              지방소득세가 계산됩니다.
            </p>
            <p>※ 소액부징수(소득세액이 1천원 미만)인 경우, 소득세가 면제됩니다.</p>
            <p>
              ※ 직업운동가(940904) 중 프로스포츠 구단과의 계약기간이 3년 이하인 외국인
              직업 운동가일 경우, 세율 20%
            </p>
            <p>
              ※ 봉사료 수취자(940905) 중 「소득세법 시행령」제184조의2에 해당하는
              봉사료 수입금액의 경우, 세율 5%
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleDeleteTab(tabIndex)}
          >
            {isMultiMode ? '이 건 삭제' : '삭제'}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button type="submit" variant="default" disabled={hasTabErrors(tabIndex)}>
              수정
            </Button>
          </div>
        </DialogFooter>
      </form>
    );
  }
}
