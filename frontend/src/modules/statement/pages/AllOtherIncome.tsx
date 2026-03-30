import { useState, useMemo, useRef, useEffect } from 'react';
import { useOtherIncomeAllList, useDeleteManyOtherIncome } from '../hooks/useOtherIncome';
import type { OtherIncome } from '../types/other-income.types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DataTable } from '@/shared/components/common/data-table';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { createAllOtherIncomeColumns } from '../components/all-other-income-columns';
import { AllOtherIncomeAddDialog } from '../components/AllOtherIncomeAddDialog';
import { AllOtherIncomeEditDialog } from '../components/AllOtherIncomeEditDialog';
import { toast } from '@/shared/hooks/use-toast';
import { Search } from 'lucide-react';

// 검색 허용 문자 검증 함수
function validateSearchInput(value: string): boolean {
  // 허용 문자: 한글(완성형+자음/모음)·영문·숫자·공백·허용 특수문자(&, ', -, ., ·, (, ))
  const allowedPattern = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s&'\-.·()]*$/;
  return allowedPattern.test(value);
}

export function AllOtherIncome(): JSX.Element {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedOtherIncomeId, setSelectedOtherIncomeId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusAfterSearch, setShouldFocusAfterSearch] = useState(false);

  const { data, isLoading } = useOtherIncomeAllList({
    search,
    page: 1,
    pageSize: 10000, // Get all data for client-side pagination
  });

  const deleteManyMutation = useDeleteManyOtherIncome();

  // 검색 후 포커스 복원
  useEffect(() => {
    if (!isLoading && shouldFocusAfterSearch) {
      searchInputRef.current?.focus();
      setShouldFocusAfterSearch(false);
    }
  }, [isLoading, shouldFocusAfterSearch]);

  const handleSearch = (): void => {
    const trimmed = searchInput.trim();

    // 빈 값은 허용 (전체 조회)
    if (trimmed === '') {
      setSearch('');
      setSelectedRows({});
      setShouldFocusAfterSearch(true);
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
    setSelectedRows({});
    setShouldFocusAfterSearch(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const selectedIds = useMemo(() => {
    return Object.keys(selectedRows).filter((key) => selectedRows[key]);
  }, [selectedRows]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

  const handleDeleteSelected = (): void => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      `총 ${selectedIds.length}개의 리스트를 삭제하시겠습니까?`
    );

    if (confirmed) {
      deleteManyMutation.mutate(selectedIds, {
        onSuccess: () => {
          const toastInstance = toast({
            title: '삭제가 완료되었습니다.',
          });
          setTimeout(() => {
            toastInstance.dismiss();
          }, 1500);
          setSelectedRows({});
        },
      });
    }
  };

  const handleAddOtherIncome = (): void => {
    setShowAddDialog(true);
  };

  const columns = useMemo(
    () => createAllOtherIncomeColumns(selectedIds, (ids) => {
      const newSelectedRows: Record<string, boolean> = {};
      ids.forEach((id) => {
        newSelectedRows[id] = true;
      });
      setSelectedRows(newSelectedRows);
    }, data?.data ?? []),
    [selectedIds, data?.data]
  );

  const handleRowClick = (row: OtherIncome): void => {
    setSelectedOtherIncomeId(row.id);
    setShowEditDialog(true);
  };

  const handleExcelDownload = (): void => {
    if (!data?.total) {
      alert('다운로드할 데이터가 없습니다');
      return;
    }

    // TODO: 엑셀 다운로드 구현
    // Policy 요구사항:
    // 1. 검색하지 않았을 경우: 전체 리스트 다운로드
    // 2. 검색했을 경우: 검색 결과 다운로드
    // 3. 리스트 선택 후: 선택한 리스트만 다운로드
    // 파일명: "전체 기타소득.xlsx"
    alert('엑셀 다운로드 기능은 추후 구현됩니다.');
  };

  const handleExcelUpload = (): void => {
    // TODO: 엑셀 업로드 구현 (SPS_OI_01 기타소득 합산 화면의 엑셀 업로드 기능과 동일)
    alert('엑셀 업로드 기능은 추후 구현됩니다.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <AllOtherIncomeAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {selectedOtherIncomeId && (
        <AllOtherIncomeEditDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          otherIncomeId={selectedOtherIncomeId}
        />
      )}

      <div>
        <PageHeader title="전체 기타소득" showBackButton={false} />

        {/* 검색영역 */}
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
              maxLength={50}
            />
          </div>
          <Button
            onClick={handleSearch}
            onMouseDown={(e) => e.preventDefault()}
          >
            검색
          </Button>
        </div>

        {/* 리스트 개수 및 액션 버튼 */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{data?.total ?? 0}개</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || !data?.total}
            >
              선택 삭제
            </Button>
            <Button onClick={handleExcelDownload}>엑셀 다운로드</Button>
            <Button onClick={handleExcelUpload} variant="default">
              엑셀 업로드
            </Button>
            <Button onClick={handleAddOtherIncome} variant="default">
              기타소득 추가
            </Button>
          </div>
        </div>

        {/* 리스트(테이블) */}
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          pageSize={30}
        />
      </div>
    </>
  );
}
