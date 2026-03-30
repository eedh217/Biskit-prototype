import { useState, useEffect } from 'react';
import { JobLevel } from '../types/jobLevel';
import { Employee, getEmploymentStatus } from '../types/employee';
import { employeeService } from '../services/employeeService';
import { jobLevelService } from '../services/jobLevelService';
import { organizationService } from '../services/organizationService';
import { DataTable } from '@/shared/components/common/data-table';
import { jobLevelEmployeeColumns, JobLevelEmployee } from './job-level-employee-columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface JobLevelDetailProps {
  jobLevelId: string;
}

export function JobLevelDetail({ jobLevelId }: JobLevelDetailProps): JSX.Element {
  const [jobLevel, setJobLevel] = useState<JobLevel | null>(null);
  const [employees, setEmployees] = useState<JobLevelEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobLevelDetails();
  }, [jobLevelId]);

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

  const loadJobLevelDetails = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // 직급 정보 가져오기
      const jobLevels = await jobLevelService.getList();
      const currentJobLevel = jobLevels.find((jl) => jl.id === jobLevelId);
      if (!currentJobLevel) {
        console.error('JobLevel not found');
        return;
      }
      setJobLevel(currentJobLevel);

      // 전체 직원 목록 가져오기 (재직중인 직원만)
      const allEmployees = await employeeService.getAll({ limit: 9999 });
      const jobLevelEmployees = allEmployees.data.filter(
        (emp) =>
          emp.position === jobLevelId && getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      // 직원 목록에 부서명, 직급명 추가
      const allOrgs = await organizationService.getAll();
      const enrichedEmployees: JobLevelEmployee[] = await Promise.all(
        jobLevelEmployees.map(async (emp) => {
          // 부서 경로를 계층 구조로 가져오기
          const departmentPath = emp.departmentId
            ? await getOrganizationPath(emp.departmentId)
            : null;
          return {
            ...emp,
            departmentName: departmentPath,
            positionName: currentJobLevel.name,
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
      console.error('Failed to load job level details:', error);
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

  if (!jobLevel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">직급 정보를 불러올 수 없습니다.</p>
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
              <div className="text-sm font-medium text-slate-500 mb-1">직급명</div>
              <div className="text-base font-semibold text-slate-900">{jobLevel.name}</div>
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
                  columns={jobLevelEmployeeColumns}
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
