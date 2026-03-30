import { useState, useEffect } from 'react';
import { OrganizationNode } from '../types/organization';
import { Employee, getEmploymentStatus } from '../types/employee';
import { JobLevel } from '../types/jobLevel';
import { EmploymentType } from '../types/employmentType';
import { employeeService } from '../services/employeeService';
import { jobLevelService } from '../services/jobLevelService';
import { employmentTypeService } from '../services/employmentTypeService';
import { organizationService } from '../services/organizationService';
import { DataTable } from '@/shared/components/common/data-table';
import { departmentEmployeeColumns, DepartmentEmployee } from './department-employee-columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface DepartmentDetailProps {
  departmentId: string;
  tree: OrganizationNode[];
}

interface Statistics {
  jobLevelDistribution: { name: string; count: number }[];
  employmentTypeDistribution: { name: string; count: number }[];
  childDepartmentCount: number;
  totalEmployeeCount: number;
}

export function DepartmentDetail({ departmentId, tree }: DepartmentDetailProps): JSX.Element {
  const [department, setDepartment] = useState<OrganizationNode | null>(null);
  const [employees, setEmployees] = useState<DepartmentEmployee[]>([]);
  const [departmentHead, setDepartmentHead] = useState<Employee | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [organizationPath, setOrganizationPath] = useState<string>('');

  useEffect(() => {
    loadDepartmentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId]);

  const findDepartmentNode = (nodes: OrganizationNode[], id: string): OrganizationNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findDepartmentNode(node.children, id);
      if (found) return found;
    }
    return null;
  };

  const getAllChildIds = (node: OrganizationNode): string[] => {
    const ids: string[] = [node.id];
    node.children.forEach((child) => {
      ids.push(...getAllChildIds(child));
    });
    return ids;
  };

  const countChildDepartments = (node: OrganizationNode): number => {
    let count = node.children.length;
    node.children.forEach((child) => {
      count += countChildDepartments(child);
    });
    return count;
  };

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

  const loadDepartmentDetails = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // 부서 노드 찾기
      const deptNode = findDepartmentNode(tree, departmentId);
      if (!deptNode) {
        console.error('Department not found');
        return;
      }
      setDepartment(deptNode);

      // 조직 경로 가져오기
      const path = await getOrganizationPath(departmentId);
      setOrganizationPath(path);

      // 하위 부서 포함한 모든 부서 ID 가져오기
      const allDepartmentIds = getAllChildIds(deptNode);

      // 전체 직원 목록 가져오기 (재직중인 직원만)
      const allEmployees = await employeeService.getAll({ limit: 9999 });
      const deptEmployees = allEmployees.data.filter((emp) =>
        emp.departmentId &&
        allDepartmentIds.includes(emp.departmentId) &&
        getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      // 부서장 가져오기
      const head = await employeeService.getDepartmentHead(departmentId);
      setDepartmentHead(head);

      // 직급, 고용형태 마스터 데이터 가져오기
      const [jobLevels, employmentTypes] = await Promise.all([
        jobLevelService.getList(),
        employmentTypeService.getList(),
      ]);

      // 직원 목록에 부서명, 직급명 추가
      const allOrgs = await organizationService.getAll();
      const enrichedEmployees: DepartmentEmployee[] = await Promise.all(
        deptEmployees.map(async (emp) => {
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

      // 상위 부서 순서대로 정렬
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

      // 통계 계산
      const stats = calculateStatistics(deptEmployees, jobLevels, employmentTypes, deptNode);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load department details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStatistics = (
    employees: Employee[],
    jobLevels: JobLevel[],
    employmentTypes: EmploymentType[],
    deptNode: OrganizationNode
  ): Statistics => {
    // 직급별 분포
    const jobLevelMap = new Map<string, number>();
    employees.forEach((emp) => {
      if (emp.position) {
        const current = jobLevelMap.get(emp.position) || 0;
        jobLevelMap.set(emp.position, current + 1);
      } else {
        const current = jobLevelMap.get('미지정') || 0;
        jobLevelMap.set('미지정', current + 1);
      }
    });

    const jobLevelDistribution = Array.from(jobLevelMap.entries()).map(([id, count]) => {
      const jobLevel = jobLevels.find((jl) => jl.id === id);
      return {
        name: jobLevel?.name || '미지정',
        count,
      };
    });

    // 고용형태별 분포
    const employmentTypeMap = new Map<string, number>();
    employees.forEach((emp) => {
      if (emp.employmentTypeId) {
        const current = employmentTypeMap.get(emp.employmentTypeId) || 0;
        employmentTypeMap.set(emp.employmentTypeId, current + 1);
      } else {
        const current = employmentTypeMap.get('미지정') || 0;
        employmentTypeMap.set('미지정', current + 1);
      }
    });

    const employmentTypeDistribution = Array.from(employmentTypeMap.entries()).map(([id, count]) => {
      const empType = employmentTypes.find((et) => et.id === id);
      return {
        name: empType?.name || '미지정',
        count,
      };
    });

    return {
      jobLevelDistribution,
      employmentTypeDistribution,
      childDepartmentCount: countChildDepartments(deptNode),
      totalEmployeeCount: employees.length,
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  if (!department || !statistics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500">부서 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* 소속 인원 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>소속 인원 정보</CardTitle>
          <p className="text-sm text-slate-500 mt-1">* 재직중인 직원만 표시됩니다.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">부서장</div>
              <div className="text-base font-semibold text-slate-900">
                {departmentHead ? `${departmentHead.name} (${departmentHead.employeeNumber})` : '미지정'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">소속 인원 수</div>
              <div className="text-base font-semibold text-slate-900">{employees.length}명</div>
            </div>
          </div>

          {/* 소속 직원 목록 테이블 */}
          <div className="mt-6">
            <div className="text-sm font-medium text-slate-500 mb-1">소속 직원 목록</div>
            {employees.length > 0 ? (
              <DataTable
                columns={departmentEmployeeColumns}
                data={employees}
                enableInfiniteScroll={true}
                infiniteScrollIncrement={20}
              />
            ) : (
              <div className="flex items-center justify-center py-8 border border-slate-200 rounded-md">
                <p className="text-slate-500 text-sm">소속 직원이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 조직 통계 */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>조직 통계</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">하위 부서 개수</div>
              <div className="text-base font-semibold text-slate-900">{statistics.childDepartmentCount}개</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 mb-1">전체 인원 수 (하위 부서 포함)</div>
              <div className="text-base font-semibold text-slate-900">{statistics.totalEmployeeCount}명</div>
            </div>
          </div>

          {/* 직급별 분포 */}
          {statistics.jobLevelDistribution.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium text-slate-500 mb-1">직급별 인원 분포</div>
              <div className="flex flex-wrap gap-3">
                {statistics.jobLevelDistribution.map((item) => (
                  <div key={item.name} className="text-base font-semibold text-slate-900">
                    {item.name}: {item.count}명
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 고용형태별 분포 */}
          {statistics.employmentTypeDistribution.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-medium text-slate-500 mb-1">고용형태별 인원 분포</div>
              <div className="flex flex-wrap gap-3">
                {statistics.employmentTypeDistribution.map((item) => (
                  <div key={item.name} className="text-base font-semibold text-slate-900">
                    {item.name}: {item.count}명
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
