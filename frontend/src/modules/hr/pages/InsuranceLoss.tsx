import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Trash2, Plus } from 'lucide-react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
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
import { EmployeeCombobox } from '../components/EmployeeCombobox';
import { AddressSearchDialog } from '../components/AddressSearchDialog';
import { toast } from '@/shared/hooks/use-toast';
import {
  WorkplaceInfo,
  EmployeeLossInfo,
  PENSION_LOSS_CODES,
  HEALTH_LOSS_CODES,
  EMPLOYMENT_LOSS_CODES,
} from '../types/insurance';
import { saveWorkplaceInfo, loadWorkplaceInfo } from '../services/insuranceService';
import { lossReportService } from '../services/lossReportService';
import type { Employee } from '../types/employee';
import { setNavigationGuard } from '@/shared/utils/navigationGuard';

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
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const isInitialLoadComplete = useRef(false);

  const [_isComposing, setIsComposing] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [workplaceDialogOpen, setWorkplaceDialogOpen] = useState(false);
  const [workplaceEditData, setWorkplaceEditData] = useState<WorkplaceInfo>({
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

  const [reportId, setReportId] = useState<string | null>(null);

  const [workplace, setWorkplace] = useState<WorkplaceInfo>({
    managementNumber: '12345678',
    name: '에이티앤피파트너즈',
    unitName: '',
    branchName: '',
    postalCode: '04506',
    address: '서울 중구 중림로 31',
    addressDetail: '3층',
    phoneNumber: '02-1234-5678',
    faxNumber: '',
    email: '',
    mobilePhone: '',
  });

  const [employees, setEmployees] = useState<EmployeeLossInfo[]>([createDefaultEmployee()]);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(0);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [workplaceFaxNumber, setWorkplaceFaxNumber] = useState('');
  const [faxNumber, setFaxNumber] = useState('');

  const [isAtBottom, setIsAtBottom] = useState(false);

  // FAX 정보 로드
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

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      const pathParts = window.location.pathname.split('/');
      const isEditMode = pathParts.includes('edit');
      const id = isEditMode ? pathParts[pathParts.length - 1] : null;

      if (isEditMode && id) {
        setReportId(id);
        try {
          const report = await lossReportService.getById(id);
          if (report && report.formData) {
            setWorkplace(report.formData.workplace);
            setEmployees(report.formData.employees);
            toast({ title: '작성중인 신고 데이터를 불러왔습니다.' });
            return;
          }
        } catch (error) {
          console.error('Failed to load report data:', error);
          toast({ title: '데이터를 불러오는데 실패했습니다.', variant: 'destructive' });
        }
      }

      const savedWorkplace = loadWorkplaceInfo();
      if (savedWorkplace) {
        setWorkplace(savedWorkplace);
      }
    };

    loadInitialData().then(() => {
      setTimeout(() => { isInitialLoadComplete.current = true; }, 0);
    });
  }, []);

  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    setIsDirty(true);
  }, [employees]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    if (isDirty) {
      setNavigationGuard(() => window.confirm('자격 상실신고를 취소하시겠습니까?'));
    } else {
      setNavigationGuard(null);
    }
    return () => setNavigationGuard(null);
  }, [isDirty]);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = (): void => {
      const el = document.querySelector('main');
      if (el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
      }
    };
    const el = document.querySelector('main');
    el?.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = (): void => {
    if (isDirtyRef.current && !window.confirm('자격 상실신고를 취소하시겠습니까?')) return;
    setNavigationGuard(null);
    window.history.pushState({}, '', '/hr/insurance/loss');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // 사업장 정보 수정 다이얼로그
  const handleOpenWorkplaceDialog = (): void => {
    setWorkplaceEditData({ ...workplace });
    setWorkplaceDialogOpen(true);
  };

  const handleWorkplaceEditChange = (field: keyof WorkplaceInfo, value: string): void => {
    setWorkplaceEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleWorkplaceEditSave = (): void => {
    setWorkplace({ ...workplaceEditData });
    saveWorkplaceInfo(workplaceEditData);
    setWorkplaceDialogOpen(false);
    toast({ title: '사업장 정보를 저장하였습니다.' });
  };

  const isWorkplaceEditValid =
    !!workplaceEditData.managementNumber &&
    !!workplaceEditData.name &&
    !!workplaceEditData.postalCode &&
    !!workplaceEditData.address &&
    !!workplaceEditData.addressDetail &&
    !!workplaceEditData.phoneNumber;

  const handleAddressComplete = (data: { zonecode: string; address: string }): void => {
    setWorkplaceEditData((prev) => ({ ...prev, postalCode: data.zonecode, address: data.address }));
    setAddressDialogOpen(false);
  };

  // 직원 추가 / 삭제
  const handleAddEmployee = (): void => {
    setEmployees((prev) => [...prev, createDefaultEmployee()]);
    setSelectedEmployeeIndex(employees.length);
  };

  const handleDeleteSingleEmployee = (index: number): void => {
    const newEmployees = employees.filter((_, i) => i !== index);
    setEmployees(newEmployees);
    if (index >= newEmployees.length) {
      setSelectedEmployeeIndex(newEmployees.length - 1);
    } else {
      setSelectedEmployeeIndex(index);
    }
  };

  // 직원 정보 변경
  const handleEmployeeChange = (
    index: number,
    field: keyof EmployeeLossInfo,
    value: any
  ): void => {
    setEmployees((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as EmployeeLossInfo;
      return updated;
    });
  };

  // 주민등록번호 포맷팅
  const handleResidentNumberChange = (index: number, value: string): void => {
    const numbers = value.replace(/[^0-9]/g, '').slice(0, 13);
    const formatted = numbers.length > 6 ? `${numbers.slice(0, 6)}-${numbers.slice(6)}` : numbers;
    handleEmployeeChange(index, 'residentNumber', formatted);
  };

  // 날짜 입력
  const handleDateChange = (index: number, field: keyof EmployeeLossInfo, value: string): void => {
    if (value === '' || value.length <= 10) {
      const parts = value.split('-');
      if (!parts[0] || parts[0].length <= 4) {
        handleEmployeeChange(index, field, value);
      }
    }
  };

  // 직원 콤보박스 선택
  const handleSelectEmployeeFromCombobox = (index: number, employee: Employee | null): void => {
    if (!employee) return;

    const calculateLossDate = (): string => {
      if (!employee.leaveDate || employee.leaveDate.length !== 8) return '';
      const year = parseInt(employee.leaveDate.substring(0, 4));
      const month = parseInt(employee.leaveDate.substring(4, 6)) - 1;
      const day = parseInt(employee.leaveDate.substring(6, 8));
      const d = new Date(year, month, day);
      d.setDate(d.getDate() + 1);
      return format(d, 'yyyy-MM-dd');
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

  // 직원 개별 유효성 검사
  const isEmployeeValid = (emp: EmployeeLossInfo): boolean => {
    if (!emp.employeeId || !emp.name || !emp.residentNumber || !emp.phoneNumber || !emp.lossDate) return false;

    if (emp.applyPension && !emp.pensionLossCode) return false;

    if (emp.applyHealthInsurance) {
      if (!emp.healthLossCode || !emp.healthCurrentYearSalary || emp.healthCurrentYearSalary === 0 ||
          !emp.healthCurrentYearMonths || emp.healthCurrentYearMonths === 0) return false;
      if (emp.healthNoPreviousYearTaxAdjustment) {
        if (!emp.healthPreviousYearSalary || emp.healthPreviousYearSalary === 0 ||
            !emp.healthPreviousYearMonths || emp.healthPreviousYearMonths === 0) return false;
      }
    }

    if (emp.applyEmploymentInsurance || emp.applyWorkersCompensation) {
      if (!emp.employmentLossCode || !emp.employmentSpecificReason) return false;

      const shouldShowSeparate = emp.applyEmploymentInsurance && emp.applyWorkersCompensation && emp.hasSalaryDifferenceBetweenInsurances;

      if (shouldShowSeparate) {
        if (!emp.employmentCurrentYearSalary || emp.employmentCurrentYearSalary === 0 ||
            !emp.workersCompCurrentYearSalary || emp.workersCompCurrentYearSalary === 0) return false;
        if (emp.noPreviousYearSalaryReport) {
          if (!emp.employmentPreviousYearSalary || emp.employmentPreviousYearSalary === 0 ||
              !emp.workersCompPreviousYearSalary || emp.workersCompPreviousYearSalary === 0) return false;
        }
      } else {
        if (!emp.employmentCurrentYearSalary || emp.employmentCurrentYearSalary === 0) return false;
        if (emp.noPreviousYearSalaryReport) {
          if (!emp.employmentPreviousYearSalary || emp.employmentPreviousYearSalary === 0) return false;
        }
      }
    }

    return true;
  };

  const isFormValid = useMemo(() => {
    if (!workplace.managementNumber || !workplace.name || !workplace.postalCode ||
        !workplace.address || !workplace.addressDetail || !workplace.phoneNumber) return false;
    if (employees.length === 0) return false;
    return employees.every(isEmployeeValid);
  }, [workplace, employees]);

  // 임시 저장
  const handleTempSave = async (): Promise<void> => {
    try {
      const employeeList = employees
        .filter(emp => emp.employeeId)
        .map(emp => ({
          employeeId: emp.employeeId as string,
          employeeName: emp.name,
          employeeNumber: emp.employeeNumber as string,
        }));

      if (employeeList.length === 0) {
        toast({ title: '직원을 선택해주세요.', variant: 'destructive' });
        return;
      }

      const reportData = {
        reportDate: new Date().toISOString(),
        status: 'draft' as const,
        faxStatus: 'success' as const,
        employees: employeeList,
        formData: { workplace, employees },
      };

      if (reportId) {
        await lossReportService.updateDraft(reportId, reportData);
      } else {
        const newReport = await lossReportService.saveDraft(reportData);
        setReportId(newReport.id);
        window.history.replaceState({}, '', `/hr/insurance/loss/edit/${newReport.id}`);
      }

      toast({ title: '임시 저장되었습니다.' });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({ title: '임시 저장에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 신고하기 버튼
  const handleSubmit = (): void => {
    if (!isFormValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setConfirmDialogOpen(true);
  };

  // 신고 확인 후 처리
  const handleConfirmSubmit = async (): Promise<void> => {
    try {
      const now = new Date();
      const reportDate = now.toISOString();

      const employeeList = employees
        .filter(emp => emp.employeeId)
        .map(emp => ({
          employeeId: emp.employeeId as string,
          employeeName: emp.name,
          employeeNumber: emp.employeeNumber as string,
        }));

      let completedReport;

      if (reportId) {
        completedReport = await lossReportService.complete(reportId, {
          reportDate,
          employees: employeeList,
          formData: { workplace, employees, workplaceFaxNumber, agencyFaxNumber: faxNumber },
        });
      } else {
        const draftReport = await lossReportService.saveDraft({
          reportDate,
          status: 'draft',
          faxStatus: 'success',
          employees: employeeList,
          formData: { workplace, employees, workplaceFaxNumber, agencyFaxNumber: faxNumber },
        });
        completedReport = await lossReportService.complete(draftReport.id, {});
      }

      saveWorkplaceInfo(workplace);

      localStorage.setItem('biskit_insurance_fax_info', JSON.stringify({
        workplaceFaxNumber,
        agencyFaxNumber: faxNumber,
      }));

      toast({ title: '자격상실 신고가 완료되었습니다.' });

      setConfirmDialogOpen(false);

      setNavigationGuard(null);
      window.history.pushState({}, '', `/hr/insurance/loss/detail/${completedReport.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast({ title: '신고에 실패했습니다.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader
        title="자격상실신고"
        showBackButton={true}
        onBack={handleBack}
        actions={
          <Button variant="outline" size="sm" onClick={handleOpenWorkplaceDialog}>
            사업장 정보 수정
          </Button>
        }
      />

      <div className="flex gap-6 flex-1 min-h-0 pb-20">
        {/* 좌측 패널 - 직원 목록 */}
        <div className="w-72 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <span className="text-sm font-medium">{employees.length}명</span>
            <Button size="sm" onClick={handleAddEmployee}>
              <Plus className="h-4 w-4 mr-1" />
              추가하기
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            {employees.map((emp, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedEmployeeIndex === idx ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedEmployeeIndex(idx)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {showErrors && !isEmployeeValid(emp) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                  <div className="text-sm min-w-0 truncate">
                    <span className="font-medium">{emp.name || '(미입력)'}</span>
                    {emp.employeeNumber && (
                      <span className="text-gray-500 ml-1">({emp.employeeNumber})</span>
                    )}
                  </div>
                </div>
                {idx > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingleEmployee(idx);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 우측 패널 - 선택된 직원 폼 */}
        <div className="flex-1 flex flex-col min-h-0">
          {employees[selectedEmployeeIndex] !== undefined && (() => {
            const index = selectedEmployeeIndex;
            const employee = employees[index]!;
            return (
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className="pt-6 space-y-6 overflow-auto flex-1">

                  {/* 기본 정보 */}
                  <div>
                    <h4 className="font-medium mb-3">기본 정보</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>성명 *</Label>
                        <div className={showErrors && !employee.employeeId ? 'rounded-md ring-1 ring-red-500' : ''}>
                          <EmployeeCombobox
                            value={employee.employeeId}
                            onChange={(sel) => handleSelectEmployeeFromCombobox(index, sel)}
                            excludeIds={employees
                              .filter((e, i) => i !== index && e.employeeId)
                              .map((e) => e.employeeId as string)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>주민등록번호/외국인등록번호 *</Label>
                        <Input
                          value={employee.residentNumber}
                          onChange={(e) => handleResidentNumberChange(index, e.target.value)}
                          placeholder="예: 900101-1234567"
                          className={showErrors && !employee.residentNumber ? 'border-red-500' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>전화번호(휴대폰번호) *</Label>
                        <Input
                          value={employee.phoneNumber}
                          onChange={(e) => handleEmployeeChange(index, 'phoneNumber', e.target.value)}
                          placeholder="예: 010-1234-5678"
                          className={showErrors && !employee.phoneNumber ? 'border-red-500' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>상실연월일 *</Label>
                        <Input
                          type="date"
                          value={employee.lossDate}
                          onChange={(e) => handleDateChange(index, 'lossDate', e.target.value)}
                          max="2100-12-31"
                          className={showErrors && !employee.lossDate ? 'border-red-500' : ''}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 보험 신고 */}
                  <div>
                    <h4 className="font-medium mb-3">보험 신고</h4>
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={employee.applyPension}
                          onChange={(e) => handleEmployeeChange(index, 'applyPension', e.target.checked)}
                        />
                        <Label>국민연금</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={employee.applyHealthInsurance}
                          onChange={(e) => handleEmployeeChange(index, 'applyHealthInsurance', e.target.checked)}
                        />
                        <Label>건강보험</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={employee.applyEmploymentInsurance}
                          onChange={(e) => handleEmployeeChange(index, 'applyEmploymentInsurance', e.target.checked)}
                        />
                        <Label>고용보험</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={employee.applyWorkersCompensation}
                          onChange={(e) => handleEmployeeChange(index, 'applyWorkersCompensation', e.target.checked)}
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
                            onValueChange={(value) => handleEmployeeChange(index, 'pensionLossCode', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PENSION_LOSS_CODES.map((code) => (
                                <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center pt-7">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={employee.pensionPayFirstDayLoss}
                              onChange={(e) => handleEmployeeChange(index, 'pensionPayFirstDayLoss', e.target.checked)}
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
                            onValueChange={(value) => handleEmployeeChange(index, 'healthLossCode', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HEALTH_LOSS_CODES.map((code) => (
                                <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
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
                              const v = e.target.value.replace(/,/g, '');
                              if (v === '' || /^\d+$/.test(v)) {
                                handleEmployeeChange(index, 'healthCurrentYearSalary', v === '' ? 0 : Number(v));
                              }
                            }}
                            placeholder="0"
                            className={showErrors && (!employee.healthCurrentYearSalary || employee.healthCurrentYearSalary === 0) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>근무개월수(해당연도) *</Label>
                          <Input
                            type="number"
                            value={employee.healthCurrentYearMonths === 0 ? '' : employee.healthCurrentYearMonths}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '') { handleEmployeeChange(index, 'healthCurrentYearMonths', 0); return; }
                              const n = Number(v);
                              if (n >= 1 && n <= 12) handleEmployeeChange(index, 'healthCurrentYearMonths', n);
                            }}
                            placeholder="0"
                            min="1"
                            max="12"
                            className={showErrors && (!employee.healthCurrentYearMonths || employee.healthCurrentYearMonths === 0) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-8">
                          <Checkbox
                            checked={employee.healthNoPreviousYearTaxAdjustment || false}
                            onChange={(e) => handleEmployeeChange(index, 'healthNoPreviousYearTaxAdjustment', e.target.checked)}
                          />
                          <Label className="cursor-pointer">전년도 연말정산을 실시하지 않았나요?</Label>
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
                                const v = e.target.value.replace(/,/g, '');
                                if (v === '' || /^\d+$/.test(v)) {
                                  handleEmployeeChange(index, 'healthPreviousYearSalary', v === '' ? 0 : Number(v));
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
                                const v = e.target.value;
                                if (v === '') { handleEmployeeChange(index, 'healthPreviousYearMonths', 0); return; }
                                const n = Number(v);
                                if (n >= 1 && n <= 12) handleEmployeeChange(index, 'healthPreviousYearMonths', n);
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
                  {(employee.applyEmploymentInsurance || employee.applyWorkersCompensation) && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">고용보험·산재보험</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>상실사유코드 *</Label>
                          <Select
                            value={employee.employmentLossCode}
                            onValueChange={(value) => handleEmployeeChange(index, 'employmentLossCode', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EMPLOYMENT_LOSS_CODES.map((code) => (
                                <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>구체적 사유 *</Label>
                          <Input
                            value={employee.employmentSpecificReason}
                            onChange={(e) => handleEmployeeChange(index, 'employmentSpecificReason', e.target.value)}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                            maxLength={50}
                            placeholder="예: 사업장 이전으로 인한 자진퇴사"
                            className={showErrors && !employee.employmentSpecificReason ? 'border-red-500' : ''}
                          />
                        </div>
                        <div className="col-span-2 pt-8 space-y-3">
                          {employee.applyEmploymentInsurance && employee.applyWorkersCompensation && (
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={employee.hasSalaryDifferenceBetweenInsurances || false}
                                onChange={(e) => handleEmployeeChange(index, 'hasSalaryDifferenceBetweenInsurances', e.target.checked)}
                              />
                              <Label className="cursor-pointer">
                                전보 또는 휴직 등의 사유로 고용보험과 산재보험 보수총액에 차이가 있나요?
                              </Label>
                            </div>
                          )}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={employee.noPreviousYearSalaryReport || false}
                              onChange={(e) => handleEmployeeChange(index, 'noPreviousYearSalaryReport', e.target.checked)}
                            />
                            <Label className="cursor-pointer">전년도 보수총액을 신고하지 않았나요?</Label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mt-4">
                        {(() => {
                          const separate = employee.applyEmploymentInsurance && employee.applyWorkersCompensation && employee.hasSalaryDifferenceBetweenInsurances;
                          if (separate) {
                            return (
                              <>
                                <div className="space-y-2">
                                  <Label>고용보험 보수총액(해당연도) *</Label>
                                  <Input
                                    type="text"
                                    value={employee.employmentCurrentYearSalary ? employee.employmentCurrentYearSalary.toLocaleString('ko-KR') : ''}
                                    onChange={(e) => {
                                      const v = e.target.value.replace(/,/g, '');
                                      if (v === '' || /^\d+$/.test(v)) handleEmployeeChange(index, 'employmentCurrentYearSalary', v === '' ? 0 : Number(v));
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
                                        const v = e.target.value.replace(/,/g, '');
                                        if (v === '' || /^\d+$/.test(v)) handleEmployeeChange(index, 'employmentPreviousYearSalary', v === '' ? 0 : Number(v));
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
                                      const v = e.target.value.replace(/,/g, '');
                                      if (v === '' || /^\d+$/.test(v)) handleEmployeeChange(index, 'workersCompCurrentYearSalary', v === '' ? 0 : Number(v));
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
                                        const v = e.target.value.replace(/,/g, '');
                                        if (v === '' || /^\d+$/.test(v)) handleEmployeeChange(index, 'workersCompPreviousYearSalary', v === '' ? 0 : Number(v));
                                      }}
                                      placeholder="0"
                                    />
                                  </div>
                                )}
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className="space-y-2">
                                  <Label>보수총액(해당연도) *</Label>
                                  <Input
                                    type="text"
                                    value={employee.employmentCurrentYearSalary ? employee.employmentCurrentYearSalary.toLocaleString('ko-KR') : ''}
                                    onChange={(e) => {
                                      const v = e.target.value.replace(/,/g, '');
                                      if (v === '' || /^\d+$/.test(v)) {
                                        const val = v === '' ? 0 : Number(v);
                                        handleEmployeeChange(index, 'employmentCurrentYearSalary', val);
                                        handleEmployeeChange(index, 'workersCompCurrentYearSalary', val);
                                      }
                                    }}
                                    placeholder="0"
                                    className={showErrors && (!employee.employmentCurrentYearSalary || employee.employmentCurrentYearSalary === 0) ? 'border-red-500' : ''}
                                  />
                                </div>
                                {employee.noPreviousYearSalaryReport && (
                                  <div className="space-y-2">
                                    <Label>보수총액(전년도) *</Label>
                                    <Input
                                      type="text"
                                      value={employee.employmentPreviousYearSalary ? employee.employmentPreviousYearSalary.toLocaleString('ko-KR') : ''}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/,/g, '');
                                        if (v === '' || /^\d+$/.test(v)) {
                                          const val = v === '' ? 0 : Number(v);
                                          handleEmployeeChange(index, 'employmentPreviousYearSalary', val);
                                          handleEmployeeChange(index, 'workersCompPreviousYearSalary', val);
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
            );
          })()}
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="fixed bottom-0 left-[305px] right-0 z-10">
        <div className="mx-auto max-w-[1500px] px-6">
          <div className={`bg-white pt-4 pb-6 px-6 flex justify-end items-center ${!isAtBottom ? 'border-t shadow-[0_-1px_3px_0_rgba(0,0,0,0.1)]' : ''}`}>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTempSave}>임시 저장</Button>
              <Button variant="outline" onClick={() => {}}>미리보기</Button>
              <Button variant="default" onClick={handleSubmit}>신고하기</Button>
            </div>
          </div>
        </div>
      </div>

      {/* 사업장 정보 수정 다이얼로그 */}
      <Dialog open={workplaceDialogOpen} onOpenChange={setWorkplaceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>사업장 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>사업장관리번호 *</Label>
                <Input
                  value={workplaceEditData.managementNumber}
                  onChange={(e) => handleWorkplaceEditChange('managementNumber', e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="예: 1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label>명칭 *</Label>
                <Input
                  value={workplaceEditData.name}
                  onChange={(e) => handleWorkplaceEditChange('name', e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>우편번호 *</Label>
                <div className="flex gap-2">
                  <Input value={workplaceEditData.postalCode} readOnly placeholder="우편번호" />
                  <Button type="button" onClick={() => setAddressDialogOpen(true)}>주소 검색</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>주소 *</Label>
                <Input value={workplaceEditData.address} readOnly placeholder="주소" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>상세주소 *</Label>
                <Input
                  value={workplaceEditData.addressDetail}
                  onChange={(e) => handleWorkplaceEditChange('addressDetail', e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="상세주소를 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label>전화번호 *</Label>
                <Input
                  value={workplaceEditData.phoneNumber}
                  onChange={(e) => {
                    if (/^[0-9+()-]*$/.test(e.target.value)) handleWorkplaceEditChange('phoneNumber', e.target.value);
                  }}
                  placeholder="예: 02-1234-5678"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setWorkplaceDialogOpen(false)}>취소</Button>
            <Button variant="default" onClick={handleWorkplaceEditSave} disabled={!isWorkplaceEditValid}>저장</Button>
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
            <div>
              <p className="text-sm font-medium mb-2">사업장 정보</p>
              <div className="bg-gray-50 p-3 rounded-md space-y-1">
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">사업장관리번호</span>
                  <span className="text-gray-900">{workplace.managementNumber || '-'}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">명칭</span>
                  <span className="text-gray-900">{workplace.name || '-'}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">주소</span>
                  <span className="text-gray-900">{workplace.address ? `${workplace.address} ${workplace.addressDetail}`.trim() : '-'}</span>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-gray-500 w-24 shrink-0">전화번호</span>
                  <span className="text-gray-900">{workplace.phoneNumber || '-'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">신고 대상 ({employees.length}명)</p>
              <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                {employees.map((emp, i) => (
                  <div key={i} className="text-sm text-gray-700">
                    {emp.name}({emp.employeeNumber || '미입력'})
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">사업장 FAX 번호</Label>
              <Input
                value={workplaceFaxNumber}
                onChange={(e) => { if (/^[0-9()-]*$/.test(e.target.value)) setWorkplaceFaxNumber(e.target.value); }}
                placeholder="예: 02-1234-5678"
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">공단 FAX 번호</Label>
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
                value={faxNumber}
                onChange={(e) => { if (/^[0-9()-]*$/.test(e.target.value)) setFaxNumber(e.target.value); }}
                placeholder="예: 02-1234-5678"
                className="text-sm"
              />
              <p className="text-xs text-gray-600">
                사업장 주소에 맞춰 공단 FAX 번호를 입력해주세요. 1개의 공단 FAX 번호만 입력해주시면 됩니다. (신고하려는 보험에 속하는 공단이어야 함)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>취소</Button>
            <Button variant="default" onClick={handleConfirmSubmit} disabled={!workplaceFaxNumber || !faxNumber}>확인</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
