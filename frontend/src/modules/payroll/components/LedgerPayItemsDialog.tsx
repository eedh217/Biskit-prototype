import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { payrollLedgerService } from '../services/payrollLedgerService';
import { CompanyPayItem, CompanyDeductionItem, PayrollLedger } from '../types/payroll';

interface LedgerPayItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledger: PayrollLedger;
  payItems: CompanyPayItem[];
  deductionItems: CompanyDeductionItem[];
  onSaved: (updated: PayrollLedger) => void;
}

export function LedgerPayItemsDialog({
  open,
  onOpenChange,
  ledger,
  payItems,
  deductionItems,
  onSaved,
}: LedgerPayItemsDialogProps): JSX.Element {
  const activePayItems = useMemo(() => payItems.filter((i) => !i.isDeprecated), [payItems]);
  const deprecatedPayItems = useMemo(() => payItems.filter((i) => i.isDeprecated), [payItems]);
  const allPayIds = useMemo(() => activePayItems.map((i) => i.id), [activePayItems]);
  const allDeductionIds = useMemo(() => deductionItems.map((i) => i.id), [deductionItems]);

  const [activePayIds, setActivePayIds] = useState<Set<string>>(
    () => new Set(ledger.activePayItemIds ?? allPayIds)
  );
  const [activeDeductionIds, setActiveDeductionIds] = useState<Set<string>>(
    () => new Set(ledger.activeDeductionItemIds ?? allDeductionIds)
  );

  useEffect(() => {
    if (open) {
      setActivePayIds(new Set(ledger.activePayItemIds ?? allPayIds));
      setActiveDeductionIds(new Set(ledger.activeDeductionItemIds ?? allDeductionIds));
    }
  }, [open]);

  const sortedPayItems = useMemo(
    () => [...activePayItems].sort((a, b) => {
      if (a.taxItemCategory === b.taxItemCategory) return 0;
      return a.taxItemCategory === 'taxable' ? -1 : 1;
    }),
    [activePayItems]
  );

  const handleTogglePay = (id: string, checked: boolean): void => {
    setActivePayIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleDeduction = (id: string, checked: boolean): void => {
    setActiveDeductionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSave = (): void => {
    const activePayItemIds = allPayIds.filter((id) => activePayIds.has(id));
    const activeDeductionItemIds = allDeductionIds.filter((id) => activeDeductionIds.has(id));
    payrollLedgerService.updateLedger(ledger.id, { activePayItemIds, activeDeductionItemIds });
    onSaved({ ...ledger, activePayItemIds, activeDeductionItemIds });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>급여항목 관리</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto py-1">
          {/* 지급항목 */}
          <div>
            <p className="text-sm font-medium text-blue-600 mb-2">지급항목</p>
            {sortedPayItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">등록된 지급항목이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {sortedPayItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={activePayIds.has(item.id)}
                      onChange={(e) => handleTogglePay(item.id, e.target.checked)}
                    />
                    <span className="text-sm flex-1">{item.name}</span>
                    <Badge variant={item.taxItemCategory === 'taxable' ? 'default' : 'secondary'} className="text-xs">
                      {item.taxItemCategory === 'taxable' ? '과세' : '비과세'}
                    </Badge>
                  </label>
                ))}
                {deprecatedPayItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md bg-red-50/60"
                  >
                    <Checkbox checked={false} onChange={() => {}} disabled />
                    <span className="text-sm text-gray-400">{item.name}</span>
                    <div className="flex items-center gap-1 text-xs text-red-500 flex-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>사용중단</span>
                    </div>
                    <Badge variant={item.taxItemCategory === 'taxable' ? 'default' : 'secondary'} className="text-xs">
                      {item.taxItemCategory === 'taxable' ? '과세' : '비과세'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t" />

          {/* 공제항목 */}
          <div>
            <p className="text-sm font-medium text-red-600 mb-2">공제항목</p>
            {deductionItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">등록된 공제항목이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {deductionItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={activeDeductionIds.has(item.id)}
                      onChange={(e) => handleToggleDeduction(item.id, e.target.checked)}
                    />
                    <span className="text-sm flex-1">{item.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button variant="default" onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
