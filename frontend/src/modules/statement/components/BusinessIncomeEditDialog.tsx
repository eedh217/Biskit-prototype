import { useState, useEffect } from 'react';
import {
  useUpdateBusinessIncome,
  useDeleteBusinessIncome,
  useIndustryCodes,
} from '../hooks/useBusinessIncome';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  calculateTaxes,
  formatCurrency,
  isExceptionIndustry,
} from '../types/business-income.types';
import type { BusinessIncome } from '../types/business-income.types';
import { useToast } from '@/shared/hooks/use-toast';
import { FormRadioGroup } from '@/shared/components/common/FormRadioGroup';

interface BusinessIncomeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessIncome: BusinessIncome | null;
}

export function BusinessIncomeEditDialog({
  open,
  onOpenChange,
  businessIncome,
}: BusinessIncomeEditDialogProps): JSX.Element {
  const currentYear = new Date().getFullYear();
  const { data: industryCodes } = useIndustryCodes();
  const updateMutation = useUpdateBusinessIncome();
  const deleteMutation = useDeleteBusinessIncome();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    attributionYear: currentYear,
    attributionMonth: 1,
    name: '',
    iino: '',
    isForeign: false,
    industryCode: '',
    paymentSum: 0,
    taxRate: 3,
  });

  useEffect(() => {
    if (businessIncome) {
      setFormData({
        attributionYear: businessIncome.attributionYear,
        attributionMonth: businessIncome.attributionMonth,
        name: businessIncome.name,
        iino: businessIncome.iino,
        isForeign: businessIncome.isForeign,
        industryCode: businessIncome.industryCode,
        paymentSum: businessIncome.paymentSum,
        taxRate: businessIncome.taxRate,
      });
    }
  }, [businessIncome]);

  const taxes = calculateTaxes({
    paymentSum: formData.paymentSum,
    isForeign: formData.isForeign,
    industryCode: formData.industryCode,
    taxRate: formData.taxRate,
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();

    if (!businessIncome) return;

    // 귀속 기준 예외 규칙 확인
    const isException =
      isExceptionIndustry(formData.industryCode) &&
      formData.attributionYear !== businessIncome.paymentYear;

    if (isException) {
      const confirmed = window.confirm(
        `해당 데이터는 ${formData.attributionYear}년 12월 사업소득에 표시됩니다.`
      );
      if (!confirmed) {
        return;
      }
    }

    updateMutation.mutate(
      {
        id: businessIncome.id,
        dto: formData,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast({
            title: '사업소득 수정 완료',
            description: '사업소득이 성공적으로 수정되었습니다.',
          });
        },
        onError: (error) => {
          alert(error.message);
        },
      }
    );
  };

  const handleDelete = (): void => {
    if (!businessIncome) return;

    const confirmed = window.confirm(
      '사업소득을 삭제하시겠습니까? 삭제한 정보는 복구할 수 없습니다.'
    );

    if (confirmed) {
      deleteMutation.mutate(businessIncome.id, {
        onSuccess: () => {
          onOpenChange(false);
          toast({
            title: '사업소득 삭제 완료',
            description: '사업소득이 성공적으로 삭제되었습니다.',
          });
        },
        onError: (error) => {
          alert(error.message);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>사업소득 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  *귀속연도
                </label>
                <Select
                  value={formData.attributionYear === 0 ? '' : formData.attributionYear.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      attributionYear: Number(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i).map(
                      (yr) => (
                        <SelectItem key={yr} value={yr.toString()}>
                          {yr}년
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">*귀속월</label>
                <Select
                  value={formData.attributionMonth === 0 ? '' : formData.attributionMonth.toString()}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      attributionMonth: Number(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*성명(상호)</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                maxLength={50}
              />
            </div>

            <FormRadioGroup
              label="내외국인 구분"
              options={[
                { value: 'domestic', label: '내국인' },
                { value: 'foreign', label: '외국인' },
              ]}
              value={formData.isForeign ? 'foreign' : 'domestic'}
              onValueChange={(value) =>
                setFormData({ ...formData, isForeign: value === 'foreign' })
              }
              orientation="horizontal"
              required
            />

            <div>
              <label className="block text-sm font-medium mb-1">
                *주민(사업자)등록번호
              </label>
              <Input
                value={formData.iino}
                onChange={(e) =>
                  setFormData({ ...formData, iino: e.target.value.replace(/\D/g, '') })
                }
                required
                maxLength={13}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*업종코드</label>
              <Select
                value={formData.industryCode}
                onValueChange={(value) =>
                  setFormData({ ...formData, industryCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  {industryCodes?.map((code) => (
                    <SelectItem key={code.code} value={code.code}>
                      {code.name} ({code.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">*지급액</label>
              <Input
                type="number"
                value={formData.paymentSum}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    paymentSum: Number(e.target.value),
                  })
                }
                required
                min={0}
              />
            </div>

            {/* 자동 계산 영역 */}
            <div className="border-t pt-4 space-y-3 bg-gray-50 p-4 rounded">
              <h3 className="font-semibold text-sm">자동 계산 결과</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">세율(%)</Label>
                  <Input
                    value={`${taxes.taxRate}%`}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">소득세</Label>
                  <Input
                    value={formatCurrency(taxes.incomeTax)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">지방소득세</Label>
                  <Input
                    value={formatCurrency(taxes.localIncomeTax)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <Label className="text-sm text-gray-600">실지급액</Label>
                  <Input
                    value={formatCurrency(taxes.actualPayment)}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              삭제
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" variant="default">수정</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
