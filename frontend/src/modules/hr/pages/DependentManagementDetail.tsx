import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { format, isValid, parseISO } from 'date-fns';
import { dependentReportService } from '../services/dependentReportService';
import type { DependentReport } from '../types/insuranceReport';
import type { EmployeeDependentManagement, DependentWithManagementInfo } from '../types/insurance';
import {
  DEPENDENT_RELATIONSHIP_CODES,
  DISABILITY_TYPE_CODES,
  RESIDENCE_STATUS_CODES,
  DEPENDENT_ACQUISITION_LOSS_CODES,
} from '../types/insurance';
import { COUNTRIES } from '@/shared/constants/countries';

export function DependentManagementDetail(): JSX.Element {
  const [report, setReport] = useState<DependentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDependentIndex, setSelectedDependentIndex] = useState(0);

  useEffect(() => {
    const loadReport = async (): Promise<void> => {
      try {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        if (!id) return;
        const data = await dependentReportService.getById(id);
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
    window.history.pushState({}, '', '/hr/insurance/dependent');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    try {
      const dateObj = parseISO(dateStr);
      if (isValid(dateObj)) return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
    } catch { /* ignore */ }
    return '-';
  };

  const getCodeLabel = (code: string, codeList: readonly { value: string; label: string }[]): string => {
    return codeList.find((item) => item.value === code)?.label ?? code;
  };

  const getCountryName = (code: string): string => {
    return COUNTRIES.find((c) => c.code === code)?.nameKo ?? code;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="피부양자 관리 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="피부양자 관리 상세" showBackButton={true} onBack={handleBack} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">신고 내역을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  if (!report.formData) {
    return (
      <div className="flex flex-col h-[calc(100vh-3rem)]">
        <PageHeader title="피부양자 관리 상세" showBackButton={true} onBack={handleBack} />
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

  const { workplace, employees, workplaceFaxNumber, agencyFaxNumber, attachmentsMetadata } = report.formData as { workplace: { managementNumber: string; name: string; address: string; addressDetail: string; phoneNumber: string }; employees: EmployeeDependentManagement[]; workplaceFaxNumber?: string; agencyFaxNumber?: string; attachmentsMetadata?: { name: string; size: number }[][] };
  const employee = employees?.[0];
  const dependents: DependentWithManagementInfo[] = employee?.dependents ?? [];
  const currentDependent = dependents[selectedDependentIndex];

  const renderDependentDetail = (dep: DependentWithManagementInfo, dependentIndex: number): JSX.Element => (
    <Card className="flex-1 flex flex-col overflow-hidden">
      <CardContent className="pt-6 space-y-6 overflow-auto flex-1">

        {/* 기본 정보 */}
        <div>
          <h4 className="font-medium mb-3">기본 정보</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">구분</span>
              <span className="col-span-3 text-sm">{dep.acquisitionOrLossType === 'loss' ? '상실' : '취득'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">
                {dep.acquisitionOrLossType === 'loss' ? '상실일자' : '취득일자'}
              </span>
              <span className="col-span-3 text-sm">{dep.acquisitionOrLossDate || '-'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">
                {dep.acquisitionOrLossType === 'loss' ? '상실부호' : '취득부호'}
              </span>
              <span className="col-span-3 text-sm">
                {dep.acquisitionOrLossCode
                  ? getCodeLabel(dep.acquisitionOrLossCode, DEPENDENT_ACQUISITION_LOSS_CODES)
                  : '-'}
              </span>
            </div>
            {dep.acquisitionOrLossType !== 'loss' && (
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">피부양자 관계</span>
                <span className="col-span-3 text-sm">
                  {dep.relationship ? getCodeLabel(dep.relationship, DEPENDENT_RELATIONSHIP_CODES) : '-'}
                </span>
              </div>
            )}
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">성명</span>
              <span className="col-span-3 text-sm">{dep.name || '-'}</span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <span className="text-sm font-medium text-gray-500">주민등록번호/외국인등록번호</span>
              <span className="col-span-3 text-sm">{dep.residentNumber || '-'}</span>
            </div>
          </div>
        </div>

        {/* 장애인·국가유공자 */}
        {dep.isDisabledOrVeteran && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">장애인·국가유공자</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">종별부호</span>
                <span className="col-span-3 text-sm">
                  {dep.disabilityTypeCode ? getCodeLabel(dep.disabilityTypeCode, DISABILITY_TYPE_CODES) : '-'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">등록일</span>
                <span className="col-span-3 text-sm">{dep.registrationDate || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 외국인 */}
        {dep.isForeigner && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">외국인</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">국적</span>
                <span className="col-span-3 text-sm">
                  {dep.nationality ? getCountryName(dep.nationality) : '-'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">체류자격</span>
                <span className="col-span-3 text-sm">
                  {dep.residenceStatus ? getCodeLabel(dep.residenceStatus, RESIDENCE_STATUS_CODES) : '-'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <span className="text-sm font-medium text-gray-500">체류기간</span>
                <span className="col-span-3 text-sm">{dep.residencePeriod || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {/* 첨부서류 */}
        {attachmentsMetadata && attachmentsMetadata[dependentIndex] && attachmentsMetadata[dependentIndex].length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">첨부서류</h4>
            <div className="space-y-2">
              {attachmentsMetadata[dependentIndex].map((file: { name: string; size: number }, fileIdx: number) => (
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
      <PageHeader title="피부양자 관리 상세" showBackButton={true} onBack={handleBack} />

      {/* 직원 정보 영역 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">직원 정보</p>
        <div className="flex gap-16">
          <div>
            <span className="text-sm text-gray-500">성명</span>
            <p className="text-sm font-medium mt-0.5">{employee?.name || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">주민등록번호/외국인등록번호</span>
            <p className="text-sm font-medium mt-0.5">{employee?.residentNumber || '-'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">전화번호</span>
            <p className="text-sm font-medium mt-0.5">{employee?.phoneNumber || '-'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* 좌측 패널 */}
        <div className="w-64 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto">
            {/* 신고 정보 */}
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">신고 정보</p>
              <div className="space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500">신고일자</span>
                  <span className="text-sm text-right">{formatDate(report.reportDate)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500">상태</span>
                  <span className="text-sm">{report.status === 'draft' ? '작성중' : '신고완료'}</span>
                </div>
                <div className="flex justify-between gap-2">
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
                  <span className="text-sm text-right">{workplace?.managementNumber || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">명칭</span>
                  <span className="text-sm text-right">{workplace?.name || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">주소</span>
                  <span className="text-sm text-right break-all">
                    {workplace?.address ? `${workplace.address} ${workplace.addressDetail ?? ''}`.trim() : '-'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-sm text-gray-500 shrink-0">전화번호</span>
                  <span className="text-sm text-right">{workplace?.phoneNumber || '-'}</span>
                </div>
              </div>
            </div>

            {/* 피부양자 목록 */}
            <div>
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">피부양자 ({dependents.length}명)</p>
              </div>
              {dependents.map((dep, idx) => (
                <div
                  key={idx}
                  className={`flex items-center px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${selectedDependentIndex === idx ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelectedDependentIndex(idx)}
                >
                  <div className="text-sm min-w-0 truncate">
                    <span className="font-medium">{dep.name || '(미입력)'}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      {dep.acquisitionOrLossType === 'loss' ? '상실' : '취득'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 우측 패널 */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentDependent ? (
            renderDependentDetail(currentDependent, selectedDependentIndex)
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              피부양자를 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
