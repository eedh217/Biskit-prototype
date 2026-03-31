import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { toast } from '@/shared/hooks/use-toast';
import { leaveRequestService } from '../services/leaveRequestService';
import { leaveTypeService } from '../services/leaveTypeService';
import { leaveBalanceService } from '../services/leaveBalanceService';
import type { LeaveRequest } from '../types/leave';
import type { Employee } from '../types/employee';
import { formatDate } from '../types/employee';

interface EmployeeLeaveManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onSuccess?: () => void;
}

export function EmployeeLeaveManagementDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EmployeeLeaveManagementDialogProps): JSX.Element {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypeMap, setLeaveTypeMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && employee) {
      loadData();
    }
  }, [open, employee]);

  const loadData = async (): Promise<void> => {
    if (!employee) return;

    setIsLoading(true);
    try {
      // 휴가 유형 맵 로드
      const types = await leaveTypeService.getAll();
      const typeMap = new Map(types.map((t) => [t.id, t.name]));
      setLeaveTypeMap(typeMap);

      // 신청 내역 (승인/반려/승인취소된 것만)
      const allRequests = await leaveRequestService.getByEmployee(employee.id);
      const filteredRequests = allRequests.filter(
        (r) => r.status === 'approved' || r.status === 'rejected' || r.status === 'cancelled'
      );
      setRequests(filteredRequests);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      toast({
        title: '로딩 실패',
        description: '휴가 신청 내역을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelApproval = async (requestId: string): Promise<void> => {
    if (!employee) return;
    if (!confirm('승인을 취소하시겠습니까? 연차가 복원됩니다.')) return;

    setProcessingId(requestId);
    try {
      await leaveRequestService.cancelApproval(requestId);

      // 잔액 재계산
      const year = new Date().getFullYear();
      await leaveBalanceService.getSummary(employee.id, year, employee);

      toast({
        description: '승인 취소가 완료되었습니다.',
      });

      await loadData();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to cancel approval:', error);
      toast({
        title: '승인 취소 실패',
        description: error instanceof Error ? error.message : '승인 취소에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveRejected = async (requestId: string): Promise<void> => {
    if (!employee) return;
    if (!confirm('반려된 신청을 승인하시겠습니까? 연차가 차감됩니다.')) return;

    setProcessingId(requestId);
    try {
      await leaveRequestService.approveRejected(requestId, {
        approvedBy: 'admin', // TODO: 실제 사용자 ID로 변경
      });

      // 잔액 재계산
      const year = new Date().getFullYear();
      await leaveBalanceService.getSummary(employee.id, year, employee);

      toast({
        description: '승인이 완료되었습니다.',
      });

      await loadData();
      onSuccess?.();
    } catch (error) {
      console.error('Failed to approve:', error);
      toast({
        title: '승인 실패',
        description: error instanceof Error ? error.message : '승인에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string): JSX.Element => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">대기중</Badge>;
      case 'approved':
        return <Badge variant="success">승인</Badge>;
      case 'rejected':
        return <Badge variant="destructive">반려</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">승인취소</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {employee?.name}
          </DialogTitle>
          <DialogDescription>
            승인된 신청은 취소할 수 있고, 반려된 신청은 승인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">로딩 중...</div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            승인 또는 반려된 신청이 없습니다.
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>신청일</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>기간</TableHead>
                  <TableHead>일수</TableHead>
                  <TableHead>사유</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{leaveTypeMap.get(request.leaveTypeId)}</TableCell>
                    <TableCell>
                      {request.startDate === request.endDate
                        ? formatDate(request.startDate)
                        : `${formatDate(request.startDate)} ~ ${formatDate(request.endDate)}`}
                    </TableCell>
                    <TableCell>
                      {request.usageUnit === 'morning' && `오전반차(${request.workingDays}일)`}
                      {request.usageUnit === 'afternoon' && `오후반차(${request.workingDays}일)`}
                      {request.usageUnit?.endsWith('hour') && `${request.usageUnit.replace('hour', '')}시간(${request.workingDays}일)`}
                      {(!request.usageUnit || request.usageUnit === 'day') && `${request.workingDays}일`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelApproval(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? '처리 중...' : '승인 취소'}
                        </Button>
                      )}
                      {(request.status === 'rejected' || request.status === 'cancelled') && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproveRejected(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? '처리 중...' : '승인'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
