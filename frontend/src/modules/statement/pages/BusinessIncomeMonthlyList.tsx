import { useState, useMemo } from 'react';
import {
  useBusinessIncomeList,
  useDeleteManyBusinessIncome,
} from '../hooks/useBusinessIncome';
import { BusinessIncomeSummary } from './BusinessIncomeSummary';
import { BusinessIncomeAddDialog } from '../components/BusinessIncomeAddDialog';
import { AllBusinessIncomeEditDialog } from '../components/AllBusinessIncomeEditDialog';
import { BusinessIncomeStatementDialog } from '../components/BusinessIncomeStatementDialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { DataTable } from '@/shared/components/common/data-table';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { createBusinessIncomeColumns } from '../components/business-income-columns';
import { formatCurrency } from '../types/business-income.types';
import type {
  BusinessIncome,
  GroupedBusinessIncome,
  StatementCreationSummary,
} from '../types/business-income.types';
import { toast } from '@/shared/hooks/use-toast';

export function BusinessIncomeMonthlyList(): JSX.Element {
  const urlParams = new URLSearchParams(window.location.search);
  const year = Number(urlParams.get('year')) || 0;
  const month = Number(urlParams.get('month')) || 0;

  // year/month 파라미터가 없으면 합산 화면 표시
  if (!year || !month) {
    return <BusinessIncomeSummary />;
  }

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecords, setEditingRecords] = useState<BusinessIncome[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [statementTargetIds, setStatementTargetIds] = useState<string[]>([]);
  const [statementTargetType, setStatementTargetType] = useState<'all' | 'selected'>('all');

  // 검색 결과 데이터 (리스트 표시용)
  const { data, isLoading } = useBusinessIncomeList({
    year,
    month,
    search,
    page: 1,
    limit: 10000, // Get all data for client-side pagination
  });

  // 전체 데이터 (상단 요약 정보용 - 검색 시에도 전체 데이터 기준 유지)
  const { data: allData } = useBusinessIncomeList({
    year,
    month,
    search: '', // 검색어 없이 전체 데이터
    page: 1,
    limit: 10000,
  });

  const deleteManyMutation = useDeleteManyBusinessIncome();

  // 검색 허용 문자 검증 함수
  const validateSearchInput = (value: string): boolean => {
    // 허용 문자: 한글·영문·숫자·공백·허용 특수문자(&, ', -, ., ·, (, ))
    const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
    return allowedPattern.test(value);
  };

  const handleSearch = (): void => {
    const trimmed = searchInput.trim();

    // 빈 값은 허용 (전체 조회)
    if (trimmed === '') {
      setSearch('');
      setSelectedIds([]);
      return;
    }

    // 허용 문자 검증
    if (!validateSearchInput(trimmed)) {
      toast({
        title: '입력 오류',
        description: '한글, 영문, 숫자, 공백 및 특수문자(&, \', -, ., ·, (, ))만 입력 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    setSearch(trimmed);
    setSelectedIds([]);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    // 입력 시에도 허용 문자만 입력 가능
    if (validateSearchInput(value)) {
      setSearchInput(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const columns = useMemo(
    () => createBusinessIncomeColumns(selectedIds, setSelectedIds, data?.data ?? []),
    [selectedIds, data?.data]
  );

  const handleDeleteSelected = (): void => {
    if (selectedIds.length === 0) return;

    // 선택된 행 중 합산 행이 있는지 확인
    const selectedRowsData = data?.data.filter((item) =>
      item.groupedIds.some((id) => selectedIds.includes(id))
    );

    const totalRows = selectedRowsData?.length ?? 0;
    const totalRecords = selectedIds.length;

    const hasGrouped = selectedRowsData?.some((row) => row.isGrouped) ?? false;

    const message = hasGrouped
      ? `총 ${totalRows}건(${totalRecords}개)의 리스트를 삭제하시겠습니까?`
      : `총 ${totalRecords}건의 리스트를 삭제하시겠습니까?`;

    const confirmed = window.confirm(message);

    if (confirmed) {
      deleteManyMutation.mutate(selectedIds, {
        onSuccess: () => {
          // Toast 1.5초 노출
          const toastInstance = toast({
            title: '삭제가 완료되었습니다.',
          });
          setTimeout(() => {
            toastInstance.dismiss();
          }, 1500);
          setSelectedIds([]);
        },
      });
    }
  };

  const handleDeleteAll = (): void => {
    if (!allData?.total) return;

    const allIds = allData.data.flatMap((item) => item.groupedIds);

    const confirmed = window.confirm(
      `총 ${allData.total}명의 사업소득을 전체 삭제하시겠습니까?`
    );

    if (confirmed) {
      deleteManyMutation.mutate(allIds, {
        onSuccess: () => {
          // Toast 1.5초 노출
          const toastInstance = toast({
            title: '삭제가 완료되었습니다.',
          });
          setTimeout(() => {
            toastInstance.dismiss();
          }, 1500);
          setSelectedIds([]);
        },
      });
    }
  };

  const handleAddBusinessIncome = (): void => {
    setShowAddDialog(true);
  };

  const handleRowClick = (row: GroupedBusinessIncome): void => {
    // records 배열을 지급연월 오름차순으로 정렬
    const sortedRecords = [...row.records].sort((a, b) => {
      if (a.paymentYear !== b.paymentYear) {
        return a.paymentYear - b.paymentYear;
      }
      return a.paymentMonth - b.paymentMonth;
    });

    setEditingRecords(sortedRecords);
    setShowEditDialog(true);
  };

  const getRowClassName = (row: { isGrouped: boolean }): string => {
    return row.isGrouped ? 'bg-blue-50' : '';
  };

  const handleExcelDownload = (): void => {
    // TODO: Excel download implementation
  };

  // 간이지급명세서 생성 - 조회된 전체 대상자
  const handleCreateStatementAll = (): void => {
    // 현재 조회된 리스트의 모든 ID
    const allIds = data?.data.flatMap((item) => item.groupedIds) ?? [];
    setStatementTargetIds(allIds);
    setStatementTargetType('all');
    setShowPopover(false);
    setShowStatementDialog(true);
  };

  // 간이지급명세서 생성 - 선택 대상자
  const handleCreateStatementSelected = (): void => {
    // 선택된 대상자가 없으면 경고
    if (selectedIds.length === 0) {
      alert('선택된 대상자가 없습니다. 목록 내 좌측 대상자를 선택해주세요.');
      return;
    }

    setStatementTargetIds(selectedIds);
    setStatementTargetType('selected');
    setShowPopover(false);
    setShowStatementDialog(true);
  };

  // 간이지급명세서 생성용 요약 정보 계산
  const calculateStatementSummary = (): StatementCreationSummary => {
    // targetIds에 해당하는 개별 레코드들의 데이터를 다시 합산
    const stored = localStorage.getItem('biskit_business_income');
    if (!stored) {
      return {
        count: 0,
        totalPaymentSum: 0,
        totalIncomeTax: 0,
        totalLocalIncomeTax: 0,
        totalActualPayment: 0,
      };
    }

    const allRecords = JSON.parse(stored) as BusinessIncome[];
    const targetRecords = allRecords.filter((record) =>
      statementTargetIds.includes(record.id)
    );

    // 행 개수는 선택된 행(GroupedBusinessIncome) 개수
    const selectedRows = data?.data.filter((row) =>
      row.groupedIds.some((id) => statementTargetIds.includes(id))
    );

    return {
      count: selectedRows?.length ?? 0,
      totalPaymentSum: targetRecords.reduce((sum, r) => sum + r.paymentSum, 0),
      totalIncomeTax: targetRecords.reduce((sum, r) => sum + r.incomeTax, 0),
      totalLocalIncomeTax: targetRecords.reduce((sum, r) => sum + r.localIncomeTax, 0),
      totalActualPayment: targetRecords.reduce((sum, r) => sum + r.actualPayment, 0),
    };
  };

  // 간이지급명세서 생성 성공 시
  const handleStatementSuccess = (): void => {
    // 부모 화면 갱신 (데이터 리로드)
    window.location.reload();
  };

  // 상단 요약 정보는 항상 전체 데이터 기준 (검색 시에도 유지)
  const summary = allData?.data.reduce(
    (acc, item) => ({
      count: acc.count + 1,
      totalPaymentSum: acc.totalPaymentSum + item.paymentSum,
      totalIncomeTax: acc.totalIncomeTax + item.incomeTax,
      totalLocalIncomeTax: acc.totalLocalIncomeTax + item.localIncomeTax,
      totalActualPayment: acc.totalActualPayment + item.actualPayment,
    }),
    {
      count: 0,
      totalPaymentSum: 0,
      totalIncomeTax: 0,
      totalLocalIncomeTax: 0,
      totalActualPayment: 0,
    }
  );

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <>
      <BusinessIncomeAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        year={year}
        month={month}
      />

      <AllBusinessIncomeEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        businessIncomes={editingRecords}
      />

      <BusinessIncomeStatementDialog
        open={showStatementDialog}
        onOpenChange={setShowStatementDialog}
        year={year}
        month={month}
        summary={calculateStatementSummary()}
        targetIds={statementTargetIds}
        targetType={statementTargetType}
        onSuccess={handleStatementSuccess}
      />

      <div>
        <PageHeader
          title={`${year}년 ${month}월 사업소득`}
          showBackButton={true}
          onBack={() => {
            window.location.href = '/statement/business-income/monthly';
          }}
          actions={
            <Popover open={showPopover} onOpenChange={setShowPopover}>
              <PopoverTrigger asChild>
                <Button>간이지급명세서 생성</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-2">
                  <button
                    onClick={handleCreateStatementAll}
                    className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-sm font-medium">
                      조회된 전체 대상자({data?.total ?? 0}건)
                    </div>
                  </button>
                  <button
                    onClick={handleCreateStatementSelected}
                    className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-sm font-medium">
                      선택 대상자({selectedIds.length}건)
                    </div>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          }
        />

        <div className="mb-4 p-4 bg-gray-50 rounded">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <div className="text-sm text-gray-600">건수(소득자 건수)</div>
              <div className="text-lg font-semibold">{summary?.count}건</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">총 지급액</div>
              <div className="text-lg font-semibold">
                {formatCurrency(summary?.totalPaymentSum ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">총 소득세</div>
              <div className="text-lg font-semibold">
                {formatCurrency(summary?.totalIncomeTax ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">총 지방소득세</div>
              <div className="text-lg font-semibold">
                {formatCurrency(summary?.totalLocalIncomeTax ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">총 실지급액</div>
              <div className="text-lg font-semibold">
                {formatCurrency(summary?.totalActualPayment ?? 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="성명(상호)를 입력해주세요."
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
            className="max-w-md"
          />
          <Button onClick={handleSearch}>검색</Button>
        </div>

        <div className="mb-2 text-sm text-gray-600">
          ※ 간이지급명세서 신고 후 데이터가 수정되거나 추가된 대상자는 좌측
          체크박스에서 체크 후 간이지급명세서 개별 생성을 진행해주세요.
        </div>

        <div className="flex justify-between items-center mb-4">
          {/* 왼쪽: 리스트 개수 (2.4) */}
          <div className="text-sm font-medium">
            {(() => {
              const total = data?.total ?? 0;
              const totalRecords = data?.totalRecords ?? 0;
              const hasExceptionData = data?.data.some((item) => item.isGrouped) ?? false;

              // 1~11월: "N건" 형식만
              if (month !== 12) {
                return `${total}건`;
              }

              // 12월: 예외규칙 데이터 있으면 "N건(X개)", 없으면 "N건"
              if (hasExceptionData && total !== totalRecords) {
                return `${total}건(${totalRecords}개)`;
              }

              return `${total}건`;
            })()}
          </div>

          {/* 오른쪽: 버튼들 */}
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || !allData?.total}
            >
              선택 삭제
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={!allData?.total}
            >
              전체 삭제
            </Button>
            <Button onClick={handleExcelDownload}>엑셀 다운로드</Button>
            <Button onClick={handleAddBusinessIncome} variant="default">사업소득 추가</Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          pageSize={30}
          getRowClassName={getRowClassName}
        />
      </div>
    </>
  );
}
