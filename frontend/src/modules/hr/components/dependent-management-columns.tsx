import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/shared/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { DependentReport } from '../types/insuranceReport';

interface DependentManagementColumnsProps {
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  onRowClick: (report: DependentReport) => void;
  onResend: (id: string) => void;
}

export const createDependentManagementColumns = ({
  onDelete,
  onPreview,
  onRowClick,
  onResend,
}: DependentManagementColumnsProps): ColumnDef<DependentReport>[] => [
  {
    accessorKey: 'reportDate',
    header: '신고일자',
    cell: ({ row }) => {
      const date = row.original.reportDate;
      if (!date) return '-';
      try {
        const dateObj = parseISO(date);
        if (isValid(dateObj)) return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
      } catch {
        // ignore
      }
      return '-';
    },
  },
  {
    id: 'employee',
    header: '직원',
    cell: ({ row }) => {
      const emp = row.original.employees[0];
      if (!emp) return '-';
      return (
        <div className="min-w-[160px]">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => onRowClick(row.original)}
          >
            {emp.employeeName || '(미입력)'}
            {emp.employeeNumber && (
              <span className="text-gray-500 ml-1">({emp.employeeNumber})</span>
            )}
          </span>
        </div>
      );
    },
  },
  {
    id: 'dependents',
    header: '피부양자',
    cell: ({ row }) => {
      const deps = row.original.dependents;
      if (!deps || deps.length === 0) return '-';
      const count = deps.length;
      const names = deps.map((dep) => dep.dependentName).join(', ');
      const displayText = names.length > 30 ? `${names.slice(0, 30)}...` : names;
      return (
        <div className="min-w-[280px]">
          <span
            className="cursor-pointer hover:underline"
            onClick={() => onRowClick(row.original)}
            title={names}
          >
            {count}명({displayText})
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
            status === 'draft'
              ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20'
              : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          }`}
        >
          {status === 'draft' ? '작성중' : '신고완료'}
        </span>
      );
    },
  },
  {
    accessorKey: 'faxStatus',
    header: '팩스발송',
    cell: ({ row }) => {
      const status = row.original.status;
      if (status === 'draft') return <span className="text-gray-500">-</span>;

      const faxStatus = row.original.faxStatus;
      let bgColor = 'bg-gray-50';
      let textColor = 'text-gray-700';
      let ringColor = 'ring-gray-600/20';
      let label = '발송중';

      if (faxStatus === 'success') {
        bgColor = 'bg-blue-50'; textColor = 'text-blue-700'; ringColor = 'ring-blue-600/20'; label = '발송성공';
      } else if (faxStatus === 'failed') {
        bgColor = 'bg-red-50'; textColor = 'text-red-700'; ringColor = 'ring-red-600/20'; label = '발송실패';
      }

      return (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${bgColor} ${textColor} ring-1 ring-inset ${ringColor}`}>
            {label}
          </span>
          {faxStatus === 'failed' && (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onResend(row.original.id); }}>
              재발송
            </Button>
          )}
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex justify-end gap-2">
          {status === 'draft' ? (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(row.original.id); }}>
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onPreview(row.original.id); }}>
              신고서 확인
            </Button>
          )}
        </div>
      );
    },
  },
];
