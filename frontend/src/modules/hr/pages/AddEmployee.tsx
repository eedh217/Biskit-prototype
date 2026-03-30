import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AddressSearchDialog } from '../components/AddressSearchDialog';
import { employeeService } from '../services/employeeService';
import { organizationService } from '../services/organizationService';
import { jobLevelService } from '../services/jobLevelService';
import { employmentTypeService } from '../services/employmentTypeService';
import type { CreateEmployeeDto } from '../types/employee';
import type { Organization, OrganizationNode } from '../types/organization';
import type { JobLevel } from '../types/jobLevel';
import type { EmploymentType } from '../types/employmentType';
import { COUNTRIES } from '@/shared/constants/countries';
import { BANKS } from '@/shared/constants/banks';
import {
  isValidDate,
  isValidResidentRegistrationNumber,
  isValidForeignerRegistrationNumber,
  isValidEmail,
  isValidContact,
  isOnlyDigits,
  isValidPassportNumber,
} from '../utils/validation';
import { toast } from '@/shared/hooks/use-toast';
import { formatNumberInput, parseFormattedNumber } from '@/shared/lib/utils';

interface FormData {
  employeeNumber: string;
  name: string;
  nationalityType: 'domestic' | 'foreign';
  foreignerIdType: 'foreigner' | 'passport'; // 외국인 신분증 타입
  residentRegistrationNumberFront: string;
  residentRegistrationNumberBack: string;
  foreignerRegistrationNumberFront: string;
  foreignerRegistrationNumberBack: string;
  passportNumber: string;
  birthDate: string;
  gender: 'male' | 'female' | '';
  nationality: string;
  residenceType: 'resident' | 'non-resident';
  disabilityType: 'none' | 'disabled' | 'veteran' | 'severe';
  email: string;
  contact: string;
  phone1: string;
  phone2: string;
  phone3: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  joinDate: string;
  leaveDate: string;
  departmentId: string;
  position: string;
  employmentTypeId: string;
  isDepartmentHead: boolean;
  salaryType: '연봉' | '시급' | '';
  salaryAmount: string;
  mealAllowance: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
}

interface FormErrors {
  employeeNumber?: string;
  name?: string;
  residentRegistrationNumber?: string;
  foreignerRegistrationNumber?: string;
  passportNumber?: string;
  birthDate?: string;
  nationality?: string;
  email?: string;
  contact?: string;
  phone?: string;
  zipCode?: string;
  address?: string;
  detailAddress?: string;
  joinDate?: string;
  leaveDate?: string;
  isDepartmentHead?: string;
}

// 날짜 비교 헬퍼 함수
const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const isBeforeToday = (dateStr: string): boolean => {
  if (!dateStr || dateStr.length !== 8) return false;
  return dateStr < getTodayString();
};

const isTodayOrAfter = (dateStr: string): boolean => {
  if (!dateStr || dateStr.length !== 8) return false;
  return dateStr >= getTodayString();
};

export function AddEmployee(): JSX.Element {
  const [isComposing, setIsComposing] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    employeeNumber: '',
    name: '',
    nationalityType: 'domestic',
    foreignerIdType: 'foreigner', // 디폴트: 외국인등록번호
    residentRegistrationNumberFront: '',
    residentRegistrationNumberBack: '',
    foreignerRegistrationNumberFront: '',
    foreignerRegistrationNumberBack: '',
    passportNumber: '',
    birthDate: '',
    gender: '',
    nationality: '',
    residenceType: 'resident',
    disabilityType: 'none',
    email: '',
    contact: '',
    phone1: '',
    phone2: '',
    phone3: '',
    zipCode: '',
    address: '',
    detailAddress: '',
    joinDate: '',
    leaveDate: '',
    departmentId: '',
    position: '',
    employmentTypeId: '',
    isDepartmentHead: false,
    salaryType: '연봉',
    salaryAmount: '',
    mealAllowance: '',
    bankName: '',
    accountHolder: '',
    accountNumber: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);

  const detailAddressRef = useRef<HTMLInputElement>(null);
  const residentBackRef = useRef<HTMLInputElement>(null);
  const foreignerBackRef = useRef<HTMLInputElement>(null);
  const phone2Ref = useRef<HTMLInputElement>(null);
  const phone3Ref = useRef<HTMLInputElement>(null);

  // 트리를 평면화하는 함수
  const flattenTree = (nodes: OrganizationNode[]): Organization[] => {
    const result: Organization[] = [];
    const traverse = (node: OrganizationNode): void => {
      const { children, ...org } = node;
      result.push(org);
      children.forEach(traverse);
    };
    nodes.forEach(traverse);
    return result;
  };

  // 조직의 전체 경로를 구하는 함수
  const getOrganizationPath = (org: Organization, allOrgs: Organization[]): string => {
    const path: string[] = [];
    let current: Organization | undefined = org;

    while (current) {
      path.unshift(current.name);
      current = allOrgs.find(o => o.id === current?.parentId);
    }

    return path.join(' > ');
  };

  // 조직 데이터 로드
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const [orgTree, levels, types] = await Promise.all([
          organizationService.getTree(),
          jobLevelService.getList(),
          employmentTypeService.getList(),
        ]);
        // 트리를 평면화해서 계층 순서 유지
        const flatOrgs = flattenTree(orgTree);
        setOrganizations(flatOrgs);
        setJobLevels(levels);
        setEmploymentTypes(types);
      } catch (error) {
        console.error('Failed to load organization data:', error);
      }
    };

    loadData();
  }, []);

  // 페이지 이탈 방지 (새로고침, 탭 닫기)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      // 제출 중이거나 수정되지 않았으면 이탈 방지 안 함
      if (isModified && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isModified, isSubmitting]);

  // 페이지 이탈 방지 (브라우저 뒤로가기)
  useEffect(() => {
    // 페이지 진입 시 현재 상태를 history에 푸시 (뒤로가기 감지를 위해)
    window.history.pushState(null, '', window.location.pathname);

    const handlePopState = (): void => {
      if (isModified && !isSubmitting) {
        const confirmed = window.confirm('직원 추가를 취소하시겠습니까?');
        if (!confirmed) {
          // 취소하면 다시 현재 페이지로 푸시
          window.history.pushState(null, '', '/hr/employee/add');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isModified, isSubmitting]);

  // 페이지 이탈 방지 (메뉴 클릭)
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (!isModified || isSubmitting) return;

      // 링크 클릭 확인
      const target = (e.target as HTMLElement).closest('a, button');
      if (!target) return;

      // 현재 페이지 내부 요소 클릭인지 확인 (추가/취소 버튼 등)
      const isInternalButton = target.closest('[data-internal-actions="true"]') ||
                               target.closest('form') ||
                               target.getAttribute('type') === 'button' ||
                               target.getAttribute('type') === 'submit';

      if (isInternalButton) return;

      // 외부 네비게이션 클릭으로 판단
      e.preventDefault();
      e.stopPropagation();

      const confirmed = window.confirm('직원 추가를 취소하시겠습니까?');
      if (confirmed) {
        // 확인하면 isModified를 false로 설정하고 이동 허용
        setIsModified(false);
        setTimeout(() => {
          (target as HTMLElement).click();
        }, 0);
      }
    };

    // capture phase에서 이벤트 가로채기
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [isModified, isSubmitting]);

  const handleChange = (field: keyof FormData, value: string | boolean): void => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // 퇴사일 변경 시 부서장 체크 검증
      if (field === 'leaveDate' && typeof value === 'string') {
        if (newData.isDepartmentHead && value && isBeforeToday(value)) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            leaveDate: '퇴사일을 오늘 이전 날짜로 지정한 경우, 부서장으로 선택할 수 없습니다.',
          }));
        } else {
          setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors.leaveDate;
            return newErrors;
          });
        }
      }

      // 부서장 체크 변경 시 퇴사일 검증
      if (field === 'isDepartmentHead' && typeof value === 'boolean') {
        if (value && newData.leaveDate && isBeforeToday(newData.leaveDate)) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            isDepartmentHead: '퇴사일을 오늘 이전 날짜로 지정한 경우, 부서장으로 선택할 수 없습니다.',
          }));
        } else {
          setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors.isDepartmentHead;
            return newErrors;
          });
        }
      }

      return newData;
    });
    setIsModified(true);

    // 에러 초기화 (퇴사일, 부서장 제외 - 위에서 처리)
    if (field !== 'leaveDate' && field !== 'isDepartmentHead') {
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof FormErrors];
          return newErrors;
        });
      }
    }
  };

  const handleCancel = (): void => {
    if (isModified) {
      const confirmed = window.confirm('직원 추가를 취소하시겠습니까?');
      if (!confirmed) return;
    }
    // 취소 확인 후 isModified를 false로 설정하여 beforeunload 방지
    setIsModified(false);
    // 상태 업데이트 후 페이지 이동
    setTimeout(() => {
      window.history.pushState({}, '', '/hr/employee');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, 0);
  };

  const handleAddressComplete = (zipCode: string, address: string): void => {
    setFormData((prev) => ({ ...prev, zipCode, address }));
    setIsModified(true);
    // 상세주소로 포커스 이동
    setTimeout(() => {
      detailAddressRef.current?.focus();
    }, 100);
  };

  // 성명 입력 핸들러 (특수문자 체크)
  const handleNameChange = (value: string): void => {
    // 조합 중이거나 빈 값이면 그대로 허용 (삭제 가능하도록)
    if (isComposing || value === '') {
      handleChange('name', value);
      return;
    }

    // 유효하지 않은 문자 제거 (특수문자, 한글 초성 등)
    const filtered = value
      .split('')
      .filter((char) => /^[가-힣a-zA-Z0-9\s]$/.test(char))
      .join('');

    if (filtered !== value) {
      setErrors((prev) => ({ ...prev, name: '특수문자는 입력하실 수 없습니다.' }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.name;
        return newErrors;
      });
    }

    handleChange('name', filtered);
  };

  // 사번 입력 핸들러
  const handleEmployeeNumberChange = (value: string): void => {
    // 조합 중이거나 빈 값이면 그대로 허용 (삭제 가능하도록)
    if (isComposing || value === '') {
      handleChange('employeeNumber', value);
      return;
    }

    // 유효하지 않은 문자 제거 (한글 초성 등)
    const filtered = value
      .split('')
      .filter((char) => /^[가-힣a-zA-Z0-9!"#$%&'()*+,\-./:;<>=?@\[\\\]^_`{|}~]$/.test(char))
      .join('');

    handleChange('employeeNumber', filtered);
  };

  // 연락처 입력 핸들러
  const handleContactChange = (value: string): void => {
    if (!isValidContact(value)) {
      return;
    }
    handleChange('contact', value);
  };

  // 휴대폰번호 입력 핸들러
  const handlePhoneChange = (field: 'phone1' | 'phone2' | 'phone3', value: string): void => {
    if (!isOnlyDigits(value)) {
      return;
    }
    handleChange(field, value);
  };

  // 여권번호 입력 핸들러
  const handlePassportNumberChange = (value: string): void => {
    if (!isValidPassportNumber(value)) {
      return;
    }
    handleChange('passportNumber', value);
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

  // 이메일 blur 검증
  const handleEmailBlur = (): void => {
    if (!formData.email) return;

    if (!isValidEmail(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '이메일 형식이 맞지 않습니다.' }));
    }
  };

  // 주민등록번호 blur 검증
  const handleResidentRegistrationNumberBlur = (): void => {
    const { residentRegistrationNumberFront, residentRegistrationNumberBack } = formData;

    // 둘 다 입력되어 있을 때만 검증
    if (!residentRegistrationNumberFront || !residentRegistrationNumberBack) {
      return;
    }

    if (
      !isValidResidentRegistrationNumber(
        residentRegistrationNumberFront,
        residentRegistrationNumberBack
      )
    ) {
      setErrors((prev) => ({
        ...prev,
        residentRegistrationNumber: '유효하지 않은 주민등록번호입니다.',
      }));
    }
  };

  // 외국인등록번호 blur 검증
  const handleForeignerRegistrationNumberBlur = (): void => {
    const { foreignerRegistrationNumberFront, foreignerRegistrationNumberBack } = formData;

    // 둘 다 입력되어 있을 때만 검증
    if (!foreignerRegistrationNumberFront || !foreignerRegistrationNumberBack) {
      return;
    }

    if (
      !isValidForeignerRegistrationNumber(
        foreignerRegistrationNumberFront,
        foreignerRegistrationNumberBack
      )
    ) {
      setErrors((prev) => ({
        ...prev,
        foreignerRegistrationNumber: '유효하지 않은 외국인등록번호입니다.',
      }));
    }
  };

  // 날짜 blur 검증
  const handleDateBlur = (field: 'joinDate' | 'leaveDate' | 'birthDate'): void => {
    const value = formData[field];
    if (!value) return;

    if (!isValidDate(value)) {
      setErrors((prev) => ({ ...prev, [field]: '유효하지 않은 날짜입니다.' }));
    }
  };

  // 필수 필드 체크
  const isFormValid = (): boolean => {
    const {
      employeeNumber,
      name,
      nationalityType,
      residentRegistrationNumberFront,
      residentRegistrationNumberBack,
      foreignerRegistrationNumberFront,
      foreignerRegistrationNumberBack,
      passportNumber,
      birthDate,
      gender,
      nationality,
      email,
      joinDate,
    } = formData;

    // 기본 필수 필드
    if (!employeeNumber || !name || !email || !joinDate) {
      return false;
    }

    // 내국인: 주민등록번호 필수
    if (nationalityType === 'domestic') {
      if (!residentRegistrationNumberFront || !residentRegistrationNumberBack) {
        return false;
      }
    }

    // 외국인: 선택한 신분증 타입에 따라 필수 필드 검증, 국적 필수
    if (nationalityType === 'foreign') {
      if (!nationality) {
        return false;
      }

      const { foreignerIdType } = formData;

      // 외국인등록번호 선택 시
      if (foreignerIdType === 'foreigner') {
        if (!foreignerRegistrationNumberFront || !foreignerRegistrationNumberBack) {
          return false;
        }
      }

      // 여권번호 선택 시
      if (foreignerIdType === 'passport') {
        if (!passportNumber || !birthDate || !gender) {
          return false;
        }
      }
    }

    // 에러가 있으면 invalid
    if (Object.keys(errors).length > 0) {
      return false;
    }

    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    let finalIsDepartmentHead = formData.isDepartmentHead;

    // 퇴사일(오늘 이후) + 부서장 체크 시 Confirm 팝업
    if (formData.isDepartmentHead && formData.leaveDate && isTodayOrAfter(formData.leaveDate)) {
      const confirmed = window.confirm(
        '퇴사일 이후에는 부서장이 체크해제됩니다. 부서장으로 추가하시겠습니까?'
      );

      if (!confirmed) {
        return; // 취소 시 저장 중단
      }
    }

    // 부서장 체크가 되어 있을 때 중복 확인
    if (formData.isDepartmentHead && formData.departmentId) {
      const existingHead = await employeeService.getDepartmentHead(formData.departmentId);

      if (existingHead) {
        const department = organizations.find((o) => o.id === formData.departmentId);
        const departmentPath = department
          ? getOrganizationPath(department, organizations)
          : '선택한 부서';

        const confirmed = window.confirm(
          `${departmentPath}의 부서장은 ${existingHead.name}님으로 지정되어 있습니다. ${formData.name}님으로 변경하시겠습니까?\n\n아니오 선택 시, 부서장은 ${existingHead.name}님으로 유지됩니다.`
        );

        if (!confirmed) {
          // 새 직원은 부서장이 아님
          finalIsDepartmentHead = false;
        } else {
          // "예" 선택 시 기존 부서장 해제
          await employeeService.update(existingHead.id, { isDepartmentHead: false });
        }
      }
    }

    setIsSubmitting(true);

    try {
      const dto: CreateEmployeeDto = {
        employeeNumber: formData.employeeNumber,
        name: formData.name,
        nationalityType: formData.nationalityType,
        residentRegistrationNumber:
          formData.nationalityType === 'domestic'
            ? `${formData.residentRegistrationNumberFront}-${formData.residentRegistrationNumberBack}`
            : null,
        foreignerRegistrationNumber:
          formData.nationalityType === 'foreign' && formData.foreignerIdType === 'foreigner'
            ? `${formData.foreignerRegistrationNumberFront}-${formData.foreignerRegistrationNumberBack}`
            : null,
        passportNumber:
          formData.nationalityType === 'foreign' && formData.foreignerIdType === 'passport'
            ? formData.passportNumber
            : null,
        birthDate:
          formData.nationalityType === 'foreign' && formData.foreignerIdType === 'passport'
            ? formData.birthDate
            : null,
        gender:
          formData.nationalityType === 'foreign' && formData.foreignerIdType === 'passport'
            ? (formData.gender === '' ? null : formData.gender)
            : null,
        nationality: formData.nationality || null,
        residenceType: formData.residenceType,
        disabilityType: formData.disabilityType,
        email: formData.email,
        contact: formData.contact || null,
        phone:
          formData.phone1 && formData.phone2 && formData.phone3
            ? `${formData.phone1}-${formData.phone2}-${formData.phone3}`
            : null,
        zipCode: formData.zipCode || null,
        address: formData.address || null,
        detailAddress: formData.detailAddress || null,
        joinDate: formData.joinDate,
        leaveDate: formData.leaveDate || null,
        departmentId: formData.departmentId || null,
        position: formData.position || null,
        employmentTypeId: formData.employmentTypeId || null,
        isDepartmentHead: finalIsDepartmentHead,
        salaryType: formData.salaryType || null,
        salaryAmount: formData.salaryAmount ? parseFormattedNumber(formData.salaryAmount) : null,
        mealAllowance: formData.mealAllowance ? parseFormattedNumber(formData.mealAllowance) : null,
        bankName: formData.bankName || null,
        accountHolder: formData.accountHolder || null,
        accountNumber: formData.accountNumber || null,
      };

      await employeeService.create(dto);

      setIsModified(false);

      toast({
        title: '직원 추가를 완료했습니다.',
      });

      // 직원관리 목록으로 이동
      window.history.pushState({}, '', '/hr/employee');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <PageHeader title="직원 추가" showBackButton={true} onBack={handleCancel} />

        {/* 개인정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">개인정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* 사번 */}
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">
                  사번 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => handleEmployeeNumberChange(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  maxLength={30}
                  placeholder="사번을 입력하세요"
                />
                {errors.employeeNumber && (
                  <p className="text-sm text-red-500 mt-1">{errors.employeeNumber}</p>
                )}
              </div>

              {/* 성명 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  성명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  maxLength={30}
                  placeholder="성명을 입력하세요"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* 내외국인 여부 */}
              <div className="col-span-2 space-y-2">
                <Label>
                  내외국인 여부 <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={formData.nationalityType}
                  onValueChange={(value: 'domestic' | 'foreign') =>
                    handleChange('nationalityType', value)
                  }
                  className="h-10 flex items-center gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="domestic" id="domestic" />
                    <Label htmlFor="domestic" className="cursor-pointer">
                      내국인
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="foreign" id="foreign" />
                    <Label htmlFor="foreign" className="cursor-pointer">
                      외국인
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 내국인 - 주민등록번호 */}
              {formData.nationalityType === 'domestic' && (
                <div className="col-span-2 space-y-2">
                  <Label>
                    주민등록번호 <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.residentRegistrationNumberFront}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleChange('residentRegistrationNumberFront', value);
                        if (value.length === 6) {
                          residentBackRef.current?.focus();
                        }
                      }}
                      onBlur={handleResidentRegistrationNumberBlur}
                      maxLength={6}
                      placeholder="앞 6자리"
                      className="flex-1"
                    />
                    <span>-</span>
                    <Input
                      ref={residentBackRef}
                      type="text"
                      value={formData.residentRegistrationNumberBack}
                      onChange={(e) =>
                        handleChange('residentRegistrationNumberBack', e.target.value)
                      }
                      onBlur={handleResidentRegistrationNumberBlur}
                      maxLength={7}
                      placeholder="뒤 7자리"
                      className="flex-1"
                    />
                  </div>
                  {errors.residentRegistrationNumber && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.residentRegistrationNumber}
                    </p>
                  )}
                </div>
              )}

              {/* 외국인 - 신분증 선택 및 입력 */}
              {formData.nationalityType === 'foreign' && (
                <>
                  {/* 신분증 타입 선택 */}
                  <div className="col-span-2 space-y-2">
                    <Label>
                      신분증 선택 <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={formData.foreignerIdType}
                      onValueChange={(value: 'foreigner' | 'passport') => {
                        handleChange('foreignerIdType', value);
                        // 여권번호 선택 시 성별 기본값을 '남'으로 설정
                        if (value === 'passport') {
                          handleChange('gender', 'male');
                        }
                      }}
                      className="h-10 flex items-center gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="foreigner" id="id-foreigner" />
                        <Label htmlFor="id-foreigner" className="cursor-pointer">
                          외국인등록번호
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="passport" id="id-passport" />
                        <Label htmlFor="id-passport" className="cursor-pointer">
                          여권번호
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* 외국인등록번호 입력 */}
                  {formData.foreignerIdType === 'foreigner' && (
                    <>
                      <div className="space-y-2">
                        <Label>
                          외국인등록번호 <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formData.foreignerRegistrationNumberFront}
                            onChange={(e) => {
                              const value = e.target.value;
                              handleChange('foreignerRegistrationNumberFront', value);
                              if (value.length === 6) {
                                foreignerBackRef.current?.focus();
                              }
                            }}
                            onBlur={handleForeignerRegistrationNumberBlur}
                            maxLength={6}
                            placeholder="앞 6자리"
                            className="flex-1"
                          />
                          <span>-</span>
                          <Input
                            ref={foreignerBackRef}
                            type="text"
                            value={formData.foreignerRegistrationNumberBack}
                            onChange={(e) =>
                              handleChange('foreignerRegistrationNumberBack', e.target.value)
                            }
                            onBlur={handleForeignerRegistrationNumberBlur}
                            maxLength={7}
                            placeholder="뒤 7자리"
                            className="flex-1"
                          />
                        </div>
                        {errors.foreignerRegistrationNumber && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.foreignerRegistrationNumber}
                          </p>
                        )}
                      </div>

                      {/* 국적 */}
                      <div className="space-y-2">
                        <Label htmlFor="nationality">
                          국적 <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.nationality}
                          onValueChange={(value) => handleChange('nationality', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="국적을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.nameKo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* 여권번호 입력 */}
                  {formData.foreignerIdType === 'passport' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="passportNumber">
                          여권번호 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="passportNumber"
                          value={formData.passportNumber}
                          onChange={(e) => handlePassportNumberChange(e.target.value)}
                          placeholder="여권번호를 입력하세요"
                        />
                      </div>

                      {/* 국적 */}
                      <div className="space-y-2">
                        <Label htmlFor="nationality">
                          국적 <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={formData.nationality}
                          onValueChange={(value) => handleChange('nationality', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="국적을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.nameKo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          성별 <span className="text-red-500">*</span>
                        </Label>
                        <RadioGroup
                          value={formData.gender}
                          onValueChange={(value: 'male' | 'female') =>
                            handleChange('gender', value)
                          }
                          className="h-10 flex items-center gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" />
                            <Label htmlFor="male" className="cursor-pointer">
                              남
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" />
                            <Label htmlFor="female" className="cursor-pointer">
                              여
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="birthDate">
                          생년월일 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="birthDate"
                          value={formData.birthDate}
                          onChange={(e) => handleChange('birthDate', e.target.value)}
                          onBlur={() => handleDateBlur('birthDate')}
                          maxLength={8}
                          placeholder="YYYYMMDD"
                        />
                        {errors.birthDate && (
                          <p className="text-sm text-red-500 mt-1">{errors.birthDate}</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* 거주구분 */}
              <div className="col-span-2 space-y-2">
                <Label>
                  거주구분 <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={formData.residenceType}
                  onValueChange={(value: 'resident' | 'non-resident') =>
                    handleChange('residenceType', value)
                  }
                  className="h-10 flex items-center gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="resident" id="resident" />
                    <Label htmlFor="resident" className="cursor-pointer">
                      거주자
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non-resident" id="non-resident" />
                    <Label htmlFor="non-resident" className="cursor-pointer">
                      비거주자
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 장애여부 */}
              <div className="space-y-2">
                <Label htmlFor="disabilityType">
                  장애여부 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.disabilityType}
                  onValueChange={(
                    value: 'none' | 'disabled' | 'veteran' | 'severe'
                  ) => handleChange('disabilityType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">비장애인</SelectItem>
                    <SelectItem value="disabled">장애인복지법상 장애인</SelectItem>
                    <SelectItem value="veteran">국가유공자 중증환자</SelectItem>
                    <SelectItem value="severe">중증환자</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 이메일 */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="이메일을 입력하세요"
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* 연락처 */}
              <div className="space-y-2">
                <Label htmlFor="contact">
                  연락처
                </Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => handleContactChange(e.target.value)}
                  maxLength={30}
                  placeholder="연락처를 입력하세요 (+ ( ) - 숫자)"
                />
                {errors.contact && <p className="text-sm text-red-500 mt-1">{errors.contact}</p>}
              </div>

              {/* 휴대폰번호 */}
              <div className="space-y-2">
                <Label>
                  휴대폰번호
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.phone1}
                    onChange={(e) => {
                      const value = e.target.value;
                      handlePhoneChange('phone1', value);
                      if (value.length === 3) {
                        phone2Ref.current?.focus();
                      }
                    }}
                    maxLength={3}
                    placeholder="010"
                    className="flex-1"
                  />
                  <span>-</span>
                  <Input
                    ref={phone2Ref}
                    value={formData.phone2}
                    onChange={(e) => {
                      const value = e.target.value;
                      handlePhoneChange('phone2', value);
                      if (value.length === 4) {
                        phone3Ref.current?.focus();
                      }
                    }}
                    maxLength={4}
                    placeholder="1234"
                    className="flex-1"
                  />
                  <span>-</span>
                  <Input
                    ref={phone3Ref}
                    value={formData.phone3}
                    onChange={(e) => handlePhoneChange('phone3', e.target.value)}
                    maxLength={4}
                    placeholder="5678"
                    className="flex-1"
                  />
                </div>
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>

              {/* 입사일 */}
              <div className="space-y-2">
                <Label htmlFor="joinDate">
                  입사일 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="joinDate"
                  value={formData.joinDate}
                  onChange={(e) => handleChange('joinDate', e.target.value)}
                  onBlur={() => handleDateBlur('joinDate')}
                  maxLength={8}
                  placeholder="YYYYMMDD"
                />
                {errors.joinDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.joinDate}</p>
                )}
              </div>

              {/* 퇴사일 */}
              <div className="space-y-2">
                <Label htmlFor="leaveDate">
                  퇴사일
                </Label>
                <Input
                  id="leaveDate"
                  value={formData.leaveDate}
                  onChange={(e) => handleChange('leaveDate', e.target.value)}
                  onBlur={() => handleDateBlur('leaveDate')}
                  maxLength={8}
                  placeholder="YYYYMMDD"
                />
                {errors.leaveDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.leaveDate}</p>
                )}
              </div>

              {/* 주소 */}
              <div className="col-span-2 space-y-2">
                <Label>
                  주소
                </Label>
                <div className="flex gap-2">
                  <Input value={formData.zipCode} readOnly placeholder="우편번호" />
                  <Button type="button" onClick={() => setAddressDialogOpen(true)}>
                    주소 검색
                  </Button>
                </div>
                <Input value={formData.address} readOnly placeholder="주소" />
                <Input
                  ref={detailAddressRef}
                  value={formData.detailAddress}
                  onChange={(e) => handleChange('detailAddress', e.target.value)}
                  placeholder="상세주소"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 조직정보 섹션 */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">조직정보</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="mb-4 text-sm text-gray-600">
              ※ 조직관리 메뉴에서 부서, 직급, 근로형태를 관리할 수 있습니다.
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* 부서 */}
              <div className="space-y-2">
                <Label htmlFor="department">
                  부서
                </Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={(value) => {
                    handleChange('departmentId', value);
                    // 부서 변경 시 부서장 체크박스 초기화
                    if (formData.isDepartmentHead) {
                      handleChange('isDepartmentHead', false);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {getOrganizationPath(org, organizations)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 부서장 체크박스 */}
              <div className="space-y-2">
                <Label className="invisible">부서장</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Checkbox
                    id="isDepartmentHead"
                    checked={formData.isDepartmentHead}
                    onChange={(e) => handleChange('isDepartmentHead', e.target.checked)}
                    disabled={!formData.departmentId}
                  />
                  <Label htmlFor="isDepartmentHead" className="cursor-pointer">
                    부서장
                  </Label>
                </div>
                {errors.isDepartmentHead && (
                  <p className="text-sm text-red-500 mt-1">{errors.isDepartmentHead}</p>
                )}
              </div>

              {/* 직급 */}
              <div className="space-y-2">
                <Label htmlFor="position">
                  직급
                </Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => handleChange('position', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="직급을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 근로형태 */}
              <div className="space-y-2">
                <Label htmlFor="employmentType">
                  근로형태
                </Label>
                <Select
                  value={formData.employmentTypeId}
                  onValueChange={(value) => handleChange('employmentTypeId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="근로형태를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 급여정보 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">급여정보</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4" data-internal-actions="true">
        <div className="max-w-[1200px] mx-auto flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button variant="default" onClick={handleSubmit} disabled={!isFormValid() || isSubmitting}>
            {isSubmitting ? '추가 중...' : '추가'}
          </Button>
        </div>
      </div>

      {/* 주소 검색 다이얼로그 */}
      <AddressSearchDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onComplete={handleAddressComplete}
      />
    </div>
  );
}
