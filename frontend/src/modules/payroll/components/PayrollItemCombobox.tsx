import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import { PAYROLL_ITEMS_2026 } from '../constants/payrollItems2026';

interface PayrollItemComboboxProps {
  value?: string; // 선택된 급여항목 ID
  onChange: (itemId: string) => void;
  error?: boolean; // 에러 상태 (빨간 테두리)
}

export function PayrollItemCombobox({
  value,
  onChange,
  error = false,
}: PayrollItemComboboxProps): JSX.Element {
  const [open, setOpen] = useState(false);

  // 전체 항목 리스트
  const allItems = [
    ...PAYROLL_ITEMS_2026.taxableItems.map(item => ({ ...item, category: 'taxable' as const })),
    ...PAYROLL_ITEMS_2026.nonTaxableItems.map(item => ({ ...item, category: 'non-taxable' as const })),
  ];

  // 선택된 항목 찾기
  const selectedItem = allItems.find((item) => item.id === value);

  const handleSelect = (itemId: string): void => {
    onChange(itemId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between',
            error && 'border-red-500'
          )}
        >
          <span className={cn(!selectedItem && 'text-muted-foreground')}>
            {selectedItem
              ? selectedItem.category === 'non-taxable'
                ? `${(selectedItem as any).code} - ${selectedItem.name}`
                : selectedItem.name
              : '급여항목 선택'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="급여항목 검색..." />
          <CommandList>
            <CommandEmpty>급여항목을 찾을 수 없습니다.</CommandEmpty>

            {/* 과세 항목 */}
            <CommandGroup heading="과세">
              {PAYROLL_ITEMS_2026.taxableItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name}`}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* 비과세 항목 */}
            <CommandGroup heading="비과세">
              {PAYROLL_ITEMS_2026.nonTaxableItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.code} ${item.name}`}
                  onSelect={() => handleSelect(item.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 min-w-[40px]">{item.code}</span>
                    <span>{item.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
