import { ColumnDef } from '@tanstack/react-table';
import { Employee, formatDate, formatPhone } from '../types/employee';

export interface DepartmentEmployee extends Employee {
  positionName: string | null;
  departmentName: string | null;
}

export const departmentEmployeeColumns: ColumnDef<DepartmentEmployee>[] = [
  {
    accessorKey: 'employeeNumber',
    header: '사번',
    cell: ({ row }) => (
      <div className="font-medium text-sm">{row.getValue('employeeNumber')}</div>
    ),
  },
  {
    accessorKey: 'name',
    header: '이름',
    cell: ({ row }) => (
      <div className="font-medium text-sm">{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'departmentName',
    header: '부서',
    cell: ({ row }) => {
      const departmentName = row.getValue('departmentName') as string | null;
      return (
        <div className="text-sm text-slate-600">
          {departmentName || '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'positionName',
    header: '직급',
    cell: ({ row }) => {
      const position = row.getValue('positionName') as string | null;
      return (
        <div className="text-sm text-slate-600">
          {position || '-'}
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: '이메일',
    cell: ({ row }) => (
      <div className="text-sm text-slate-600">{row.getValue('email')}</div>
    ),
  },
  {
    accessorKey: 'phone',
    header: '전화번호',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | null;
      return (
        <div className="text-sm text-slate-600">{formatPhone(phone)}</div>
      );
    },
  },
];
