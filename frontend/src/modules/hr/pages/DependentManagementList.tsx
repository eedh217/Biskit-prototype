import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DataTable } from '@/shared/components/common/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { dependentReportService } from '../services/dependentReportService';
import { createDependentManagementColumns } from '../components/dependent-management-columns';
import type { DependentReport } from '../types/insuranceReport';
import { toast } from '@/shared/hooks/use-toast';

export function DependentManagementList(): JSX.Element {
  const [allReports, setAllReports] = useState<DependentReport[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [receiptCheckOpen, setReceiptCheckOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusAfterSearch, setShouldFocusAfterSearch] = useState(false);

  const loadReports = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await dependentReportService.getAll({ page: 1, limit: 10000 });
      setAllReports(response.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = searchInput.trim()
    ? allReports.filter((report) =>
        report.employees.some(
          (emp) =>
            emp.employeeName.includes(searchInput.trim()) ||
            emp.employeeNumber.includes(searchInput.trim())
        )
      )
    : allReports;

  useEffect(() => {
    if (!isLoading && shouldFocusAfterSearch) {
      searchInputRef.current?.focus();
      setShouldFocusAfterSearch(false);
    }
  }, [isLoading, shouldFocusAfterSearch]);

  const handleSearch = (): void => {
    setShouldFocusAfterSearch(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleNewReport = (): void => {
    window.history.pushState({}, '', '/hr/insurance/dependent/new');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = window.confirm('작성중인 신고를 삭제하시겠습니까?');
    if (!confirmed) return;
    try {
      await dependentReportService.delete(id);
      toast({ title: '삭제 완료되었습니다.' });
      loadReports();
    } catch (error) {
      if (error instanceof Error) alert(error.message);
    }
  };

  const handlePreview = (id: string): void => {
    window.open(`/hr/insurance/dependent/detail/${id}`, '_blank');
  };

  const handleRowClick = (report: DependentReport): void => {
    if (report.status === 'draft') {
      window.history.pushState({}, '', `/hr/insurance/dependent/edit/${report.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      window.history.pushState({}, '', `/hr/insurance/dependent/detail/${report.id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleResend = (_id: string): void => {
    const confirmed = window.confirm(
      '신고서를 재발송하시겠습니까?\n내용을 수정하실 경우, 신고하기 버튼을 눌러 재작성 후 신고해주세요.'
    );
    if (!confirmed) return;
    toast({ title: '재발송되었습니다.' });
  };

  const columns = createDependentManagementColumns({
    onDelete: handleDelete,
    onPreview: handlePreview,
    onRowClick: handleRowClick,
    onResend: handleResend,
  });

  return (
    <>
      <div>
        <PageHeader title="피부양자 관리" showBackButton={false} />

        {/* 검색 영역 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={searchInputRef}
              placeholder="이름 또는 사번을 입력해주세요."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-9"
            />
          </div>
          <Button onClick={handleSearch} onMouseDown={(e) => e.preventDefault()}>
            검색
          </Button>
        </div>

        {/* 리스트 개수 및 버튼 영역 */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">{filteredReports.length}개</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setReceiptCheckOpen(true)}>
              수신여부 확인
            </Button>
            <Button variant="default" onClick={handleNewReport}>
              <Plus className="h-4 w-4 mr-1" />
              신고하기
            </Button>
          </div>
        </div>

        {/* 수신여부 확인 다이얼로그 */}
        <Dialog open={receiptCheckOpen} onOpenChange={setReceiptCheckOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>수신여부 확인</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                팩스를 보낸 공단을 클릭하여 수신여부를 확인해주세요.
              </p>
              <div className="space-y-2">
                <a
                  href="https://www.nhis.or.kr/nhis/minwon/jpCda00101.do"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 rounded-md border border-slate-200 hover:bg-gray-50 text-sm font-medium"
                >
                  건강보험공단
                  <span className="text-gray-400 text-xs">바로가기 →</span>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 데이터 테이블 */}
        <DataTable
          columns={columns}
          data={filteredReports}
          pageSize={30}
          onRowClick={handleRowClick}
          getRowId={(row) => row.id}
        />
      </div>
    </>
  );
}
