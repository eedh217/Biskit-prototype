import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { OtherIncome } from '../types/other-income.types';
import { formatCurrency, formatDateTime, getIncomeTypeLabel } from '../types/other-income.types';

export function createOtherIncomeColumns(
  selectedIds: string[],
  setSelectedIds: (ids: string[]) => void
): ColumnDef<OtherIncome>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => {
        const currentPageData = table.getRowModel().rows.map((row) => row.original);
        const currentPageIds = currentPageData.map((item) => item.id);
        const allSelected =
          currentPageIds.length > 0 &&
          currentPageIds.every((id) => selectedIds.includes(id));

        return (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={allSelected}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const checked = e.target.checked;
                if (checked) {
                  // 현재 페이지 전체 선택
                  const newIds = [...selectedIds];
                  currentPageIds.forEach((id) => {
                    if (!newIds.includes(id)) {
                      newIds.push(id);
                    }
                  });
                  setSelectedIds(newIds);
                } else {
                  // 현재 페이지 전체 해제
                  setSelectedIds(
                    selectedIds.filter((id) => !currentPageIds.includes(id))
                  );
                }
              }}
            />
          </div>
        );
      },
      cell: ({ row }) => {
        const item = row.original;
        const isChecked = selectedIds.includes(item.id);

        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (isChecked) {
                setSelectedIds(selectedIds.filter((id) => id !== item.id));
              } else {
                setSelectedIds([...selectedIds, item.id]);
              }
            }}
          >
            <Checkbox checked={isChecked} />
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
      size: 50,
    },
    {
      accessorKey: 'attributionYear',
      header: '귀속연도',
      cell: ({ row }) => (
        <div className="text-left">{row.original.attributionYear}년</div>
      ),
      size: 100,
    },
    {
      accessorKey: 'attributionMonth',
      header: '귀속월',
      cell: ({ row }) => (
        <div className="text-left">{row.original.attributionMonth}월</div>
      ),
      size: 80,
    },
    {
      accessorKey: 'name',
      header: '성명(상호)',
      cell: ({ row }) => <div className="text-left">{row.original.name}</div>,
      size: 150,
    },
    {
      accessorKey: 'iino',
      header: '주민(사업자)등록번호',
      cell: ({ row }) => <div className="text-left">{row.original.iino}</div>,
      size: 150,
    },
    {
      accessorKey: 'incomeType',
      header: '소득구분',
      cell: ({ row }) => (
        <div className="text-left">
          {getIncomeTypeLabel(row.original.incomeType)}
        </div>
      ),
      size: 180,
    },
    {
      accessorKey: 'paymentCount',
      header: '지급건수',
      cell: ({ row }) => (
        <div className="text-right">{row.original.paymentCount.toLocaleString('ko-KR')}</div>
      ),
      size: 100,
    },
    {
      accessorKey: 'paymentAmount',
      header: '지급액(A)',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.paymentAmount)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'necessaryExpenses',
      header: '필요경비(B)',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.necessaryExpenses)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'incomeAmount',
      header: '소득금액(A-B)',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.incomeAmount)}
        </div>
      ),
      size: 130,
    },
    {
      accessorKey: 'incomeTax',
      header: '소득세',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.incomeTax)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'localIncomeTax',
      header: '지방소득세',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.localIncomeTax)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'actualIncomeAmount',
      header: '실소득금액',
      cell: ({ row }) => (
        <div className="text-right">
          {formatCurrency(row.original.actualIncomeAmount)}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'reportFileGeneratedAt',
      header: '신고파일 최종 생성일',
      cell: ({ row }) => (
        <div className="text-center">
          {formatDateTime(row.original.reportFileGeneratedAt)}
        </div>
      ),
      size: 180,
    },
  ];
}
