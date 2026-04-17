import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/shared/components/ui/button';
import { Trash2 } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { AcquisitionReport } from '../types/insuranceReport';

interface AcquisitionReportColumnsProps {
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  onRowClick: (report: AcquisitionReport) => void;
  onResend: (id: string) => void;
}

export const createAcquisitionReportColumns = ({
  onDelete,
  onPreview,
  onRowClick,
  onResend,
}: AcquisitionReportColumnsProps): ColumnDef<AcquisitionReport>[] => [
  {
    accessorKey: 'reportDate',
    header: '신고일자',
    cell: ({ row }) => {
      const date = row.original.reportDate;
      if (!date) return '-';

      // ISO 형식인 경우
      try {
        const dateObj = parseISO(date);
        if (isValid(dateObj)) {
          return format(dateObj, 'yyyy-MM-dd HH:mm:ss');
        }
      } catch {
        // ISO 파싱 실패
      }

      // YYYYMMDD 형식인 경우 (기존 데이터 호환)
      if (date.length === 8) {
        return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      }

      return '-';
    },
  },
  {
    accessorKey: 'employees',
    header: '직원',
    cell: ({ row }) => {
      const employees = row.original.employees;
      if (!employees || employees.length === 0) return '-';

      const count = employees.length;
      const names = employees.map((emp) => emp.employeeName).join(', ');

      // 최대 30자까지만 표시
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

      // 작성중 상태면 '-' 표시
      if (status === 'draft') {
        return <span className="text-gray-500">-</span>;
      }

      const faxStatus = row.original.faxStatus;
      let bgColor = 'bg-gray-50';
      let textColor = 'text-gray-700';
      let ringColor = 'ring-gray-600/20';
      let label = '발송중';

      if (faxStatus === 'success') {
        bgColor = 'bg-blue-50';
        textColor = 'text-blue-700';
        ringColor = 'ring-blue-600/20';
        label = '발송성공';
      } else if (faxStatus === 'failed') {
        bgColor = 'bg-red-50';
        textColor = 'text-red-700';
        ringColor = 'ring-red-600/20';
        label = '발송실패';
      }

      return (
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${bgColor} ${textColor} ring-1 ring-inset ${ringColor}`}
          >
            {label}
          </span>
          {faxStatus === 'failed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onResend(row.original.id);
              }}
            >
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
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(row.original.id);
              }}
            >
              신고서 확인
            </Button>
          )}
        </div>
      );
    },
  },
];
