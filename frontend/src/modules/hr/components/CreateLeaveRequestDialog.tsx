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
import { leaveSettingsService } from '../services/leaveSettingsService';
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
  const [hourlyLeaveEnabled, setHourlyLeaveEnabled] = useState(true);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [usageUnit, setUsageUnit] = useState<string>(''); // 선택한 사용 단위
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

      // 시간 단위 사용 설정 로드
      const settings = await leaveSettingsService.get();
      setHourlyLeaveEnabled(settings.hourlyLeaveEnabled);
    } catch (error) {
      console.error('Failed to load leave data:', error);
    }
  };

  // 현재 선택된 휴가 유형
  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);

  // 사용 단위 옵션 생성
  const usageUnitOptions: Array<{ value: string; label: string }> = [];
  if (selectedType?.usageUnits) {
    // 일 단위가 포함되어 있으면 "일 단위 (기간 선택)" 추가
    if (selectedType.usageUnits.includes('day')) {
      usageUnitOptions.push({ value: 'day', label: '일 단위 (기간 선택)' });
    }
    // 반일 단위가 포함되어 있으면 오전/오후 반차 추가
    if (selectedType.usageUnits.includes('half-day')) {
      usageUnitOptions.push(
        { value: 'morning', label: '오전 반차' },
        { value: 'afternoon', label: '오후 반차' }
      );
    }
    // 시간 단위가 포함되어 있고, 시간 단위 사용이 활성화된 경우에만 1~8시간 추가
    if (selectedType.usageUnits.includes('hour') && hourlyLeaveEnabled) {
      for (let i = 1; i <= 8; i++) {
        usageUnitOptions.push({ value: `${i}hour`, label: `${i}시간` });
      }
    }
  }

  // 휴가 유형 변경 시 사용 단위 초기화
  useEffect(() => {
    if (leaveTypeId && selectedType) {
      // 일 단위만 가능한 경우 자동으로 'day' 선택
      if (selectedType.usageUnits?.length === 1 && selectedType.usageUnits[0] === 'day') {
        setUsageUnit('day');
      } else {
        setUsageUnit('');
      }
      setStartDate('');
      setEndDate('');
    }
  }, [leaveTypeId]);

  // 사용 단위가 반일/시간인 경우 종료일 자동 설정
  useEffect(() => {
    if (usageUnit && usageUnit !== 'day' && startDate) {
      setEndDate(startDate);
    }
  }, [usageUnit, startDate]);

  // 예상 차감 일수 계산
  useEffect(() => {
    if (startDate && endDate && leaveTypeId && usageUnit) {
      calculateEstimatedDays();
    }
  }, [startDate, endDate, leaveTypeId, usageUnit]);

  const calculateEstimatedDays = async (): Promise<void> => {
    try {
      const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
      if (!selectedType) return;

      // 오전/오후 반차는 0.5일
      if (usageUnit === 'morning' || usageUnit === 'afternoon') {
        setEstimatedDays(0.5);
        return;
      }

      // 시간 단위는 N/8일
      if (usageUnit.endsWith('hour')) {
        const hours = parseInt(usageUnit.replace('hour', ''));
        setEstimatedDays(hours / 8);
        return;
      }

      // 일 단위는 평일 계산
      if (usageUnit === 'day') {
        const holidays = await holidayService.getAll();
        const days = calculateWorkingDays(startDate, endDate, holidays);
        setEstimatedDays(days);
      }
    } catch (error) {
      console.error('Failed to calculate days:', error);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!leaveTypeId || !startDate || !endDate || !reason.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    // 선택한 휴가 유형 확인
    const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);
    if (!selectedType) {
      alert('휴가 유형을 찾을 수 없습니다.');
      return;
    }

    // 일수가 정해진 휴가인 경우 (days가 null이 아닌 경우)
    if (selectedType.days !== null) {
      try {
        // 해당 휴가 유형으로 신청/승인된 신청 조회 (대기중 + 승인됨)
        const allRequests = await leaveRequestService.getByEmployee(employee.id);
        const approvedOrPendingRequests = allRequests.filter(
          (req) => req.leaveTypeId === leaveTypeId && (req.status === 'approved' || req.status === 'pending')
        );

        // 이미 신청/승인된 일수 계산
        const usedDays = approvedOrPendingRequests.reduce((sum, req) => sum + req.workingDays, 0);

        // 신청하려는 일수 + 이미 신청/승인된 일수가 허용 일수를 초과하는지 확인
        if (usedDays + estimatedDays > selectedType.days) {
          alert(
            `${selectedType.name}는 최대 ${selectedType.days}일까지 사용 가능합니다.\n` +
            `이미 신청/승인: ${usedDays}일\n` +
            `신청 가능: ${selectedType.days - usedDays}일`
          );
          return;
        }
      } catch (error) {
        console.error('Failed to check used days:', error);
        alert('휴가 사용 일수 확인에 실패했습니다.');
        return;
      }
    }

    // 날짜 중복 확인 (시간 단위로 세밀하게 체크)
    try {
      const allRequests = await leaveRequestService.getByEmployee(employee.id);
      const activeRequests = allRequests.filter(
        (req) => req.status === 'pending' || req.status === 'approved'
      );

      // usageUnit을 시간으로 환산하는 함수
      const getHours = (unit: string | undefined, days: number): number => {
        if (!unit || unit === 'day') return days * 8; // 일 단위
        if (unit === 'morning' || unit === 'afternoon') return 4; // 반차
        if (unit.endsWith('hour')) return parseInt(unit.replace('hour', '')); // N시간
        return days * 8; // 기본값
      };

      // 반일/시간 단위: 같은 날짜만 체크
      if (usageUnit !== 'day') {
        const sameDateRequests = activeRequests.filter(
          (req) => req.startDate === startDate && req.endDate === startDate
        );

        let totalHours = 0;
        const usedUnits = new Set<string>();

        // 이미 사용 중인 시간 계산
        for (const req of sameDateRequests) {
          totalHours += getHours(req.usageUnit, req.workingDays);
          if (req.usageUnit && req.usageUnit !== 'day' && !req.usageUnit.endsWith('hour')) {
            usedUnits.add(req.usageUnit); // morning, afternoon 추가
          }
        }

        const requestHours = getHours(usageUnit, estimatedDays);

        // 1. 총 시간 초과 체크
        if (totalHours + requestHours > 8) {
          alert(
            `해당 날짜는 이미 ${totalHours}시간 사용 중입니다.\n` +
            `총 8시간까지만 신청 가능합니다.`
          );
          return;
        }

        // 2. 동일 단위 중복 체크 (오전반차, 오후반차만)
        if (usageUnit === 'morning' && usedUnits.has('morning')) {
          alert('해당 날짜에 이미 오전반차를 신청했거나 승인되었습니다.');
          return;
        }
        if (usageUnit === 'afternoon' && usedUnits.has('afternoon')) {
          alert('해당 날짜에 이미 오후반차를 신청했거나 승인되었습니다.');
          return;
        }
      } else {
        // 일 단위: 기존 로직 (날짜 범위 겹침 체크)
        for (const req of activeRequests) {
          const reqStart = req.startDate;
          const reqEnd = req.endDate;

          // 겹침 조건: newStart <= existingEnd && newEnd >= existingStart
          if (startDate <= reqEnd && endDate >= reqStart) {
            // YYYYMMDD → MM/DD 형식으로 변환
            const formatMMDD = (yyyymmdd: string): string => {
              return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
            };

            const conflictRange = req.startDate === req.endDate
              ? formatMMDD(req.startDate)
              : `${formatMMDD(req.startDate)}~${formatMMDD(req.endDate)}`;

            alert(`${conflictRange}는 이미 휴가를 신청했거나 승인된 날짜입니다.`);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Failed to check date conflict:', error);
      alert('날짜 중복 확인에 실패했습니다.');
      return;
    }

    // 연차 잔액 확인 (연차 잔액에 영향이 있는 휴가만)
    if (selectedType.affectsLeaveBalance && balance && estimatedDays > balance.remainingDays - balance.pendingDays) {
      alert('잔여 연차가 부족합니다.');
      return;
    }

    setIsLoading(true);
    try {
      await leaveRequestService.create({
        employeeId: employee.id,
        leaveTypeId,
        usageUnit,
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
    setUsageUnit('');
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
  const isFormValid = !!(leaveTypeId && usageUnit && startDate && endDate && reason.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // 다이얼로그 닫힐 때 입력값 초기화
          setLeaveTypeId('');
          setUsageUnit('');
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

          {/* 사용 단위 선택 (복수 단위 지원 시) */}
          {leaveTypeId && selectedType && usageUnitOptions.length > 1 && (
            <div>
              <Label htmlFor="usageUnit">사용 단위 *</Label>
              <Select value={usageUnit} onValueChange={setUsageUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {usageUnitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 날짜 입력 */}
          {usageUnit === 'day' ? (
            // 일 단위: 기간 선택
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
                />
              </div>
            </div>
          ) : usageUnit ? (
            // 반일/시간 단위: 하루만 선택
            <div>
              <Label htmlFor="singleDate">날짜 *</Label>
              <Input
                id="singleDate"
                type="date"
                value={formatDateForInput(startDate)}
                onChange={(e) => {
                  const date = e.target.value.replace(/-/g, '');
                  setStartDate(date);
                  setEndDate(date);
                }}
              />
            </div>
          ) : null}

          {estimatedDays > 0 && (
            <div className="rounded-md bg-blue-50 p-3 text-sm">
              <span className="font-medium">예상 차감 일수:</span>{' '}
              <span className="text-blue-600 font-semibold">{estimatedDays}일</span>
              {(usageUnit === 'morning' || usageUnit === 'afternoon') && (
                <span className="text-gray-500 ml-2">(반차는 0.5일)</span>
              )}
              {usageUnit?.endsWith('hour') && (
                <span className="text-gray-500 ml-2">
                  ({parseInt(usageUnit.replace('hour', ''))}시간 = {estimatedDays}일)
                </span>
              )}
              {usageUnit === 'day' && (
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
