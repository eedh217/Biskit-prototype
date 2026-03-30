import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { DataTableColumnHeader } from '@/shared/components/common/data-table-column-header';
import { OtherIncome, formatCurrency, getIncomeTypeLabel } from '../types/other-income.types';

export function createAllOtherIncomeColumns(
  selectedIds: string[],
  onSelectionChange: (ids: string[]) => void,
  allData: OtherIncome[]
): ColumnDef<OtherIncome>[] {
  return [
    {
      id: 'select',
      header: () => {
        const allIds = allData.map((item) => item.id);
        const isAllSelected =
          allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

        return (
          <Checkbox
            checked={isAllSelected}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectionChange(allIds);
              } else {
                onSelectionChange([]);
              }
            }}
            aria-label="모두 선택"
          />
        );
      },
      cell: ({ row }) => {
        const id = row.original.id;
        const isSelected = selectedIds.includes(id);

        return (
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectionChange([...selectedIds, id]);
              } else {
                onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
              }
            }}
            aria-label="행 선택"
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  {
    accessorKey: 'attributionYear',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="귀속연도" />
    ),
    cell: ({ row }) => <div className="text-left">{row.getValue('attributionYear')}년</div>,
  },
  {
    accessorKey: 'attributionMonth',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="귀속월" />
    ),
    cell: ({ row }) => <div className="text-left">{row.getValue('attributionMonth')}월</div>,
  },
  {
    accessorKey: 'paymentYear',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="지급연도" />
    ),
    cell: ({ row }) => <div className="text-left">{row.getValue('paymentYear')}년</div>,
  },
  {
    accessorKey: 'paymentMonth',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="지급월" />
    ),
    cell: ({ row }) => <div className="text-left">{row.getValue('paymentMonth')}월</div>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="성명(상호)" />
    ),
    cell: ({ row }) => <div className="text-left">{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'iino',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="주민(사업자)등록번호" />
    ),
    cell: ({ row }) => <div className="text-left">{row.getValue('iino')}</div>,
  },
  {
    accessorKey: 'incomeType',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="소득구분" />
    ),
    cell: ({ row }) => (
      <div className="text-left">{getIncomeTypeLabel(row.getValue('incomeType'))}</div>
    ),
  },
  {
    accessorKey: 'paymentCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="지급건수" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{(row.getValue('paymentCount') as number).toLocaleString('ko-KR')}</div>
    ),
  },
  {
    accessorKey: 'paymentAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="지급액(A)" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.getValue('paymentAmount'))}</div>
    ),
  },
  {
    accessorKey: 'necessaryExpenses',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="필요경비(B)" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.getValue('necessaryExpenses'))}</div>
    ),
  },
  {
    accessorKey: 'incomeAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="소득금액(A-B)" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.getValue('incomeAmount'))}</div>
    ),
  },
  {
    accessorKey: 'incomeTax',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="소득세" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.getValue('incomeTax'))}</div>
    ),
  },
  {
    accessorKey: 'localIncomeTax',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="지방소득세" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.getValue('localIncomeTax'))}</div>
    ),
  },
  {
    accessorKey: 'actualIncomeAmount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="실소득금액" />
    ),
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.getValue('actualIncomeAmount'))}</div>
    ),
  },
];
}
