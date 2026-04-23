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
import { CompanyPayItem } from '../types/payroll';

interface CompanyPayItemComboboxProps {
  value?: string; // company pay item ID
  onChange: (itemId: string) => void;
  items: CompanyPayItem[];
  error?: boolean;
}

export function CompanyPayItemCombobox({
  value,
  onChange,
  items,
  error = false,
}: CompanyPayItemComboboxProps): JSX.Element {
  const [open, setOpen] = useState(false);

  const taxableItems = items.filter((i) => i.taxItemCategory === 'taxable');
  const nonTaxableItems = items.filter((i) => i.taxItemCategory === 'non-taxable');
  const selectedItem = items.find((i) => i.id === value);

  const getNonTaxableCode = (taxItemId: string): string => {
    // "non-taxable-2026-P01" → "P01"
    const parts = taxItemId.split('-');
    return parts.slice(3).join('-');
  };

  const getDisplayLabel = (item: CompanyPayItem): string => {
    if (item.taxItemCategory === 'non-taxable') {
      const code = getNonTaxableCode(item.taxItemId);
      return code ? `${code} - ${item.name}` : item.name;
    }
    return item.name;
  };

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
          className={cn('w-full h-10 justify-between', error && 'border-red-500')}
        >
          <span className={cn(!selectedItem && 'text-muted-foreground')}>
            {selectedItem ? getDisplayLabel(selectedItem) : '급여항목 선택'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="급여항목 검색..." />
          <CommandList>
            <CommandEmpty>급여항목을 찾을 수 없습니다.</CommandEmpty>
            {taxableItems.length > 0 && (
              <CommandGroup heading="과세">
                {taxableItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.name}
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
            )}
            {nonTaxableItems.length > 0 && (
              <CommandGroup heading="비과세">
                {nonTaxableItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${getNonTaxableCode(item.taxItemId)} ${item.name}`}
                    onSelect={() => handleSelect(item.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === item.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 min-w-[36px]">
                        {getNonTaxableCode(item.taxItemId)}
                      </span>
                      <span>{item.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
