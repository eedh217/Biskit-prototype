import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { format, isValid, parseISO } from 'date-fns';
import { acquisitionReportService } from '../services/acquisitionReportService';
import type { AcquisitionReport } from '../types/insuranceReport';
import type { EmployeeInsuranceInfo, Dependent } from '../types/insurance';
import {
  PENSION_ACQUISITION_CODES,
  HEALTH_ACQUISITION_CODES,
  PREMIUM_REDUCTION_CODES,
  SPECIAL_OCCUPATION_CODES,
  OCCUPATIONAL_PENSION_CODES,
  DEPENDENT_RELATIONSHIP_CODES,
  DISABILITY_TYPE_CODES,
  RESIDENCE_STATUS_CODES,
  EMPLOYMENT_JOB_CODES,
  PREMIUM_IMPOSITION_TYPES,
  REASON_CODES,
} from '../types/insurance';
import { COUNTRIES } from '@/shared/constants/countries';

export function InsuranceAcquisitionDetail(): JSX.Element {
  const [report, setReport] = useState<AcquisitionReport | null>(null);
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

        const data = await acquisitionReportService.getById(id);
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
    window.history.pushState({}, '', '/hr/insurance/acquisition');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="자격취득신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="자격취득신고 상세" showBackButton={true} onBack={handleBack} />
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

  const getCodeLabel = (code: string, codeList: readonly { value: string; label: string }[]): string => {
    const found = codeList.find((item) => item.value === code);
    return found ? found.label : code;
  };

  const getEmploymentJobCodeLabel = (code: string): string => {
    for (const category of EMPLOYMENT_JOB_CODES) {
      const found = category.codes.find((item) => item.value === code);
      if (found) return found.label;
    }
    return code;
  };

  const getCountryName = (code: string): string => {
    const found = COUNTRIES.find((country) => country.code === code);
    return found ? found.nameKo : code;
  };

  // formData가 없으면 단순 레이아웃
  if (!report.formData) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="자격취득신고 상세" showBackButton={true} onBack={handleBack} />
        <div className="space-y-6 overflow-auto">
          <Card>
            <CardHeader><CardTitle>신고 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">신고일자</span>
                <span className="col-span-3 text-sm">{formatDate(report.reportDate)}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">상태</span>
                <span className="col-span-3 text-sm">{report.status === 'draft' ? '작성중' : '신고완료'}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">팩스발송</span>
                <span className="col-span-3 text-sm">{report.status === 'draft' ? '-' : '발송성공'}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>직원 목록</CardTitle></CardHeader>
            <CardContent>
              {report.employees && report.employees.length > 0 ? (
                <div className="space-y-3">
                  {report.employees.map((emp, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 py-2 border-b last:border-b-0">
                      <span className="text-sm font-medium text-gray-500">직원 {index + 1}</span>
                      <span className="col-span-3 text-sm">{emp.employeeName} ({emp.employeeNumber})</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">직원 정보가 없습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { workplace, employees, workplaceFaxNumber, agencyFaxNumber } = report.formData as typeof report.formData & { workplaceFaxNumber?: string; agencyFaxNumber?: string };

  const renderEmployeeDetail = (employee: EmployeeInsuranceInfo): JSX.Element => (
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
              <span className="text-sm font-medium text-gray-500">국적</span>
              <span className="col-span-3 text-sm">{getCountryName(employee.nationality)}</span>
            </div>
            {employee.residenceStatus && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">체류자격</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.residenceStatus, RESIDENCE_STATUS_CODES)}</span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">월 소득액</span>
              <span className="col-span-3 text-sm">
                {employee.monthlySalary ? employee.monthlySalary.toLocaleString('ko-KR') + '원' : '-'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">자격취득일</span>
              <span className="col-span-3 text-sm">{employee.acquisitionDate || '-'}</span>
            </div>
            {employee.isCEO && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">대표자 여부</span>
                <span className="col-span-3 text-sm"><Badge variant="outline">대표자</Badge></span>
              </div>
            )}
          </div>
        </div>

        {/* 국민연금 */}
        {employee.applyPension && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">국민연금</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">자격취득부호</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.pensionAcquisitionCode, PENSION_ACQUISITION_CODES)}</span>
              </div>
              {employee.specialOccupationCode && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">특수직종부호</span>
                  <span className="col-span-3 text-sm">{getCodeLabel(employee.specialOccupationCode, SPECIAL_OCCUPATION_CODES)}</span>
                </div>
              )}
              {employee.occupationalPensionCode && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">직역연금부호</span>
                  <span className="col-span-3 text-sm">{getCodeLabel(employee.occupationalPensionCode, OCCUPATIONAL_PENSION_CODES)}</span>
                </div>
              )}
              {employee.wantToPayAcquisitionMonth && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">취득 월 납부 희망</span>
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
                <span className="text-sm font-medium text-gray-500">자격취득부호</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.healthAcquisitionCode, HEALTH_ACQUISITION_CODES)}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">보험료감면부호</span>
                <span className="col-span-3 text-sm">{getCodeLabel(employee.premiumReductionCode, PREMIUM_REDUCTION_CODES)}</span>
              </div>
              {employee.isPublicOfficial && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <span className="text-sm font-medium text-gray-500">공무원·교직원</span>
                    <span className="col-span-3 text-sm"><Badge variant="outline">해당</Badge></span>
                  </div>
                  {employee.accountName && (
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">회계명</span>
                      <span className="col-span-3 text-sm">{employee.accountName}</span>
                    </div>
                  )}
                  {employee.accountCode && (
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">회계부호</span>
                      <span className="col-span-3 text-sm">{employee.accountCode}</span>
                    </div>
                  )}
                  {employee.jobName && (
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">직종명</span>
                      <span className="col-span-3 text-sm">{employee.jobName}</span>
                    </div>
                  )}
                  {employee.jobCode && (
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">직종부호</span>
                      <span className="col-span-3 text-sm">{employee.jobCode}</span>
                    </div>
                  )}
                </>
              )}
              {employee.applyForDependent && employee.dependents && employee.dependents.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium mb-3">피부양자 목록</h5>
                  <div className="space-y-4">
                    {employee.dependents.map((dep: Dependent, depIdx: number) => (
                      <Card key={depIdx} className="border-2">
                        <CardHeader className="bg-gray-50">
                          <div className="font-semibold">피부양자 {depIdx + 1}</div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                          <div className="grid grid-cols-3 gap-4">
                            <span className="text-sm font-medium text-gray-500">피부양자 관계</span>
                            <span className="col-span-2 text-sm">{getCodeLabel(dep.relationship, DEPENDENT_RELATIONSHIP_CODES)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <span className="text-sm font-medium text-gray-500">성명</span>
                            <span className="col-span-2 text-sm">{dep.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <span className="text-sm font-medium text-gray-500">주민등록번호/외국인등록번호</span>
                            <span className="col-span-2 text-sm">{dep.residentNumber}</span>
                          </div>
                          {dep.isDisabledOrVeteran && (
                            <>
                              <div className="grid grid-cols-3 gap-4">
                                <span className="text-sm font-medium text-gray-500">장애인·국가유공자</span>
                                <span className="col-span-2 text-sm"><Badge variant="outline">해당</Badge></span>
                              </div>
                              {dep.disabilityTypeCode && (
                                <div className="grid grid-cols-3 gap-4">
                                  <span className="text-sm font-medium text-gray-500">종별부호</span>
                                  <span className="col-span-2 text-sm">{getCodeLabel(dep.disabilityTypeCode, DISABILITY_TYPE_CODES)}</span>
                                </div>
                              )}
                              {dep.registrationDate && (
                                <div className="grid grid-cols-3 gap-4">
                                  <span className="text-sm font-medium text-gray-500">등록일</span>
                                  <span className="col-span-2 text-sm">{dep.registrationDate}</span>
                                </div>
                              )}
                            </>
                          )}
                          {dep.isForeigner && (
                            <>
                              <div className="grid grid-cols-3 gap-4">
                                <span className="text-sm font-medium text-gray-500">외국인</span>
                                <span className="col-span-2 text-sm"><Badge variant="outline">해당</Badge></span>
                              </div>
                              {dep.nationality && (
                                <div className="grid grid-cols-3 gap-4">
                                  <span className="text-sm font-medium text-gray-500">국적</span>
                                  <span className="col-span-2 text-sm">{getCountryName(dep.nationality)}</span>
                                </div>
                              )}
                              {dep.residenceStatus && (
                                <div className="grid grid-cols-3 gap-4">
                                  <span className="text-sm font-medium text-gray-500">체류자격</span>
                                  <span className="col-span-2 text-sm">{getCodeLabel(dep.residenceStatus, RESIDENCE_STATUS_CODES)}</span>
                                </div>
                              )}
                              {dep.residencePeriod && (
                                <div className="grid grid-cols-3 gap-4">
                                  <span className="text-sm font-medium text-gray-500">체류기간</span>
                                  <span className="col-span-2 text-sm">{dep.residencePeriod}</span>
                                </div>
                              )}
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
              {employee.employmentJobCode && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">직종부호</span>
                  <span className="col-span-3 text-sm">{getEmploymentJobCodeLabel(employee.employmentJobCode)}</span>
                </div>
              )}
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">1주 소정근로시간</span>
                <span className="col-span-3 text-sm">{employee.weeklyWorkHours}시간</span>
              </div>
              {employee.premiumImpositionType && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">보험료부과구분</span>
                  <span className="col-span-3 text-sm">{getCodeLabel(employee.premiumImpositionType, PREMIUM_IMPOSITION_TYPES)}</span>
                </div>
              )}
              {employee.reasonCode && (
                <div className="grid grid-cols-4 gap-4">
                  <span className="text-sm font-medium text-gray-500">사유</span>
                  <span className="col-span-3 text-sm">{getCodeLabel(employee.reasonCode, REASON_CODES)}</span>
                </div>
              )}
              {employee.isContractWorker && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    <span className="text-sm font-medium text-gray-500">계약직</span>
                    <span className="col-span-3 text-sm"><Badge variant="outline">해당</Badge></span>
                  </div>
                  {employee.contractEndDate && (
                    <div className="grid grid-cols-4 gap-4">
                      <span className="text-sm font-medium text-gray-500">계약종료연월</span>
                      <span className="col-span-3 text-sm">{employee.contractEndDate}</span>
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

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="자격취득신고 상세" showBackButton={true} onBack={handleBack} />

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
                {workplace.unitName && (
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-gray-500 shrink-0">단위사업소</span>
                    <span className="text-sm text-right">{workplace.unitName}</span>
                  </div>
                )}
                {workplace.branchName && (
                  <div className="flex justify-between gap-2">
                    <span className="text-sm text-gray-500 shrink-0">영업소</span>
                    <span className="text-sm text-right">{workplace.branchName}</span>
                  </div>
                )}
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
              {employees && employees.map((emp: EmployeeInsuranceInfo, idx: number) => (
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
