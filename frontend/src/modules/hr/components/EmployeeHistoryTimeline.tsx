import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import type { EmployeeHistory, HistoryCategory } from '../types/employeeHistory';
import { employeeHistoryService } from '../services/employeeHistoryService';
import { ArrowRight } from 'lucide-react';

interface EmployeeHistoryTimelineProps {
  employeeId: string;
  category: HistoryCategory;
}

export function EmployeeHistoryTimeline({
  employeeId,
  category,
}: EmployeeHistoryTimelineProps): JSX.Element {
  const [history, setHistory] = useState<EmployeeHistory[]>([]);
  const [displayCount, setDisplayCount] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const data = await employeeHistoryService.getByEmployeeIdAndCategory(
          employeeId,
          category
        );
        setHistory(data);
        setDisplayCount(10); // 초기화
      } catch (error) {
        console.error('Failed to load employee history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [employeeId, category]);

  // 무한 스크롤 이벤트 리스너
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // 스크롤이 하단 근처(50px 이내)에 도달하면 더 로드
      if (scrollHeight - scrollTop - clientHeight < 50) {
        if (displayCount < history.length) {
          setDisplayCount(prev => Math.min(prev + 10, history.length));
        }
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [displayCount, history.length]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-32 bg-gray-200 animate-pulse rounded"></div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="w-0.5 h-20 bg-gray-200 animate-pulse"></div>
              </div>
              <div className="flex-1 pb-8">
                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded mb-2"></div>
                <Card>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">수정 이력</h3>
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">수정 이력이 없습니다.</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">수정 이력</h3>

      <div
        ref={scrollContainerRef}
        className="relative max-h-[600px] overflow-y-auto"
      >
        {history.slice(0, displayCount).map((item, index) => (
          <div key={item.id} className="flex gap-4">
            {/* Timeline 라인 */}
            <div className="flex flex-col items-center pt-1">
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow"></div>
              {index < Math.min(displayCount, history.length) - 1 && (
                <div className="w-0.5 flex-1 bg-gray-200 min-h-[80px]"></div>
              )}
            </div>

            {/* 이력 내용 */}
            <div className="flex-1 pb-8">
              {/* 날짜 및 수정자 */}
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="text-gray-900 font-medium">{item.modifiedBy}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">{formatDateTime(item.modifiedAt)}</span>
              </div>

              {/* 변경 내용 카드 */}
              <Card className="border border-gray-200 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-2">
                    {item.changes.map((change, changeIndex) => (
                      <div
                        key={changeIndex}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-gray-600 font-medium min-w-[80px]">
                          {change.fieldName}
                        </span>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-gray-500 line-through">
                            {change.displayOldValue}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-blue-600 font-medium">
                            {change.displayNewValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
