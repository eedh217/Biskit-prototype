import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { payrollLedgerService } from '../services/payrollLedgerService';

interface PaySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function PaySettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: PaySettingsDialogProps): JSX.Element {
  const settings = payrollLedgerService.getSettings();
  const [payDay, setPayDay] = useState<string>(
    settings.defaultPayDay != null ? settings.defaultPayDay.toString() : ''
  );
  const [payMonthType, setPayMonthType] = useState<'current' | 'next'>(
    settings.payMonthType ?? 'current'
  );
  const [error, setError] = useState('');

  const handleSave = (): void => {
    const num = parseInt(payDay, 10);
    if (payDay !== '' && (isNaN(num) || num < 1 || num > 31)) {
      setError('1~31 사이의 숫자를 입력하세요.');
      return;
    }
    payrollLedgerService.saveSettings({
      defaultPayDay: payDay === '' ? null : num,
      payMonthType,
    });
    onSaved();
    onOpenChange(false);
  };

  const handlePayDayChange = (value: string): void => {
    setError('');
    setPayDay(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>급여 지급일 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>지급 월</Label>
            <RadioGroup
              value={payMonthType}
              onValueChange={(v) => setPayMonthType(v as 'current' | 'next')}
              className="flex items-center gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="current" id="current" />
                <label htmlFor="current" className="text-sm cursor-pointer">
                  당월
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="next" id="next" />
                <label htmlFor="next" className="text-sm cursor-pointer">
                  익월
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>기본 지급일</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="예: 25"
                value={payDay}
                onChange={(e) => handlePayDayChange(e.target.value)}
                className="w-[120px]"
              />
              <span className="text-sm text-gray-500">일</span>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <p className="text-xs text-gray-400">
              급여대장 생성 시 지급일에 자동으로 입력됩니다.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button variant="default" onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
