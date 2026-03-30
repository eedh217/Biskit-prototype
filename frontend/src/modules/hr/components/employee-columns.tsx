import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { DataTableColumnHeader } from '@/shared/components/common/data-table-column-header';
import {
  Employee,
  getEmploymentStatus,
  calculateTenure,
  formatDate,
  formatPhone,
} from '../types/employee';

interface EmployeeWithDepartment extends Employee {
  departmentPath?: string;
  positionName?: string;
}

export const employeeColumns: ColumnDef<EmployeeWithDepartment>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        aria-label="모두 선택"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        aria-label="행 선택"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="이름" />
    ),
    cell: ({ row }) => <div>{row.getValue('name')}</div>,
    enablePinning: true,
    size: 120,
  },
  {
    accessorKey: 'employeeNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="사번" />
    ),
    cell: ({ row }) => <div>{row.getValue('employeeNumber')}</div>,
    size: 120,
  },
  {
    id: 'employmentStatus',
    accessorFn: (row) => getEmploymentStatus(row.leaveDate),
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="재직상태" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('employmentStatus') as '재직중' | '퇴사';
      return (
        <div className={status === '재직중' ? 'text-green-600' : 'text-gray-500'}>
          {status}
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: 'joinDate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="입사일" />
    ),
    cell: ({ row }) => <div>{formatDate(row.getValue('joinDate'))}</div>,
    size: 120,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="이메일" />
    ),
    cell: ({ row }) => <div>{row.getValue('email')}</div>,
    size: 200,
  },
  {
    accessorKey: 'phone',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="휴대폰번호" />
    ),
    cell: ({ row }) => <div>{formatPhone(row.getValue('phone'))}</div>,
    size: 140,
  },
  {
    id: 'positionName',
    accessorKey: 'positionName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="직급" />
    ),
    cell: ({ row }) => {
      const positionName = row.getValue('positionName') as string | undefined;
      return <div>{positionName || '-'}</div>;
    },
    size: 100,
  },
  {
    id: 'departmentPath',
    accessorKey: 'departmentPath',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="부서" />
    ),
    cell: ({ row }) => {
      const departmentPath = row.getValue('departmentPath') as string | undefined;
      return <div>{departmentPath || '-'}</div>;
    },
    size: 200,
  },
];
