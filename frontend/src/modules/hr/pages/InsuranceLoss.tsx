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
import { AddressSearchDialog } from '../components/AddressSearchDialog';
import { toast } from '@/shared/hooks/use-toast';
import {
  WorkplaceInfo,
  EmployeeLossInfo,
  InsuranceLossForm,
  PENSION_LOSS_CODES,
  HEALTH_LOSS_CODES,
  EMPLOYMENT_LOSS_CODES,
} from '../types/insurance';
import {
  saveWorkplaceInfo,
  loadWorkplaceInfo,
  saveLossHistory,
  getLossHistories,
} from '../services/insuranceService';
import type { Employee } from '../types/employee';

const LOSS_TEMP_STORAGE_KEY = 'biskit_insurance_loss_temp';

// 기본 직원 데이터 생성 함수
const createDefaultEmployee = (): EmployeeLossInfo => ({
  employeeId: '',
  employeeNumber: '',
  name: '',
  residentNumber: '',
  phoneNumber: '',
  lossDate: '',
  applyPension: true,
  applyHealthInsurance: true,
  applyEmploymentInsurance: true,
  applyWorkersCompensation: true,
  pensionLossCode: '3',
  pensionPayFirstDayLoss: false,
  healthLossCode: '1',
  healthCurrentYearSalary: 0,
  healthPreviousYearSalary: 0,
  healthCurrentYearMonths: 0,
  healthPreviousYearMonths: 0,
  healthNoPreviousYearTaxAdjustment: false,
  employmentLossCode: '11',
  employmentSpecificReason: '',
  hasSalaryDifferenceBetweenInsurances: false,
  noPreviousYearSalaryReport: false,
  employmentCurrentYearSalary: 0,
  employmentPreviousYearSalary: 0,
  workersCompCurrentYearSalary: 0,
  workersCompPreviousYearSalary: 0,
});

export function InsuranceLoss(): JSX.Element {
  const [isComposing, setIsComposing] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);

  // 사업장 정보
  const [workplace, setWorkplace] = useState<WorkplaceInfo>({
    managementNumber: '',
    name: '',
    unitName: '',
    branchName: '',
    postalCode: '',
    address: '',
    addressDetail: '',
    phoneNumber: '',
    faxNumber: '',
    email: '',
    mobilePhone: '',
  });

  // 직원 목록 (초기에 빈 직원 1명 추가)
  const [employees, setEmployees] = useState<EmployeeLossInfo[]>([createDefaultEmployee()]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

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
  const [workplaceFaxNumber, setWorkplaceFaxNumber] = useState('');
  const [faxNumber, setFaxNumber] = useState('');

  // FAX 정보 로드 (다이얼로그 열릴 때)
  useEffect(() => {
    if (confirmDialogOpen) {
      const savedFaxInfo = localStorage.getItem('biskit_insurance_fax_info');
      if (savedFaxInfo) {
        const faxInfo = JSON.parse(savedFaxInfo);
        setWorkplaceFaxNumber(faxInfo.workplaceFaxNumber || '');
        setFaxNumber(faxInfo.agencyFaxNumber || '');
      }
    }
  }, [confirmDialogOpen]);

  // 스크롤 위치 감지 (하단 버튼 영역 그림자 제어)
  const [isAtBottom, setIsAtBottom] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    const savedWorkplace = loadWorkplaceInfo();
    if (savedWorkplace) {
      setWorkplace(savedWorkplace);
    }

    const tempDataStr = localStorage.getItem(LOSS_TEMP_STORAGE_KEY);
    if (tempDataStr) {
      try {
        const tempData: InsuranceLossForm = JSON.parse(tempDataStr);
        setHasTempData(true);
        setTempSavedAt(tempData.savedAt || '');
      } catch {
        // 무시
      }
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
  const handleWorkplaceChange = (field: keyof WorkplaceInfo, value: string): void => {
    setWorkplace((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 주소 검색 완료
  const handleAddressComplete = (data: { zonecode: string; address: string }): void => {
    setWorkplace((prev) => ({
      ...prev,
      postalCode: data.zonecode,
      address: data.address,
    }));
    setAddressDialogOpen(false);
  };

  // 직원 정보 변경
  const handleEmployeeChange = (
    index: number,
    field: keyof EmployeeLossInfo,
    value: any
  ): void => {
    setEmployees((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      } as EmployeeLossInfo;
      return updated;
    });
  };

  // 주민등록번호/외국인등록번호 포맷팅 (000000-0000000)
  const handleResidentNumberChange = (index: number, value: string): void => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');

    // 13자리 제한
    const limited = numbers.slice(0, 13);

    // 6자리 이후 하이픈 자동 추가
    let formatted = limited;
    if (limited.length > 6) {
      formatted = `${limited.slice(0, 6)}-${limited.slice(6)}`;
    }

    handleEmployeeChange(index, 'residentNumber', formatted);
  };

  // 날짜 입력 검증 (YYYY-MM-DD)
  const handleDateChange = (index: number, field: keyof EmployeeLossInfo, value: string): void => {
    // 빈 값은 허용
    if (value === '') {
      handleEmployeeChange(index, field, value);
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

    handleEmployeeChange(index, field, value);
  };

  // 콤보박스에서 직원 선택 시 정보 자동 입력
  const handleSelectEmployeeFromCombobox = (index: number, employee: Employee | null): void => {
    if (!employee) return;

    // 퇴사일이 있으면 퇴사일 + 1일을 상실연월일로 설정
    const calculateLossDate = (): string => {
      if (!employee.leaveDate) return '';

      // YYYYMMDD 형식을 Date로 변환
      const dateStr = employee.leaveDate;
      if (dateStr.length !== 8) return '';

      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-based
      const day = parseInt(dateStr.substring(6, 8));

      const resignDate = new Date(year, month, day);
      resignDate.setDate(resignDate.getDate() + 1); // 다음날

      return format(resignDate, 'yyyy-MM-dd');
    };

    setEmployees((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        name: employee.name,
        residentNumber: employee.residentRegistrationNumber || employee.foreignerRegistrationNumber || '',
        phoneNumber: employee.phone || '',
        lossDate: calculateLossDate(),
      } as EmployeeLossInfo;
      return updated;
    });
  };

  // 직원 삭제 (다중)
  const handleDeleteEmployees = (): void => {
    if (selectedEmployeeIds.size === 0) {
      toast({
        title: '삭제할 직원을 선택하세요.',
        variant: 'destructive',
      });
      return;
    }

    setEmployees((prev) =>
      prev.filter((_, index) => !selectedEmployeeIds.has(String(index)))
    );
    setSelectedEmployeeIds(new Set());
  };

  // 직원 삭제 (단일)
  const handleDeleteSingleEmployee = (index: number): void => {
    setEmployees((prev) => prev.filter((_, i) => i !== index));
    // 선택 목록에서도 제거
    const newSelected = new Set(selectedEmployeeIds);
    newSelected.delete(String(index));
    setSelectedEmployeeIds(newSelected);
  };


  // 임시 저장
  const handleTempSave = (): void => {
    const formData: InsuranceLossForm = {
      workplace,
      employees,
      reportDate: format(new Date(), 'yyyy-MM-dd'),
    };

    const now = new Date().toISOString();
    const dataToSave = {
      ...formData,
      savedAt: now,
    };

    localStorage.setItem(LOSS_TEMP_STORAGE_KEY, JSON.stringify(dataToSave));
    setHasTempData(true);
    setTempSavedAt(now);

    toast({
      title: '임시 저장되었습니다.',
    });
  };

  // 임시 저장 불러오기
  const handleLoadTempData = (): void => {
    const tempDataStr = localStorage.getItem(LOSS_TEMP_STORAGE_KEY);
    if (!tempDataStr) {
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
      workplace.postalCode ||
      workplace.address ||
      workplace.addressDetail ||
      employees.some(
        (emp) =>
          emp.name ||
          emp.residentNumber ||
          emp.phoneNumber ||
          emp.lossDate
      );

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

    try {
      const tempData: InsuranceLossForm = JSON.parse(tempDataStr);
      setWorkplace(tempData.workplace);
      setEmployees(tempData.employees);

      toast({
        title: '임시 저장 데이터를 불러왔습니다.',
      });
    } catch {
      toast({
        title: '임시 저장 데이터를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 임시 저장 삭제
  const handleClearTempData = (): void => {
    localStorage.removeItem(LOSS_TEMP_STORAGE_KEY);
    setHasTempData(false);
    setTempSavedAt('');

    toast({
      title: '임시 저장 데이터를 삭제했습니다.',
    });
  };

  // 신고 확인 다이얼로그용 주소 추출
  // 서울: 구까지, 광역시: 구까지, 도 지역: 시까지 표시
  const getShortAddress = (fullAddress: string): string => {
    // 서울특별시 또는 서울인 경우 "서울 구명"으로 표시
    if (fullAddress.includes('서울특별시') || fullAddress.startsWith('서울 ')) {
      const match = fullAddress.match(/(서울특별시|서울)\s*(.*?구)/);
      return match ? `서울 ${match[2]}` : fullAddress.split(' ').slice(0, 2).join(' ');
    }

    // 광역시인 경우 "시명 구명"으로 표시
    if (fullAddress.includes('광역시')) {
      const match = fullAddress.match(/(.*?)광역시\s*(.*?구)/);
      return match ? `${match[1]} ${match[2]}` : fullAddress.split(' ').slice(0, 2).join(' ');
    }

    // 도 지역인 경우 "도명 시명"으로 표시
    const match = fullAddress.match(/(.*?도)\s*(.*?시)/);
    return match ? `${match[1]} ${match[2]}` : (fullAddress.split(' ')[0] ?? '');
  };

  // 필수값 검증
  const isFormValid = useMemo(() => {
    // 사업장 정보 필수값 검증
    if (!workplace.managementNumber || !workplace.name || !workplace.postalCode ||
        !workplace.address || !workplace.addressDetail || !workplace.phoneNumber) {
      return false;
    }

    // 직원이 없으면 false
    if (employees.length === 0) {
      return false;
    }

    // 직원 정보 필수값 검증
    for (const emp of employees) {
      // 기본 정보
      if (!emp.employeeId || !emp.name || !emp.residentNumber || !emp.phoneNumber || !emp.lossDate) {
        return false;
      }

      // 국민연금
      if (emp.applyPension && !emp.pensionLossCode) {
        return false;
      }

      // 건강보험
      if (emp.applyHealthInsurance) {
        if (!emp.healthLossCode || !emp.healthCurrentYearSalary || emp.healthCurrentYearSalary === 0 ||
            !emp.healthCurrentYearMonths || emp.healthCurrentYearMonths === 0) {
          return false;
        }

        // 전년도 연말정산 미실시한 경우
        if (emp.healthNoPreviousYearTaxAdjustment) {
          if (!emp.healthPreviousYearSalary || emp.healthPreviousYearSalary === 0 ||
              !emp.healthPreviousYearMonths || emp.healthPreviousYearMonths === 0) {
            return false;
          }
        }
      }

      // 고용보험·산재보험
      if (emp.applyEmploymentInsurance || emp.applyWorkersCompensation) {
        if (!emp.employmentLossCode || !emp.employmentSpecificReason) {
          return false;
        }

        // 보수총액 검증
        const shouldShowSeparate =
          emp.applyEmploymentInsurance &&
          emp.applyWorkersCompensation &&
          emp.hasSalaryDifferenceBetweenInsurances;

        if (shouldShowSeparate) {
          // 구분해서 표시하는 경우
          if (!emp.employmentCurrentYearSalary || emp.employmentCurrentYearSalary === 0 ||
              !emp.workersCompCurrentYearSalary || emp.workersCompCurrentYearSalary === 0) {
            return false;
          }

          // 전년도 보수총액 신고하지 않은 경우
          if (emp.noPreviousYearSalaryReport) {
            if (!emp.employmentPreviousYearSalary || emp.employmentPreviousYearSalary === 0 ||
                !emp.workersCompPreviousYearSalary || emp.workersCompPreviousYearSalary === 0) {
              return false;
            }
          }
        } else {
          // 통합해서 표시하는 경우
          if (!emp.employmentCurrentYearSalary || emp.employmentCurrentYearSalary === 0) {
            return false;
          }

          // 전년도 보수총액 신고하지 않은 경우
          if (emp.noPreviousYearSalaryReport) {
            if (!emp.employmentPreviousYearSalary || emp.employmentPreviousYearSalary === 0) {
              return false;
            }
          }
        }
      }
    }

    return true;
  }, [workplace, employees]);

  // 신고하기 버튼 클릭 (확인 다이얼로그 열기)
  const handleSubmit = (): void => {
    setConfirmDialogOpen(true);
  };

  // 신고 확인 후 실제 신고 처리
  const handleConfirmSubmit = (): void => {
    // 신고내역 저장
    const reportDate = format(new Date(), 'yyyy-MM-dd');
    saveLossHistory(reportDate, workplace, employees);

    // 사업장 정보 저장
    saveWorkplaceInfo(workplace);

    // FAX 정보 저장
    localStorage.setItem('biskit_insurance_fax_info', JSON.stringify({
      workplaceFaxNumber,
      agencyFaxNumber: faxNumber,
    }));

    // 임시 저장 데이터 삭제
    localStorage.removeItem(LOSS_TEMP_STORAGE_KEY);
    setHasTempData(false);
    setTempSavedAt('');

    toast({
      title: '자격상실 신고가 완료되었습니다.',
    });

    // 초기화 (기본 직원 1명 추가)
    setEmployees([createDefaultEmployee()]);
    setSelectedEmployeeIds(new Set());

    // 확인 다이얼로그 닫기
    setConfirmDialogOpen(false);
  };

  // 신고내역 조회
  const handleSearchHistory = (): void => {
    const results = getLossHistories(
      historyStartDate || undefined,
      historyEndDate || undefined,
      historySearch || undefined
    );
    setHistories(results);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  // 신고내역 Dialog 열기
  const handleOpenHistoryDialog = (): void => {
    setHistoryDialogOpen(true);
    setHistorySearch(''); // 검색어 초기화
    setCurrentPage(1); // 페이지 초기화
    // 검색어 없이 전체 내역 조회
    const results = getLossHistories(
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
    setCurrentPage(1); // 기간 변경 시 첫 페이지로 이동
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
        title="자격상실신고"
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
          <div className="grid grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="faxNumber">FAX번호</Label>
              <Input
                id="faxNumber"
                value={workplace.faxNumber}
                onChange={(e) => {
                  // 숫자, - 만 허용
                  const value = e.target.value;
                  if (/^[0-9-]*$/.test(value)) {
                    handleWorkplaceChange('faxNumber', value);
                  }
                }}
                placeholder="예: 02-1234-5678"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">우편번호 *</Label>
              <div className="flex gap-2">
                <Input
                  id="postalCode"
                  value={workplace.postalCode}
                  readOnly
                  placeholder="우편번호"
                />
                <Button type="button" onClick={() => setAddressDialogOpen(true)}>
                  주소 검색
                </Button>
              </div>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">주소 *</Label>
              <Input
                id="address"
                value={workplace.address}
                readOnly
                placeholder="주소"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressDetail">상세주소 *</Label>
              <Input
                id="addressDetail"
                value={workplace.addressDetail}
                onChange={(e) => handleWorkplaceChange('addressDetail', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder="상세주소를 입력하세요"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 직원 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>직장가입자 목록</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setEmployees([...employees, createDefaultEmployee()])}>
                <Plus className="h-4 w-4 mr-1" />
                추가하기
              </Button>
              {selectedEmployeeIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteEmployees}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  선택 삭제 ({selectedEmployeeIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              직원을 추가하세요.
            </div>
          ) : (
            <div className="space-y-6">
              {employees.map((employee, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">
                        직원{index + 1}
                      </div>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSingleEmployee(index)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* 기본 정보 */}
                    <div>
                      <h4 className="font-medium mb-3">기본 정보</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>성명 *</Label>
                          <EmployeeCombobox
                            value={employee.employeeId}
                            onChange={(selectedEmployee) => handleSelectEmployeeFromCombobox(index, selectedEmployee)}
                            excludeIds={employees
                              .filter((e, i) => i !== index && e.employeeId)
                              .map((e) => e.employeeId as string)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>주민등록번호/외국인등록번호 *</Label>
                          <Input
                            value={employee.residentNumber}
                            onChange={(e) => handleResidentNumberChange(index, e.target.value)}
                            placeholder="예: 900101-1234567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>전화번호(휴대폰번호) *</Label>
                          <Input
                            value={employee.phoneNumber}
                            onChange={(e) => handleEmployeeChange(index, 'phoneNumber', e.target.value)}
                            placeholder="예: 010-1234-5678"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>상실연월일 *</Label>
                          <Input
                            type="date"
                            value={employee.lossDate}
                            onChange={(e) => handleDateChange(index, 'lossDate', e.target.value)}
                            max="2100-12-31"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 보험 신청 여부 */}
                    <div>
                      <h4 className="font-medium mb-3">보험 신고</h4>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={employee.applyPension}
                            onChange={(e) =>
                              handleEmployeeChange(index, 'applyPension', e.target.checked)
                            }
                          />
                          <Label>국민연금</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={employee.applyHealthInsurance}
                            onChange={(e) =>
                              handleEmployeeChange(
                                index,
                                'applyHealthInsurance',
                                e.target.checked
                              )
                            }
                          />
                          <Label>건강보험</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={employee.applyEmploymentInsurance}
                            onChange={(e) =>
                              handleEmployeeChange(
                                index,
                                'applyEmploymentInsurance',
                                e.target.checked
                              )
                            }
                          />
                          <Label>고용보험</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={employee.applyWorkersCompensation}
                            onChange={(e) =>
                              handleEmployeeChange(
                                index,
                                'applyWorkersCompensation',
                                e.target.checked
                              )
                            }
                          />
                          <Label>산재보험</Label>
                        </div>
                      </div>
                    </div>

                    {/* 국민연금 */}
                    {employee.applyPension && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">국민연금</h4>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>상실부호 *</Label>
                            <Select
                              value={employee.pensionLossCode}
                              onValueChange={(value) =>
                                handleEmployeeChange(index, 'pensionLossCode', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PENSION_LOSS_CODES.map((code) => (
                                  <SelectItem key={code.value} value={code.value}>
                                    {code.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center pt-7">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={employee.pensionPayFirstDayLoss}
                                onChange={(e) =>
                                  handleEmployeeChange(
                                    index,
                                    'pensionPayFirstDayLoss',
                                    e.target.checked
                                  )
                                }
                              />
                              <Label>초일취득·당월상실자 납부여부</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 건강보험 */}
                    {employee.applyHealthInsurance && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">건강보험</h4>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>상실부호 *</Label>
                            <Select
                              value={employee.healthLossCode}
                              onValueChange={(value) =>
                                handleEmployeeChange(index, 'healthLossCode', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HEALTH_LOSS_CODES.map((code) => (
                                  <SelectItem key={code.value} value={code.value}>
                                    {code.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>연간보수총액(해당연도) *</Label>
                            <Input
                              type="text"
                              value={employee.healthCurrentYearSalary ? employee.healthCurrentYearSalary.toLocaleString('ko-KR') : ''}
                              onChange={(e) => {
                                const numericValue = e.target.value.replace(/,/g, '');
                                if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                  handleEmployeeChange(
                                    index,
                                    'healthCurrentYearSalary',
                                    numericValue === '' ? 0 : Number(numericValue)
                                  );
                                }
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>근무개월수(해당연도) *</Label>
                            <Input
                              type="number"
                              value={employee.healthCurrentYearMonths === 0 ? '' : employee.healthCurrentYearMonths}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  handleEmployeeChange(index, 'healthCurrentYearMonths', 0);
                                  return;
                                }
                                const numValue = Number(value);
                                if (numValue >= 1 && numValue <= 12) {
                                  handleEmployeeChange(index, 'healthCurrentYearMonths', numValue);
                                }
                              }}
                              placeholder="0"
                              min="1"
                              max="12"
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-8">
                            <Checkbox
                              checked={employee.healthNoPreviousYearTaxAdjustment || false}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'healthNoPreviousYearTaxAdjustment',
                                  e.target.checked
                                )
                              }
                            />
                            <Label className="cursor-pointer">
                              전년도 연말정산을 실시하지 않았나요?
                            </Label>
                          </div>
                        </div>

                        {employee.healthNoPreviousYearTaxAdjustment && (
                          <div className="grid grid-cols-4 gap-4 mt-4">
                            <div className="space-y-2">
                              <Label>연간보수총액(전년도) *</Label>
                              <Input
                                type="text"
                                value={employee.healthPreviousYearSalary ? employee.healthPreviousYearSalary.toLocaleString('ko-KR') : ''}
                                onChange={(e) => {
                                  const numericValue = e.target.value.replace(/,/g, '');
                                  if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                    handleEmployeeChange(
                                      index,
                                      'healthPreviousYearSalary',
                                      numericValue === '' ? 0 : Number(numericValue)
                                    );
                                  }
                                }}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>근무개월수(전년도) *</Label>
                              <Input
                                type="number"
                                value={employee.healthPreviousYearMonths === 0 ? '' : employee.healthPreviousYearMonths}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    handleEmployeeChange(index, 'healthPreviousYearMonths', 0);
                                    return;
                                  }
                                  const numValue = Number(value);
                                  if (numValue >= 1 && numValue <= 12) {
                                    handleEmployeeChange(index, 'healthPreviousYearMonths', numValue);
                                  }
                                }}
                                placeholder="0"
                                min="1"
                                max="12"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 고용보험·산재보험 */}
                    {(employee.applyEmploymentInsurance ||
                      employee.applyWorkersCompensation) && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">고용보험·산재보험</h4>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>상실사유코드 *</Label>
                            <Select
                              value={employee.employmentLossCode}
                              onValueChange={(value) =>
                                handleEmployeeChange(index, 'employmentLossCode', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {EMPLOYMENT_LOSS_CODES.map((code) => (
                                  <SelectItem key={code.value} value={code.value}>
                                    {code.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>구체적 사유 *</Label>
                            <Input
                              value={employee.employmentSpecificReason}
                              onChange={(e) =>
                                handleEmployeeChange(index, 'employmentSpecificReason', e.target.value)
                              }
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                              maxLength={50}
                              placeholder="예: 사업장 이전으로 인한 자진퇴사"
                            />
                          </div>
                          <div className="col-span-2 pt-8 space-y-3">
                            {/* 고용보험과 산재보험 둘 다 체크된 경우에만 표시 */}
                            {employee.applyEmploymentInsurance &&
                              employee.applyWorkersCompensation && (
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={employee.hasSalaryDifferenceBetweenInsurances || false}
                                    onChange={(e) =>
                                      handleEmployeeChange(
                                        index,
                                        'hasSalaryDifferenceBetweenInsurances',
                                        e.target.checked
                                      )
                                    }
                                  />
                                  <Label className="cursor-pointer">
                                    전보 또는 휴직 등의 사유로 고용보험과 산재보험 보수총액에 차이가 있나요?
                                  </Label>
                                </div>
                              )}
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={employee.noPreviousYearSalaryReport || false}
                                onChange={(e) =>
                                  handleEmployeeChange(
                                    index,
                                    'noPreviousYearSalaryReport',
                                    e.target.checked
                                  )
                                }
                              />
                              <Label className="cursor-pointer">
                                전년도 보수총액을 신고하지 않았나요?
                              </Label>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4">
                          {(() => {
                            // 고용보험과 산재보험 둘 다 선택되고 차이가 있는 경우: 구분해서 표시
                            const shouldShowSeparate =
                              employee.applyEmploymentInsurance &&
                              employee.applyWorkersCompensation &&
                              employee.hasSalaryDifferenceBetweenInsurances;

                            if (shouldShowSeparate) {
                              return (
                                <>
                                  <div className="space-y-2">
                                    <Label>고용보험 보수총액(해당연도) *</Label>
                                    <Input
                                      type="text"
                                      value={employee.employmentCurrentYearSalary ? employee.employmentCurrentYearSalary.toLocaleString('ko-KR') : ''}
                                      onChange={(e) => {
                                        const numericValue = e.target.value.replace(/,/g, '');
                                        if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                          handleEmployeeChange(
                                            index,
                                            'employmentCurrentYearSalary',
                                            numericValue === '' ? 0 : Number(numericValue)
                                          );
                                        }
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                  {employee.noPreviousYearSalaryReport && (
                                    <div className="space-y-2">
                                      <Label>고용보험 보수총액(전년도) *</Label>
                                      <Input
                                        type="text"
                                        value={employee.employmentPreviousYearSalary ? employee.employmentPreviousYearSalary.toLocaleString('ko-KR') : ''}
                                        onChange={(e) => {
                                          const numericValue = e.target.value.replace(/,/g, '');
                                          if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                            handleEmployeeChange(
                                              index,
                                              'employmentPreviousYearSalary',
                                              numericValue === '' ? 0 : Number(numericValue)
                                            );
                                          }
                                        }}
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label>산재보험 보수총액(해당연도) *</Label>
                                    <Input
                                      type="text"
                                      value={employee.workersCompCurrentYearSalary ? employee.workersCompCurrentYearSalary.toLocaleString('ko-KR') : ''}
                                      onChange={(e) => {
                                        const numericValue = e.target.value.replace(/,/g, '');
                                        if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                          handleEmployeeChange(
                                            index,
                                            'workersCompCurrentYearSalary',
                                            numericValue === '' ? 0 : Number(numericValue)
                                          );
                                        }
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                  {employee.noPreviousYearSalaryReport && (
                                    <div className="space-y-2">
                                      <Label>산재보험 보수총액(전년도) *</Label>
                                      <Input
                                        type="text"
                                        value={employee.workersCompPreviousYearSalary ? employee.workersCompPreviousYearSalary.toLocaleString('ko-KR') : ''}
                                        onChange={(e) => {
                                          const numericValue = e.target.value.replace(/,/g, '');
                                          if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                            handleEmployeeChange(
                                              index,
                                              'workersCompPreviousYearSalary',
                                              numericValue === '' ? 0 : Number(numericValue)
                                            );
                                          }
                                        }}
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </>
                              );
                            } else {
                              // 그 외의 경우: 통합해서 표시
                              return (
                                <>
                                  <div className="space-y-2">
                                    <Label>보수총액(해당연도) *</Label>
                                    <Input
                                      type="text"
                                      value={employee.employmentCurrentYearSalary ? employee.employmentCurrentYearSalary.toLocaleString('ko-KR') : ''}
                                      onChange={(e) => {
                                        const numericValue = e.target.value.replace(/,/g, '');
                                        if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                          const value = numericValue === '' ? 0 : Number(numericValue);
                                          handleEmployeeChange(index, 'employmentCurrentYearSalary', value);
                                          handleEmployeeChange(index, 'workersCompCurrentYearSalary', value);
                                        }
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                  {employee.noPreviousYearSalaryReport && (
                                    <div className="space-y-2">
                                      <Label>보수총액(전년도) *</Label>
                                      <Input
                                        type="text"
                                        value={employee.employmentPreviousYearSalary ? employee.employmentPreviousYearSalary.toLocaleString('ko-KR') : ''}
                                        onChange={(e) => {
                                          const numericValue = e.target.value.replace(/,/g, '');
                                          if (numericValue === '' || /^\d+$/.test(numericValue)) {
                                            const value = numericValue === '' ? 0 : Number(numericValue);
                                            handleEmployeeChange(index, 'employmentPreviousYearSalary', value);
                                            handleEmployeeChange(index, 'workersCompPreviousYearSalary', value);
                                          }
                                        }}
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </>
                              );
                            }
                          })()}
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
          <div className={`bg-white pt-4 pb-6 px-6 flex justify-between items-center ${!isAtBottom ? 'border-t shadow-[0_-1px_3px_0_rgba(0,0,0,0.1)]' : ''}`}>
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
            <Button variant="default" onClick={handleSubmit} disabled={!isFormValid}>신고하기</Button>
          </div>
          </div>
        </div>
      </div>

      {/* 신고내역 조회 Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>자격상실 신고내역</DialogTitle>
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

            <div className="text-sm text-gray-600 mb-2">
              총 {histories.length}건
            </div>

            <div className="border rounded">
              <Table>
                <colgroup>
                  <col className="w-[280px]" />
                  <col className="w-[280px]" />
                  <col className="w-[280px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>신고일자</TableHead>
                    <TableHead>사업장명</TableHead>
                    <TableHead>직원</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
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
                          <TableCell className="truncate">
                            {history.employees.length}명({history.employees.map((emp: any) => emp.name).join(', ')})
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
                  onClick={() => setCurrentPage((prev) => Math.min(Math.ceil(histories.length / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(histories.length / itemsPerPage)}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 주소 검색 다이얼로그 */}
      <AddressSearchDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        onComplete={handleAddressComplete}
      />

      {/* 신고 확인 다이얼로그 */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자격상실 신고 확인</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 직장가입자 목록 */}
            <div>
              <p className="text-sm font-medium mb-2">신고 대상 ({employees.length}명)</p>
              <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                {employees.map((emp, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    {emp.name}({emp.employeeNumber || '미입력'})
                  </div>
                ))}
              </div>
            </div>

            {/* 사업장 FAX 번호 */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="workplaceFaxNumber" className="text-sm font-medium">
                  사업장 FAX 번호
                </Label>
                <Input
                  id="workplaceFaxNumber"
                  value={workplaceFaxNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 숫자, -, (, ) 만 허용
                    if (/^[0-9()-]*$/.test(value)) {
                      setWorkplaceFaxNumber(value);
                    }
                  }}
                  placeholder="예: 02-1234-5678"
                  className="text-sm"
                />
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
            <Button variant="default" onClick={handleConfirmSubmit} disabled={!workplaceFaxNumber || !faxNumber}>
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
