import { useState, useEffect, useRef, useMemo } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { EmployeeCombobox } from '../components/EmployeeCombobox';
import { AddressSearchDialog } from '../components/AddressSearchDialog';
import { toast } from '@/shared/hooks/use-toast';
import { WorkplaceInfo, EmployeeSalaryChangeInfo } from '../types/insurance';
import { loadWorkplaceInfo, saveWorkplaceInfo } from '../services/insuranceService';
import { salaryChangeReportService } from '../services/salaryChangeReportService';
import { setNavigationGuard } from '@/shared/utils/navigationGuard';
import type { Employee } from '../types/employee';

const createDefaultEmployee = (): EmployeeSalaryChangeInfo => ({
  employeeId: '',
  employeeNumber: '',
  name: '',
  residentNumber: '',
  changeMonth: '',
  changeReason: '',
  applyPension: true,
  applyHealthInsurance: true,
  applyEmploymentInsurance: true,
  applyWorkersCompensation: true,
  pensionCurrentIncome: 0,
  pensionChangedIncome: 0,
  pensionWorkerConsent: false,
  healthChangedSalary: 0,
  healthChangeMonth: 0,
  healthChangeReason: '',
  isDifferentEmploymentWorkersCompSalary: false,
  employmentChangedSalary: 0,
  workersCompChangedSalary: 0,
  employmentWorkersCompChangeMonth: 0,
  employmentWorkersCompChangeReason: '',
});

export function InsuranceSalaryChange(): JSX.Element {
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

  const [employees, setEmployees] = useState<EmployeeSalaryChangeInfo[]>([createDefaultEmployee()]);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(0);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [workplaceFaxNumber, setWorkplaceFaxNumber] = useState('');
  const [faxNumber, setFaxNumber] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(false);

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

  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      const pathParts = window.location.pathname.split('/');
      const isEditMode = pathParts.includes('edit');
      const id = isEditMode ? pathParts[pathParts.length - 1] : null;

      if (isEditMode && id) {
        setReportId(id);
        try {
          const report = await salaryChangeReportService.getById(id);
          if (report?.formData) {
            setWorkplace(report.formData.workplace);
            setEmployees(report.formData.employees);
            toast({ title: '작성중인 신고 데이터를 불러왔습니다.' });
            return;
          }
        } catch {
          toast({ title: '데이터를 불러오는데 실패했습니다.', variant: 'destructive' });
        }
      }

      const savedWorkplace = loadWorkplaceInfo();
      if (savedWorkplace) setWorkplace(savedWorkplace);
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
      setNavigationGuard(() => window.confirm('보수월액 변경신고를 취소하시겠습니까?'));
    } else {
      setNavigationGuard(null);
    }
    return () => setNavigationGuard(null);
  }, [isDirty]);

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

  const handleAddressComplete = (data: { zonecode: string; address: string }): void => {
    setWorkplaceEditData((prev) => ({ ...prev, postalCode: data.zonecode, address: data.address }));
    setAddressDialogOpen(false);
  };

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

  const handleEmployeeChange = (
    index: number,
    field: keyof EmployeeSalaryChangeInfo,
    value: EmployeeSalaryChangeInfo[keyof EmployeeSalaryChangeInfo]
  ): void => {
    setEmployees((prev) => {
      const updated = [...prev];
      const employee = { ...updated[index], [field]: value } as EmployeeSalaryChangeInfo;

      if (field === 'applyPension' && value === false) {
        employee.pensionCurrentIncome = 0;
        employee.pensionChangedIncome = 0;
        employee.pensionWorkerConsent = false;
      } else if (field === 'applyHealthInsurance' && value === false) {
        employee.healthChangedSalary = 0;
      } else if (
        (field === 'applyEmploymentInsurance' || field === 'applyWorkersCompensation') &&
        value === false
      ) {
        const otherInsurance =
          field === 'applyEmploymentInsurance'
            ? employee.applyWorkersCompensation
            : employee.applyEmploymentInsurance;
        if (!otherInsurance) {
          employee.employmentChangedSalary = 0;
          employee.workersCompChangedSalary = 0;
        }
      }

      updated[index] = employee;
      return updated;
    });
  };

  const handleResidentNumberChange = (index: number, value: string): void => {
    const numbers = value.replace(/[^0-9]/g, '').slice(0, 13);
    const formatted = numbers.length > 6 ? `${numbers.slice(0, 6)}-${numbers.slice(6)}` : numbers;
    handleEmployeeChange(index, 'residentNumber', formatted);
  };

  const handleMonthChange = (index: number, field: keyof EmployeeSalaryChangeInfo, value: string): void => {
    if (value === '') { handleEmployeeChange(index, field, value); return; }
    if (value.length > 7) return;
    const parts = value.split('-');
    if (parts[0] && parts[0].length > 4) return;
    handleEmployeeChange(index, field, value);
  };

  const handleSelectEmployeeFromCombobox = (index: number, employee: Employee | null): void => {
    if (!employee) return;

    const calculateMonthlySalary = (): number => {
      if (!employee.payrollTemplate || employee.payrollTemplate.length === 0) return 0;
      return employee.payrollTemplate
        .filter((item) => item.category === 'taxable')
        .reduce((sum, item) => sum + item.amount, 0);
    };

    setEmployees((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        employeeId: employee.id,
        employeeNumber: employee.employeeNumber,
        name: employee.name,
        residentNumber: employee.residentRegistrationNumber || employee.foreignerRegistrationNumber || '',
        changeMonth: format(new Date(), 'yyyy-MM'),
        pensionCurrentIncome: calculateMonthlySalary(),
      } as EmployeeSalaryChangeInfo;
      return updated;
    });
  };

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

  const handleTempSave = async (): Promise<void> => {
    try {
      const employeeList = employees
        .filter((emp) => emp.employeeId)
        .map((emp) => ({
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
        await salaryChangeReportService.updateDraft(reportId, reportData);
      } else {
        const newReport = await salaryChangeReportService.saveDraft(reportData);
        setReportId(newReport.id);
        window.history.replaceState({}, '', `/hr/insurance/salary-change/edit/${newReport.id}`);
      }

      toast({ title: '임시 저장되었습니다.' });
    } catch {
      toast({ title: '임시 저장에 실패했습니다.', variant: 'destructive' });
    }
  };

  const isEmployeeValid = (emp: EmployeeSalaryChangeInfo): boolean => {
    if (!emp.employeeId || !emp.name || !emp.residentNumber || !emp.changeMonth || !emp.changeReason) return false;
    if (emp.applyPension) {
      if (!emp.pensionCurrentIncome || emp.pensionCurrentIncome === 0) return false;
      if (!emp.pensionChangedIncome || emp.pensionChangedIncome === 0) return false;
    }
    if (emp.applyHealthInsurance) {
      if (!emp.healthChangedSalary || emp.healthChangedSalary === 0) return false;
    }
    if (emp.applyEmploymentInsurance || emp.applyWorkersCompensation) {
      if (emp.applyEmploymentInsurance && emp.applyWorkersCompensation && !emp.isDifferentEmploymentWorkersCompSalary) {
        if (!emp.employmentChangedSalary || emp.employmentChangedSalary === 0) return false;
      } else {
        if (emp.applyEmploymentInsurance && (!emp.employmentChangedSalary || emp.employmentChangedSalary === 0)) return false;
        if (emp.applyWorkersCompensation && (!emp.workersCompChangedSalary || emp.workersCompChangedSalary === 0)) return false;
      }
    }
    return true;
  };

  const isFormValid = useMemo(() => {
    if (!workplace.managementNumber || !workplace.name || !workplace.postalCode ||
        !workplace.address || !workplace.addressDetail || !workplace.phoneNumber) return false;
    if (employees.length === 0) return false;
    return employees.every(isEmployeeValid);
  }, [workplace, employees]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (): void => {
    if (!isFormValid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async (): Promise<void> => {
    try {
      const employeeList = employees
        .filter((emp) => emp.employeeId)
        .map((emp) => ({
          employeeId: emp.employeeId as string,
          employeeName: emp.name,
          employeeNumber: emp.employeeNumber as string,
        }));

      const reportDate = new Date().toISOString();
      let completedReport;

      if (reportId) {
        completedReport = await salaryChangeReportService.complete(reportId, {
          reportDate,
          employees: employeeList,
          formData: { workplace, employees, workplaceFaxNumber, agencyFaxNumber: faxNumber },
        });
      } else {
        const draft = await salaryChangeReportService.saveDraft({
          reportDate,
          status: 'draft',
          faxStatus: 'success',
          employees: employeeList,
          formData: { workplace, employees, workplaceFaxNumber, agencyFaxNumber: faxNumber },
        });
        completedReport = await salaryChangeReportService.complete(draft.id, {});
      }

      saveWorkplaceInfo(workplace);
      localStorage.setItem('biskit_insurance_fax_info', JSON.stringify({ workplaceFaxNumber, agencyFaxNumber: faxNumber }));

      toast({ title: '보수월액 변경 신고가 완료되었습니다.' });

      setNavigationGuard(null);
      setConfirmDialogOpen(false);

      window.history.pushState({}, '', `/hr/insurance/salary-change/detail/${completedReport.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      toast({ title: '신고에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleBack = (): void => {
    if (isDirtyRef.current && !window.confirm('보수월액 변경신고를 취소하시겠습니까?')) return;
    setNavigationGuard(null);
    window.history.pushState({}, '', '/hr/insurance/salary-change');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader
        title="보수월액 변경신고"
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
                        <Label>보수 변경 월 *</Label>
                        <Input
                          type="month"
                          value={employee.changeMonth}
                          onChange={(e) => handleMonthChange(index, 'changeMonth', e.target.value)}
                          max="2100-12"
                          className={showErrors && !employee.changeMonth ? 'border-red-500' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>변경사유 *</Label>
                        <Input
                          value={employee.changeReason}
                          onChange={(e) => handleEmployeeChange(index, 'changeReason', e.target.value)}
                          onCompositionStart={() => setIsComposing(true)}
                          onCompositionEnd={() => setIsComposing(false)}
                          placeholder="보수인상, 보수인하, 착오정정 등"
                          className={showErrors && !employee.changeReason ? 'border-red-500' : ''}
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
                      <h4 className="font-medium mb-2">국민연금</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        기준소득월액 대비 실제 소득이 보건복지부장관이 고시하는 비율 이상으로 변동된 자만 신고해주세요.
                      </p>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>현재 기준소득월액 *</Label>
                          <Input
                            type="text"
                            value={employee.pensionCurrentIncome ? employee.pensionCurrentIncome.toLocaleString('ko-KR') : ''}
                            onChange={(e) => {
                              const num = e.target.value.replace(/,/g, '');
                              if (num === '' || /^\d+$/.test(num)) {
                                handleEmployeeChange(index, 'pensionCurrentIncome', num === '' ? 0 : Number(num));
                              }
                            }}
                            placeholder="0"
                            className={showErrors && (!employee.pensionCurrentIncome || employee.pensionCurrentIncome === 0) ? 'border-red-500' : ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>변경 기준소득월액 *</Label>
                          <Input
                            type="text"
                            value={employee.pensionChangedIncome ? employee.pensionChangedIncome.toLocaleString('ko-KR') : ''}
                            onChange={(e) => {
                              const num = e.target.value.replace(/,/g, '');
                              if (num === '' || /^\d+$/.test(num)) {
                                handleEmployeeChange(index, 'pensionChangedIncome', num === '' ? 0 : Number(num));
                              }
                            }}
                            placeholder="0"
                            className={showErrors && (!employee.pensionChangedIncome || employee.pensionChangedIncome === 0) ? 'border-red-500' : ''}
                          />
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
                          <Label>변경 후 보수월액 *</Label>
                          <Input
                            type="text"
                            value={employee.healthChangedSalary ? employee.healthChangedSalary.toLocaleString('ko-KR') : ''}
                            onChange={(e) => {
                              const num = e.target.value.replace(/,/g, '');
                              if (num === '' || /^\d+$/.test(num)) {
                                handleEmployeeChange(index, 'healthChangedSalary', num === '' ? 0 : Number(num));
                              }
                            }}
                            placeholder="0"
                            className={showErrors && (!employee.healthChangedSalary || employee.healthChangedSalary === 0) ? 'border-red-500' : ''}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 고용보험·산재보험 */}
                  {(employee.applyEmploymentInsurance || employee.applyWorkersCompensation) && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">고용보험·산재보험</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {employee.applyEmploymentInsurance && employee.applyWorkersCompensation && !employee.isDifferentEmploymentWorkersCompSalary ? (
                          <>
                            <div className="space-y-2">
                              <Label>변경 후 월평균보수 *</Label>
                              <Input
                                type="text"
                                value={employee.employmentChangedSalary ? employee.employmentChangedSalary.toLocaleString('ko-KR') : ''}
                                onChange={(e) => {
                                  const num = e.target.value.replace(/,/g, '');
                                  if (num === '' || /^\d+$/.test(num)) {
                                    const salary = num === '' ? 0 : Number(num);
                                    handleEmployeeChange(index, 'employmentChangedSalary', salary);
                                    handleEmployeeChange(index, 'workersCompChangedSalary', salary);
                                  }
                                }}
                                placeholder="0"
                                className={showErrors && (!employee.employmentChangedSalary || employee.employmentChangedSalary === 0) ? 'border-red-500' : ''}
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={employee.isDifferentEmploymentWorkersCompSalary ?? false}
                                  onChange={(e) => handleEmployeeChange(index, 'isDifferentEmploymentWorkersCompSalary', e.target.checked)}
                                />
                                <Label className="font-normal text-sm leading-tight">
                                  고용보험과 산재보험의<br />
                                  변경 후 월평균보수가 다른가요?
                                </Label>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {employee.applyEmploymentInsurance && (
                              <div className="space-y-2">
                                <Label>
                                  {employee.applyWorkersCompensation && employee.isDifferentEmploymentWorkersCompSalary
                                    ? '고용보험 변경 후 월평균보수 *'
                                    : '변경 후 월평균보수 *'}
                                </Label>
                                <Input
                                  type="text"
                                  value={employee.employmentChangedSalary ? employee.employmentChangedSalary.toLocaleString('ko-KR') : ''}
                                  onChange={(e) => {
                                    const num = e.target.value.replace(/,/g, '');
                                    if (num === '' || /^\d+$/.test(num)) {
                                      handleEmployeeChange(index, 'employmentChangedSalary', num === '' ? 0 : Number(num));
                                    }
                                  }}
                                  placeholder="0"
                                  className={showErrors && (!employee.employmentChangedSalary || employee.employmentChangedSalary === 0) ? 'border-red-500' : ''}
                                />
                              </div>
                            )}
                            {employee.applyWorkersCompensation && (
                              <div className="space-y-2">
                                <Label>
                                  {employee.applyEmploymentInsurance && employee.isDifferentEmploymentWorkersCompSalary
                                    ? '산재보험 변경 후 월평균보수 *'
                                    : '변경 후 월평균보수 *'}
                                </Label>
                                <Input
                                  type="text"
                                  value={employee.workersCompChangedSalary ? employee.workersCompChangedSalary.toLocaleString('ko-KR') : ''}
                                  onChange={(e) => {
                                    const num = e.target.value.replace(/,/g, '');
                                    if (num === '' || /^\d+$/.test(num)) {
                                      handleEmployeeChange(index, 'workersCompChangedSalary', num === '' ? 0 : Number(num));
                                    }
                                  }}
                                  placeholder="0"
                                  className={showErrors && (!employee.workersCompChangedSalary || employee.workersCompChangedSalary === 0) ? 'border-red-500' : ''}
                                />
                              </div>
                            )}
                            {employee.applyEmploymentInsurance && employee.applyWorkersCompensation && (
                              <div className="flex items-end pb-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={employee.isDifferentEmploymentWorkersCompSalary ?? false}
                                    onChange={(e) => handleEmployeeChange(index, 'isDifferentEmploymentWorkersCompSalary', e.target.checked)}
                                  />
                                  <Label className="font-normal text-sm leading-tight">
                                    고용보험과 산재보험의<br />
                                    변경 후 월평균보수가 다른가요?
                                  </Label>
                                </div>
                              </div>
                            )}
                          </>
                        )}
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
                    if (/^[0-9+()-]*$/.test(e.target.value)) {
                      handleWorkplaceEditChange('phoneNumber', e.target.value);
                    }
                  }}
                  placeholder="예: 02-1234-5678"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>전자우편주소</Label>
                <Input
                  value={workplaceEditData.email}
                  onChange={(e) => handleWorkplaceEditChange('email', e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="예: example@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>휴대폰번호</Label>
                <Input
                  value={workplaceEditData.mobilePhone}
                  onChange={(e) => {
                    if (/^[0-9+()-]*$/.test(e.target.value)) {
                      handleWorkplaceEditChange('mobilePhone', e.target.value);
                    }
                  }}
                  placeholder="예: 010-1234-5678"
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
            <DialogTitle>보수월액 변경 신고 확인</DialogTitle>
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
                {workplace.email && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-500 w-24 shrink-0">전자우편주소</span>
                    <span className="text-gray-900">{workplace.email}</span>
                  </div>
                )}
                {workplace.mobilePhone && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-gray-500 w-24 shrink-0">휴대폰번호</span>
                    <span className="text-gray-900">{workplace.mobilePhone}</span>
                  </div>
                )}
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
                onChange={(e) => {
                  if (/^[0-9()-]*$/.test(e.target.value)) setWorkplaceFaxNumber(e.target.value);
                }}
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
                onChange={(e) => {
                  if (/^[0-9()-]*$/.test(e.target.value)) setFaxNumber(e.target.value);
                }}
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
