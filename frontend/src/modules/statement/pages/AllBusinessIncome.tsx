import { useState, useMemo, useRef, useEffect } from 'react';
import {
  useAllBusinessIncomeList,
  useDeleteManyBusinessIncome,
} from '../hooks/useBusinessIncome';
import type { BusinessIncome, GroupedBusinessIncome } from '../types/business-income.types';
import { AllBusinessIncomeAddDialog } from '../components/AllBusinessIncomeAddDialog';
import { AllBusinessIncomeEditDialog } from '../components/AllBusinessIncomeEditDialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DataTable } from '@/shared/components/common/data-table';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { createAllBusinessIncomeColumns } from '../components/all-business-income-columns';
import { toast } from '@/shared/hooks/use-toast';
import { Search } from 'lucide-react';

// 검색 허용 문자 검증 함수
function validateSearchInput(value: string): boolean {
  // 허용 문자: 한글(완성형+자음/모음)·영문·숫자·공백·허용 특수문자(&, ', -, ., ·, (, ))
  const allowedPattern = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9\s&'\-.·()]*$/;
  return allowedPattern.test(value);
}

export function AllBusinessIncome(): JSX.Element {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecords, setEditingRecords] = useState<BusinessIncome[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusAfterSearch, setShouldFocusAfterSearch] = useState(false);

  const { data, isLoading } = useAllBusinessIncomeList({
    search,
    page: 1,
    limit: 10000, // Get all data for client-side pagination
  });

  const deleteManyMutation = useDeleteManyBusinessIncome();

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

  const handleAddBusinessIncome = (): void => {
    setShowAddDialog(true);
  };

  const columns = useMemo(
    () => createAllBusinessIncomeColumns(selectedIds, (ids) => {
      const newSelectedRows: Record<string, boolean> = {};
      ids.forEach((id) => {
        newSelectedRows[id] = true;
      });
      setSelectedRows(newSelectedRows);
    }, data?.data ?? []),
    [selectedIds, data?.data]
  );

  const handleRowClick = (row: GroupedBusinessIncome): void => {
    // 전체 리스트는 단건만 표시하지만 AllBusinessIncomeEditDialog는 배열을 받음
    setEditingRecords(row.records);
    setShowEditDialog(true);
  };

  const handleExcelDownload = (): void => {
    if (!data?.total) {
      alert('다운로드할 데이터가 없습니다');
      return;
    }
  };

  const handleExcelUpload = (): void => {
    // TODO: Excel upload implementation
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <>
      <AllBusinessIncomeAddDialog open={showAddDialog} onOpenChange={setShowAddDialog} />

      <AllBusinessIncomeEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        businessIncomes={editingRecords}
      />

      <div>
        <PageHeader
          title="전체 사업소득"
          showBackButton={false}
        />

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
            <Button onClick={handleExcelUpload} variant="default">엑셀 업로드</Button>
            <Button onClick={handleAddBusinessIncome} variant="default">사업소득 추가</Button>
          </div>
        </div>

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
