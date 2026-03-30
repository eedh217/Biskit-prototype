import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { toast } from '@/shared/hooks/use-toast';
import type { Employee } from '../types/employee';
import type { LeaveRequest, LeaveBalanceSummary, LeaveHistory } from '../types/leave';
import { leaveBalanceService } from '../services/leaveBalanceService';
import { leaveRequestService } from '../services/leaveRequestService';
import { leaveHistoryService } from '../services/leaveHistoryService';
import { leaveTypeService } from '../services/leaveTypeService';
import { CreateLeaveRequestDialog } from './CreateLeaveRequestDialog';
import { formatDate } from '../types/employee';

interface LeaveTabProps {
  employee: Employee;
  showHistory?: boolean;
}

export function LeaveTab({ employee, showHistory = false }: LeaveTabProps): JSX.Element {
  const [balance, setBalance] = useState<LeaveBalanceSummary | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [history, setHistory] = useState<LeaveHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState('');
  const [leaveTypeMap, setLeaveTypeMap] = useState<Map<string, string>>(new Map());
  const [leaveRequestMap, setLeaveRequestMap] = useState<Map<string, LeaveRequest>>(
    new Map()
  );

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, [employee.id]);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // 휴가 유형 맵 로드
      const types = await leaveTypeService.getAll();
      const typeMap = new Map(types.map((t) => [t.id, t.name]));
      setLeaveTypeMap(typeMap);

      // 연차 잔액
      const balanceSummary = await leaveBalanceService.getSummary(
        employee.id,
        currentYear,
        employee
      );
      setBalance(balanceSummary);

      // 신청 내역
      const requestList = await leaveRequestService.getByEmployee(employee.id);
      setRequests(requestList);

      // 신청 내역을 Map으로 저장 (이력에서 사용)
      const requestMap = new Map(requestList.map((r) => [r.id, r]));
      setLeaveRequestMap(requestMap);

      console.log('LeaveRequestMap loaded:', requestMap.size, 'requests');

      // 이력
      const historyList = await leaveHistoryService.getByEmployee(
        employee.id,
        currentYear
      );
      setHistory(historyList);

      console.log('History loaded:', historyList.length, 'items');
      historyList.forEach(h => {
        if (h.type === 'use') {
          console.log('Use history:', h.id, 'requestId:', h.leaveRequestId, 'reason:', h.reason);
          if (h.leaveRequestId) {
            const req = requestMap.get(h.leaveRequestId);
            console.log('  -> Found request:', req?.id, 'request reason:', req?.reason);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load leave data:', error);
      toast({
        title: '로딩 실패',
        description: '연차 정보를 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string): Promise<void> => {
    if (!confirm('휴가 신청을 취소하시겠습니까?')) return;

    try {
      await leaveRequestService.cancel(requestId);
      toast({
        title: '취소 완료',
        description: '휴가 신청이 취소되었습니다.',
      });
      loadData();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('휴가 신청 취소에 실패했습니다.');
      }
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

  const getHistoryTypeName = (type: string): string => {
    switch (type) {
      case 'grant':
        return '발생';
      case 'use':
        return '사용';
      case 'cancel':
        return '취소';
      case 'adjust':
        return '조정';
      default:
        return type;
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

  if (isLoading) {
    return <div className="p-6">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 연차 현황 */}
      {balance && (
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{currentYear}년 연차 현황</h3>
            <Button onClick={() => setShowCreateDialog(true)}>+ 연차 신청</Button>
          </div>

          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">총 발생</div>
              <div>
                <span className="text-3xl font-bold">{balance.totalDays}</span>
                <span className="text-sm text-gray-500 ml-1">일</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">사용</div>
              <div>
                <span className="text-3xl font-bold text-gray-600">{balance.usedDays}</span>
                <span className="text-sm text-gray-500 ml-1">일</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">대기중</div>
              <div>
                <span className="text-3xl font-bold text-yellow-600">{balance.pendingDays}</span>
                <span className="text-sm text-gray-500 ml-1">일</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">잔여</div>
              <div>
                <span className="text-3xl font-bold text-blue-600">
                  {balance.remainingDays - balance.pendingDays}
                </span>
                <span className="text-sm text-gray-500 ml-1">일</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 신청 내역 */}
      <div className="rounded-lg border bg-white p-6">
        <h3 className="text-lg font-semibold mb-4">신청 내역</h3>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">신청 내역이 없습니다.</div>
        ) : (
          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
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
                      {formatDate(request.startDate)} ~{' '}
                      {formatDate(request.endDate)}
                    </TableCell>
                    <TableCell>{request.workingDays}일</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {request.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                        >
                          신청 취소
                        </Button>
                      )}
                      {request.status === 'rejected' && request.rejectionReason && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedRejectionReason(request.rejectionReason || '');
                            setShowRejectionDialog(true);
                          }}
                        >
                          사유 보기
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 연차 이력 */}
      {showHistory && (
        <div className="rounded-lg border bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">연차이력</h3>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">연차 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="relative">
            {history.map((item, index) => (
              <div key={item.id} className="flex gap-4">
                {/* Timeline 라인 */}
                <div className="flex flex-col items-center pt-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                  {index < history.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 min-h-[80px]"></div>
                  )}
                </div>

                {/* 이력 내용 */}
                <div className="flex-1 pb-8">
                  {/* 구분 및 발생시간 */}
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-900 font-medium">
                      {getHistoryTypeName(item.type)}
                    </span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{formatDateTime(item.occurredAt)}</span>
                  </div>

                  {/* 변경 내용 카드 */}
                  <Card className="border border-gray-200 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 font-medium min-w-[80px]">
                            일수
                          </span>
                          <span
                            className={
                              item.days > 0
                                ? 'text-green-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {item.days > 0 ? '+' : ''}
                            {item.days}일
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-gray-600 font-medium min-w-[80px] pt-0.5">
                            사유
                          </span>
                          <span className="text-gray-900 flex-1">
                            {(() => {
                              // 사용(use) 타입이고 leaveRequestId가 있으면 신청서의 사유 표시
                              if (item.type === 'use' && item.leaveRequestId) {
                                const request = leaveRequestMap.get(item.leaveRequestId);
                                if (request && request.reason) {
                                  return request.reason;
                                }
                                // request를 찾지 못한 경우 기본 사유 표시
                                console.warn('Request not found for leaveRequestId:', item.leaveRequestId);
                              }
                              // 그 외의 경우 이력의 기본 사유 표시
                              return item.reason;
                            })()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* 연차 신청 다이얼로그 */}
      <CreateLeaveRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        employee={employee}
        onSuccess={loadData}
      />

      {/* 반려 사유 다이얼로그 */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>반려 사유</DialogTitle>
            <DialogDescription>
              휴가 신청이 반려된 사유입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm whitespace-pre-wrap">{selectedRejectionReason}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
