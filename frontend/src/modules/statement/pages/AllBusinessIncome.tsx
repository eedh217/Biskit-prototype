import { useState, useMemo } from 'react';
import {
  useAllBusinessIncomeList,
  useDeleteManyBusinessIncome,
} from '../hooks/useBusinessIncome';
import type { BusinessIncome, GroupedBusinessIncome } from '../types/business-income.types';
import { AllBusinessIncomeAddDialog } from '../components/AllBusinessIncomeAddDialog';
import { BusinessIncomeEditDialog } from '../components/BusinessIncomeEditDialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DataTable } from '@/shared/components/common/data-table';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { allBusinessIncomeColumns } from '../components/all-business-income-columns';
import { toast } from '@/shared/hooks/use-toast';

// 검색 허용 문자 검증 함수
function validateSearchInput(value: string): boolean {
  // 허용 문자: 한글·영문·숫자·공백·허용 특수문자(&, ', -, ., ·, (, ))
  const allowedPattern = /^[가-힣a-zA-Z0-9\s&'\-.·()]*$/;
  return allowedPattern.test(value);
}

export function AllBusinessIncome(): JSX.Element {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BusinessIncome | null>(null);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useAllBusinessIncomeList({
    search,
    page: 1,
    limit: 10000, // Get all data for client-side pagination
  });

  const deleteManyMutation = useDeleteManyBusinessIncome();

  const handleSearch = (): void => {
    const trimmed = searchInput.trim();

    // 빈 값은 허용 (전체 조회)
    if (trimmed === '') {
      setSearch('');
      setSelectedRows({});
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

  const handleRowClick = (row: GroupedBusinessIncome): void => {
    // 전체 리스트는 단건만 표시하므로 첫 번째 record만 전달
    setEditingRecord(row.records[0] || null);
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

      <BusinessIncomeEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        businessIncome={editingRecord}
      />

      <div>
        <PageHeader
          title="전체 사업소득"
          showBackButton={false}
        />

        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="성명(상호)를 입력해주세요."
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
            className="max-w-md"
            maxLength={50}
          />
          <Button onClick={handleSearch}>검색</Button>
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
          columns={allBusinessIncomeColumns}
          data={data?.data ?? []}
          onRowClick={handleRowClick}
          pageSize={30}
        />
      </div>
    </>
  );
}
