import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { format, isValid, parseISO } from 'date-fns';
import { lossReportService } from '../services/lossReportService';
import type { LossReport } from '../types/insuranceReport';
import type { EmployeeLossInfo } from '../types/insurance';
import {
  PENSION_LOSS_CODES,
  HEALTH_LOSS_CODES,
  EMPLOYMENT_LOSS_CODES,
} from '../types/insurance';

export function InsuranceLossDetail(): JSX.Element {
  const [report, setReport] = useState<LossReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmployeeIndex, setSelectedEmployeeIndex] = useState(0);

  useEffect(() => {
    const loadReport = async (): Promise<void> => {
      try {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        if (!id) return;
        const data = await lossReportService.getById(id);
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
    window.history.pushState({}, '', '/hr/insurance/loss');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const dateObj = parseISO(dateStr);
      if (isValid(dateObj)) return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
    } catch { /* ignore */ }
    if (dateStr.length === 8) return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    return '-';
  };

  const getCodeLabel = (code: string, codeList: readonly { value: string; label: string }[]): string => {
    return codeList.find((item) => item.value === code)?.label ?? code;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="자격상실신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="자격상실신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">신고 내역을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  // formData 없을 때 간단 레이아웃
  if (!report.formData) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="자격상실신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="space-y-6 overflow-auto p-4">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">신고일자</span>
                <span className="col-span-3 text-sm">{formatDate(report.reportDate)}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">상태</span>
                <span className="col-span-3 text-sm">{report.status === 'draft' ? '작성중' : '신고완료'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { workplace, employees, workplaceFaxNumber, agencyFaxNumber } = report.formData as { workplace: any; employees: EmployeeLossInfo[]; workplaceFaxNumber?: string; agencyFaxNumber?: string };

  const renderEmployeeDetail = (employee: EmployeeLossInfo): JSX.Element => (
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
              <span className="text-sm font-medium text-gray-500">전화번호</span>
              <span className="col-span-3 text-sm">{employee.phoneNumber || '-'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">상실연월일</span>
              <span className="col-span-3 text-sm">{employee.lossDate || '-'}</span>
            </div>
          </div>
        </div>

        {/* 국민연금 */}
        {employee.applyPension && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">국민연금</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">상실부호</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.pensionLossCode ?? '', PENSION_LOSS_CODES)}</span>
              </div>
              {employee.pensionPayFirstDayLoss && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">초일취득·당월상실자 납부</span>
                  <span className="col-span-3 text-sm"><Badge variant="outline">희망</Badge></span>
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
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">상실부호</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.healthLossCode ?? '', HEALTH_LOSS_CODES)}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">연간보수총액(해당연도)</span>
                <span className="col-span-3 text-sm">{employee.healthCurrentYearSalary ? employee.healthCurrentYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">근무개월수(해당연도)</span>
                <span className="col-span-3 text-sm">{employee.healthCurrentYearMonths ? employee.healthCurrentYearMonths + '개월' : '-'}</span>
              </div>
              {employee.healthNoPreviousYearTaxAdjustment && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <span className="text-sm font-medium text-gray-500">연간보수총액(전년도)</span>
                    <span className="col-span-3 text-sm">{employee.healthPreviousYearSalary ? employee.healthPreviousYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <span className="text-sm font-medium text-gray-500">근무개월수(전년도)</span>
                    <span className="col-span-3 text-sm">{employee.healthPreviousYearMonths ? employee.healthPreviousYearMonths + '개월' : '-'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* 고용보험·산재보험 */}
        {(employee.applyEmploymentInsurance || employee.applyWorkersCompensation) && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">고용보험·산재보험</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">상실사유코드</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.employmentLossCode ?? '', EMPLOYMENT_LOSS_CODES)}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">구체적 사유</span>
                <span className="col-span-3 text-sm">{employee.employmentSpecificReason || '-'}</span>
              </div>
              {(() => {
                const separate = employee.applyEmploymentInsurance && employee.applyWorkersCompensation && employee.hasSalaryDifferenceBetweenInsurances;
                if (separate) {
                  return (
                    <>
                      <div className="grid grid-cols-4 gap-4">
                        <span className="text-sm font-medium text-gray-500">고용보험 보수총액(해당연도)</span>
                        <span className="col-span-3 text-sm">{employee.employmentCurrentYearSalary ? employee.employmentCurrentYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <span className="text-sm font-medium text-gray-500">산재보험 보수총액(해당연도)</span>
                        <span className="col-span-3 text-sm">{employee.workersCompCurrentYearSalary ? employee.workersCompCurrentYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
                      </div>
                      {employee.noPreviousYearSalaryReport && (
                        <>
                          <div className="grid grid-cols-4 gap-4">
                            <span className="text-sm font-medium text-gray-500">고용보험 보수총액(전년도)</span>
                            <span className="col-span-3 text-sm">{employee.employmentPreviousYearSalary ? employee.employmentPreviousYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                            <span className="text-sm font-medium text-gray-500">산재보험 보수총액(전년도)</span>
                            <span className="col-span-3 text-sm">{employee.workersCompPreviousYearSalary ? employee.workersCompPreviousYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
                          </div>
                        </>
                      )}
                    </>
                  );
                } else {
                  return (
                    <>
                      <div className="grid grid-cols-4 gap-4">
                        <span className="text-sm font-medium text-gray-500">보수총액(해당연도)</span>
                        <span className="col-span-3 text-sm">{employee.employmentCurrentYearSalary ? employee.employmentCurrentYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
                      </div>
                      {employee.noPreviousYearSalaryReport && (
                        <div className="grid grid-cols-4 gap-4">
                          <span className="text-sm font-medium text-gray-500">보수총액(전년도)</span>
                          <span className="col-span-3 text-sm">{employee.employmentPreviousYearSalary ? employee.employmentPreviousYearSalary.toLocaleString('ko-KR') + '원' : '-'}</span>
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

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="자격상실신고 상세" showBackButton={true} onBack={handleBack} />

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
              </div>
            </div>

            {/* 직원 목록 */}
            <div>
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">직원 목록 ({employees?.length ?? 0}명)</p>
              </div>
              {employees && employees.map((emp: EmployeeLossInfo, idx: number) => (
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
          {employees && employees[selectedEmployeeIndex] && renderEmployeeDetail(employees[selectedEmployeeIndex]!)}
        </div>
      </div>
    </div>
  );
}
