import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/shared/hooks/use-toast';
import { leaveRequestService } from '../services/leaveRequestService';
import { leaveTypeService } from '../services/leaveTypeService';
import { employeeService } from '../services/employeeService';
import type { LeaveRequest } from '../types/leave';
import { formatDate } from '../types/employee';

export function LeaveApproval(): JSX.Element {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeMap, setEmployeeMap] = useState<Map<string, string>>(new Map());
  const [leaveTypeMap, setLeaveTypeMap] = useState<Map<string, string>>(new Map());

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [showBulkApprovePopover, setShowBulkApprovePopover] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // 대기중인 신청만
      const pendingRequests = await leaveRequestService.getPending();
      setRequests(pendingRequests);

      // 직원 맵
      const emps = await employeeService.getAll({ limit: 9999 });
      const empMap = new Map(emps.data.map((e) => [e.id, e.name]));
      setEmployeeMap(empMap);

      // 휴가 유형 맵
      const types = await leaveTypeService.getAll();
      const typeMap = new Map(types.map((t) => [t.id, t.name]));
      setLeaveTypeMap(typeMap);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (requestId: string): Promise<void> => {
    if (!confirm('휴가 신청을 승인하시겠습니까?')) return;

    try {
      await leaveRequestService.approve(requestId, {
        approvedBy: 'admin', // TODO: 실제 로그인 사용자 ID
      });

      toast({
        title: '승인 완료',
        description: '휴가 신청이 승인되었습니다.',
      });

      loadData();
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({
        title: '승인 실패',
        description: '휴가 승인에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleRejectClick = (requestId: string): void => {
    setSelectedRequestId(requestId);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async (): Promise<void> => {
    if (!selectedRequestId) return;
    if (!rejectionReason.trim()) {
      toast({
        title: '입력 오류',
        description: '반려 사유를 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await leaveRequestService.reject(selectedRequestId, {
        rejectionReason,
        rejectedBy: 'admin', // TODO: 실제 로그인 사용자 ID
      });

      toast({
        title: '반려 완료',
        description: '휴가 신청이 반려되었습니다.',
      });

      setShowRejectDialog(false);
      loadData();
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast({
        title: '반려 실패',
        description: '휴가 반려에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkApproveAll = async (): Promise<void> => {
    setShowBulkApprovePopover(false);

    try {
      const totalCount = requests.length;

      // 모든 신청 승인
      await Promise.all(
        requests.map((req) =>
          leaveRequestService.approve(req.id, { approvedBy: 'admin' })
        )
      );

      toast({
        title: '승인 완료',
        description: `총 ${totalCount}개의 휴가 승인을 완료했습니다.`,
      });

      setSelectedRequests(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to bulk approve:', error);
      toast({
        title: '승인 실패',
        description: '일괄 승인에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkApproveSelected = async (): Promise<void> => {
    if (selectedRequests.size === 0) {
      alert('선택된 신청내역이 없습니다. 목록 내 좌측 신청내역을 선택해주세요.');
      return;
    }

    setShowBulkApprovePopover(false);

    try {
      const selectedCount = selectedRequests.size;
      const selectedIds = Array.from(selectedRequests);

      // 선택된 신청만 승인
      await Promise.all(
        selectedIds.map((id) =>
          leaveRequestService.approve(id, { approvedBy: 'admin' })
        )
      );

      toast({
        title: '승인 완료',
        description: `총 ${selectedCount}개의 휴가 승인을 완료했습니다.`,
      });

      setSelectedRequests(new Set());
      loadData();
    } catch (error) {
      console.error('Failed to bulk approve selected:', error);
      toast({
        title: '승인 실패',
        description: '일괄 승인에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckboxChange = (requestId: string, checked: boolean): void => {
    const newSelected = new Set(selectedRequests);
    if (checked) {
      newSelected.add(requestId);
    } else {
      newSelected.delete(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedRequests(new Set(requests.map((req) => req.id)));
    } else {
      setSelectedRequests(new Set());
    }
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center">
        <p className="text-gray-500">대기중인 휴가 신청이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">대기중인 휴가 신청</h3>
          <Badge variant="warning">{requests.length}건</Badge>
        </div>

        {requests.length > 0 && (
          <Popover open={showBulkApprovePopover} onOpenChange={setShowBulkApprovePopover}>
            <PopoverTrigger asChild>
              <Button variant="default">일괄승인</Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1" align="end">
              <button
                onClick={handleBulkApproveAll}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                전체 신청내역({requests.length})
              </button>
              <button
                onClick={handleBulkApproveSelected}
                className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                선택 신청내역({selectedRequests.size})
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedRequests.size === requests.length && requests.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead>신청일</TableHead>
              <TableHead>신청자</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>기간</TableHead>
              <TableHead>일수</TableHead>
              <TableHead>사유</TableHead>
              <TableHead>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedRequests.has(request.id)}
                    onChange={(e) => handleCheckboxChange(request.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  {new Date(request.requestedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-medium">
                  {employeeMap.get(request.employeeId) || '-'}
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
                <TableCell className="max-w-[200px]">
                  <div className="truncate" title={request.reason}>
                    {request.reason}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(request.id)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectClick(request.id)}
                    >
                      반려
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 반려 사유 입력 다이얼로그 */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>휴가 신청 반려</DialogTitle>
          </DialogHeader>

          <div>
            <Label htmlFor="rejectionReason">반려 사유 *</Label>
            <Textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="반려 사유를 입력하세요"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              취소
            </Button>
            <Button
              variant="default"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim()}
            >
              반려
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
