import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { DataTable } from '@/shared/components/common/data-table';
import { toast } from '@/shared/hooks/use-toast';
import { employeeService } from '../services/employeeService';
import { leaveHistoryService } from '../services/leaveHistoryService';
import { leaveBalanceService } from '../services/leaveBalanceService';
import type { Employee } from '../types/employee';
import type { LeaveHistory } from '../types/leave';
import type { ColumnDef } from '@tanstack/react-table';

interface AdjustmentHistoryRow extends LeaveHistory {
  employeeName: string;
  employeeNumber: string;
}

export function LeaveAdjustment(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState<AdjustmentHistoryRow[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [days, setDays] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setIsLoadingData(true);

      // 직원 목록 로드
      console.log('Loading employees...');
      const response = await employeeService.getAll({ limit: 1000 });
      const employeeData = response.data;
      console.log('Employees loaded:', employeeData.length);

      const activeEmployees = employeeData.filter(
        (emp) => !emp.leaveDate || new Date(emp.leaveDate) > new Date()
      );
      setEmployees(activeEmployees);

      // 모든 조정 이력 로드
      console.log('Loading adjustment history...');
      await loadAdjustmentHistory(employeeData);
      console.log('Data loaded successfully');
    } catch (error) {
      console.error('Failed to load data:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      toast({
        title: '로딩 실패',
        description: `데이터를 불러오는데 실패했습니다. ${error instanceof Error ? error.message : ''}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAdjustmentHistory = async (employeeData: Employee[]): Promise<void> => {
    try {
      // 병렬로 모든 직원의 이력 로드
      const historyPromises = employeeData.map(async (emp) => {
        try {
          const history = await leaveHistoryService.getByEmployee(emp.id);
          const adjustments = history
            .filter((h) => h.type === 'adjust')
            .map((h) => ({
              ...h,
              employeeName: emp.name,
              employeeNumber: emp.employeeNumber,
            }));
          return adjustments;
        } catch (error) {
          console.error(`Failed to load history for employee ${emp.name}:`, error);
          return [];
        }
      });

      const allHistoryArrays = await Promise.all(historyPromises);
      const allHistory = allHistoryArrays.flat();

      // 최신순 정렬
      allHistory.sort(
        (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );

      console.log('Adjustment history loaded:', allHistory.length);
      setAdjustmentHistory(allHistory);
    } catch (error) {
      console.error('Failed to load adjustment history:', error);
      throw error;
    }
  };

  const handleOpenDialog = (): void => {
    setSelectedEmployeeId('');
    setYear(new Date().getFullYear());
    setDays('');
    setReason('');
    setShowDialog(true);
  };

  const handleCloseDialog = (): void => {
    setShowDialog(false);
  };

  const handleSubmit = async (): Promise<void> => {
    // 유효성 검사
    if (!selectedEmployeeId) {
      toast({
        title: '입력 오류',
        description: '직원을 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!days || days === '0') {
      toast({
        title: '입력 오류',
        description: '조정 일수를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: '입력 오류',
        description: '사유를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const daysNumber = parseFloat(days);
    if (isNaN(daysNumber)) {
      toast({
        title: '입력 오류',
        description: '올바른 일수를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);

      // 이력 추가
      await leaveHistoryService.create(
        selectedEmployeeId,
        year,
        'adjust',
        daysNumber,
        reason.trim(),
        null
      );

      // 잔액 재계산
      const employee = employees.find((e) => e.id === selectedEmployeeId);
      if (employee) {
        await leaveBalanceService.getSummary(selectedEmployeeId, year, employee);
      }

      toast({
        title: '조정 완료',
        description: '연차가 조정되었습니다.',
      });

      // Dialog 닫기
      setShowDialog(false);

      // 데이터 새로고침
      await loadData();
    } catch (error) {
      console.error('Failed to adjust leave:', error);
      toast({
        title: '조정 실패',
        description: '연차 조정에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDaysChange = (value: string): void => {
    // 숫자와 +/- 부호만 허용
    if (value === '' || value === '-' || value === '+' || /^[+-]?\d*\.?\d*$/.test(value)) {
      setDays(value);
    }
  };

  // 날짜 포맷팅 (YYYY-MM-DD HH:mm)
  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // 테이블 컬럼 정의
  const columns: ColumnDef<AdjustmentHistoryRow>[] = [
    {
      accessorKey: 'occurredAt',
      header: '조정일시',
      cell: ({ row }) => formatDateTime(row.original.occurredAt),
    },
    {
      accessorKey: 'employeeName',
      header: '직원명',
      cell: ({ row }) => (
        <span>
          {row.original.employeeName} ({row.original.employeeNumber})
        </span>
      ),
    },
    {
      accessorKey: 'year',
      header: '연도',
      cell: ({ row }) => `${row.original.year}년`,
    },
    {
      accessorKey: 'days',
      header: '조정일수',
      cell: ({ row }) => {
        const days = row.original.days;
        return (
          <span
            className={days > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}
          >
            {days > 0 ? '+' : ''}
            {days}일
          </span>
        );
      },
    },
    {
      accessorKey: 'reason',
      header: '사유',
      cell: ({ row }) => (
        <span className="max-w-[300px] truncate block">{row.original.reason}</span>
      ),
    },
  ];

  if (isLoadingData) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 상단 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleOpenDialog}>+ 연차 조정</Button>
      </div>

      {/* 조정 이력 테이블 */}
      <DataTable
        columns={columns}
        data={adjustmentHistory}
        searchPlaceholder="직원명 또는 사유 검색"
        emptyMessage="조정 이력이 없습니다."
      />

      {/* 조정 Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>연차 조정</DialogTitle>
            <DialogDescription>직원의 연차를 조정합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 직원 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                직원 <span className="text-red-500">*</span>
              </label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="직원을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 연도 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                연도 <span className="text-red-500">*</span>
              </label>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 조정 일수 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                조정 일수 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="예: +5 또는 -3"
                value={days}
                onChange={(e) => handleDaysChange(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                양수(+)는 연차 추가, 음수(-)는 연차 차감입니다.
              </p>
            </div>

            {/* 사유 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                사유 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="조정 사유를 입력하세요"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isLoading}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? '처리 중...' : '조정하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
