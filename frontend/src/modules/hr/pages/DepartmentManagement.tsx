import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { DepartmentTree } from '../components/DepartmentTree';
import { DepartmentDetail } from '../components/DepartmentDetail';
import { organizationService } from '../services/organizationService';
import { employeeService } from '../services/employeeService';
import { OrganizationNode } from '../types/organization';
import { getEmploymentStatus } from '../types/employee';

export function DepartmentManagement(): JSX.Element {
  const [tree, setTree] = useState<OrganizationNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [employeeCountByDept, setEmployeeCountByDept] = useState<Map<string, number>>(new Map());

  const loadTree = async (showLoading = true): Promise<void> => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const data = await organizationService.getTree();
      setTree(data);

      // 첫 번째 부서 자동 선택
      if (data.length > 0 && !selectedDepartmentId) {
        setSelectedDepartmentId(data[0].id);
      }

      // 직원 수 계산 (재직중인 직원만)
      const employees = await employeeService.getAll({ limit: 9999 });
      const activeEmployees = employees.data.filter((emp) =>
        getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      // 부서별 직원 수 계산
      const countMap = new Map<string, number>();
      activeEmployees.forEach((emp) => {
        if (emp.departmentId) {
          const current = countMap.get(emp.departmentId) || 0;
          countMap.set(emp.departmentId, current + 1);
        }
      });
      setEmployeeCountByDept(countMap);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const handleAddRoot = async (name: string): Promise<void> => {
    const order = organizationService.getNextOrder(null);
    await organizationService.create({
      name,
      parentId: null,
      order,
    });
    await loadTree(false);
  };

  const handleUpdate = async (id: string, name: string): Promise<void> => {
    await organizationService.update(id, { name });
    await loadTree(false);
  };

  const getAllChildIds = (parentId: string, allOrgs: Array<{ id: string; parentId: string | null }>): string[] => {
    const childIds: string[] = [];
    const children = allOrgs.filter((org) => org.parentId === parentId);

    children.forEach((child) => {
      childIds.push(child.id);
      childIds.push(...getAllChildIds(child.id, allOrgs));
    });

    return childIds;
  };

  const checkCanDelete = async (id: string): Promise<{ canDelete: boolean; message: string; hasChildren: boolean }> => {
    const allOrgs = await organizationService.getAll();
    const hasChildren = allOrgs.some((org) => org.parentId === id);

    // 직원 정보 가져오기 (재직중인 직원만)
    const employees = await employeeService.getAll({ limit: 9999 });
    const activeEmployees = employees.data.filter((emp) =>
      getEmploymentStatus(emp.leaveDate) === '재직중'
    );

    if (!hasChildren) {
      // 하위 부서가 없을 경우
      const hasEmployees = activeEmployees.some((emp) => emp.departmentId === id);
      if (hasEmployees) {
        return {
          canDelete: false,
          message: '소속 직원이 존재하여 삭제할 수 없습니다.',
          hasChildren: false,
        };
      }
      return { canDelete: true, message: '', hasChildren: false };
    } else {
      // 하위 부서가 있을 경우
      const childIds = getAllChildIds(id, allOrgs);
      const allDeptIds = [id, ...childIds];

      // 삭제하려는 부서와 모든 하위 부서에 소속 직원이 있는지 확인
      const hasEmployeesInAnyDept = activeEmployees.some((emp) =>
        emp.departmentId && allDeptIds.includes(emp.departmentId)
      );

      if (hasEmployeesInAnyDept) {
        return {
          canDelete: false,
          message: '하위부서에 소속직원이 존재하여 삭제할 수 없습니다.',
          hasChildren: true,
        };
      }
      return { canDelete: true, message: '', hasChildren: true };
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const checkResult = await checkCanDelete(id);

    if (!checkResult.canDelete) {
      throw new Error(checkResult.message);
    }

    // 삭제 전에 현재 선택된 부서인지 확인
    const isSelectedDepartment = selectedDepartmentId === id;

    // 하위 부서 ID 수집 (하위 부서도 삭제되므로)
    const allOrgs = await organizationService.getAll();
    const childIds = getAllChildIds(id, allOrgs);
    const allDeletedIds = [id, ...childIds];

    // 선택된 부서가 삭제될 부서 중 하나인지 확인
    const isSelectedInDeletedDepts = selectedDepartmentId && allDeletedIds.includes(selectedDepartmentId);

    await organizationService.delete(id);
    await loadTree(false);

    // 선택된 부서가 삭제되었으면 첫 번째 부서로 변경
    if (isSelectedInDeletedDepts) {
      const newTree = await organizationService.getTree();
      if (newTree.length > 0) {
        setSelectedDepartmentId(newTree[0].id);
      } else {
        setSelectedDepartmentId(null);
      }
    }
  };

  const handleAddChild = async (parentId: string, name: string): Promise<void> => {
    const order = organizationService.getNextOrder(parentId);
    await organizationService.create({
      name,
      parentId,
      order,
    });
    await loadTree(false);
  };

  const handleReorder = async (activeId: string, overId: string): Promise<void> => {
    const organizations = await organizationService.getAll();

    const active = organizations.find((org) => org.id === activeId);
    const over = organizations.find((org) => org.id === overId);

    if (!active || !over) return;

    // 같은 부모인지 확인
    if (active.parentId !== over.parentId) {
      alert('같은 레벨 내에서만 순서를 변경할 수 있습니다.');
      return;
    }

    // 같은 위치면 무시
    if (activeId === overId) return;

    // 같은 레벨의 모든 부서 가져오기
    const siblings = organizations.filter((org) => org.parentId === active.parentId);

    // order 기준으로 정렬
    siblings.sort((a, b) => a.order - b.order);

    // activeId와 overId의 위치 찾기
    const activeIndex = siblings.findIndex((s) => s.id === activeId);
    const overIndex = siblings.findIndex((s) => s.id === overId);

    // 순서 변경
    const [removed] = siblings.splice(activeIndex, 1);
    siblings.splice(overIndex, 0, removed);

    // 새로운 order 할당
    const reorderItems = siblings.map((sibling, index) => ({
      id: sibling.id,
      parentId: sibling.parentId,
      order: index,
    }));

    // 백그라운드에서 저장 (await 없이)
    organizationService.reorder(reorderItems).then(() => {
      // 저장 완료 후 트리 새로고침 (로딩 표시 없이)
      loadTree(false);
    });
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="부서" showBackButton={false} />
        <div className="mt-6 flex items-center justify-center">
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="부서" showBackButton={false} />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Department Tree */}
        <div className="w-96 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <DepartmentTree
            tree={tree}
            onAddRoot={handleAddRoot}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onCheckCanDelete={checkCanDelete}
            onAddChild={handleAddChild}
            onReorder={handleReorder}
            selectedId={selectedDepartmentId}
            onSelect={setSelectedDepartmentId}
            employeeCountByDept={employeeCountByDept}
          />
        </div>

        {/* Right Panel - Department Details */}
        <div className="flex-1 flex flex-col overflow-auto">
          {selectedDepartmentId ? (
            <DepartmentDetail departmentId={selectedDepartmentId} tree={tree} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">부서를 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
