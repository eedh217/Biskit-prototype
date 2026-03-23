import { Label } from '@/shared/components/ui/label';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/shared/components/ui/radio-group';

export interface RadioOption {
  value: string;
  label: string;
}

interface FormRadioGroupProps {
  label?: string;
  options: RadioOption[];
  value: string;
  onValueChange: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  required?: boolean;
  error?: string;
}

export function FormRadioGroup({
  label,
  options,
  value,
  onValueChange,
  orientation = 'horizontal',
  required = false,
  error,
}: FormRadioGroupProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        className={
          orientation === 'horizontal'
            ? 'flex flex-wrap gap-4'
            : 'flex flex-col space-y-2'
        }
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value} className="font-normal cursor-pointer">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
