import { useState, useEffect } from 'react';
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
// import { toast } from '@/shared/hooks/use-toast';
import type {
  StatementCreationFormData,
  StatementCreationSummary,
} from '../types/business-income.types';
import { formatCurrency } from '../types/business-income.types';

interface BusinessIncomeStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  summary: StatementCreationSummary;
  targetIds: string[];
  targetType: 'all' | 'selected';
  onSuccess: () => void;
}

const STORAGE_KEY = 'biskit_sps_bi_creation_form';

const initialFormData: StatementCreationFormData = {
  companyName: '',
  ceoName: '',
  businessNumber: '',
  corporateNumber: '',
  managerName: '',
  managerDepartment: '',
  managerPhone: '',
  hometaxId: '',
  taxOfficeCode: '',
  purpose: '',
};

export function BusinessIncomeStatementDialog({
  open,
  onOpenChange,
  year,
  month,
  summary,
  targetIds,
  targetType: _targetType,
  onSuccess,
}: BusinessIncomeStatementDialogProps): JSX.Element {
  const [formData, setFormData] = useState<StatementCreationFormData>(initialFormData);
  const [initialData, setInitialData] = useState<StatementCreationFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof StatementCreationFormData, string>>>(
    {}
  );
  const [isComposing, setIsComposing] = useState(false);

  // LocalStorage에서 이전 입력값 불러오기
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsedData = JSON.parse(saved) as StatementCreationFormData;
          setFormData(parsedData);
          setInitialData(parsedData);
        } catch {
          setFormData(initialFormData);
          setInitialData(initialFormData);
        }
      } else {
        setFormData(initialFormData);
        setInitialData(initialFormData);
      }
      setErrors({});
    }
  }, [open]);

  // 변경 사항 확인
  const hasChanges = (): boolean => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  };

  // 닫기 처리
  const handleClose = (): void => {
    if (hasChanges()) {
      const confirmed = window.confirm('간이지급명세서 생성을 취소하시겠습니까?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  // 입력값 변경
  const handleChange = (field: keyof StatementCreationFormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 에러 제거
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 허용 문자 검증
  const validateAllowedChars = (value: string, pattern: RegExp): boolean => {
    return pattern.test(value);
  };

  // 필드별 허용 문자 패턴
  const patterns = {
    companyName: /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/,
    ceoName: /^[가-힣a-zA-Z0-9\s]*$/,
    businessNumber: /^[0-9]*$/,
    corporateNumber: /^[0-9]*$/,
    managerName: /^[가-힣a-zA-Z0-9\s]*$/,
    managerDepartment: /^[가-힣a-zA-Z0-9\s]*$/,
    managerPhone: /^[0-9\-()]*$/,
    hometaxId: /^[a-zA-Z0-9]*$/,
  };

  // 입력값 필터링
  const handleInputChange = (
    field: keyof StatementCreationFormData,
    value: string
  ): void => {
    // 한글 조합 중에는 검증 건너뛰기
    if (isComposing) {
      handleChange(field, value);
      return;
    }

    // 필드별 입력 제한
    if (field === 'companyName' && !validateAllowedChars(value, patterns.companyName)) {
      return;
    }
    if (field === 'ceoName' && !validateAllowedChars(value, patterns.ceoName)) {
      return;
    }
    if (field === 'businessNumber') {
      if (!validateAllowedChars(value, patterns.businessNumber)) return;
      if (value.length > 10) return;
    }
    if (field === 'corporateNumber') {
      if (!validateAllowedChars(value, patterns.corporateNumber)) return;
      if (value.length > 13) return;
    }
    if (field === 'managerName' && !validateAllowedChars(value, patterns.managerName)) {
      return;
    }
    if (field === 'managerDepartment' && !validateAllowedChars(value, patterns.managerDepartment)) {
      return;
    }
    if (field === 'managerPhone') {
      if (!validateAllowedChars(value, patterns.managerPhone)) return;
      if (value.length > 15) return;
    }
    if (field === 'hometaxId') {
      if (!validateAllowedChars(value, patterns.hometaxId)) return;
      if (value.length > 20) return;
    }
    if (field === 'taxOfficeCode' && value.length > 3) {
      return;
    }
    if (field === 'purpose' && value.length > 50) {
      return;
    }

    // 최대 길이 제한 (일반 필드)
    if (['companyName', 'ceoName', 'managerName', 'managerDepartment'].includes(field)) {
      if (value.length > 30) return;
    }

    handleChange(field, value);
  };

  // Blur 시 유효성 검증
  const handleBlur = (field: keyof StatementCreationFormData): void => {
    const value = formData[field].trim();
    const newErrors: Partial<Record<keyof StatementCreationFormData, string>> = {};

    // 필수값 검증
    if (!value) {
      newErrors[field] = '필수 입력 항목입니다.';
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    // 사업자등록번호 자릿수 검증
    if (field === 'businessNumber' && value.length !== 10) {
      newErrors[field] = '사업자등록번호는 10자리만 입력 가능합니다.';
    }

    // 법인등록번호 자릿수 검증
    if (field === 'corporateNumber' && value.length !== 13) {
      newErrors[field] = '법인등록번호는 13자리만 입력 가능합니다.';
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
  };

  // 전체 유효성 검증
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof StatementCreationFormData, string>> = {};

    // 모든 필드 필수 검증
    Object.keys(formData).forEach((key) => {
      const field = key as keyof StatementCreationFormData;
      const value = formData[field].trim();

      if (!value) {
        newErrors[field] = '필수 입력 항목입니다.';
      }
    });

    // 사업자등록번호 자릿수
    if (formData.businessNumber.trim() && formData.businessNumber.length !== 10) {
      newErrors.businessNumber = '사업자등록번호는 10자리만 입력 가능합니다.';
    }

    // 법인등록번호 자릿수
    if (formData.corporateNumber.trim() && formData.corporateNumber.length !== 13) {
      newErrors.corporateNumber = '법인등록번호는 13자리만 입력 가능합니다.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 생성 버튼 클릭
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      // LocalStorage에 입력값 저장
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));

      // 신고파일 최종생성일 업데이트
      const now = new Date().toISOString();
      updateReportFileGeneratedAt(year, month, targetIds, now);

      // PDF 파일 다운로드 (테스트용 빈 PDF)
      downloadPDF(year, month);

      // Alert 노출
      alert(`${year}년 ${month}월 사업소득 간이지급명세서 생성이 완료되었습니다.`);

      // 팝업 닫기 및 부모 화면 갱신
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // 신고파일 최종생성일 업데이트 (LocalStorage)
  const updateReportFileGeneratedAt = (
    _year: number,
    _month: number,
    targetIds: string[],
    generatedAt: string
  ): void => {
    // 사업소득 월별 리스트 데이터 업데이트
    const stored = localStorage.getItem('biskit_business_income');
    if (stored) {
      const data = JSON.parse(stored) as Array<{
        id: string;
        reportFileGeneratedAt: string | null;
      }>;

      const updated = data.map((item) => {
        if (targetIds.includes(item.id)) {
          return { ...item, reportFileGeneratedAt: generatedAt };
        }
        return item;
      });

      localStorage.setItem('biskit_business_income', JSON.stringify(updated));
    }
  };

  // PDF 다운로드 (테스트용 빈 PDF)
  const downloadPDF = (year: number, month: number): void => {
    // 빈 PDF 생성 (간단한 바이너리 데이터)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
0000000341 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
433
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${year}년 ${month}월 사업소득 간이지급명세서.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>사업소득 간이지급명세서 생성</DialogTitle>
        </DialogHeader>

        {/* 상단 요약 정보 */}
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">건수(소득자 건수)</span>
              <span className="text-sm font-semibold">{summary.count}건</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 지급액</span>
              <span className="text-sm font-semibold">
                {formatCurrency(summary.totalPaymentSum)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 소득세</span>
              <span className="text-sm font-semibold">
                {formatCurrency(summary.totalIncomeTax)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 지방소득세</span>
              <span className="text-sm font-semibold">
                {formatCurrency(summary.totalLocalIncomeTax)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">총 실지급액</span>
              <span className="text-sm font-semibold">
                {formatCurrency(summary.totalActualPayment)}
              </span>
            </div>
          </div>
        </div>

        {/* 입력 폼 */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 상호(법인명) */}
            <div>
              <Label htmlFor="companyName">
                상호(법인명) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                onBlur={() => handleBlur('companyName')}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="상호(법인명)를 입력하세요"
              />
              {errors.companyName && (
                <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
              )}
            </div>

            {/* 대표자 성명 */}
            <div>
              <Label htmlFor="ceoName">
                대표자 성명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ceoName"
                value={formData.ceoName}
                onChange={(e) => handleInputChange('ceoName', e.target.value)}
                onBlur={() => handleBlur('ceoName')}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="대표자 성명을 입력하세요"
              />
              {errors.ceoName && (
                <p className="text-sm text-red-500 mt-1">{errors.ceoName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 사업자등록번호 */}
            <div>
              <Label htmlFor="businessNumber">
                사업자등록번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="businessNumber"
                value={formData.businessNumber}
                onChange={(e) => handleInputChange('businessNumber', e.target.value)}
                onBlur={() => handleBlur('businessNumber')}
                placeholder="10자리 숫자"
              />
              {errors.businessNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.businessNumber}</p>
              )}
            </div>

            {/* 법인등록번호 */}
            <div>
              <Label htmlFor="corporateNumber">
                법인등록번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="corporateNumber"
                value={formData.corporateNumber}
                onChange={(e) => handleInputChange('corporateNumber', e.target.value)}
                onBlur={() => handleBlur('corporateNumber')}
                placeholder="13자리 숫자"
              />
              {errors.corporateNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.corporateNumber}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 담당자 성명 */}
            <div>
              <Label htmlFor="managerName">
                담당자 성명 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="managerName"
                value={formData.managerName}
                onChange={(e) => handleInputChange('managerName', e.target.value)}
                onBlur={() => handleBlur('managerName')}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="담당자 성명을 입력하세요"
              />
              {errors.managerName && (
                <p className="text-sm text-red-500 mt-1">{errors.managerName}</p>
              )}
            </div>

            {/* 담당자 부서 */}
            <div>
              <Label htmlFor="managerDepartment">
                담당자 부서 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="managerDepartment"
                value={formData.managerDepartment}
                onChange={(e) => handleInputChange('managerDepartment', e.target.value)}
                onBlur={() => handleBlur('managerDepartment')}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="담당자 부서를 입력하세요"
              />
              {errors.managerDepartment && (
                <p className="text-sm text-red-500 mt-1">{errors.managerDepartment}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 담당자 전화번호 */}
            <div>
              <Label htmlFor="managerPhone">
                담당자 전화번호 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="managerPhone"
                value={formData.managerPhone}
                onChange={(e) => handleInputChange('managerPhone', e.target.value)}
                onBlur={() => handleBlur('managerPhone')}
                placeholder="전화번호를 입력하세요"
              />
              {errors.managerPhone && (
                <p className="text-sm text-red-500 mt-1">{errors.managerPhone}</p>
              )}
            </div>

            {/* 홈택스ID */}
            <div>
              <Label htmlFor="hometaxId">
                홈택스ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hometaxId"
                value={formData.hometaxId}
                onChange={(e) => handleInputChange('hometaxId', e.target.value)}
                onBlur={() => handleBlur('hometaxId')}
                placeholder="영문, 숫자만 입력 가능"
              />
              {errors.hometaxId && (
                <p className="text-sm text-red-500 mt-1">{errors.hometaxId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 관할세무서 코드 */}
            <div>
              <Label htmlFor="taxOfficeCode">
                관할세무서 코드 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="taxOfficeCode"
                value={formData.taxOfficeCode}
                onChange={(e) => handleInputChange('taxOfficeCode', e.target.value)}
                onBlur={() => handleBlur('taxOfficeCode')}
                placeholder="최대 3자리"
              />
              {errors.taxOfficeCode && (
                <p className="text-sm text-red-500 mt-1">{errors.taxOfficeCode}</p>
              )}
            </div>

            {/* 생성목적 */}
            <div>
              <Label htmlFor="purpose">
                생성목적 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="purpose"
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                onBlur={() => handleBlur('purpose')}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="생성목적을 입력하세요"
              />
              {errors.purpose && (
                <p className="text-sm text-red-500 mt-1">{errors.purpose}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button variant="default" onClick={handleSubmit}>생성</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
