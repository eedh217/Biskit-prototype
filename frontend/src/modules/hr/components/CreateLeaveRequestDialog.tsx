import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/shared/hooks/use-toast';
import type { Employee } from '../types/employee';
import type { LeaveType, LeaveBalanceSummary } from '../types/leave';
import { leaveTypeService } from '../services/leaveTypeService';
import { leaveRequestService } from '../services/leaveRequestService';
import { leaveBalanceService } from '../services/leaveBalanceService';
import { calculateWorkingDays } from '../utils/dateUtils';
import { holidayService } from '../services/holidayService';

interface CreateLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess: () => void;
}

export function CreateLeaveRequestDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: CreateLeaveRequestDialogProps): JSX.Element {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balance, setBalance] = useState<LeaveBalanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [estimatedDays, setEstimatedDays] = useState<number>(0);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async (): Promise<void> => {
    try {
      const types = await leaveTypeService.getAll();
      setLeaveTypes(types);

      const currentYear = new Date().getFullYear();
      const balanceSummary = await leaveBalanceService.getSummary(
        employee.id,
        currentYear,
        employee
      );
      setBalance(balanceSummary);
    } catch (error) {
      console.error('Failed to load leave data:', error);
    }
  };

  // 현재 선택된 휴가 유형
  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
  const isHalfDay = selectedType?.deductionDays === 0.5;

  // 반차 선택 시 종료일 자동 설정
  useEffect(() => {
    if (isHalfDay && startDate) {
      setEndDate(startDate);
    }
  }, [isHalfDay, startDate]);

  // 예상 차감 일수 계산
  useEffect(() => {
    if (startDate && endDate && leaveTypeId) {
      calculateEstimatedDays();
    }
  }, [startDate, endDate, leaveTypeId]);

  const calculateEstimatedDays = async (): Promise<void> => {
    try {
      const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
      if (!selectedType) return;

      // 반차는 무조건 0.5일
      if (selectedType.deductionDays === 0.5) {
        setEstimatedDays(0.5);
        return;
      }

      // 연차는 평일 계산
      const holidays = await holidayService.getAll();
      const days = calculateWorkingDays(startDate, endDate, holidays);
      setEstimatedDays(days);
    } catch (error) {
      console.error('Failed to calculate days:', error);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // 잔여 연차 확인
    if (balance && estimatedDays > balance.remainingDays - balance.pendingDays) {
      alert('잔여 연차가 부족합니다.');
      return;
    }

    setIsLoading(true);
    try {
      await leaveRequestService.create({
        employeeId: employee.id,
        leaveTypeId,
        startDate,
        endDate,
        reason,
      });

      toast({
        title: '신청 완료',
        description: '휴가 신청이 완료되었습니다. (대기중)',
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to create leave request:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('휴가 신청에 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (): void => {
    setLeaveTypeId('');
    setStartDate('');
    setEndDate('');
    setReason('');
    setEstimatedDays(0);
    onOpenChange(false);
  };

  // YYYYMMDD → YYYY-MM-DD 변환 (date input용)
  const formatDateForInput = (yyyymmdd: string): string => {
    if (!yyyymmdd || yyyymmdd.length !== 8) return '';
    return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  };

  // 필수 입력 항목 체크
  const isFormValid = !!(leaveTypeId && startDate && endDate && reason.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // 다이얼로그 닫힐 때 입력값 초기화
          setLeaveTypeId('');
          setStartDate('');
          setEndDate('');
          setReason('');
          setEstimatedDays(0);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-[500px]">
        <DialogHeader>
          <DialogTitle>연차/휴가 신청</DialogTitle>
          <DialogDescription>
            {employee.name}님의 휴가를 신청합니다.
          </DialogDescription>
        </DialogHeader>

        {balance && (
          <div className="rounded-lg border bg-gray-50 p-4">
            <div className="grid grid-cols-4 gap-4 text-center text-sm">
              <div>
                <div className="text-gray-500">총 발생</div>
                <div className="text-lg font-semibold">{balance.totalDays}일</div>
              </div>
              <div>
                <div className="text-gray-500">사용</div>
                <div className="text-lg font-semibold">{balance.usedDays}일</div>
              </div>
              <div>
                <div className="text-gray-500">대기중</div>
                <div className="text-lg font-semibold text-yellow-600">
                  {balance.pendingDays}일
                </div>
              </div>
              <div>
                <div className="text-gray-500">잔여</div>
                <div className="text-lg font-semibold text-blue-600">
                  {balance.remainingDays - balance.pendingDays}일
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="leaveType">휴가 유형 *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">시작일 *</Label>
              <Input
                id="startDate"
                type="date"
                value={formatDateForInput(startDate)}
                onChange={(e) => setStartDate(e.target.value.replace(/-/g, ''))}
                max={formatDateForInput(endDate)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">종료일 *</Label>
              <Input
                id="endDate"
                type="date"
                value={formatDateForInput(endDate)}
                onChange={(e) => setEndDate(e.target.value.replace(/-/g, ''))}
                min={formatDateForInput(startDate)}
                disabled={isHalfDay}
              />
            </div>
          </div>

          {estimatedDays > 0 && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <span className="font-medium">예상 차감 일수:</span>{' '}
              <span className="text-blue-600 font-semibold">{estimatedDays}일</span>
              {isHalfDay && (
                <span className="text-gray-500 ml-2">(반차는 0.5일 고정)</span>
              )}
              {!isHalfDay && (
                <span className="text-gray-500 ml-2">(평일 기준, 공휴일 제외)</span>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="reason">사유 *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="휴가 사유를 입력하세요"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            취소
          </Button>
          <Button variant="default" onClick={handleSubmit} disabled={!isFormValid || isLoading}>
            {isLoading ? '신청 중...' : '신청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
