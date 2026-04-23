import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Switch } from '@/shared/components/ui/switch';
import { employeeService } from '../services/employeeService';
import { organizationService } from '../services/organizationService';
import { jobLevelService } from '../services/jobLevelService';
import { employmentTypeService } from '../services/employmentTypeService';
import type { Employee } from '../types/employee';
import type { Organization } from '../types/organization';
import type { JobLevel } from '../types/jobLevel';
import type { EmploymentType } from '../types/employmentType';
import { findCountryByCode } from '@/shared/constants/countries';
import { formatDate, getEmploymentStatus, calculateTenure } from '../types/employee';
import { formatNumber } from '@/shared/lib/utils';
import { EditPersonalInfoDialog } from '../components/EditPersonalInfoDialog';
import { EditOrganizationInfoDialog } from '../components/EditOrganizationInfoDialog';
import { SalaryContractEditDialog } from '@/modules/payroll/components/SalaryContractEditDialog';
import { EmployeeHistoryTimeline } from '../components/EmployeeHistoryTimeline';
import { LeaveTab } from '../components/LeaveTab';
import { companyPayrollItemService } from '@/modules/payroll/services/companyPayrollItemService';
import type { CompanyPayItem } from '@/modules/payroll/types/payroll';
import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';

export function EmployeeDetail(): JSX.Element {
  // URL에서 ID 추출
  const pathname = window.location.pathname;
  const id = pathname.split('/').pop();

  console.log('EmployeeDetail - pathname:', pathname);
  console.log('EmployeeDetail - extracted id:', id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [jobLevel, setJobLevel] = useState<JobLevel | null>(null);
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editPersonalInfoOpen, setEditPersonalInfoOpen] = useState(false);
  const [editOrganizationInfoOpen, setEditOrganizationInfoOpen] = useState(false);
  const [editSalaryInfoOpen, setEditSalaryInfoOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(() => {
    const saved = localStorage.getItem('biskit_employee_detail_show_history');
    return saved === 'true';
  });
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const currentYear = Math.max(2026, new Date().getFullYear());
  const [companyItems] = useState<CompanyPayItem[]>(() => companyPayrollItemService.getPayItems(currentYear));

  useEffect(() => {
    const loadEmployee = async (): Promise<void> => {
      console.log('loadEmployee - id:', id);

      if (!id || id === 'employee') {
        console.error('Invalid ID:', id);
        window.history.pushState({}, '', '/hr/employee');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      try {
        setIsLoading(true);
        console.log('Fetching employee with id:', id);
        const emp = await employeeService.getById(id);
        console.log('Employee loaded:', emp);
        setEmployee(emp);

        // 조직 정보 로드
        const orgs = await organizationService.getAll();
        setOrganizations(orgs);

        // 직급 정보 로드
        if (emp.position) {
          const levels = await jobLevelService.getList();
          const level = levels.find((l) => l.id === emp.position);
          setJobLevel(level || null);
        }

        // 근로형태 정보 로드
        if (emp.employmentTypeId) {
          const types = await employmentTypeService.getList();
          const type = types.find((t) => t.id === emp.employmentTypeId);
          setEmploymentType(type || null);
        }
      } catch (error) {
        console.error('Failed to load employee:', error);
        window.history.pushState({}, '', '/hr/employee');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [id]);

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title={
            <div className="flex items-center gap-3">
              <div className="h-7 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-6 w-16 bg-gray-200 animate-pulse rounded-full"></div>
            </div>
          }
          showBackButton={true}
        />
        <div className="space-y-6">
          <div className="pb-6 border-b">
            <div className="flex items-center gap-6 text-sm">
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>개인정보</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div>
        <PageHeader title="직원 정보" showBackButton={true} />
        <div className="mt-6 flex items-center justify-center">
          <p className="text-slate-500">직원을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const nationalityTypeLabel =
    employee.nationalityType === 'domestic' ? '내국인' : '외국인';
  const residenceTypeLabel = employee.residenceType === 'resident' ? '거주자' : '비거주자';
  const disabilityTypeLabel = {
    none: '비장애인',
    disabled: '장애인복지법상 장애인',
    veteran: '국가유공자 중증환자',
    severe: '중증환자',
  }[employee.disabilityType];
  const genderLabel = employee.gender === 'male' ? '남' : employee.gender === 'female' ? '여' : '-';
  const nationalityLabel = employee.nationality
    ? findCountryByCode(employee.nationality)?.nameKo || employee.nationality
    : '-';
  const status = getEmploymentStatus(employee.leaveDate);
  const tenure = calculateTenure(employee.joinDate, employee.leaveDate);

  // 부서 전체 경로 계산
  const getDepartmentPath = (): string => {
    if (!employee.departmentId) return '-';

    const dept = organizations.find((o) => o.id === employee.departmentId);
    if (!dept) return '-';

    const path: string[] = [];
    let current: Organization | undefined = dept;

    while (current) {
      path.unshift(current.name);
      current = organizations.find((o) => o.id === current?.parentId);
    }

    return path.join(' > ');
  };

  // 사용중단 항목 테스트용: Q01 출산보육수당 추가
  const handleAddDeprecatedTestItem = async (): Promise<void> => {
    if (!employee) return;
    const q01Item = companyItems.find((ci) => ci.taxItemId === 'non-taxable-2025-Q01');
    if (!q01Item) {
      alert('출산보육수당 항목을 찾을 수 없습니다. 급여항목 관리에서 2026년 항목을 확인해주세요.');
      return;
    }
    const alreadyExists = (employee.payrollTemplate ?? []).some((t) => t.itemId === q01Item.id || t.itemCode === q01Item.taxItemId);
    if (alreadyExists) {
      alert('이미 출산보육수당 항목이 있습니다.');
      return;
    }
    const includeInAnnual = confirm('연봉 포함 여부를 선택해주세요.\n\n확인 → 연봉 포함\n취소 → 연봉 미포함');
    const newItem = {
      itemId: q01Item.id,
      itemCode: q01Item.taxItemId,
      itemName: q01Item.name,
      amount: 100000,
      category: q01Item.taxItemCategory as 'taxable' | 'non-taxable',
      includeInAnnual,
    };
    await employeeService.update(employee.id, {
      payrollTemplate: [...(employee.payrollTemplate ?? []), newItem],
    });
    await handleEditSuccess();
  };

  // 수정 완료 시 직원 정보 다시 로드
  const handleEditSuccess = async (): Promise<void> => {
    if (!id || id === 'employee') return;

    try {
      const emp = await employeeService.getById(id);
      setEmployee(emp);

      // 직급 정보 다시 로드
      if (emp.position) {
        const levels = await jobLevelService.getList();
        const level = levels.find((l) => l.id === emp.position);
        setJobLevel(level || null);
      }

      // 근로형태 정보 다시 로드
      if (emp.employmentTypeId) {
        const types = await employmentTypeService.getList();
        const type = types.find((t) => t.id === emp.employmentTypeId);
        setEmploymentType(type || null);
      }

      // 이력 새로고침
      setHistoryRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to reload employee:', error);
    }
  };

  return (
    <div>
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span>{employee.name}</span>
            <Badge variant={status === '재직중' ? 'success' : 'secondary'}>
              {status}
            </Badge>
          </div>
        }
        showBackButton={true}
        onBack={() => {
          window.history.pushState(null, '', '/hr/employee');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
      />

      <div className="space-y-6">
        {/* 기본 정보 - 프로필 헤더 */}
        <div className="pb-6 border-b">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>
              <span className="font-medium text-gray-700">사번:</span> {employee.employeeNumber}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              <span className="font-medium text-gray-700">근속기간:</span> {tenure}
            </span>
          </div>
        </div>

        {/* 탭 */}
        <Tabs
          defaultValue="personal"
          className="w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="personal">개인정보</TabsTrigger>
              <TabsTrigger value="organization">조직정보</TabsTrigger>
              <TabsTrigger value="salary">급여정보</TabsTrigger>
              <TabsTrigger value="leave">연차/휴가</TabsTrigger>
            </TabsList>

            {/* 이력 토글 */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="history-toggle"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                이력 보기
              </label>
              <Switch
                id="history-toggle"
                checked={showHistory}
                onCheckedChange={(checked) => {
                  setShowHistory(checked);
                  localStorage.setItem('biskit_employee_detail_show_history', String(checked));
                }}
              />
            </div>
          </div>

          {/* 개인정보 탭 */}
          <TabsContent value="personal">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">개인정보</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditPersonalInfoOpen(true)}
                >
                  수정
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">사번</span>
              <span className="col-span-3 text-sm">{employee.employeeNumber}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">이름</span>
              <span className="col-span-3 text-sm">{employee.name}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">내외국인 여부</span>
              <span className="col-span-3 text-sm">{nationalityTypeLabel}</span>
            </div>

            {employee.nationalityType === 'domestic' && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">주민등록번호</span>
                <span className="col-span-3 text-sm">
                  {employee.residentRegistrationNumber || '-'}
                </span>
              </div>
            )}

            {employee.nationalityType === 'foreign' && (
              <>
                {employee.foreignerRegistrationNumber && (
                  <div className="grid grid-cols-4 gap-4">
                    <span className="text-sm font-medium text-gray-500">외국인등록번호</span>
                    <span className="col-span-3 text-sm">
                      {employee.foreignerRegistrationNumber}
                    </span>
                  </div>
                )}
                {employee.passportNumber && (
                  <>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">여권번호</span>
                      <span className="col-span-3 text-sm">{employee.passportNumber}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">생년월일</span>
                      <span className="col-span-3 text-sm">
                        {employee.birthDate ? formatDate(employee.birthDate) : '-'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">성별</span>
                      <span className="col-span-3 text-sm">{genderLabel}</span>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">국적</span>
                  <span className="col-span-3 text-sm">{nationalityLabel}</span>
                </div>
              </>
            )}

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">거주구분</span>
              <span className="col-span-3 text-sm">{residenceTypeLabel}</span>
            </div>

            {employee.residenceType === 'non-resident' && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">거주지국</span>
                <span className="col-span-3 text-sm">
                  {employee.residenceCountry
                    ? (findCountryByCode(employee.residenceCountry)?.nameKo ?? employee.residenceCountry)
                    : '-'}
                </span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">장애여부</span>
              <span className="col-span-3 text-sm">{disabilityTypeLabel}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">이메일</span>
              <span className="col-span-3 text-sm">{employee.email}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">연락처</span>
              <span className="col-span-3 text-sm">{employee.contact || '-'}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">휴대폰번호</span>
              <span className="col-span-3 text-sm">{employee.phone || '-'}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">입사일</span>
              <span className="col-span-3 text-sm">{formatDate(employee.joinDate)}</span>
            </div>

            {employee.leaveDate && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">퇴사일</span>
                <span className="col-span-3 text-sm">{formatDate(employee.leaveDate)}</span>
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">주소</span>
              <span className="col-span-3 text-sm">
                {employee.zipCode && employee.address
                  ? `(${employee.zipCode}) ${employee.address} ${employee.detailAddress || ''}`
                  : '-'}
              </span>
            </div>

              </CardContent>
            </Card>

            {/* 개인정보 이력 */}
            {showHistory && employee && (
              <Card className="mt-6">
                <EmployeeHistoryTimeline
                  key={`personal-${historyRefreshKey}`}
                  employeeId={employee.id}
                  category="personal"
                />
              </Card>
            )}
          </TabsContent>

          {/* 조직정보 탭 */}
          <TabsContent value="organization">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">조직정보</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOrganizationInfoOpen(true)}
                >
                  수정
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">부서</span>
              <div className="col-span-3 flex items-center gap-2">
                <span className="text-sm">{getDepartmentPath()}</span>
                {employee.isDepartmentHead && (
                  <Badge variant="default" className="text-xs">
                    부서장
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">직급</span>
              <span className="col-span-3 text-sm">{jobLevel?.name || '-'}</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">근로형태</span>
              <span className="col-span-3 text-sm">{employmentType?.name || '-'}</span>
            </div>
              </CardContent>
            </Card>

            {/* 조직정보 이력 */}
            {showHistory && employee && (
              <Card className="mt-6">
                <EmployeeHistoryTimeline
                  key={`organization-${historyRefreshKey}`}
                  employeeId={employee.id}
                  category="organization"
                />
              </Card>
            )}
          </TabsContent>

          {/* 급여정보 탭 */}
          <TabsContent value="salary">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-lg">급여정보</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddDeprecatedTestItem}
                  >
                    사용중단항목 테스트
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSalaryInfoOpen(true)}
                  >
                    수정
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* 급여항목 템플릿 */}
                {(() => {
                  const template = employee.payrollTemplate ?? [];
                  const inAnnual = template.filter(item => item.includeInAnnual);
                  const notInAnnual = template.filter(item => !item.includeInAnnual);

                  const calcedAnnual = inAnnual.reduce((sum, item) => {
                    const ci = companyItems.find((c) => c.id === item.itemId);
                    const isIrregular = ci?.paymentType === 'irregular';
                    const months = isIrregular
                      ? ((ci?.paymentMonths?.length ?? 0) > 0 ? ci!.paymentMonths! : (item.paymentMonths ?? [])).length
                      : 12;
                    return sum + item.amount * months;
                  }, 0);

                  const renderItem = (item: typeof template[0], index: number): JSX.Element => {
                    const companyItem = companyItems.find((ci) => ci.id === item.itemId);
                    const isIrregular = companyItem?.paymentType === 'irregular';
                    const companyMonths = companyItem?.paymentMonths ?? [];
                    const employeeMonths = item.paymentMonths ?? [];
                    const effectiveMonths = companyMonths.length > 0 ? companyMonths : employeeMonths;
                    const isDeprecated = companyItem?.isDeprecated ?? false;
                    return (
                      <div
                        key={index}
                        className={`grid grid-cols-[1fr_160px_1fr_1fr_20px] gap-x-2 items-center ${isDeprecated ? 'bg-red-50/60 -mx-4 px-4 py-1 rounded' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            {item.category === 'non-taxable' && item.itemCode && item.itemCode !== item.itemName
                              ? `${item.itemCode.split('-').slice(3).join('-')} - ${item.itemName}`
                              : item.itemName}
                          </span>
                          {item.category === 'non-taxable' && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              비과세
                            </span>
                          )}
                        </div>
                        <span className="text-sm">{formatNumber(item.amount)}원</span>
                        <span className="text-xs text-gray-400">
                          {isIrregular
                            ? `비정기${effectiveMonths.length > 0 ? ` · ${effectiveMonths.join(', ')}월` : ''}`
                            : '매월지급'}
                        </span>
                        <span />
                        {isDeprecated ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 cursor-default" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                사용중단된 항목입니다. 급여항목 관리에서 처리해주세요.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-3">
                      {inAnnual.length > 0 && (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <span className="text-sm font-semibold text-slate-600">
                              {calcedAnnual > 0 ? `연봉 ${formatNumber(calcedAnnual)}원` : '-'}
                            </span>
                          </div>
                          <div className="px-4 py-3 space-y-3">
                            {inAnnual.map((item, index) => renderItem(item, index))}
                          </div>
                        </div>
                      )}
                      {notInAnnual.length > 0 && (
                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                            <span className="text-sm font-semibold text-slate-600">연봉 미포함</span>
                          </div>
                          <div className="px-4 py-3 space-y-3">
                            {notInAnnual.map((item, index) => renderItem(item, index))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 계좌정보 */}
                <div className="pt-4 border-t space-y-3 px-4">
                  <div className="grid grid-cols-[1fr_160px_1fr_1fr] gap-x-2">
                    <span className="text-sm font-medium text-gray-500">은행</span>
                    <span className="text-sm">{employee.bankName || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_160px_1fr_1fr] gap-x-2">
                    <span className="text-sm font-medium text-gray-500">예금주</span>
                    <span className="text-sm">{employee.accountHolder || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_160px_1fr_1fr] gap-x-2">
                    <span className="text-sm font-medium text-gray-500">계좌번호</span>
                    <span className="text-sm">{employee.accountNumber || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 급여정보 이력 */}
            {showHistory && employee && (
              <Card className="mt-6">
                <EmployeeHistoryTimeline
                  key={`salary-${historyRefreshKey}`}
                  employeeId={employee.id}
                  category="salary"
                />
              </Card>
            )}
          </TabsContent>

          {/* 연차/휴가 탭 */}
          <TabsContent value="leave">
            <LeaveTab employee={employee} showHistory={showHistory} />
          </TabsContent>
        </Tabs>
      </div>

      {/* 개인정보 수정 다이얼로그 */}
      {employee && (
        <EditPersonalInfoDialog
          open={editPersonalInfoOpen}
          onOpenChange={setEditPersonalInfoOpen}
          employee={employee}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 조직정보 수정 다이얼로그 */}
      {employee && (
        <EditOrganizationInfoDialog
          open={editOrganizationInfoOpen}
          onOpenChange={setEditOrganizationInfoOpen}
          employee={employee}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 급여정보 수정 다이얼로그 */}
      {employee && (
        <SalaryContractEditDialog
          open={editSalaryInfoOpen}
          onOpenChange={setEditSalaryInfoOpen}
          employee={employee}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
