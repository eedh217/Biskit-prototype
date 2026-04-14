import { useState, useEffect } from 'react';
import { Info, Search, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  WorkplaceInfo,
  EmployeeSalaryChangeInfo,
  InsuranceSalaryChangeForm,
} from '../types/insurance';
import {
  saveWorkplaceInfo,
  loadWorkplaceInfo,
  saveSalaryChangeHistory,
  getSalaryChangeHistories,
} from '../services/insuranceService';
import type { Employee } from '../types/employee';

const SALARY_CHANGE_TEMP_STORAGE_KEY = 'biskit_insurance_salary_change_temp';

export function InsuranceSalaryChange(): JSX.Element {
  const [isComposing, setIsComposing] = useState(false);

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

  // 직원 목록
  const [employees, setEmployees] = useState<EmployeeSalaryChangeInfo[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // 신청 정보
  const [reportDate, setReportDate] = useState(
    format(new Date(), 'yyyy-MM-dd')
  );

  // 임시저장 정보
  const [hasTempData, setHasTempData] = useState(false);
  const [tempSavedAt, setTempSavedAt] = useState<string>('');

  // 신청내역 조회 Dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [histories, setHistories] = useState<any[]>([]);

  // 초기 데이터 로드
  useEffect(() => {
    const savedWorkplace = loadWorkplaceInfo();
    if (savedWorkplace) {
      setWorkplace(savedWorkplace);
    }

    const tempDataStr = localStorage.getItem(SALARY_CHANGE_TEMP_STORAGE_KEY);
    if (tempDataStr) {
      try {
        const tempData: InsuranceSalaryChangeForm = JSON.parse(tempDataStr);
        setHasTempData(true);
        setTempSavedAt(tempData.savedAt || '');
      } catch {
        // 무시
      }
    }
  }, []);

  // 사업장 정보 변경 핸들러
  const handleWorkplaceChange = (field: keyof WorkplaceInfo, value: string): void => {
    setWorkplace((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 직원 추가
  const handleAddEmployee = (employee: Employee | null): void => {
    if (!employee) return;

    // 이미 추가된 직원인지 체크
    const exists = employees.some((e) => e.employeeId === employee.id);
    if (exists) {
      toast({
        title: '이미 추가된 직원입니다.',
        variant: 'destructive',
      });
      return;
    }

    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthNumber = new Date().getMonth() + 1;

    const newEmployee: EmployeeSalaryChangeInfo = {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      residentNumber: employee.residentRegistrationNumber || employee.foreignerRegistrationNumber || '',
      changeMonth: currentMonth,
      changeReason: '',
      applyPension: true,
      applyHealthInsurance: true,
      applyEmploymentInsurance: true,
      applyWorkersCompensation: true,
      pensionCurrentIncome: employee.salary || 0,
      pensionChangedIncome: 0,
      pensionWorkerConsent: false,
      healthChangedSalary: 0,
      healthChangeMonth: monthNumber,
      healthChangeReason: '',
      employmentChangedSalary: 0,
      workersCompChangedSalary: 0,
      employmentWorkersCompChangeMonth: monthNumber,
      employmentWorkersCompChangeReason: '',
    };

    setEmployees((prev) => [...prev, newEmployee]);
  };

  // 직원 정보 변경
  const handleEmployeeChange = (
    index: number,
    field: keyof EmployeeSalaryChangeInfo,
    value: any
  ): void => {
    setEmployees((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  // 직원 삭제
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

  // 전체 선택
  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedEmployeeIds(new Set(employees.map((_, index) => String(index))));
    } else {
      setSelectedEmployeeIds(new Set());
    }
  };

  // 개별 선택
  const handleSelectEmployee = (index: number, checked: boolean): void => {
    const newSelected = new Set(selectedEmployeeIds);
    if (checked) {
      newSelected.add(String(index));
    } else {
      newSelected.delete(String(index));
    }
    setSelectedEmployeeIds(newSelected);
  };

  // 임시 저장
  const handleTempSave = (): void => {
    const formData: InsuranceSalaryChangeForm = {
      workplace,
      employees,
      reportDate,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(SALARY_CHANGE_TEMP_STORAGE_KEY, JSON.stringify(formData));
    setHasTempData(true);
    setTempSavedAt(formData.savedAt);

    toast({
      title: '임시 저장되었습니다.',
    });
  };

  // 임시 저장 불러오기
  const handleLoadTempData = (): void => {
    const tempDataStr = localStorage.getItem(SALARY_CHANGE_TEMP_STORAGE_KEY);
    if (!tempDataStr) {
      toast({
        title: '불러올 임시 저장 데이터가 없습니다.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const tempData: InsuranceSalaryChangeForm = JSON.parse(tempDataStr);
      setWorkplace(tempData.workplace);
      setEmployees(tempData.employees);
      setReportDate(tempData.reportDate);

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
    localStorage.removeItem(SALARY_CHANGE_TEMP_STORAGE_KEY);
    setHasTempData(false);
    setTempSavedAt('');

    toast({
      title: '임시 저장 데이터를 삭제했습니다.',
    });
  };

  // 신청
  const handleSubmit = (): void => {
    // 유효성 검증
    if (!workplace.managementNumber) {
      toast({
        title: '사업장관리번호를 입력하세요.',
        variant: 'destructive',
      });
      return;
    }

    if (employees.length === 0) {
      toast({
        title: '직원을 추가하세요.',
        variant: 'destructive',
      });
      return;
    }

    // 신청내역 저장
    saveSalaryChangeHistory(reportDate, workplace, employees);

    // 사업장 정보 저장
    saveWorkplaceInfo(workplace);

    // 임시 저장 데이터 삭제
    localStorage.removeItem(SALARY_CHANGE_TEMP_STORAGE_KEY);
    setHasTempData(false);
    setTempSavedAt('');

    toast({
      title: '보수월액 변경 신청이 완료되었습니다.',
    });

    // 초기화
    setEmployees([]);
    setSelectedEmployeeIds(new Set());
  };

  // 신청내역 조회
  const handleSearchHistory = (): void => {
    const results = getSalaryChangeHistories(
      historyStartDate || undefined,
      historyEndDate || undefined,
      historySearch || undefined
    );
    setHistories(results);
  };

  // 신청내역 Dialog 열기
  const handleOpenHistoryDialog = (): void => {
    setHistoryDialogOpen(true);
    handleSearchHistory();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="보수월액 변경신청" showBackButton={false} />

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
              <Label htmlFor="unitName">단위사업장 명칭</Label>
              <Input
                id="unitName"
                value={workplace.unitName}
                onChange={(e) => handleWorkplaceChange('unitName', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branchName">영업소 명칭</Label>
              <Input
                id="branchName"
                value={workplace.branchName}
                onChange={(e) => handleWorkplaceChange('branchName', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">우편번호</Label>
              <Input
                id="postalCode"
                value={workplace.postalCode}
                onChange={(e) => handleWorkplaceChange('postalCode', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호</Label>
              <Input
                id="phoneNumber"
                value={workplace.phoneNumber}
                onChange={(e) => handleWorkplaceChange('phoneNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={workplace.address}
                onChange={(e) => handleWorkplaceChange('address', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressDetail">상세주소</Label>
              <Input
                id="addressDetail"
                value={workplace.addressDetail}
                onChange={(e) => handleWorkplaceChange('addressDetail', e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="faxNumber">FAX번호</Label>
              <Input
                id="faxNumber"
                value={workplace.faxNumber}
                onChange={(e) => handleWorkplaceChange('faxNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">전자우편주소</Label>
              <Input
                id="email"
                type="email"
                value={workplace.email}
                onChange={(e) => handleWorkplaceChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobilePhone">휴대폰번호</Label>
              <Input
                id="mobilePhone"
                value={workplace.mobilePhone}
                onChange={(e) => handleWorkplaceChange('mobilePhone', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 직원 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>직장가입자 (직원) 목록</CardTitle>
            <div className="flex gap-2">
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
          <div className="flex items-center gap-2">
            <Label>직원 추가</Label>
            <div className="flex-1 max-w-md">
              <EmployeeCombobox
                onChange={handleAddEmployee}
                excludeIds={employees
                  .filter((e) => e.employeeId)
                  .map((e) => e.employeeId as string)}
              />
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              직원을 추가하세요.
            </div>
          ) : (
            <div className="space-y-6">
              {employees.map((employee, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedEmployeeIds.has(String(index))}
                        onChange={(e) => handleSelectEmployee(index, e.target.checked)}
                      />
                      <div className="font-semibold">
                        {employee.name} ({employee.employeeNumber || '신규'})
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {/* 기본 정보 */}
                    <div>
                      <h4 className="font-medium mb-3">기본 정보</h4>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>성명 *</Label>
                          <Input
                            value={employee.name}
                            onChange={(e) =>
                              handleEmployeeChange(index, 'name', e.target.value)
                            }
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>주민등록번호/외국인등록번호 *</Label>
                          <Input
                            value={employee.residentNumber}
                            onChange={(e) =>
                              handleEmployeeChange(index, 'residentNumber', e.target.value)
                            }
                            placeholder="예: 900101-1234567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>보수 변경 월 (YYYY-MM) *</Label>
                          <Input
                            type="month"
                            value={employee.changeMonth}
                            onChange={(e) =>
                              handleEmployeeChange(index, 'changeMonth', e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>변경사유</Label>
                          <Input
                            value={employee.changeReason}
                            onChange={(e) =>
                              handleEmployeeChange(index, 'changeReason', e.target.value)
                            }
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 보험 신청 여부 */}
                    <div>
                      <h4 className="font-medium mb-3">보험 신청</h4>
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
                            <Label>현재 기준소득월액</Label>
                            <Input
                              type="number"
                              value={employee.pensionCurrentIncome}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'pensionCurrentIncome',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>변경 기준소득월액 *</Label>
                            <Input
                              type="number"
                              value={employee.pensionChangedIncome}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'pensionChangedIncome',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 h-full">
                              <Checkbox
                                checked={employee.pensionWorkerConsent}
                                onChange={(e) =>
                                  handleEmployeeChange(
                                    index,
                                    'pensionWorkerConsent',
                                    e.target.checked
                                  )
                                }
                              />
                              <Label>근로자 동의(서명 또는 인)</Label>
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
                            <Label>변경 후 보수월액 *</Label>
                            <Input
                              type="number"
                              value={employee.healthChangedSalary}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'healthChangedSalary',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>보수 변경 월 (1~12)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              value={employee.healthChangeMonth}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'healthChangeMonth',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>변경사유</Label>
                            <Input
                              value={employee.healthChangeReason}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'healthChangeReason',
                                  e.target.value
                                )
                              }
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 고용보험·산재보험 */}
                    {(employee.applyEmploymentInsurance ||
                      employee.applyWorkersCompensation) && (
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">고용보험·산재보험</h4>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>고용보험 변경 후 월평균보수</Label>
                            <Input
                              type="number"
                              value={employee.employmentChangedSalary}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'employmentChangedSalary',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>산재보험 변경 후 월평균보수</Label>
                            <Input
                              type="number"
                              value={employee.workersCompChangedSalary}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'workersCompChangedSalary',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>보수 변경 월 (1~12)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="12"
                              value={employee.employmentWorkersCompChangeMonth}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'employmentWorkersCompChangeMonth',
                                  Number(e.target.value)
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>변경사유</Label>
                            <Input
                              value={employee.employmentWorkersCompChangeReason}
                              onChange={(e) =>
                                handleEmployeeChange(
                                  index,
                                  'employmentWorkersCompChangeReason',
                                  e.target.value
                                )
                              }
                              onCompositionStart={() => setIsComposing(true)}
                              onCompositionEnd={() => setIsComposing(false)}
                            />
                          </div>
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

      {/* 신청 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>신청 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportDate">보고 연월일</Label>
              <Input
                id="reportDate"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 하단 버튼 영역 */}
      <div className="flex justify-between items-center">
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
          <Button variant="outline" onClick={handleOpenHistoryDialog}>
            신청내역 조회
          </Button>
          <Button variant="outline" onClick={handleTempSave}>
            임시 저장
          </Button>
          <Button onClick={handleSubmit}>신청</Button>
        </div>
      </div>

      {/* 신청내역 조회 Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>보수월액 변경 신청내역</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>시작일</Label>
                <Input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일</Label>
                <Input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>검색 (사번/성명)</Label>
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="사번 또는 성명"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearchHistory}>
                  <Search className="h-4 w-4 mr-1" />
                  검색
                </Button>
              </div>
            </div>

            <div className="border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>신청일자</TableHead>
                    <TableHead>사업장명</TableHead>
                    <TableHead>직원수</TableHead>
                    <TableHead>신청시각</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        신청내역이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    histories.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell>{history.reportDate}</TableCell>
                        <TableCell>{history.workplace.name}</TableCell>
                        <TableCell>{history.employees.length}명</TableCell>
                        <TableCell>
                          {format(new Date(history.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setHistoryDialogOpen(false)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
