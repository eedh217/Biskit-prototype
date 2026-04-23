import { useState, useMemo, useEffect, useRef } from 'react';
import { useEmployeeList, useDeleteManyEmployees } from '../hooks/useEmployee';
import { organizationService } from '../services/organizationService';
import { jobLevelService } from '../services/jobLevelService';
import { seedEmployees } from '../services/seedEmployees';
import type { Organization } from '../types/organization';
import type { JobLevel } from '../types/jobLevel';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DataTable } from '@/shared/components/common/data-table';
import { employeeColumns } from '../components/employee-columns';
import { toast } from '@/shared/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TooltipArrow,
} from '@/shared/components/ui/tooltip';
import { Search, X } from 'lucide-react';

export function EmployeeList(): JSX.Element {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [showSeedTooltip, setShowSeedTooltip] = useState(() => {
    const saved = localStorage.getItem('biskit_hide_seed_tooltip');
    return saved !== 'true';
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shouldFocusAfterSearch, setShouldFocusAfterSearch] = useState(false);

  const { data, isLoading, isError, error } = useEmployeeList({
    search,
    page: 1,
    limit: 10000, // Get all data for client-side pagination
  });

  const deleteManyMutation = useDeleteManyEmployees();

  // 조직의 전체 경로를 구하는 함수
  const getOrganizationPath = (orgId: string | null, allOrgs: Organization[]): string => {
    if (!orgId) return '-';

    const org = allOrgs.find((o) => o.id === orgId);
    if (!org) return '-';

    const path: string[] = [];
    let current: Organization | undefined = org;

    while (current) {
      path.unshift(current.name);
      current = allOrgs.find((o) => o.id === current?.parentId);
    }

    return path.join(' > ');
  };

  // 조직 및 직급 목록 로드
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setIsMetadataLoading(true);
        const [orgs, levels] = await Promise.all([
          organizationService.getAll(),
          jobLevelService.getList(),
        ]);
        setOrganizations(orgs);
        setJobLevels(levels);
      } catch (error) {
        console.error('데이터 로딩 실패:', error);
      } finally {
        setIsMetadataLoading(false);
      }
    };

    loadData();
  }, []);

  // 검색 후 포커스 복원
  useEffect(() => {
    if (!isLoading && shouldFocusAfterSearch) {
      searchInputRef.current?.focus();
      setShouldFocusAfterSearch(false);
    }
  }, [isLoading, shouldFocusAfterSearch]);

  // 직원 데이터에 부서명, 직급명 추가
  const employeesWithDepartment = useMemo(() => {
    if (!data?.data) return [];

    return data.data.map((employee) => {
      const jobLevel = jobLevels.find(
        (level) => level.id === employee.position
      );

      return {
        ...employee,
        departmentPath: getOrganizationPath(employee.departmentId, organizations),
        positionName: jobLevel?.name,
      };
    });
  }, [data?.data, organizations, jobLevels]);

  const handleSearch = (): void => {
    const trimmed = searchInput.trim();

    // 빈 값은 허용 (전체 조회)
    if (trimmed === '') {
      setSearch('');
      setSelectedRows({});
      setShouldFocusAfterSearch(true);
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
        onError: (error) => {
          toast({
            title: '삭제 실패',
            description: error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다.',
            variant: 'destructive',
          });
        },
      });
    }
  };

  const handleExcelDownload = (): void => {
    if (!data?.total) {
      alert('다운로드할 데이터가 없습니다');
      return;
    }

    // TODO: 엑셀 다운로드 구현
    toast({
      title: '엑셀 다운로드',
      description: '엑셀 다운로드 기능은 준비 중입니다.',
    });
  };

  const handleAdd = (): void => {
    window.history.pushState({}, '', '/hr/employee/add');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleSeedData = async (): Promise<void> => {
    const confirmed = window.confirm(
      '더미 데이터를 생성하시겠습니까?\n\n• 부서 (11개)\n• 직급 (6개)\n• 근로형태 (4개)\n• 직원 (50명)\n\n※ 이미 등록된 데이터가 있으면 추가로 생성됩니다.'
    );

    if (!confirmed) return;

    try {
      await seedEmployees();
      toast({
        title: '더미 데이터 생성 완료',
        description: '50명의 직원 데이터가 생성되었습니다.',
      });
      // 페이지 새로고침
      window.location.reload();
    } catch (error) {
      toast({
        title: '더미 데이터 생성 실패',
        description: error instanceof Error ? error.message : '생성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCloseSeedTooltip = (): void => {
    setShowSeedTooltip(false);
    localStorage.setItem('biskit_hide_seed_tooltip', 'true');
  };

  if (isLoading || isMetadataLoading) {
    return (
      <div>
        <PageHeader title="직원관리" showBackButton={false} />
        <div className="mt-6 flex items-center justify-center">
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="직원관리" showBackButton={false} />
        <div className="mt-6 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-2">데이터를 불러오는데 실패했습니다.</p>
            <p className="text-sm text-slate-500">{error?.message || '알 수 없는 오류'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <PageHeader title="직원관리" showBackButton={false} />

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
          <Button
            onClick={handleSearch}
            onMouseDown={(e) => e.preventDefault()}
          >
            검색
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || !data?.total}
            >
              선택 삭제
            </Button>
            <Button onClick={handleExcelDownload}>엑셀 다운로드</Button>
            <TooltipProvider>
              <Tooltip open={showSeedTooltip}>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleSeedData}>더미 데이터 생성</Button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="max-w-sm bg-blue-50 border-blue-200 text-blue-900"
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onEscapeKeyDown={(e) => e.preventDefault()}
                >
                  <TooltipArrow className="fill-blue-200" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      테스트를 위해 부서, 직급, 근로형태, 직원을 자동으로 추가할 수 있습니다.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-blue-100 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseSeedTooltip();
                      }}
                    >
                      <X className="h-3 w-3 text-blue-600" />
                    </Button>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="default" onClick={handleAdd}>추가하기</Button>
          </div>
        </div>

        <DataTable
          noBorder
          columns={employeeColumns}
          data={employeesWithDepartment}
          onRowClick={(row) => {
            if (!row.id) {
              console.error('Row has no id!');
              return;
            }
            window.history.pushState({}, '', `/hr/employee/${row.id}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          pageSize={30}
          columnPinning={{ left: ['select', 'name'] }}
          rowSelection={selectedRows}
          onRowSelectionChange={setSelectedRows}
          getRowId={(row) => row.id}
          rowLabel="명"
        />
      </div>
    </>
  );
}
