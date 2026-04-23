import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { format, isValid, parseISO } from 'date-fns';
import { salaryChangeReportService } from '../services/salaryChangeReportService';
import type { SalaryChangeReport } from '../types/insuranceReport';
import type { EmployeeSalaryChangeInfo, WorkplaceInfo } from '../types/insurance';

export function InsuranceSalaryChangeDetail(): JSX.Element {
  const [report, setReport] = useState<SalaryChangeReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(0);

  useEffect(() => {
    const loadReport = async (): Promise<void> => {
      try {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];

        if (!id) {
          console.error('No report ID found in URL');
          return;
        }

        const data = await salaryChangeReportService.getById(id);
        setReport(data);
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, []);

  const handleBack = (): void => {
    window.history.pushState({}, '', '/hr/insurance/salary-change');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="보수월액 변경신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="보수월액 변경신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">신고 내역을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const dateObj = parseISO(dateStr);
      if (isValid(dateObj)) {
        return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
      }
    } catch {
      // ISO 파싱 실패
    }
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return '-';
  };

  if (!report.formData) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="보수월액 변경신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">신고 데이터를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { workplace, employees, workplaceFaxNumber, agencyFaxNumber, attachmentsMetadata } = report.formData as {
    workplace: WorkplaceInfo;
    employees: EmployeeSalaryChangeInfo[];
    workplaceFaxNumber?: string;
    agencyFaxNumber?: string;
    attachmentsMetadata?: { name: string; size: number }[][];
  };

  const renderEmployeeDetail = (employee: EmployeeSalaryChangeInfo, employeeIndex: number): JSX.Element => (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <CardContent className="pt-6 space-y-6 overflow-auto flex-1">
        {/* 기본 정보 */}
        <div>
          <h4 className="font-medium mb-3">기본 정보</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">성명</span>
              <span className="col-span-3 text-sm">{employee.name || '-'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">주민등록번호/외국인등록번호</span>
              <span className="col-span-3 text-sm">{employee.residentNumber || '-'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">보수 변경 월</span>
              <span className="col-span-3 text-sm">{employee.changeMonth || '-'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">변경사유</span>
              <span className="col-span-3 text-sm">{employee.changeReason || '-'}</span>
            </div>
          </div>
        </div>

        {/* 국민연금 */}
        {employee.applyPension && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">국민연금</h4>
            <div className="space-y-3">
              {employee.pensionCurrentIncome !== undefined && employee.pensionCurrentIncome !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">현재 기준소득월액</span>
                  <span className="col-span-3 text-sm">
                    {employee.pensionCurrentIncome.toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              {employee.pensionChangedIncome !== undefined && employee.pensionChangedIncome !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">변경 기준소득월액</span>
                  <span className="col-span-3 text-sm">
                    {employee.pensionChangedIncome.toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              {employee.pensionWorkerConsent && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">근로자 동의</span>
                  <span className="col-span-3 text-sm"><Badge variant="outline">동의</Badge></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 건강보험 */}
        {employee.applyHealthInsurance && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">건강보험</h4>
            <div className="space-y-3">
              {employee.healthChangedSalary !== undefined && employee.healthChangedSalary !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">변경 후 보수월액</span>
                  <span className="col-span-3 text-sm">
                    {employee.healthChangedSalary.toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              {employee.healthChangeMonth !== undefined && employee.healthChangeMonth !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">보수 변경 월</span>
                  <span className="col-span-3 text-sm">{employee.healthChangeMonth}월</span>
                </div>
              )}
              {employee.healthChangeReason && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">변경사유</span>
                  <span className="col-span-3 text-sm">{employee.healthChangeReason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 고용보험·산재보험 */}
        {(employee.applyEmploymentInsurance || employee.applyWorkersCompensation) && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">고용보험·산재보험</h4>
            <div className="space-y-3">
              {employee.applyEmploymentInsurance && employee.employmentChangedSalary !== undefined && employee.employmentChangedSalary !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">변경 후 월평균보수(고용보험)</span>
                  <span className="col-span-3 text-sm">
                    {employee.employmentChangedSalary.toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              {employee.isDifferentEmploymentWorkersCompSalary && employee.applyWorkersCompensation && employee.workersCompChangedSalary !== undefined && employee.workersCompChangedSalary !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">변경 후 월평균보수(산재보험)</span>
                  <span className="col-span-3 text-sm">
                    {employee.workersCompChangedSalary.toLocaleString('ko-KR')}원
                  </span>
                </div>
              )}
              {employee.employmentWorkersCompChangeMonth !== undefined && employee.employmentWorkersCompChangeMonth !== 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">보수 변경 월</span>
                  <span className="col-span-3 text-sm">{employee.employmentWorkersCompChangeMonth}월</span>
                </div>
              )}
              {employee.employmentWorkersCompChangeReason && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">변경사유</span>
                  <span className="col-span-3 text-sm">{employee.employmentWorkersCompChangeReason}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {/* 첨부서류 */}
        {attachmentsMetadata && attachmentsMetadata[employeeIndex] && attachmentsMetadata[employeeIndex].length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">첨부서류</h4>
            <div className="space-y-2">
              {attachmentsMetadata[employeeIndex].map((file: { name: string; size: number }, fileIdx: number) => (
                <div
                  key={fileIdx}
                  className="flex items-center justify-between p-2 border rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => window.open(window.location.href, '_blank')}
                >
                  <span className="text-sm text-blue-600 underline truncate">{file.name}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">({(file.size / 1024).toFixed(0)}KB)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="보수월액 변경신고 상세" showBackButton={true} onBack={handleBack} />

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 좌측 패널 */}
        <div className="w-80 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            {/* 신고 정보 */}
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">신고 정보</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">신고일자</span>
                  <span className="text-sm text-right">{formatDate(report.reportDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">상태</span>
                  <span className="text-sm">{report.status === 'draft' ? '작성중' : '신고완료'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">팩스발송</span>
                  <span className="text-sm">{report.status === 'draft' ? '-' : '발송성공'}</span>
                </div>
                {report.status !== 'draft' && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-500 shrink-0">사업장 FAX</span>
                      <span className="text-sm text-right">{workplaceFaxNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-500 shrink-0">공단 FAX</span>
                      <span className="text-sm text-right">{agencyFaxNumber || '-'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 사업장 정보 */}
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">사업장 정보</p>
              <div className="space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">관리번호</span>
                  <span className="text-sm text-right">{workplace.managementNumber || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">명칭</span>
                  <span className="text-sm text-right">{workplace.name || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">주소</span>
                  <span className="text-sm text-right break-all">
                    {workplace.address ? `${workplace.address} ${workplace.addressDetail}`.trim() : '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">전화번호</span>
                  <span className="text-sm text-right">{workplace.phoneNumber || '-'}</span>
                </div>
                {workplace.email && (
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-gray-500 shrink-0">전자우편주소</span>
                    <span className="text-sm text-right break-all">{workplace.email}</span>
                  </div>
                )}
                {workplace.mobilePhone && (
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-gray-500 shrink-0">휴대폰번호</span>
                    <span className="text-sm text-right">{workplace.mobilePhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 직원 목록 */}
            <div>
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">직원 목록 ({employees?.length ?? 0}명)</p>
              </div>
              {employees && employees.map((emp: EmployeeSalaryChangeInfo, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedEmployeeIndex === idx ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedEmployeeIndex(idx)}
                >
                  <div className="text-sm">
                    <span className="font-medium">{emp.name || '(미입력)'}</span>
                    {emp.employeeNumber && (
                      <span className="text-gray-500 ml-1">({emp.employeeNumber})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="flex-1 flex flex-col min-h-0">
          {employees && employees[selectedEmployeeIndex] && renderEmployeeDetail(employees[selectedEmployeeIndex]!, selectedEmployeeIndex)}
        </div>
      </div>
    </div>
  );
}
