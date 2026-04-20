import { useState, useEffect, useMemo, useRef } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
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
  EmployeeDependentManagement,
  DependentWithManagementInfo,
  DEPENDENT_RELATIONSHIP_CODES,
  DISABILITY_TYPE_CODES,
  RESIDENCE_STATUS_CODES,
  DEPENDENT_ACQUISITION_LOSS_CODES,
} from '../types/insurance';
import type { Employee } from '../types/employee';
import { COUNTRIES } from '@/shared/constants/countries';
import { loadWorkplaceInfo, saveWorkplaceInfo } from '../services/insuranceService';
import { dependentReportService } from '../services/dependentReportService';
import { setNavigationGuard } from '@/shared/utils/navigationGuard';

const createDefaultDependent = (): DependentWithManagementInfo => ({
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
});

const createDefaultEmployee = (): EmployeeDependentManagement => ({
  employeeId: '',
  employeeNumber: '',
  name: '',
  residentNumber: '',
  phoneNumber: '',
  dependents: [createDefaultDependent()],
});

export function DependentManagement(): JSX.Element {
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

  const [employee, setEmployee] = useState<EmployeeDependentManagement>(createDefaultEmployee());
  const [selectedDependentIndex, setSelectedDependentIndex] = useState(0);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [workplaceFaxNumber, setWorkplaceFaxNumber] = useState('');
  const [faxNumber, setFaxNumber] = useState('');

  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const isInitialLoadComplete = useRef(false);

  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      const pathParts = window.location.pathname.split('/');
      const isEditMode = pathParts.includes('edit');
      const id = isEditMode ? pathParts[pathParts.length - 1] : null;

      if (isEditMode && id) {
        setReportId(id);
        try {
          const report = await dependentReportService.getById(id);
          if (report?.formData) {
            setWorkplace(report.formData.workplace);
            if (report.formData.employees?.[0]) {
              setEmployee(report.formData.employees[0]);
            }
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
  }, [employee]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent): void => {
      if (isDirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    if (isDirty) {
      setNavigationGuard(() => window.confirm('피부양자 신고를 취소하시겠습니까?'));
    } else {
      setNavigationGuard(null);
    }
    return () => setNavigationGuard(null);
  }, [isDirty]);

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
    if (isDirtyRef.current && !window.confirm('피부양자 신고를 취소하시겠습니까?')) return;
    setNavigationGuard(null);
    window.history.pushState({}, '', '/hr/insurance/dependent');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // 사업장 정보 다이얼로그
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

  // 직원 선택
  const handleSelectEmployee = (selected: Employee | null): void => {
    if (!selected) return;
    setEmployee((prev) => ({
      ...prev,
      employeeId: selected.id,
      employeeNumber: selected.employeeNumber,
      name: selected.name,
      residentNumber: selected.residentRegistrationNumber || selected.foreignerRegistrationNumber || '',
      phoneNumber: selected.phone || '',
    }));
  };

  const handleEmployeeResidentNumberChange = (value: string): void => {
    const numbers = value.replace(/[^0-9]/g, '').slice(0, 13);
    const formatted = numbers.length > 6 ? `${numbers.slice(0, 6)}-${numbers.slice(6)}` : numbers;
    setEmployee((prev) => ({ ...prev, residentNumber: formatted }));
  };

  // 피부양자 추가/삭제/변경
  const handleAddDependent = (): void => {
    setEmployee((prev) => ({ ...prev, dependents: [...prev.dependents, createDefaultDependent()] }));
    setSelectedDependentIndex(employee.dependents.length);
  };

  const handleDeleteDependent = (index: number): void => {
    const newDependents = employee.dependents.filter((_, i) => i !== index);
    setEmployee((prev) => ({ ...prev, dependents: newDependents }));
    setSelectedDependentIndex(index >= newDependents.length ? newDependents.length - 1 : index);
  };

  const handleDependentChange = (
    index: number,
    field: keyof DependentWithManagementInfo,
    value: string | boolean
  ): void => {
    setEmployee((prev) => {
      const updated = [...prev.dependents];
      updated[index] = { ...updated[index]!, [field]: value } as DependentWithManagementInfo;
      return { ...prev, dependents: updated };
    });
  };

  const handleDependentResidentNumberChange = (index: number, value: string): void => {
    const numbers = value.replace(/[^0-9]/g, '').slice(0, 13);
    const formatted = numbers.length > 6 ? `${numbers.slice(0, 6)}-${numbers.slice(6)}` : numbers;
    handleDependentChange(index, 'residentNumber', formatted);
  };

  const handleDependentDateChange = (
    index: number,
    field: keyof DependentWithManagementInfo,
    value: string
  ): void => {
    if (value === '') { handleDependentChange(index, field, value); return; }
    if (value.length > 10) return;
    const parts = value.split('-');
    if (parts[0] && parts[0].length > 4) return;
    handleDependentChange(index, field, value);
  };

  // 피부양자 유효성 검사
  const isDependentValid = (dep: DependentWithManagementInfo): boolean => {
    if (!dep.name || !dep.residentNumber || !dep.acquisitionOrLossDate || !dep.acquisitionOrLossCode) return false;
    if (dep.acquisitionOrLossType === 'acquisition' && !dep.relationship) return false;
    if (dep.isDisabledOrVeteran && (!dep.disabilityTypeCode || !dep.registrationDate)) return false;
    if (dep.isForeigner && (!dep.nationality || !dep.residenceStatus || !dep.residencePeriod)) return false;
    return true;
  };

  const isFormValid = useMemo(() => {
    if (!workplace.managementNumber || !workplace.name || !workplace.postalCode ||
        !workplace.address || !workplace.addressDetail || !workplace.phoneNumber) return false;
    if (!employee.employeeId || !employee.name || !employee.residentNumber || !employee.phoneNumber) return false;
    if (employee.dependents.length === 0) return false;
    return employee.dependents.every(isDependentValid);
  }, [workplace, employee]);

  // 임시 저장
  const handleTempSave = async (): Promise<void> => {
    if (!employee.employeeId) {
      toast({ title: '직원을 선택해주세요.', variant: 'destructive' });
      return;
    }
    try {
      const now = new Date().toISOString();
      const reportData = {
        reportDate: now,
        status: 'draft' as const,
        faxStatus: 'success' as const,
        employees: [{ employeeId: employee.employeeId || '', employeeName: employee.name, employeeNumber: employee.employeeNumber || '' }],
        dependents: employee.dependents.map((dep) => ({ dependentName: dep.name })),
        formData: { workplace, employees: [employee] },
      };

      if (reportId) {
        await dependentReportService.updateDraft(reportId, reportData);
      } else {
        const newReport = await dependentReportService.saveDraft(reportData);
        setReportId(newReport.id);
        window.history.replaceState({}, '', `/hr/insurance/dependent/edit/${newReport.id}`);
      }

      toast({ title: '임시 저장되었습니다.' });
    } catch {
      toast({ title: '임시 저장에 실패했습니다.', variant: 'destructive' });
    }
  };

  // 신고하기
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
      const now = new Date().toISOString();
      const reportData = {
        reportDate: now,
        status: 'completed' as const,
        faxStatus: 'success' as const,
        employees: [{ employeeId: employee.employeeId || '', employeeName: employee.name, employeeNumber: employee.employeeNumber || '' }],
        dependents: employee.dependents.map((dep) => ({ dependentName: dep.name })),
        formData: { workplace, employees: [employee], workplaceFaxNumber, agencyFaxNumber: faxNumber },
      };

      let completedReport;
      if (reportId) {
        completedReport = await dependentReportService.complete(reportId, reportData);
      } else {
        const draft = await dependentReportService.saveDraft({ ...reportData, status: 'draft' });
        completedReport = await dependentReportService.complete(draft.id, {});
      }

      saveWorkplaceInfo(workplace);
      localStorage.setItem('biskit_insurance_fax_info', JSON.stringify({ workplaceFaxNumber, agencyFaxNumber: faxNumber }));

      toast({ title: '피부양자 관리 신고가 완료되었습니다.' });
      setConfirmDialogOpen(false);

      setNavigationGuard(null);
      window.history.pushState({}, '', '/hr/insurance/dependent');
      window.dispatchEvent(new PopStateEvent('popstate'));
      void completedReport;
    } catch {
      toast({ title: '신고에 실패했습니다.', variant: 'destructive' });
    }
  };

  const currentDependent = employee.dependents[selectedDependentIndex];

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader
        title="피부양자 관리"
        showBackButton={true}
        onBack={handleBack}
        actions={
          <Button variant="outline" size="sm" onClick={handleOpenWorkplaceDialog}>
            사업장 정보 수정
          </Button>
        }
      />

      {/* 직원 정보 영역 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">직원 정보</p>
        <div className="flex gap-8 items-end">
          <div className="space-y-1.5 w-64">
            <Label>성명 *</Label>
            <div className={showErrors && !employee.employeeId ? 'rounded-md ring-1 ring-red-500' : ''}>
              <EmployeeCombobox
                value={employee.employeeId}
                onChange={handleSelectEmployee}
                activeOnly={true}
              />
            </div>
          </div>
          <div className="space-y-1.5 w-64">
            <Label>주민등록번호/외국인등록번호 *</Label>
            <Input
              value={employee.residentNumber}
              onChange={(e) => handleEmployeeResidentNumberChange(e.target.value)}
              placeholder="예: 900101-1234567"
              className={showErrors && !employee.residentNumber ? 'border-red-500' : ''}
            />
          </div>
          <div className="space-y-1.5 w-52">
            <Label>전화번호(휴대폰번호) *</Label>
            <Input
              value={employee.phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9-]/g, '');
                setEmployee((prev) => ({ ...prev, phoneNumber: value }));
              }}
              placeholder="예: 010-1234-5678"
              maxLength={13}
              className={showErrors && !employee.phoneNumber ? 'border-red-500' : ''}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0 pb-20">
        {/* 좌측 패널 */}
        <div className="w-64 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          {/* 피부양자 목록 */}
          <div className="p-4 border-b flex items-center justify-between">
            <span className="text-sm font-medium">{employee.dependents.length}명</span>
            <Button size="sm" onClick={handleAddDependent}>
              <Plus className="h-4 w-4 mr-1" />
              추가하기
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            {employee.dependents.map((dep, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedDependentIndex === idx ? 'bg-blue-50' : ''}`}
                onClick={() => setSelectedDependentIndex(idx)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {showErrors && !isDependentValid(dep) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                  <div className="text-sm min-w-0 truncate">
                    <span className="font-medium">{dep.name || '(미입력)'}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      {dep.acquisitionOrLossType === 'acquisition' ? '취득' : '상실'}
                    </span>
                  </div>
                </div>
                {idx > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 ml-2"
                    onClick={(e) => { e.stopPropagation(); handleDeleteDependent(idx); }}
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 우측 패널 - 선택된 피부양자 폼 */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentDependent ? (
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardContent className="pt-6 space-y-6 overflow-auto flex-1">

                {/* 구분 / 날짜 / 부호 */}
                <div>
                  <h4 className="font-medium mb-3">기본 정보</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>구분 *</Label>
                      <RadioGroup
                        value={currentDependent.acquisitionOrLossType || 'acquisition'}
                        onValueChange={(value: 'acquisition' | 'loss') =>
                          handleDependentChange(selectedDependentIndex, 'acquisitionOrLossType', value)
                        }
                      >
                        <div className="flex items-center gap-4 pt-1">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="acquisition" id={`acq-${selectedDependentIndex}`} />
                            <Label htmlFor={`acq-${selectedDependentIndex}`} className="font-normal cursor-pointer">취득</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="loss" id={`loss-${selectedDependentIndex}`} />
                            <Label htmlFor={`loss-${selectedDependentIndex}`} className="font-normal cursor-pointer">상실</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {currentDependent.acquisitionOrLossType === 'loss' ? '상실일자' : '취득일자'} *
                      </Label>
                      <Input
                        type="date"
                        value={currentDependent.acquisitionOrLossDate}
                        onChange={(e) => handleDependentDateChange(selectedDependentIndex, 'acquisitionOrLossDate', e.target.value)}
                        max="2100-12-31"
                        className={showErrors && !currentDependent.acquisitionOrLossDate ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {currentDependent.acquisitionOrLossType === 'loss' ? '상실부호' : '취득부호'} *
                      </Label>
                      <Select
                        value={currentDependent.acquisitionOrLossCode}
                        onValueChange={(value) => handleDependentChange(selectedDependentIndex, 'acquisitionOrLossCode', value)}
                      >
                        <SelectTrigger className={showErrors && !currentDependent.acquisitionOrLossCode ? 'border-red-500' : ''}>
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPENDENT_ACQUISITION_LOSS_CODES.filter(
                            (code) => code.type === (currentDependent.acquisitionOrLossType || 'acquisition')
                          ).map((code) => (
                            <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {currentDependent.acquisitionOrLossType !== 'loss' && (
                      <div className="space-y-2">
                        <Label>피부양자 관계 *</Label>
                        <Select
                          value={currentDependent.relationship}
                          onValueChange={(value) => handleDependentChange(selectedDependentIndex, 'relationship', value)}
                        >
                          <SelectTrigger className={showErrors && !currentDependent.relationship ? 'border-red-500' : ''}>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPENDENT_RELATIONSHIP_CODES.map((code) => (
                              <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>성명 *</Label>
                      <Input
                        value={currentDependent.name}
                        onChange={(e) => handleDependentChange(selectedDependentIndex, 'name', e.target.value)}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        maxLength={30}
                        className={showErrors && !currentDependent.name ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>주민등록번호/외국인등록번호 *</Label>
                      <Input
                        value={currentDependent.residentNumber}
                        onChange={(e) => handleDependentResidentNumberChange(selectedDependentIndex, e.target.value)}
                        placeholder="예: 900101-1234567"
                        className={showErrors && !currentDependent.residentNumber ? 'border-red-500' : ''}
                      />
                    </div>
                  </div>
                </div>

                {/* 장애인·국가유공자 */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={currentDependent.isDisabledOrVeteran}
                      onChange={(e) => handleDependentChange(selectedDependentIndex, 'isDisabledOrVeteran', e.target.checked)}
                    />
                    <Label>장애인·국가유공자</Label>
                  </div>
                  {currentDependent.isDisabledOrVeteran && (
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>종별부호 *</Label>
                        <Select
                          value={currentDependent.disabilityTypeCode}
                          onValueChange={(value) => handleDependentChange(selectedDependentIndex, 'disabilityTypeCode', value)}
                        >
                          <SelectTrigger className={showErrors && !currentDependent.disabilityTypeCode ? 'border-red-500' : ''}>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {DISABILITY_TYPE_CODES.map((code) => (
                              <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>등록일 *</Label>
                        <Input
                          type="date"
                          value={currentDependent.registrationDate}
                          onChange={(e) => handleDependentDateChange(selectedDependentIndex, 'registrationDate', e.target.value)}
                          max="2100-12-31"
                          className={showErrors && !currentDependent.registrationDate ? 'border-red-500' : ''}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 외국인 */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={currentDependent.isForeigner}
                      onChange={(e) => handleDependentChange(selectedDependentIndex, 'isForeigner', e.target.checked)}
                    />
                    <Label>외국인</Label>
                  </div>
                  {currentDependent.isForeigner && (
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label>국적 *</Label>
                        <Select
                          value={currentDependent.nationality}
                          onValueChange={(value) => handleDependentChange(selectedDependentIndex, 'nationality', value)}
                        >
                          <SelectTrigger className={showErrors && !currentDependent.nationality ? 'border-red-500' : ''}>
                            <SelectValue placeholder="국적을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>{country.nameKo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>체류자격 *</Label>
                        <Select
                          value={currentDependent.residenceStatus}
                          onValueChange={(value) => handleDependentChange(selectedDependentIndex, 'residenceStatus', value)}
                        >
                          <SelectTrigger className={showErrors && !currentDependent.residenceStatus ? 'border-red-500' : ''}>
                            <SelectValue placeholder="선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {RESIDENCE_STATUS_CODES.map((code) => (
                              <SelectItem key={code.value} value={code.value}>{code.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>체류기간 *</Label>
                        <Input
                          value={currentDependent.residencePeriod}
                          onChange={(e) => handleDependentChange(selectedDependentIndex, 'residencePeriod', e.target.value)}
                          maxLength={30}
                          className={showErrors && !currentDependent.residencePeriod ? 'border-red-500' : ''}
                        />
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              피부양자를 추가하세요.
            </div>
          )}
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
                  <Input
                    value={workplaceEditData.postalCode}
                    readOnly
                    placeholder="우편번호"
                  />
                  <Button type="button" onClick={() => setAddressDialogOpen(true)}>
                    주소 검색
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>주소 *</Label>
                <Input
                  value={workplaceEditData.address}
                  readOnly
                  placeholder="주소"
                />
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
                    const value = e.target.value;
                    if (/^[0-9+()-]*$/.test(value)) handleWorkplaceEditChange('phoneNumber', value);
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
            <DialogTitle>피부양자 관리 신고 확인</DialogTitle>
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
              <p className="text-sm font-medium mb-2">신고 대상</p>
              <div className="bg-gray-50 p-3 rounded-md space-y-1">
                <div className="text-sm text-gray-700">
                  {employee.name}({employee.employeeNumber || '미입력'})
                </div>
                <div className="text-sm text-gray-600">
                  피부양자 {employee.dependents.length}명 (
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
                사업장 주소에 맞춰 공단 FAX 번호를 입력해주세요. 1개의 공단 FAX 번호만 입력해주시면 됩니다.
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
