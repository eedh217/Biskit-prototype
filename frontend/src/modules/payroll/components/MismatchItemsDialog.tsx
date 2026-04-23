import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { MismatchItem } from '../types/payroll';

interface MismatchItemsDialogProps {
  open: boolean;
  mismatches: MismatchItem[];
  year: number;
  onClose: () => void;
  onExclude: () => void;
  onAddItems: () => void;
}

export function MismatchItemsDialog({
  open,
  mismatches,
  year,
  onClose,
  onExclude,
  onAddItems,
}: MismatchItemsDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>미등록 급여항목 안내</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            일부 직원의 급여항목이 {year}년 급여항목 관리에 등록되어 있지 않습니다.
            <br />
            처리 방법을 선택해주세요.
          </p>
          <ul className="rounded-md border bg-gray-50 px-4 py-3 space-y-1">
            {mismatches.map((item) => (
              <li key={item.itemId} className="text-sm flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                <span>{item.itemName}</span>
                <span className="text-xs text-gray-400">
                  ({item.category === 'taxable' ? '과세' : '비과세'})
                </span>
                {item.cannotAdd && (
                  <span className="text-xs text-red-500">{year}년 세법 미지원</span>
                )}
              </li>
            ))}
          </ul>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onExclude}>
            제외하고 생성하기
          </Button>
          <Button
            variant="default"
            onClick={onAddItems}
            disabled={mismatches.some((m) => m.cannotAdd)}
            title={mismatches.some((m) => m.cannotAdd) ? `${year}년 세법에 없는 항목이 포함되어 있어 추가할 수 없습니다.` : undefined}
          >
            급여항목 추가하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
