import { v4 as uuidv4 } from 'uuid';
import {
  Organization,
  OrganizationNode,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  ReorderOrganizationDto,
} from '../types/organization';
import { getEmploymentStatus } from '../types/employee';
import { employeeHistoryService } from './employeeHistoryService';
import type { Employee } from '../types/employee';

const STORAGE_KEY = 'biskit_organizations';
const EMPLOYEE_STORAGE_KEY = 'biskit_employees';

function getStoredOrganizations(): Organization[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveOrganizations(organizations: Organization[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(organizations));
}

/**
 * LocalStorage에서 직원 데이터 읽기
 */
function getStoredEmployees(): Employee[] {
  const data = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTree(organizations: Organization[]): OrganizationNode[] {
  const map = new Map<string, OrganizationNode>();
  const roots: OrganizationNode[] = [];

  // 모든 조직을 Map에 추가
  organizations.forEach((org) => {
    map.set(org.id, { ...org, children: [] });
  });

  // 트리 구조 생성
  organizations.forEach((org) => {
    const node = map.get(org.id)!;
    if (org.parentId === null) {
      roots.push(node);
    } else {
      const parent = map.get(org.parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  // 각 레벨에서 order 기준으로 정렬
  const sortChildren = (nodes: OrganizationNode[]): void => {
    nodes.sort((a, b) => a.order - b.order);
    nodes.forEach((node) => {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(roots);

  return roots;
}

function flattenTree(nodes: OrganizationNode[]): Organization[] {
  const result: Organization[] = [];

  const traverse = (node: OrganizationNode): void => {
    const { children, ...org } = node;
    result.push(org);
    children.forEach(traverse);
  };

  nodes.forEach(traverse);
  return result;
}

function calculateDepth(parentId: string | null, organizations: Organization[]): number {
  if (parentId === null) {
    return 0;
  }

  const parent = organizations.find((org) => org.id === parentId);
  if (!parent) {
    return 0;
  }

  return parent.depth + 1;
}

function getNextOrder(parentId: string | null, organizations: Organization[]): number {
  const siblings = organizations.filter((org) => org.parentId === parentId);
  if (siblings.length === 0) {
    return 0;
  }
  return Math.max(...siblings.map((s) => s.order)) + 1;
}

function hasDuplicateName(
  name: string,
  parentId: string | null,
  organizations: Organization[],
  excludeId?: string
): boolean {
  return organizations.some(
    (org) =>
      org.name === name &&
      org.parentId === parentId &&
      org.id !== excludeId
  );
}

/**
 * 부서의 전체 경로를 반환 (예: "본사 > 개발팀 > 프론트엔드팀")
 */
function getDepartmentPath(departmentId: string, organizations: Organization[]): string {
  const path: string[] = [];
  let currentId: string | null = departmentId;

  while (currentId !== null) {
    const dept = organizations.find((org) => org.id === currentId);
    if (!dept) break;
    path.unshift(dept.name);
    currentId = dept.parentId;
  }

  return path.join(' > ');
}

export const organizationService = {
  async getAll(): Promise<Organization[]> {
    await delay(100);
    return getStoredOrganizations();
  },

  async getTree(): Promise<OrganizationNode[]> {
    await delay(100);
    const organizations = getStoredOrganizations();
    return buildTree(organizations);
  },

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    await delay(100);

    const organizations = getStoredOrganizations();

    // 중복 체크
    if (hasDuplicateName(dto.name, dto.parentId, organizations)) {
      throw new Error('같은 레벨에 동일한 이름의 조직이 이미 존재합니다.');
    }

    // Depth 체크 (최대 5depth = 0~4)
    const depth = calculateDepth(dto.parentId, organizations);
    if (depth >= 5) {
      throw new Error('최대 5단계까지만 조직을 생성할 수 있습니다.');
    }

    const newOrganization: Organization = {
      id: uuidv4(),
      name: dto.name,
      parentId: dto.parentId,
      depth,
      order: dto.order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    organizations.push(newOrganization);
    saveOrganizations(organizations);

    return newOrganization;
  },

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    await delay(100);

    const organizations = getStoredOrganizations();
    const index = organizations.findIndex((org) => org.id === id);

    if (index === -1) {
      throw new Error('조직을 찾을 수 없습니다.');
    }

    const organization = organizations[index];

    // 중복 체크
    if (hasDuplicateName(dto.name, organization.parentId, organizations, id)) {
      throw new Error('같은 레벨에 동일한 이름의 조직이 이미 존재합니다.');
    }

    const updated: Organization = {
      ...organization,
      name: dto.name,
      updatedAt: new Date().toISOString(),
    };

    organizations[index] = updated;
    saveOrganizations(organizations);

    return updated;
  },

  async delete(id: string): Promise<void> {
    await delay(100);

    const organizations = getStoredOrganizations();
    const employees = getStoredEmployees();

    // 삭제할 조직과 모든 하위 조직 ID 수집
    const idsToDelete = new Set<string>();
    const deptInfoMap = new Map<string, { id: string; name: string; path: string }>();

    const collectChildIds = (parentId: string): void => {
      idsToDelete.add(parentId);
      const dept = organizations.find((org) => org.id === parentId);
      if (dept) {
        const path = getDepartmentPath(parentId, organizations);
        deptInfoMap.set(parentId, { id: parentId, name: dept.name, path });
      }
      const children = organizations.filter((org) => org.parentId === parentId);
      children.forEach((child) => collectChildIds(child.id));
    };

    collectChildIds(id);

    // 각 삭제될 부서별로 퇴사자 직원 찾아서 이력 생성
    for (const [deptId, deptInfo] of deptInfoMap.entries()) {
      // 해당 부서의 퇴사자 직원 찾기
      const resignedEmployees = employees.filter(
        (emp) => emp.departmentId === deptId && getEmploymentStatus(emp.leaveDate) === '퇴사'
      );

      // 각 퇴사자의 이력에 부서 삭제 기록 추가
      for (const employee of resignedEmployees) {
        try {
          await employeeHistoryService.create({
            employeeId: employee.id,
            category: 'organization',
            categoryName: '조직정보',
            changes: [
              {
                fieldName: '부서',
                fieldKey: 'departmentId',
                oldValue: deptId,
                newValue: null,
                displayOldValue: deptInfo.path,
                displayNewValue: '-(부서 삭제)',
              },
            ],
            modifiedBy: '시스템',
          });
        } catch (error) {
          console.error(`Failed to create history for employee ${employee.id}:`, error);
        }
      }
    }

    // 해당 조직들 제외하고 저장
    const filtered = organizations.filter((org) => !idsToDelete.has(org.id));
    saveOrganizations(filtered);
  },

  async reorder(items: ReorderOrganizationDto[]): Promise<void> {
    await delay(100);

    const organizations = getStoredOrganizations();

    items.forEach((item) => {
      const index = organizations.findIndex((org) => org.id === item.id);
      if (index !== -1) {
        organizations[index].parentId = item.parentId;
        organizations[index].order = item.order;
        organizations[index].depth = calculateDepth(item.parentId, organizations);
        organizations[index].updatedAt = new Date().toISOString();
      }
    });

    saveOrganizations(organizations);
  },

  getNextOrder(parentId: string | null): number {
    const organizations = getStoredOrganizations();
    return getNextOrder(parentId, organizations);
  },
};
