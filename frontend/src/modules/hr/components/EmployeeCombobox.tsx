import { useState, useEffect } from 'react';
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
import { Employee, getEmploymentStatus } from '../types/employee';
import { employeeService } from '../services/employeeService';

interface EmployeeComboboxProps {
  value?: string; // 선택된 직원 ID
  onChange: (employee: Employee | null) => void;
  excludeIds?: string[]; // 제외할 직원 ID 목록 (이미 선택된 직원)
  activeOnly?: boolean; // 재직자만 표시 (기본값: false)
}

export function EmployeeCombobox({
  value,
  onChange,
  excludeIds = [],
  activeOnly = false,
}: EmployeeComboboxProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // 직원 목록 불러오기
  useEffect(() => {
    const loadEmployees = async (): Promise<void> => {
      try {
        const response = await employeeService.getAll({ page: 1, limit: 1000 });
        let filtered = response.data;

        // 제외할 ID 필터링
        filtered = filtered.filter((emp) => !excludeIds.includes(emp.id));

        // 재직자만 표시
        if (activeOnly) {
          filtered = filtered.filter((emp) => getEmploymentStatus(emp.leaveDate) === '재직중');
        }

        setEmployees(filtered);
      } catch (error) {
        console.error('Failed to load employees:', error);
      }
    };

    loadEmployees();
  }, [excludeIds, activeOnly]);

  // value prop이 변경되면 선택된 직원 업데이트
  useEffect(() => {
    if (value) {
      const employee = employees.find((emp) => emp.id === value);
      setSelectedEmployee(employee || null);
    } else {
      setSelectedEmployee(null);
    }
  }, [value, employees]);

  const handleSelect = (employeeId: string): void => {
    const employee = employees.find((emp) => emp.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      onChange(employee);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between"
        >
          <span className={cn(!selectedEmployee && 'text-muted-foreground')}>
            {selectedEmployee
              ? `${selectedEmployee.name} (${selectedEmployee.employeeNumber})`
              : '선택'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="이름 또는 사번 검색..." />
          <CommandList>
            <CommandEmpty>직원을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {employees.map((employee) => (
                <CommandItem
                  key={employee.id}
                  value={`${employee.name} ${employee.employeeNumber}`}
                  onSelect={() => handleSelect(employee.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedEmployee?.id === employee.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{employee.name}</span>
                    <span className="text-xs text-gray-500">
                      {employee.employeeNumber}
                    </span>
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
