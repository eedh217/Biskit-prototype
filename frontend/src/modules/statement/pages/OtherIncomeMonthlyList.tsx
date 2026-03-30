import { useState, useMemo, useRef, useEffect } from 'react';
import {
  useOtherIncomeMonthlyList,
  useDeleteManyOtherIncome,
  useDeleteAllOtherIncome,
} from '../hooks/useOtherIncome';
import { OtherIncomeSummary } from './OtherIncomeSummary';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { DataTable } from '@/shared/components/common/data-table';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { createOtherIncomeColumns } from '../components/other-income-columns';
import { AddOtherIncomeDialog } from '../components/AddOtherIncomeDialog';
import { EditOtherIncomeDialog } from '../components/EditOtherIncomeDialog';
import { OtherIncomeStatementDialog } from '../components/OtherIncomeStatementDialog';
import { formatCurrency } from '../types/other-income.types';
import type {
  OtherIncome,
  StatementCreationSummary,
} from '../types/other-income.types';
import { toast } from '@/shared/hooks/use-toast';
import { Search } from 'lucide-react';

export function OtherIncomeMonthlyList(): JSX.Element {
  const urlParams = new URLSearchParams(window.location.search);
  const year = Number(urlParams.get('year')) || 0;
  const month = Number(urlParams.get('month')) || 0;

  // year/month 파라미터가 없으면 합산 화면 표시
  if (!year || !month) {
    return <OtherIncomeSummary />;
  }

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOtherIncomeId, setSelectedOtherIncomeId] = useState<string | null>(null);
  const [showPopover, setShowPopover] = useState(false);
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [statementTargetIds, setStatementTargetIds] = useState<string[]>([]);
  const [statementTargetType, setStatementTargetType] = useState<'all' | 'selected'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusAfterSearch, setShouldFocusAfterSearch] = useState(false);

  // 검색 결과 데이터 (리스트 표시용)
  const { data, isLoading } = useOtherIncomeMonthlyList({
    year,
    month,
    search,
    page: 1,
    pageSize: 10000, // Get all data for client-side pagination
  });

  // 전체 데이터 (상단 요약 정보용 - 검색 시에도 전체 데이터 기준 유지)
  const { data: allData } = useOtherIncomeMonthlyList({
    year,
    month,
    search: '', // 검색어 없이 전체 데이터
    page: 1,
    pageSize: 10000,
  });

  const deleteManyMutation = useDeleteManyOtherIncome();
  const deleteAllMutation = useDeleteAllOtherIncome();

  // 검색 후 포커스 복원
  useEffect(() => {
    if (!isLoading && shouldFocusAfterSearch) {
      searchInputRef.current?.focus();
      setShouldFocusAfterSearch(false);
    }
  }, [isLoading, shouldFocusAfterSearch]);

  // 검색 허용 문자 검증 함수
  const validateSearchInput = (value: string): boolean => {
    // 허용 문자: 한글(완성형+자음/모음)·영문·숫자·공백·허용 특수문자(&, ', -, ., ·, (, ))
    const allowedPattern = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s&'\-.·()]*$/;
    return allowedPattern.test(value);
  };

  const handleSearch = (): void => {
    const trimmed = searchInput.trim();

    // 빈 값은 허용 (전체 조회)
    if (trimmed === '') {
      setSearch('');
      setSelectedIds([]);
      setShouldFocusAfterSearch(true);
      return;
    }

    // 허용 문자 검증
    if (!validateSearchInput(trimmed)) {
      toast({
        title: '입력 오류',
        description:
          "한글, 영문, 숫자, 공백 및 특수문자(&, ', -, ., ·, (, ))만 입력 가능합니다.",
        variant: 'destructive',
      });
      return;
    }

    setSearch(trimmed);
    setShouldFocusAfterSearch(true);
    setSelectedIds([]);
  };

  const handleSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = e.target.value;

    // 한글 조합 중에는 검증 건너뛰기
    if (isComposing) {
      setSearchInput(value);
      return;
    }

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
    () => createOtherIncomeColumns(selectedIds, setSelectedIds),
    [selectedIds]
  );

  const handleDeleteSelected = (): void => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `총 ${selectedIds.length}건의 리스트를 삭제하시겠습니까?`
    );

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

    const confirmed = window.confirm(
      `총 ${allData.total}건의 기타소득을 전체 삭제하시겠습니까?`
    );

    if (confirmed) {
      deleteAllMutation.mutate(
        { year, month },
        {
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
        }
      );
    }
  };

  const handleAddOtherIncome = (): void => {
    setAddDialogOpen(true);
  };

  const handleRowClick = (row: { id: string }): void => {
    setSelectedOtherIncomeId(row.id);
    setEditDialogOpen(true);
  };

  const handleExcelDownload = (): void => {
    // TODO: Excel download implementation
  };

  // 간이지급명세서 생성 - 조회된 전체 대상자
  const handleCreateStatementAll = (): void => {
    // 현재 조회된 리스트의 모든 ID
    const allIds = data?.data.map((item) => item.id) ?? [];

    // 조회된 대상자가 없으면 alert 표시
    if (allIds.length === 0) {
      alert('조회된 대상자가 없습니다. 대상자를 추가해주세요.');
      return;
    }

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
    // targetIds에 해당하는 레코드들의 데이터를 합산
    const stored = localStorage.getItem('biskit_other_income');
    if (!stored) {
      return {
        count: 0,
        totalPaymentAmount: 0,
        totalNecessaryExpenses: 0,
        totalIncomeAmount: 0,
      };
    }

    const allRecords = JSON.parse(stored) as OtherIncome[];
    const targetRecords = allRecords.filter((record) =>
      statementTargetIds.includes(record.id)
    );

    return {
      count: targetRecords.length,
      totalPaymentAmount: targetRecords.reduce((sum, r) => sum + r.paymentAmount, 0),
      totalNecessaryExpenses: targetRecords.reduce((sum, r) => sum + r.necessaryExpenses, 0),
      totalIncomeAmount: targetRecords.reduce((sum, r) => sum + r.incomeAmount, 0),
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
      totalPaymentAmount: acc.totalPaymentAmount + item.paymentAmount,
      totalNecessaryExpenses: acc.totalNecessaryExpenses + item.necessaryExpenses,
      totalIncomeAmount: acc.totalIncomeAmount + item.incomeAmount,
      totalIncomeTax: acc.totalIncomeTax + item.incomeTax,
      totalLocalIncomeTax: acc.totalLocalIncomeTax + item.localIncomeTax,
      totalActualIncomeAmount: acc.totalActualIncomeAmount + item.actualIncomeAmount,
    }),
    {
      count: 0,
      totalPaymentAmount: 0,
      totalNecessaryExpenses: 0,
      totalIncomeAmount: 0,
      totalIncomeTax: 0,
      totalLocalIncomeTax: 0,
      totalActualIncomeAmount: 0,
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${year}년 ${month}월 기타소득`}
        showBackButton={true}
        onBack={() => {
          window.location.href = '/statement/other-income/monthly';
        }}
        actions={
          <Popover open={showPopover} onOpenChange={setShowPopover}>
            <PopoverTrigger asChild>
              <Button>간이지급명세서 생성</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="end">
              <button
                onClick={handleCreateStatementAll}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                조회된 전체 대상자({data?.total ?? 0}건)
              </button>
              <button
                onClick={handleCreateStatementSelected}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                선택 대상자({selectedIds.length}건)
              </button>
            </PopoverContent>
          </Popover>
        }
      />

      {/* 상단 요약 정보 */}
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <div className="grid grid-cols-7 gap-4">
          <div>
            <div className="text-sm text-gray-600">건수(소득자 건수)</div>
            <div className="text-lg font-semibold">{summary?.count}건</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">총 지급액</div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary?.totalPaymentAmount ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">총 필요경비</div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary?.totalNecessaryExpenses ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">총 소득금액</div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary?.totalIncomeAmount ?? 0)}
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
            <div className="text-sm text-gray-600">총 실소득금액</div>
            <div className="text-lg font-semibold">
              {formatCurrency(summary?.totalActualIncomeAmount ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 검색 영역 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            ref={searchInputRef}
            placeholder="성명(상호)를 입력해주세요."
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            className="w-full pl-9"
          />
        </div>
        <Button
          onClick={handleSearch}
          onMouseDown={(e) => e.preventDefault()}
        >
          검색
        </Button>
      </div>

      {/* 안내 문구 */}
      <div className="mb-2 text-sm text-gray-600">
        ※ 간이지급명세서 신고 후 데이터가 수정되거나 추가된 대상자는 좌측
        체크박스에서 체크 후 간이지급명세서 개별 생성을 진행해주세요.
      </div>

      {/* 액션 버튼 및 리스트 개수 */}
      <div className="flex justify-between items-center mb-4">
        {/* 왼쪽: 리스트 개수 */}
        <div className="text-sm font-medium">총 {data?.total ?? 0}건</div>

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
          <Button onClick={handleAddOtherIncome} variant="default">
            기타소득 추가
          </Button>
        </div>
      </div>

      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        onRowClick={handleRowClick}
        pageSize={30}
      />

      {/* 기타소득 추가 팝업 */}
      <AddOtherIncomeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        paymentYear={year}
        paymentMonth={month}
      />

      {/* 기타소득 수정 팝업 */}
      <EditOtherIncomeDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        otherIncomeId={selectedOtherIncomeId}
        paymentYear={year}
        paymentMonth={month}
      />

      {/* 간이지급명세서 생성 팝업 */}
      <OtherIncomeStatementDialog
        open={showStatementDialog}
        onOpenChange={setShowStatementDialog}
        year={year}
        month={month}
        summary={calculateStatementSummary()}
        targetIds={statementTargetIds}
        targetType={statementTargetType}
        onSuccess={handleStatementSuccess}
      />
    </div>
  );
}
