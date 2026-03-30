import { useState, useEffect, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
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
import { AddressSearchDialog } from './AddressSearchDialog';
import { employeeService } from '../services/employeeService';
import { employeeHistoryService } from '../services/employeeHistoryService';
import type { Employee } from '../types/employee';
import type { EmployeeHistoryChange } from '../types/employeeHistory';
import { COUNTRIES, findCountryByCode } from '@/shared/constants/countries';
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
import { formatDate } from '../types/employee';

interface EditPersonalInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  nationalityType: 'domestic' | 'foreign';
  foreignerIdType: 'foreigner' | 'passport';
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
}

interface FormErrors {
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

export function EditPersonalInfoDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditPersonalInfoDialogProps): JSX.Element {
  const [isComposing, setIsComposing] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const skipValidationRef = useRef(false);

  // 초기값 설정
  const getInitialFormData = (): FormData => {
    // 휴대폰번호 분리 (하이픈 있는 경우와 없는 경우 모두 처리)
    let phone: string[] = ['', '', ''];
    if (employee.phone) {
      if (employee.phone.includes('-')) {
        // 하이픈이 있는 경우: 010-1234-5678
        phone = employee.phone.split('-');
      } else {
        // 하이픈이 없는 경우: 01012345678 → ['010', '1234', '5678']
        const phoneDigits = employee.phone.replace(/\D/g, ''); // 숫자만 추출
        if (phoneDigits.length === 11) {
          phone = [
            phoneDigits.substring(0, 3),
            phoneDigits.substring(3, 7),
            phoneDigits.substring(7, 11),
          ];
        } else if (phoneDigits.length === 10) {
          phone = [
            phoneDigits.substring(0, 3),
            phoneDigits.substring(3, 6),
            phoneDigits.substring(6, 10),
          ];
        }
      }
    }

    const residentParts = employee.residentRegistrationNumber
      ? employee.residentRegistrationNumber.split('-')
      : ['', ''];
    const foreignerParts = employee.foreignerRegistrationNumber
      ? employee.foreignerRegistrationNumber.split('-')
      : ['', ''];

    // 외국인인 경우 신분증 타입 결정
    let foreignerIdType: 'foreigner' | 'passport' = 'foreigner';
    if (employee.nationalityType === 'foreign') {
      if (employee.passportNumber) {
        foreignerIdType = 'passport';
      } else if (employee.foreignerRegistrationNumber) {
        foreignerIdType = 'foreigner';
      }
    }

    return {
      name: employee.name,
      nationalityType: employee.nationalityType,
      foreignerIdType,
      residentRegistrationNumberFront: residentParts[0] || '',
      residentRegistrationNumberBack: residentParts[1] || '',
      foreignerRegistrationNumberFront: foreignerParts[0] || '',
      foreignerRegistrationNumberBack: foreignerParts[1] || '',
      passportNumber: employee.passportNumber || '',
      birthDate: employee.birthDate || '',
      gender: employee.gender || '',
      nationality: employee.nationality || '',
      residenceType: employee.residenceType,
      disabilityType: employee.disabilityType,
      email: employee.email,
      contact: employee.contact || '',
      phone1: phone[0] || '',
      phone2: phone[1] || '',
      phone3: phone[2] || '',
      zipCode: employee.zipCode || '',
      address: employee.address || '',
      detailAddress: employee.detailAddress || '',
      joinDate: employee.joinDate,
      leaveDate: employee.leaveDate || '',
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [errors, setErrors] = useState<FormErrors>({});

  const detailAddressRef = useRef<HTMLInputElement>(null);
  const residentBackRef = useRef<HTMLInputElement>(null);
  const foreignerBackRef = useRef<HTMLInputElement>(null);
  const phone2Ref = useRef<HTMLInputElement>(null);
  const phone3Ref = useRef<HTMLInputElement>(null);

  // Dialog가 열릴 때마다 폼 데이터 초기화
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setErrors({});
      setIsModified(false);
    }
  }, [open, employee]);

  const handleChange = (field: keyof FormData, value: string | boolean): void => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // 퇴사일 변경 시 부서장 여부 확인
      if (field === 'leaveDate' && typeof value === 'string') {
        if (employee.isDepartmentHead && value && isBeforeToday(value)) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            leaveDate: '부서장으로 지정된 직원은 퇴사일을 오늘 이전 날짜로 지정할 수 없습니다. 조직정보 탭에서 부서장 지정을 먼저 해제해주세요.',
          }));
        } else {
          setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors.leaveDate;
            return newErrors;
          });
        }
      }

      return newData;
    });
    setIsModified(true);

    // 에러 초기화 (퇴사일 제외 - 위에서 처리)
    if (field !== 'leaveDate') {
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof FormErrors];
          return newErrors;
        });
      }
    }
  };

  const handleAddressComplete = (zipCode: string, address: string): void => {
    setFormData((prev) => ({ ...prev, zipCode, address }));
    setIsModified(true);
    setTimeout(() => {
      detailAddressRef.current?.focus();
    }, 100);
  };

  // Dialog 닫기 시도 시 confirm 체크
  const handleClose = (): void => {
    if (isModified) {
      const confirmed = window.confirm('개인정보 수정을 취소하시겠습니까?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  // Dialog의 onOpenChange override (ESC 키, 외부 영역 클릭 등)
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      // 닫으려고 할 때
      if (isModified) {
        const confirmed = window.confirm('개인정보 수정을 취소하시겠습니까?');
        if (!confirmed) return;
      }
    }
    onOpenChange(open);
  };

  // 성명 입력 핸들러
  const handleNameChange = (value: string): void => {
    if (isComposing || value === '') {
      handleChange('name', value);
      return;
    }

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

  // 이메일 blur 검증
  const handleEmailBlur = (): void => {
    if (!formData.email) return;

    if (!isValidEmail(formData.email)) {
      setErrors((prev) => ({ ...prev, email: '이메일 형식이 맞지 않습니다.' }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  // 주민등록번호 blur 검증
  const handleResidentRegistrationNumberBlur = (): void => {
    // 자동 포커스 이동 시에는 검증 건너뛰기
    if (skipValidationRef.current) {
      skipValidationRef.current = false;
      return;
    }

    const { residentRegistrationNumberFront, residentRegistrationNumberBack } = formData;

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
    } else {
      // 유효한 경우 에러 클리어 (완전히 삭제)
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.residentRegistrationNumber;
        return newErrors;
      });
    }
  };

  // 외국인등록번호 blur 검증
  const handleForeignerRegistrationNumberBlur = (): void => {
    // 자동 포커스 이동 시에는 검증 건너뛰기
    if (skipValidationRef.current) {
      skipValidationRef.current = false;
      return;
    }

    const { foreignerRegistrationNumberFront, foreignerRegistrationNumberBack } = formData;

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
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.foreignerRegistrationNumber;
        return newErrors;
      });
    }
  };

  // 날짜 blur 검증
  const handleDateBlur = (field: 'joinDate' | 'leaveDate' | 'birthDate'): void => {
    const value = formData[field];
    if (!value) return;

    if (!isValidDate(value)) {
      setErrors((prev) => ({ ...prev, [field]: '유효하지 않은 날짜입니다.' }));
    } else {
      // 날짜가 유효한 경우
      // 퇴사일인 경우 부서장 검증도 수행
      if (field === 'leaveDate') {
        if (employee.isDepartmentHead && value && isBeforeToday(value)) {
          setErrors((prev) => ({
            ...prev,
            leaveDate: '부서장으로 지정된 직원은 퇴사일을 오늘 이전 날짜로 지정할 수 없습니다. 조직정보 탭에서 부서장 지정을 먼저 해제해주세요.',
          }));
        } else {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      } else {
        // 다른 날짜 필드는 에러 클리어
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  // 필수 필드 체크
  const isFormValid = (): boolean => {
    const {
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
    if (!name || !email || !joinDate) {
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

    // 에러가 있으면 invalid (빈 값은 제외)
    const hasErrors = Object.entries(errors).some(([, value]) => {
      return value !== undefined && value !== '';
    });

    if (hasErrors) {
      return false;
    }

    return true;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!isFormValid()) {
      toast({
        title: '입력 오류',
        description: '필수 필드를 모두 입력하고 유효성 검사를 통과해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 변경 이력 추적
      const changes: EmployeeHistoryChange[] = [];

      // null/undefined/빈 문자열을 null로 정규화하는 헬퍼 함수
      const normalize = (value: string | number | null | undefined): string | number | null => {
        if (value === '' || value === undefined) return null;
        return value;
      };

      // 전화번호 정규화 (하이픈 제거 후 비교)
      const normalizePhone = (phone: string | null | undefined): string | null => {
        if (!phone || phone === '') return null;
        return phone.replace(/\D/g, ''); // 숫자만 추출
      };

      // 성명
      if (formData.name !== employee.name) {
        changes.push({
          fieldName: '성명',
          fieldKey: 'name',
          oldValue: employee.name,
          newValue: formData.name,
          displayOldValue: employee.name,
          displayNewValue: formData.name,
        });
      }

      // 내외국인 여부
      if (formData.nationalityType !== employee.nationalityType) {
        changes.push({
          fieldName: '내외국인 여부',
          fieldKey: 'nationalityType',
          oldValue: employee.nationalityType,
          newValue: formData.nationalityType,
          displayOldValue: employee.nationalityType === 'domestic' ? '내국인' : '외국인',
          displayNewValue: formData.nationalityType === 'domestic' ? '내국인' : '외국인',
        });
      }

      // 주민등록번호
      const newResidentNumber =
        formData.nationalityType === 'domestic'
          ? `${formData.residentRegistrationNumberFront}-${formData.residentRegistrationNumberBack}`
          : null;
      if (normalize(newResidentNumber) !== normalize(employee.residentRegistrationNumber)) {
        changes.push({
          fieldName: '주민등록번호',
          fieldKey: 'residentRegistrationNumber',
          oldValue: employee.residentRegistrationNumber,
          newValue: newResidentNumber,
          displayOldValue: employee.residentRegistrationNumber || '-',
          displayNewValue: newResidentNumber || '-',
        });
      }

      // 외국인등록번호
      const newForeignerNumber =
        formData.nationalityType === 'foreign' && formData.foreignerIdType === 'foreigner'
          ? `${formData.foreignerRegistrationNumberFront}-${formData.foreignerRegistrationNumberBack}`
          : null;
      if (normalize(newForeignerNumber) !== normalize(employee.foreignerRegistrationNumber)) {
        changes.push({
          fieldName: '외국인등록번호',
          fieldKey: 'foreignerRegistrationNumber',
          oldValue: employee.foreignerRegistrationNumber,
          newValue: newForeignerNumber,
          displayOldValue: employee.foreignerRegistrationNumber || '-',
          displayNewValue: newForeignerNumber || '-',
        });
      }

      // 여권번호
      const newPassportNumber =
        formData.nationalityType === 'foreign' && formData.foreignerIdType === 'passport'
          ? formData.passportNumber
          : null;
      if (normalize(newPassportNumber) !== normalize(employee.passportNumber)) {
        changes.push({
          fieldName: '여권번호',
          fieldKey: 'passportNumber',
          oldValue: employee.passportNumber,
          newValue: newPassportNumber,
          displayOldValue: employee.passportNumber || '-',
          displayNewValue: newPassportNumber || '-',
        });
      }

      // 생년월일
      const newBirthDate =
        formData.nationalityType === 'foreign' && formData.foreignerIdType === 'passport'
          ? formData.birthDate
          : null;
      if (normalize(newBirthDate) !== normalize(employee.birthDate)) {
        changes.push({
          fieldName: '생년월일',
          fieldKey: 'birthDate',
          oldValue: employee.birthDate,
          newValue: newBirthDate,
          displayOldValue: employee.birthDate ? formatDate(employee.birthDate) : '-',
          displayNewValue: newBirthDate ? formatDate(newBirthDate) : '-',
        });
      }

      // 성별
      const newGender =
        formData.nationalityType === 'foreign' && formData.foreignerIdType === 'passport'
          ? (formData.gender === '' ? null : formData.gender)
          : null;
      if (normalize(newGender) !== normalize(employee.gender)) {
        const genderLabel = (g: 'male' | 'female' | null): string => {
          if (!g) return '-';
          return g === 'male' ? '남' : '여';
        };
        changes.push({
          fieldName: '성별',
          fieldKey: 'gender',
          oldValue: employee.gender,
          newValue: newGender,
          displayOldValue: genderLabel(employee.gender),
          displayNewValue: genderLabel(newGender),
        });
      }

      // 국적
      const newNationality = formData.nationality || null;
      if (normalize(newNationality) !== normalize(employee.nationality)) {
        const getNationalityLabel = (code: string | null): string => {
          if (!code) return '-';
          return findCountryByCode(code)?.nameKo || code;
        };
        changes.push({
          fieldName: '국적',
          fieldKey: 'nationality',
          oldValue: employee.nationality,
          newValue: newNationality,
          displayOldValue: getNationalityLabel(employee.nationality),
          displayNewValue: getNationalityLabel(newNationality),
        });
      }

      // 거주구분
      if (formData.residenceType !== employee.residenceType) {
        changes.push({
          fieldName: '거주구분',
          fieldKey: 'residenceType',
          oldValue: employee.residenceType,
          newValue: formData.residenceType,
          displayOldValue: employee.residenceType === 'resident' ? '거주자' : '비거주자',
          displayNewValue: formData.residenceType === 'resident' ? '거주자' : '비거주자',
        });
      }

      // 장애여부
      if (formData.disabilityType !== employee.disabilityType) {
        const disabilityLabel = (type: string): string => {
          const labels: Record<string, string> = {
            none: '비장애인',
            disabled: '장애인복지법상 장애인',
            veteran: '국가유공자 중증환자',
            severe: '중증환자',
          };
          return labels[type] || type;
        };
        changes.push({
          fieldName: '장애여부',
          fieldKey: 'disabilityType',
          oldValue: employee.disabilityType,
          newValue: formData.disabilityType,
          displayOldValue: disabilityLabel(employee.disabilityType),
          displayNewValue: disabilityLabel(formData.disabilityType),
        });
      }

      // 이메일
      if (formData.email !== employee.email) {
        changes.push({
          fieldName: '이메일',
          fieldKey: 'email',
          oldValue: employee.email,
          newValue: formData.email,
          displayOldValue: employee.email,
          displayNewValue: formData.email,
        });
      }

      // 연락처
      const newContact = formData.contact || null;
      if (normalize(newContact) !== normalize(employee.contact)) {
        changes.push({
          fieldName: '연락처',
          fieldKey: 'contact',
          oldValue: employee.contact,
          newValue: newContact,
          displayOldValue: employee.contact || '-',
          displayNewValue: newContact || '-',
        });
      }

      // 휴대폰번호
      const newPhone =
        formData.phone1 && formData.phone2 && formData.phone3
          ? `${formData.phone1}-${formData.phone2}-${formData.phone3}`
          : null;
      if (normalizePhone(newPhone) !== normalizePhone(employee.phone)) {
        changes.push({
          fieldName: '휴대폰번호',
          fieldKey: 'phone',
          oldValue: employee.phone,
          newValue: newPhone,
          displayOldValue: employee.phone || '-',
          displayNewValue: newPhone || '-',
        });
      }

      // 우편번호
      const newZipCode = formData.zipCode || null;
      if (normalize(newZipCode) !== normalize(employee.zipCode)) {
        changes.push({
          fieldName: '우편번호',
          fieldKey: 'zipCode',
          oldValue: employee.zipCode,
          newValue: newZipCode,
          displayOldValue: employee.zipCode || '-',
          displayNewValue: newZipCode || '-',
        });
      }

      // 주소
      const newAddress = formData.address || null;
      if (normalize(newAddress) !== normalize(employee.address)) {
        changes.push({
          fieldName: '주소',
          fieldKey: 'address',
          oldValue: employee.address,
          newValue: newAddress,
          displayOldValue: employee.address || '-',
          displayNewValue: newAddress || '-',
        });
      }

      // 상세주소
      const newDetailAddress = formData.detailAddress || null;
      if (normalize(newDetailAddress) !== normalize(employee.detailAddress)) {
        changes.push({
          fieldName: '상세주소',
          fieldKey: 'detailAddress',
          oldValue: employee.detailAddress,
          newValue: newDetailAddress,
          displayOldValue: employee.detailAddress || '-',
          displayNewValue: newDetailAddress || '-',
        });
      }

      // 입사일
      if (formData.joinDate !== employee.joinDate) {
        changes.push({
          fieldName: '입사일',
          fieldKey: 'joinDate',
          oldValue: employee.joinDate,
          newValue: formData.joinDate,
          displayOldValue: formatDate(employee.joinDate),
          displayNewValue: formatDate(formData.joinDate),
        });
      }

      // 퇴사일
      const newLeaveDate = formData.leaveDate || null;
      if (normalize(newLeaveDate) !== normalize(employee.leaveDate)) {
        changes.push({
          fieldName: '퇴사일',
          fieldKey: 'leaveDate',
          oldValue: employee.leaveDate,
          newValue: newLeaveDate,
          displayOldValue: employee.leaveDate ? formatDate(employee.leaveDate) : '-',
          displayNewValue: newLeaveDate ? formatDate(newLeaveDate) : '-',
        });
      }

      // 직원 정보 업데이트
      await employeeService.update(employee.id, {
        name: formData.name,
        nationalityType: formData.nationalityType,
        residentRegistrationNumber: newResidentNumber,
        foreignerRegistrationNumber: newForeignerNumber,
        passportNumber: newPassportNumber,
        birthDate: newBirthDate,
        gender: newGender,
        nationality: newNationality,
        residenceType: formData.residenceType,
        disabilityType: formData.disabilityType,
        email: formData.email,
        contact: newContact,
        phone: newPhone,
        zipCode: newZipCode,
        address: newAddress,
        detailAddress: newDetailAddress,
        joinDate: formData.joinDate,
        leaveDate: newLeaveDate,
      });

      // 이력 저장 (변경사항이 있을 때만)
      if (changes.length > 0) {
        await employeeHistoryService.create({
          employeeId: employee.id,
          category: 'personal',
          categoryName: '개인정보',
          changes,
          modifiedBy: '관리자',
        });
      }

      toast({
        title: '개인정보 수정을 완료했습니다.',
      });

      setIsModified(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: '개인정보 수정 실패',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>개인정보 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* 사번 (수정 불가) */}
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">사번</Label>
                <Input
                  id="employeeNumber"
                  value={employee.employeeNumber}
                  disabled
                  className="bg-gray-50"
                />
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
                          skipValidationRef.current = true;
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
                      onValueChange={(value: 'foreigner' | 'passport') =>
                        handleChange('foreignerIdType', value)
                      }
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
                                skipValidationRef.current = true;
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
                  onValueChange={(value: 'none' | 'disabled' | 'veteran' | 'severe') =>
                    handleChange('disabilityType', value)
                  }
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
                <Label htmlFor="contact">연락처</Label>
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
                <Label>휴대폰번호</Label>
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
                <Label htmlFor="leaveDate">퇴사일</Label>
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
                <Label>주소</Label>
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button variant="default" onClick={handleSubmit} disabled={!isFormValid() || isSubmitting}>
              {isSubmitting ? '수정 중...' : '수정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 주소 검색 다이얼로그 */}
      <AddressSearchDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onComplete={handleAddressComplete}
      />
    </>
  );
}
