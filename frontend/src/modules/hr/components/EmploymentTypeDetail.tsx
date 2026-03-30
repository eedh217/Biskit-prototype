import { useState, useEffect } from 'react';
import { EmploymentType } from '../types/employmentType';
import { Employee, getEmploymentStatus } from '../types/employee';
import { employeeService } from '../services/employeeService';
import { jobLevelService } from '../services/jobLevelService';
import { employmentTypeService } from '../services/employmentTypeService';
import { organizationService } from '../services/organizationService';
import { DataTable } from '@/shared/components/common/data-table';
import { employmentTypeEmployeeColumns, EmploymentTypeEmployee } from './employment-type-employee-columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface EmploymentTypeDetailProps {
  employmentTypeId: string;
}

export function EmploymentTypeDetail({ employmentTypeId }: EmploymentTypeDetailProps): JSX.Element {
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(null);
  const [employees, setEmployees] = useState<EmploymentTypeEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEmploymentTypeDetails();
  }, [employmentTypeId]);

  const getOrganizationPath = async (departmentId: string): Promise<string> => {
    const allOrgs = await organizationService.getAll();
    const path: string[] = [];

    let currentId: string | null = departmentId;
    while (currentId !== null) {
      const org = allOrgs.find((o) => o.id === currentId);
      if (!org) break;
      path.unshift(org.name);
      currentId = org.parentId;
    }

    return path.join(' > ');
  };

  const loadEmploymentTypeDetails = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // 근로형태 정보 가져오기
      const employmentTypes = await employmentTypeService.getList();
      const currentEmploymentType = employmentTypes.find((et) => et.id === employmentTypeId);
      if (!currentEmploymentType) {
        console.error('EmploymentType not found');
        return;
      }
      setEmploymentType(currentEmploymentType);

      // 전체 직원 목록 가져오기 (재직중인 직원만)
      const allEmployees = await employeeService.getAll({ limit: 9999 });
      const employmentTypeEmployees = allEmployees.data.filter(
        (emp) =>
          emp.employmentTypeId === employmentTypeId && getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      // 직급 마스터 데이터 가져오기
      const jobLevels = await jobLevelService.getList();

      // 직원 목록에 부서명, 직급명 추가
      const allOrgs = await organizationService.getAll();
      const enrichedEmployees: EmploymentTypeEmployee[] = await Promise.all(
        employmentTypeEmployees.map(async (emp) => {
          const position = jobLevels.find((jl) => jl.id === emp.position);
          // 부서 경로를 계층 구조로 가져오기
          const departmentPath = emp.departmentId
            ? await getOrganizationPath(emp.departmentId)
            : null;
          return {
            ...emp,
            departmentName: departmentPath,
            positionName: position?.name || null,
          };
        })
      );

      // 부서별로 정렬
      enrichedEmployees.sort((a, b) => {
        const deptA = allOrgs.find((o) => o.id === a.departmentId);
        const deptB = allOrgs.find((o) => o.id === b.departmentId);

        // 부서가 없는 경우 맨 뒤로
        if (!deptA && !deptB) return 0;
        if (!deptA) return 1;
        if (!deptB) return -1;

        // 1. depth 오름차순 (상위 부서가 먼저)
        if (deptA.depth !== deptB.depth) {
          return deptA.depth - deptB.depth;
        }

        // 2. 같은 depth 내에서 order 오름차순
        if (deptA.order !== deptB.order) {
          return deptA.order - deptB.order;
        }

        // 3. 같은 부서 내에서는 사번 오름차순
        return a.employeeNumber.localeCompare(b.employeeNumber);
      });

      setEmployees(enrichedEmployees);
    } catch (error) {
      console.error('Failed to load employment type details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  if (!employmentType) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">근로형태 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>소속 인원 정보</CardTitle>
          <p className="text-sm text-slate-500 mt-1">* 재직중인 직원만 표시됩니다.</p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">근로형태명</div>
              <div className="text-base font-semibold text-slate-900">{employmentType.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">소속 인원 수</div>
              <div className="text-base font-semibold text-slate-900">{employees.length}명</div>
            </div>
          </div>

          {/* 소속 직원 목록 테이블 */}
          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <div className="text-sm font-medium text-slate-500 mb-1">소속 직원 목록</div>
            {employees.length > 0 ? (
              <div className="flex-1 min-h-0">
                <DataTable
                  columns={employmentTypeEmployeeColumns}
                  data={employees}
                  enableInfiniteScroll={true}
                  infiniteScrollIncrement={20}
                  maxHeight="full"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 border border-slate-200 rounded-md">
                <p className="text-slate-500 text-sm">소속 직원이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
