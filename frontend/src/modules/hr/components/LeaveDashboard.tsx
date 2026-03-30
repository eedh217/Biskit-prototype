import { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { DataTable } from '@/shared/components/common/data-table';
import { Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { employeeService } from '../services/employeeService';
import { leaveBalanceService } from '../services/leaveBalanceService';
import { organizationService } from '../services/organizationService';
import type { Employee } from '../types/employee';
import type { Organization } from '../types/organization';
import { getEmploymentStatus } from '../types/employee';
import { ColumnDef } from '@tanstack/react-table';
import { Progress } from '@/shared/components/ui/progress';
import { EmployeeLeaveManagementDialog } from './EmployeeLeaveManagementDialog';

interface EmployeeLeaveRow {
  id: string;
  employeeNumber: string;
  name: string;
  departmentPath: string;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  usageRate: number;
}

export function LeaveDashboard(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [rows, setRows] = useState<EmployeeLeaveRow[]>([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [openDepartmentCombobox, setOpenDepartmentCombobox] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      const emps = await employeeService.getAll({ limit: 9999 });
      const orgs = await organizationService.getAll();

      // 재직중인 직원만
      const activeEmployees = emps.data.filter(
        (emp) => getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      setEmployees(activeEmployees);
      setOrganizations(orgs);

      // 연차 잔액 조회 (병렬 처리)
      const rowPromises = activeEmployees.map(async (emp) => {
        const balance = await leaveBalanceService.getSummary(emp.id, currentYear, emp);
        const usageRate = balance.totalDays > 0
          ? Math.round((balance.usedDays / balance.totalDays) * 100)
          : 0;

        return {
          id: emp.id,
          employeeNumber: emp.employeeNumber,
          name: emp.name,
          departmentPath: getDepartmentPath(emp.departmentId, orgs),
          totalDays: balance.totalDays,
          usedDays: balance.usedDays,
          pendingDays: balance.pendingDays,
          remainingDays: balance.remainingDays - balance.pendingDays,
          usageRate,
        };
      });

      const rowData = await Promise.all(rowPromises);
      setRows(rowData);
    } catch (error) {
      console.error('Failed to load leave dashboard:', error);
    }
  };

  const getDepartmentPath = (deptId: string | null, orgs: Organization[]): string => {
    if (!deptId) return '-';

    const dept = orgs.find((o) => o.id === deptId);
    if (!dept) return '-';

    const path: string[] = [];
    let current: Organization | undefined = dept;

    while (current) {
      path.unshift(current.name);
      current = orgs.find((o) => o.id === current?.parentId);
    }

    return path.join(' > ');
  };

  const handleSearch = (): void => {
    setSearch(searchInput);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRowClick = (row: EmployeeLeaveRow): void => {
    const employee = employees.find((emp) => emp.id === row.id);
    if (employee) {
      setSelectedEmployee(employee);
      setShowManagementDialog(true);
    }
  };

  const handleManagementSuccess = async (): Promise<void> => {
    // 데이터 새로고침
    await loadData();
  };

  const columns: ColumnDef<EmployeeLeaveRow>[] = [
    {
      accessorKey: 'employeeNumber',
      header: '사번',
      cell: ({ row }) => <div className="font-medium">{row.original.employeeNumber}</div>,
    },
    {
      accessorKey: 'name',
      header: '성명',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'departmentPath',
      header: '부서',
      cell: ({ row }) => <div className="text-sm">{row.original.departmentPath}</div>,
    },
    {
      accessorKey: 'totalDays',
      header: '발생',
      cell: ({ row }) => <div className="text-center">{row.original.totalDays}일</div>,
    },
    {
      accessorKey: 'usedDays',
      header: '사용',
      cell: ({ row }) => (
        <div className="text-center text-gray-600">{row.original.usedDays}일</div>
      ),
    },
    {
      accessorKey: 'pendingDays',
      header: '대기중',
      cell: ({ row }) => (
        <div className="text-center text-yellow-600">{row.original.pendingDays}일</div>
      ),
    },
    {
      accessorKey: 'remainingDays',
      header: '잔여',
      cell: ({ row }) => (
        <div className="text-center text-blue-600 font-semibold">
          {row.original.remainingDays}일
        </div>
      ),
    },
    {
      accessorKey: 'usageRate',
      header: '사용률',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Progress value={row.original.usageRate} className="h-2 w-20" />
          <span className="text-sm text-gray-600 w-12">{row.original.usageRate}%</span>
        </div>
      ),
    },
  ];

  const filteredRows = rows.filter((row) => {
    // 검색 필터
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        row.name.toLowerCase() === searchLower ||
        row.employeeNumber.toLowerCase() === searchLower;
      if (!matchesSearch) return false;
    }

    // 부서 필터
    if (selectedDepartment !== 'all') {
      const employee = employees.find((emp) => emp.id === row.id);
      if (!employee) return false;

      if (selectedDepartment === 'none') {
        // "해당 없음" 선택 시 부서가 null인 직원만
        if (employee.departmentId !== null) return false;
      } else {
        // 특정 부서 선택 시
        if (employee.departmentId !== selectedDepartment) return false;
      }
    }

    return true;
  });

  // 부서별로 정렬
  const sortedRows = [...filteredRows].sort((a, b) => {
    // 부서명으로 정렬
    const deptA = a.departmentPath || 'zzz'; // 부서 없음은 맨 마지막
    const deptB = b.departmentPath || 'zzz';

    if (deptA !== deptB) {
      return deptA.localeCompare(deptB);
    }

    // 같은 부서 내에서는 사번으로 정렬
    return a.employeeNumber.localeCompare(b.employeeNumber);
  });

  // 요약 통계
  const totalEmployees = rows.length;
  const avgUsageRate =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.usageRate, 0) / rows.length)
      : 0;
  const totalRemainingDays = rows.reduce((sum, r) => sum + r.remainingDays, 0);

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm text-gray-500 mb-1">전체 직원</div>
          <div>
            <span className="text-3xl font-bold">{totalEmployees}</span>
            <span className="text-sm text-gray-500 ml-1">명</span>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm text-gray-500 mb-1">평균 연차 사용률</div>
          <div>
            <span className="text-3xl font-bold text-blue-600">{avgUsageRate}</span>
            <span className="text-sm text-gray-500 ml-1">%</span>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <div className="text-sm text-gray-500 mb-1">전체 잔여 연차</div>
          <div>
            <span className="text-3xl font-bold text-green-600">{totalRemainingDays}</span>
            <span className="text-sm text-gray-500 ml-1">일</span>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="성명, 사번 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-9"
          />
        </div>
        <Popover open={openDepartmentCombobox} onOpenChange={setOpenDepartmentCombobox}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openDepartmentCombobox}
              className="w-[250px] justify-between"
            >
              {selectedDepartment === 'all'
                ? '전체 부서'
                : selectedDepartment === 'none'
                ? '해당 없음'
                : getDepartmentPath(selectedDepartment, organizations)}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput placeholder="부서 검색..." />
              <CommandList>
                <CommandEmpty>부서를 찾을 수 없습니다.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setSelectedDepartment('all');
                      setOpenDepartmentCombobox(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedDepartment === 'all' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    전체 부서
                  </CommandItem>
                  {organizations.map((org) => (
                    <CommandItem
                      key={org.id}
                      value={getDepartmentPath(org.id, organizations)}
                      onSelect={() => {
                        setSelectedDepartment(org.id);
                        setOpenDepartmentCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedDepartment === org.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {getDepartmentPath(org.id, organizations)}
                    </CommandItem>
                  ))}
                  <CommandItem
                    value="해당 없음"
                    onSelect={() => {
                      setSelectedDepartment('none');
                      setOpenDepartmentCombobox(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedDepartment === 'none' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    해당 없음
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 테이블 */}
      <DataTable
        columns={columns}
        data={sortedRows}
        onRowClick={handleRowClick}
      />

      {/* 직원 휴가 관리 Dialog */}
      <EmployeeLeaveManagementDialog
        open={showManagementDialog}
        onOpenChange={setShowManagementDialog}
        employee={selectedEmployee}
        onSuccess={handleManagementSuccess}
      />
    </div>
  );
}
