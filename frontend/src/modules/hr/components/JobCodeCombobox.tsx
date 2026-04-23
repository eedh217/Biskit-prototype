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
import { EMPLOYMENT_JOB_CODES } from '../types/insurance';

interface JobCodeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function JobCodeCombobox({ value, onChange, className }: JobCodeComboboxProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allCodes = EMPLOYMENT_JOB_CODES.flatMap((cat) => [...cat.codes]);
  const selectedLabel = allCodes.find((c) => c.value === value)?.label ?? '';

  const filteredCategories = search.trim()
    ? EMPLOYMENT_JOB_CODES.map((cat) => ({
        ...cat,
        codes: cat.codes.filter(
          (c) =>
            c.value.includes(search.trim()) ||
            c.label.toLowerCase().includes(search.trim().toLowerCase())
        ),
      })).filter((cat) => cat.codes.length > 0)
    : EMPLOYMENT_JOB_CODES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full h-10 justify-between font-normal', className)}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? selectedLabel : '선택'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="코드 번호 또는 직종명 검색..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
            {filteredCategories.map((cat) => (
              <CommandGroup key={cat.category} heading={cat.category}>
                {cat.codes.map((code) => (
                  <CommandItem
                    key={code.value}
                    value={code.value}
                    onSelect={() => {
                      onChange(code.value);
                      setSearch('');
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        value === code.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {code.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
