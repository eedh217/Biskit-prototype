import { useState, useEffect, useMemo } from 'react';
import { Info, Search, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { EmployeeCombobox } from '../components/EmployeeCombobox';
import { toast } from '@/shared/hooks/use-toast';
import {
  DependentManagementForm,
  EmployeeDependentManagement,
  DependentWithManagementInfo,
  DEPENDENT_RELATIONSHIP_CODES,
  DISABILITY_TYPE_CODES,
  RESIDENCE_STATUS_CODES,
  DEPENDENT_ACQUISITION_LOSS_CODES,
} from '../types/insurance';
import type { Employee } from '../types/employee';
import { COUNTRIES } from '@/shared/constants/countries';
import { v4 as uuidv4 } from 'uuid';
import { loadWorkplaceInfo, saveWorkplaceInfo } from '../services/insuranceService';

// 스토리지 키
const TEMP_STORAGE_KEY = 'biskit_dependent_management_temp';
const HISTORY_STORAGE_KEY = 'biskit_dependent_management_history';

// 임시 저장 데이터 로드
function loadTempForm(): DependentManagementForm | null {
  const data = localStorage.getItem(TEMP_STORAGE_KEY);
  return data ? JSON.parse(data) : null;
}

// 임시 저장
function saveTempForm(formData: DependentManagementForm): void {
  localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(formData));
}

// 임시 저장 삭제
function clearTempForm(): void {
  localStorage.removeItem(TEMP_STORAGE_KEY);
}

// 신고내역 저장
function saveDependentHistory(
  reportDate: string,
  workplace: DependentManagementForm['workplace'],
  employees: EmployeeDependentManagement[]
): void {
  const histories = getDependentHistories();
  const newHistory = {
    id: uuidv4(),
    reportDate,
    workplace,
    employees,
    createdAt: new Date().toISOString(),
  };
  histories.unshift(newHistory);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(histories));
}

// 신고내역 조회
function getDependentHistories(
  startDate?: string,
  endDate?: string,
  search?: string
): any[] {
  const data = localStorage.getItem(HISTORY_STORAGE_KEY);
  let histories = data ? JSON.parse(data) : [];

  // 기간 필터링
  if (startDate) {
    histories = histories.filter((h: any) => h.reportDate >= startDate);
  }
  if (endDate) {
    histories = histories.filter((h: any) => h.reportDate <= endDate);
  }

  // 검색어 필터링 (사번 또는 성명)
  if (search) {
    const searchLower = search.toLowerCase();
    histories = histories.filter((h: any) =>
      h.employees.some(
        (emp: EmployeeDependentManagement) =>
          emp.employeeNumber?.toLowerCase().includes(searchLower) ||
          emp.name.toLowerCase().includes(searchLower)
      )
    );
  }

  return histories;
}

// 기본 직원 데이터 생성 함수
const createDefaultEmployee = (): EmployeeDependentManagement => ({
  employeeId: '',
  employeeNumber: '',
  name: '',
  residentNumber: '',
  phoneNumber: '',
  dependents: [
    {
      relationship: '',
      name: '',
      residentNumber: '',
      isDisabledOrVeteran: false,
      disabilityTypeCode: '',
      registrationDate: '',
      isForeigner: false,
      nationality: '',
      residenceStatus: '',
      residencePeriod: '',
      acquisitionOrLossType: 'acquisition' as const,
      acquisitionOrLossDate: '',
      acquisitionOrLossCode: '',
    },
  ],
});

export function DependentManagement(): JSX.Element {
  const [isComposing, setIsComposing] = useState(false);

  // 사업장 정보 (3개 필드만)
  const [workplace, setWorkplace] = useState({
    managementNumber: '',
    name: '',
    phoneNumber: '',
  });

  // 직원 정보 (1명만)
  const [employee, setEmployee] = useState<EmployeeDependentManagement>(createDefaultEmployee());

  // 임시저장 정보
  const [hasTempData, setHasTempData] = useState(false);
  const [tempSavedAt, setTempSavedAt] = useState<string>('');

  // 신고내역 조회 Dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [histories, setHistories] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1month');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 신고 확인 Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [faxNumber, setFaxNumber] = useState('');

  // 스크롤 위치 감지 (하단 버튼 영역 그림자 제어)
  const [isAtBottom, setIsAtBottom] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    // 임시 저장 데이터 확인
    const tempData = loadTempForm();
    if (tempData) {
      setHasTempData(true);
      setTempSavedAt(tempData.savedAt || '');
    }

    // 다른 보험 메뉴와 공유되는 사업장 정보 불러오기
    const sharedWorkplaceInfo = loadWorkplaceInfo();
    if (sharedWorkplaceInfo) {
      setWorkplace({
        managementNumber: sharedWorkplaceInfo.managementNumber || '',
        name: sharedWorkplaceInfo.name || '',
        phoneNumber: sharedWorkplaceInfo.phoneNumber || '',
      });
    }
  }, []);

  // 신고내역 Dialog 열릴 때 기본 기간 설정 (1개월)
  useEffect(() => {
    if (historyDialogOpen) {
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);

      setHistoryEndDate(format(today, 'yyyy-MM-dd'));
      setHistoryStartDate(format(oneMonthAgo, 'yyyy-MM-dd'));
      setSelectedPeriod('1month');
    }
  }, [historyDialogOpen]);

  // 스크롤 위치 감지 (하단 버튼 영역 그림자 제어)
  useEffect(() => {
    const handleScroll = (): void => {
      const scrollableElement = document.querySelector('main');
      if (scrollableElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
        setIsAtBottom(atBottom);
      }
    };

    const scrollableElement = document.querySelector('main');
    scrollableElement?.addEventListener('scroll', handleScroll);

    // 초기 확인
    handleScroll();

    return () => {
      scrollableElement?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 사업장 정보 변경 핸들러
  const handleWorkplaceChange = (field: keyof typeof workplace, value: string): void => {
    setWorkplace((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 직원 정보 변경
  const handleEmployeeChange = (
    field: keyof EmployeeDependentManagement,
    value: any
  ): void => {
    setEmployee((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 주민등록번호/외국인등록번호 포맷팅 (000000-0000000)
  const handleResidentNumberChange = (value: string): void => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');

    // 13자리 제한
    const limited = numbers.slice(0, 13);

    // 6자리 이후 하이픈 자동 추가
    let formatted = limited;
    if (limited.length > 6) {
      formatted = `${limited.slice(0, 6)}-${limited.slice(6)}`;
    }

    handleEmployeeChange('residentNumber', formatted);
  };

  // 피부양자 주민등록번호/외국인등록번호 포맷팅
  const handleDependentResidentNumberChange = (
    dependentIndex: number,
    value: string
  ): void => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');

    // 13자리 제한
    const limited = numbers.slice(0, 13);

    // 6자리 이후 하이픈 자동 추가
    let formatted = limited;
    if (limited.length > 6) {
      formatted = `${limited.slice(0, 6)}-${limited.slice(6)}`;
    }

    handleDependentChange(dependentIndex, 'residentNumber', formatted);
  };

  // 피부양자 날짜 입력 검증
  const handleDependentDateChange = (
    dependentIndex: number,
    field: keyof DependentWithManagementInfo,
    value: string
  ): void => {
    // 빈 값은 허용
    if (value === '') {
      handleDependentChange(dependentIndex, field, value);
      return;
    }

    // 10자리 제한 (YYYY-MM-DD)
    if (value.length > 10) {
      return;
    }

    // 연도가 4자리를 초과하지 않도록 제한
    const parts = value.split('-');
    if (parts[0] && parts[0].length > 4) {
      return;
    }

    handleDependentChange(dependentIndex, field, value);
  };

  // 콤보박스에서 직원 선택 시 정보 자동 입력
  const handleSelectEmployeeFromCombobox = (selectedEmployee: Employee | null): void => {
    if (!selectedEmployee) return;

    setEmployee((prev) => ({
      ...prev,
      employeeId: selectedEmployee.id,
      employeeNumber: selectedEmployee.employeeNumber,
      name: selectedEmployee.name,
      residentNumber:
        selectedEmployee.residentRegistrationNumber ||
        selectedEmployee.foreignerRegistrationNumber ||
        '',
      phoneNumber: selectedEmployee.phone || '',
    }));
  };

  // 피부양자 추가
  const handleAddDependent = (): void => {
    const newDependent: DependentWithManagementInfo = {
      relationship: '',
      name: '',
      residentNumber: '',
      isDisabledOrVeteran: false,
      disabilityTypeCode: '',
      registrationDate: '',
      isForeigner: false,
      nationality: '',
      residenceStatus: '',
      residencePeriod: '',
      acquisitionOrLossType: 'acquisition',
      acquisitionOrLossDate: '',
      acquisitionOrLossCode: '',
    };

    const updatedDependents = [...employee.dependents, newDependent];
    handleEmployeeChange('dependents', updatedDependents);
  };

  // 피부양자 정보 변경
  const handleDependentChange = (
    dependentIndex: number,
    field: keyof DependentWithManagementInfo,
    value: any
  ): void => {
    const updatedDependents = [...employee.dependents];
    updatedDependents[dependentIndex] = {
      ...updatedDependents[dependentIndex],
      [field]: value,
    };
    handleEmployeeChange('dependents', updatedDependents);
  };

  // 피부양자 삭제
  const handleDeleteDependent = (dependentIndex: number): void => {
    const updatedDependents = employee.dependents.filter((_, idx) => idx !== dependentIndex);
    handleEmployeeChange('dependents', updatedDependents);
  };

  // 임시 저장
  const handleTempSave = (): void => {
    const formData: DependentManagementForm = {
      workplace,
      employees: [employee],
      reportDate: format(new Date(), 'yyyy-MM-dd'),
    };

    saveTempForm(formData);
    const now = new Date().toISOString();
    setHasTempData(true);
    setTempSavedAt(now);

    toast({
      title: '임시 저장되었습니다.',
    });
  };

  // 임시 저장 불러오기
  const handleLoadTempData = (): void => {
    const tempData = loadTempForm();
    if (!tempData) {
      toast({
        title: '불러올 임시 저장 데이터가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    // 현재 작성 중인 데이터가 있는지 확인
    const hasCurrentData =
      workplace.managementNumber ||
      workplace.name ||
      workplace.phoneNumber ||
      employee.name ||
      employee.residentNumber ||
      employee.phoneNumber;

    // 현재 데이터가 있으면 확인 메시지 표시
    if (hasCurrentData) {
      if (
        !window.confirm(
          '임시저장 데이터를 불러올 경우, 현재 입력한 데이터는 사라집니다. 불러오시겠습니까?'
        )
      ) {
        return;
      }
    }

    setWorkplace(tempData.workplace);
    if (tempData.employees.length > 0) {
      setEmployee(tempData.employees[0]);
    }

    toast({
      title: '임시 저장 데이터를 불러왔습니다.',
    });
  };

  // 임시 저장 삭제
  const handleClearTempData = (): void => {
    clearTempForm();
    setHasTempData(false);
    setTempSavedAt('');

    toast({
      title: '임시 저장 데이터를 삭제했습니다.',
    });
  };

  // 신고 확인 다이얼로그용 주소 추출
  // 서울특별시/광역시: 구까지, 도 지역: 시까지 표시
  const getShortAddress = (fullAddress: string): string => {
    // 서울특별시, 광역시인 경우 구까지 표시
    if (fullAddress.includes('서울특별시') || fullAddress.includes('광역시')) {
      const match = fullAddress.match(/(.*?구)/);
      return match ? match[0] : fullAddress.split(' ').slice(0, 2).join(' ');
    }
    // 도 지역인 경우 시까지 표시
    const match = fullAddress.match(/(.*?시)/);
    return match ? match[0] : (fullAddress.split(' ')[0] ?? '');
  };

  // 필수값 검증
  const isFormValid = useMemo(() => {
    // 사업장 정보 필수값 검증
    if (!workplace.managementNumber || !workplace.name || !workplace.phoneNumber) {
      return false;
    }

    // 직원 정보 필수값 검증
    if (!employee.employeeId || !employee.name || !employee.residentNumber || !employee.phoneNumber) {
      return false;
    }

    // 피부양자가 없으면 false
    if (employee.dependents.length === 0) {
      return false;
    }

    // 피부양자 필수값 검증
    for (const dep of employee.dependents) {
      // 기본 필수값 검증
      if (
        !dep.name ||
        !dep.residentNumber ||
        !dep.acquisitionOrLossDate ||
        !dep.acquisitionOrLossCode
      ) {
        return false;
      }

      // 취득인 경우에만 피부양자 관계 필수
      if (dep.acquisitionOrLossType === 'acquisition' && !dep.relationship) {
        return false;
      }

      // 장애인·국가유공자인 경우
      if (dep.isDisabledOrVeteran) {
        if (!dep.disabilityTypeCode || !dep.registrationDate) {
          return false;
        }
      }

      // 외국인인 경우
      if (dep.isForeigner) {
        if (!dep.nationality || !dep.residenceStatus || !dep.residencePeriod) {
          return false;
        }
      }
    }

    return true;
  }, [workplace, employee]);

  // 신고하기 버튼 클릭 (확인 다이얼로그 열기)
  const handleSubmit = (): void => {
    setConfirmDialogOpen(true);
  };

  // 신고 확인 후 실제 신고 처리
  const handleConfirmSubmit = (): void => {
    // 신고내역 저장
    const reportDate = format(new Date(), 'yyyy-MM-dd');
    saveDependentHistory(reportDate, workplace, [employee]);

    // 사업장 정보를 다른 보험 메뉴와 공유하도록 저장
    saveWorkplaceInfo({
      managementNumber: workplace.managementNumber,
      name: workplace.name,
      phoneNumber: workplace.phoneNumber,
    });

    // 임시 저장 데이터 삭제
    clearTempForm();
    setHasTempData(false);
    setTempSavedAt('');

    toast({
      title: '피부양자 관리 신고가 완료되었습니다.',
    });

    // 초기화
    setEmployee(createDefaultEmployee());

    // 확인 다이얼로그 닫기
    setConfirmDialogOpen(false);
  };

  // 신고내역 조회
  const handleSearchHistory = (): void => {
    const results = getDependentHistories(
      historyStartDate || undefined,
      historyEndDate || undefined,
      historySearch || undefined
    );
    setHistories(results);
    setCurrentPage(1);
  };

  // 신고내역 Dialog 열기
  const handleOpenHistoryDialog = (): void => {
    setHistoryDialogOpen(true);
    setHistorySearch('');
    setCurrentPage(1);
    // 검색어 없이 전체 내역 조회
    const results = getDependentHistories(
      historyStartDate || undefined,
      historyEndDate || undefined,
      undefined
    );
    setHistories(results);
  };

  // 기간 설정 버튼 클릭
  const handlePeriodChange = (period: string): void => {
    const today = new Date();
    const startDate = new Date(today);

    switch (period) {
      case 'today':
        // 시작일 = 오늘
        break;
      case '1week':
        startDate.setDate(today.getDate() - 7);
        break;
      case '1month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(today.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }

    setHistoryStartDate(format(startDate, 'yyyy-MM-dd'));
    setHistoryEndDate(format(today, 'yyyy-MM-dd'));
    setSelectedPeriod(period);
    setCurrentPage(1);
  };

  // 시작일 직접 변경 시 기간 버튼 선택 해제
  const handleHistoryStartDateChange = (value: string): void => {
    setHistoryStartDate(value);
    setSelectedPeriod('');
  };

  // 종료일 직접 변경 시 기간 버튼 선택 해제
  const handleHistoryEndDateChange = (value: string): void => {
    setHistoryEndDate(value);
    setSelectedPeriod('');
  };

  return (
    <div className={`space-y-6 ${!isAtBottom ? 'pb-24' : 'pb-16'}`}>
      <PageHeader
        title="피부양자 관리"
        showBackButton={false}
        actions={
          <Button variant="outline" onClick={handleOpenHistoryDialog}>
            신고내역 조회
          </Button>
        }
      />

      {/* 사업장 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>사업장 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="managementNumber">사업장관리번호 *</Label>
              <Input
                id="managementNumber"
                value={workplace.managementNumber}
                onChange={(e) => handleWorkplaceChange('managementNumber', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="예: 1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workplaceName">명칭 *</Label>
              <Input
                id="workplaceName"
                value={workplace.name}
                onChange={(e) => handleWorkplaceChange('name', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호 *</Label>
              <Input
                id="phoneNumber"
                value={workplace.phoneNumber}
                onChange={(e) => {
                  // 숫자, +, (, ), - 만 허용
                  const value = e.target.value;
                  if (/^[0-9+()-]*$/.test(value)) {
                    handleWorkplaceChange('phoneNumber', value);
                  }
                }}
                placeholder="예: 02-1234-5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 직원 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>직원 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>성명 *</Label>
              <EmployeeCombobox
                value={employee.employeeId}
                onChange={(selectedEmployee) =>
                  handleSelectEmployeeFromCombobox(selectedEmployee)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>주민등록번호/외국인등록번호 *</Label>
              <Input
                value={employee.residentNumber}
                readOnly
                placeholder="예: 900101-1234567"
              />
            </div>
            <div className="space-y-2">
              <Label>전화번호(휴대폰번호) *</Label>
              <Input
                value={employee.phoneNumber}
                readOnly
                placeholder="예: 010-1234-5678"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 피부양자 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>피부양자 목록</CardTitle>
            <Button size="sm" onClick={handleAddDependent}>
              <Plus className="h-4 w-4 mr-1" />
              피부양자 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {employee.dependents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">피부양자를 추가하세요.</div>
          ) : (
            <div className="space-y-6">
              {employee.dependents.map((dep, depIdx) => (
                <Card key={depIdx} className="border-2">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">피부양자 {depIdx + 1}</div>
                      {depIdx > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDependent(depIdx)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>구분 *</Label>
                        <RadioGroup
                          value={dep.acquisitionOrLossType || 'acquisition'}
                          onValueChange={(value: 'acquisition' | 'loss') =>
                            handleDependentChange(depIdx, 'acquisitionOrLossType', value)
                          }
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="acquisition" id={`acquisition-${depIdx}`} />
                              <Label htmlFor={`acquisition-${depIdx}`} className="font-normal cursor-pointer">
                                취득
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="loss" id={`loss-${depIdx}`} />
                              <Label htmlFor={`loss-${depIdx}`} className="font-normal cursor-pointer">
                                상실
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {dep.acquisitionOrLossType === 'loss' ? '상실일자' : '취득일자'} *
                        </Label>
                        <Input
                          type="date"
                          value={dep.acquisitionOrLossDate}
                          onChange={(e) =>
                            handleDependentDateChange(depIdx, 'acquisitionOrLossDate', e.target.value)
                          }
                          max="2100-12-31"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          {dep.acquisitionOrLossType === 'loss' ? '상실부호' : '취득부호'} *
                        </Label>
                        <Select
                          value={dep.acquisitionOrLossCode}
                          onValueChange={(value) =>
                            handleDependentChange(depIdx, 'acquisitionOrLossCode', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPENDENT_ACQUISITION_LOSS_CODES.filter(
                              (code) => code.type === (dep.acquisitionOrLossType || 'acquisition')
                            ).map((code) => (
                              <SelectItem key={code.value} value={code.value}>
                                {code.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {dep.acquisitionOrLossType === 'loss' ? (
                        <>
                          <div className="space-y-2">
                            <Label>성명 *</Label>
                            <Input
                              value={dep.name}
                              onChange={(e) => handleDependentChange(depIdx, 'name', e.target.value)}
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                              maxLength={30}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>주민등록번호/외국인등록번호 *</Label>
                            <Input
                              value={dep.residentNumber}
                              onChange={(e) =>
                                handleDependentResidentNumberChange(depIdx, e.target.value)
                              }
                              placeholder="예: 900101-1234567"
                            />
                          </div>
                          <div></div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>피부양자 관계 *</Label>
                            <Select
                              value={dep.relationship}
                              onValueChange={(value) =>
                                handleDependentChange(depIdx, 'relationship', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {DEPENDENT_RELATIONSHIP_CODES.map((code) => (
                                  <SelectItem key={code.value} value={code.value}>
                                    {code.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>성명 *</Label>
                            <Input
                              value={dep.name}
                              onChange={(e) => handleDependentChange(depIdx, 'name', e.target.value)}
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                              maxLength={30}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>주민등록번호/외국인등록번호 *</Label>
                            <Input
                              value={dep.residentNumber}
                              onChange={(e) =>
                                handleDependentResidentNumberChange(depIdx, e.target.value)
                              }
                              placeholder="예: 900101-1234567"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={dep.isDisabledOrVeteran}
                            onChange={(e) =>
                              handleDependentChange(
                                depIdx,
                                'isDisabledOrVeteran',
                                e.target.checked
                              )
                            }
                          />
                          <Label>장애인·국가유공자</Label>
                        </div>
                      </div>
                    </div>

                    {dep.isDisabledOrVeteran && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>종별부호 *</Label>
                          <Select
                            value={dep.disabilityTypeCode}
                            onValueChange={(value) =>
                              handleDependentChange(depIdx, 'disabilityTypeCode', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {DISABILITY_TYPE_CODES.map((code) => (
                                <SelectItem key={code.value} value={code.value}>
                                  {code.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>등록일 *</Label>
                          <Input
                            type="date"
                            value={dep.registrationDate}
                            onChange={(e) =>
                              handleDependentDateChange(depIdx, 'registrationDate', e.target.value)
                            }
                            max="2100-12-31"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={dep.isForeigner}
                            onChange={(e) =>
                              handleDependentChange(depIdx, 'isForeigner', e.target.checked)
                            }
                          />
                          <Label>외국인</Label>
                        </div>
                      </div>
                    </div>

                    {dep.isForeigner && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>국적 *</Label>
                          <Select
                            value={dep.nationality}
                            onValueChange={(value) =>
                              handleDependentChange(depIdx, 'nationality', value)
                            }
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
                          <Label>체류자격 *</Label>
                          <Select
                            value={dep.residenceStatus}
                            onValueChange={(value) =>
                              handleDependentChange(depIdx, 'residenceStatus', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESIDENCE_STATUS_CODES.map((code) => (
                                <SelectItem key={code.value} value={code.value}>
                                  {code.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>체류기간 *</Label>
                          <Input
                            value={dep.residencePeriod}
                            onChange={(e) =>
                              handleDependentChange(depIdx, 'residencePeriod', e.target.value)
                            }
                            maxLength={30}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 하단 버튼 영역 */}
      <div className="fixed bottom-0 left-[305px] right-0 z-10">
        <div className="mx-auto max-w-[1500px] px-6">
          <div
            className={`bg-white pt-4 pb-6 px-6 flex justify-between items-center ${
              !isAtBottom ? 'border-t shadow-[0_-1px_3px_0_rgba(0,0,0,0.1)]' : ''
            }`}
          >
            <div className="flex gap-2">
              {hasTempData && (
                <>
                  <Button variant="outline" onClick={handleLoadTempData}>
                    임시저장 불러오기
                  </Button>
                  <Button variant="outline" onClick={handleClearTempData}>
                    임시저장 삭제
                  </Button>
                  {tempSavedAt && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Info className="h-4 w-4 mr-1" />
                      마지막 저장: {format(new Date(tempSavedAt), 'yyyy-MM-dd HH:mm:ss')}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTempSave}>
                임시 저장
              </Button>
              <Button variant="outline" onClick={() => {}}>
                미리보기
              </Button>
              <Button variant="default" onClick={handleSubmit} disabled={!isFormValid}>
                신고하기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 신고내역 조회 Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>피부양자 관리 신고내역</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="date"
                value={historyStartDate}
                onChange={(e) => handleHistoryStartDateChange(e.target.value)}
                max="2100-12-31"
                className="w-40"
              />
              <Input
                type="date"
                value={historyEndDate}
                onChange={(e) => handleHistoryEndDateChange(e.target.value)}
                max="2100-12-31"
                className="w-40"
              />
              <Button
                variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                onClick={() => handlePeriodChange('today')}
                size="sm"
              >
                당일
              </Button>
              <Button
                variant={selectedPeriod === '1week' ? 'default' : 'outline'}
                onClick={() => handlePeriodChange('1week')}
                size="sm"
              >
                일주일
              </Button>
              <Button
                variant={selectedPeriod === '1month' ? 'default' : 'outline'}
                onClick={() => handlePeriodChange('1month')}
                size="sm"
              >
                1개월
              </Button>
              <Button
                variant={selectedPeriod === '3months' ? 'default' : 'outline'}
                onClick={() => handlePeriodChange('3months')}
                size="sm"
              >
                3개월
              </Button>
              <Button
                variant={selectedPeriod === '6months' ? 'default' : 'outline'}
                onClick={() => handlePeriodChange('6months')}
                size="sm"
              >
                6개월
              </Button>
              <Button
                variant={selectedPeriod === '1year' ? 'default' : 'outline'}
                onClick={() => handlePeriodChange('1year')}
                size="sm"
              >
                1년
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isComposing) {
                    handleSearchHistory();
                  }
                }}
                placeholder="사번 또는 성명"
                className="flex-1"
              />
              <Button onClick={handleSearchHistory}>
                <Search className="h-4 w-4 mr-1" />
                검색
              </Button>
            </div>

            <div className="text-sm text-gray-600 mb-2">총 {histories.length}건</div>

            <div className="border rounded">
              <Table>
                <colgroup>
                  <col className="w-[220px]" />
                  <col className="w-[200px]" />
                  <col className="w-[150px]" />
                  <col className="w-[250px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>신고일자</TableHead>
                    <TableHead>사업장명</TableHead>
                    <TableHead>직원</TableHead>
                    <TableHead>피부양자</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        신고내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (() => {
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const endIndex = startIndex + itemsPerPage;
                      const paginatedHistories = histories.slice(startIndex, endIndex);

                      return paginatedHistories.map((history) => (
                        <TableRow key={history.id}>
                          <TableCell>
                            {format(new Date(history.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>{history.workplace.name}</TableCell>
                          <TableCell>
                            {history.employees[0]?.name || '-'}
                          </TableCell>
                          <TableCell className="truncate">
                            {(() => {
                              const employee = history.employees[0];
                              if (!employee || !employee.dependents || employee.dependents.length === 0) {
                                return '-';
                              }
                              const dependentNames = employee.dependents.map((dep: any) => dep.name).join(', ');
                              return `${employee.dependents.length}명(${dependentNames})`;
                            })()}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              미리보기
                            </Button>
                          </TableCell>
                        </TableRow>
                      ));
                    })()
                  )}
                </TableBody>
              </Table>
            </div>

            {histories.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  이전
                </Button>
                <div className="flex gap-1">
                  {(() => {
                    const totalPages = Math.ceil(histories.length / itemsPerPage);
                    const pageNumbers: (number | string)[] = [];

                    if (totalPages <= 7) {
                      // 7페이지 이하면 모두 표시
                      for (let i = 1; i <= totalPages; i++) {
                        pageNumbers.push(i);
                      }
                    } else {
                      // 첫 페이지는 항상 표시
                      pageNumbers.push(1);

                      // 현재 페이지가 4 이상이면 ... 표시
                      if (currentPage > 3) {
                        pageNumbers.push('start-ellipsis');
                      }

                      // 현재 페이지 주변 표시 (앞뒤 1페이지)
                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);

                      for (let i = start; i <= end; i++) {
                        pageNumbers.push(i);
                      }

                      // 현재 페이지가 끝에서 3페이지 이전이면 ... 표시
                      if (currentPage < totalPages - 2) {
                        pageNumbers.push('end-ellipsis');
                      }

                      // 마지막 페이지는 항상 표시
                      pageNumbers.push(totalPages);
                    }

                    return pageNumbers.map((page) => {
                      if (typeof page === 'string') {
                        // ... 표시
                        return (
                          <span key={page} className="px-2 py-1 text-sm text-gray-400">
                            ...
                          </span>
                        );
                      }

                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    });
                  })()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(Math.ceil(histories.length / itemsPerPage), prev + 1)
                    )
                  }
                  disabled={currentPage === Math.ceil(histories.length / itemsPerPage)}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 신고 확인 다이얼로그 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>피부양자 관리 신고 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 직원 정보 */}
            <div>
              <p className="text-sm font-medium mb-2">신고 대상</p>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-700">
                  {employee.name}({employee.employeeNumber || '미입력'})
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  피부양자: {employee.dependents.length}명 (
                  {employee.dependents.map((dep, idx) => (
                    <span key={idx}>
                      {dep.name} - {dep.acquisitionOrLossType === 'acquisition' ? '취득' : '상실'}
                      {idx < employee.dependents.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                  )
                </div>
              </div>
            </div>

            {/* 사업장 정보 */}
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-600">사업장: </span>
                <span className="font-medium">
                  {(() => {
                    const sharedWorkplace = loadWorkplaceInfo();
                    return sharedWorkplace?.address
                      ? getShortAddress(sharedWorkplace.address)
                      : workplace.name || '-';
                  })()}
                </span>
              </div>

              {/* 공단 FAX 번호 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="faxNumber" className="text-sm font-medium">
                    공단 FAX 번호
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://www.4insure.or.kr/pbiz/ntcn/selectInstBrofSrchView.do', '_blank')}
                  >
                    FAX번호 찾기
                  </Button>
                </div>
                <Input
                  id="faxNumber"
                  value={faxNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 숫자, -, (, ) 만 허용
                    if (/^[0-9()-]*$/.test(value)) {
                      setFaxNumber(value);
                    }
                  }}
                  placeholder="예: 02-1234-5678"
                  className="text-sm"
                />
                <p className="text-xs text-gray-600">
                  사업장 주소에 맞춰 공단 FAX 번호를 입력해주세요. 1개의 공단 FAX 번호만 입력해주시면 됩니다. (신고하려는 보험에 속하는 공단이어야 함)
                </p>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              취소
            </Button>
            <Button variant="default" onClick={handleConfirmSubmit}>
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
