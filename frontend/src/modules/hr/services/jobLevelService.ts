import { v4 as uuidv4 } from 'uuid';
import type { JobLevel, CreateJobLevelDto, UpdateJobLevelDto } from '../types/jobLevel';
import { getEmploymentStatus } from '../types/employee';
import { employeeHistoryService } from './employeeHistoryService';
import type { Employee } from '../types/employee';

const STORAGE_KEY = 'biskit_job_levels';
const EMPLOYEE_STORAGE_KEY = 'biskit_employees';

function getStoredData(): JobLevel[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: JobLevel[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * LocalStorage에서 직원 데이터 읽기
 */
function getStoredEmployees(): Employee[] {
  const data = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export const jobLevelService = {
  async getList(): Promise<JobLevel[]> {
    await delay(100);
    return getStoredData().sort((a, b) => a.order - b.order);
  },

  async create(dto: CreateJobLevelDto): Promise<JobLevel> {
    await delay(100);
    const data = getStoredData();
    const maxOrder = data.length > 0 ? Math.max(...data.map((item) => item.order)) : 0;
    const now = new Date().toISOString();

    const newJobLevel: JobLevel = {
      id: uuidv4(),
      name: dto.name,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };

    data.push(newJobLevel);
    saveData(data);
    return newJobLevel;
  },

  async update(id: string, dto: UpdateJobLevelDto): Promise<JobLevel> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('직급을 찾을 수 없습니다.');
    }

    const updatedItem: JobLevel = {
      ...data[index]!,
      name: dto.name,
      updatedAt: new Date().toISOString(),
    };

    data[index] = updatedItem;
    saveData(data);
    return updatedItem;
  },

  async delete(id: string): Promise<void> {
    await delay(100);
    const data = getStoredData();
    const employees = getStoredEmployees();

    // 삭제할 직급 정보 가져오기
    const jobLevel = data.find((item) => item.id === id);
    if (!jobLevel) {
      throw new Error('직급을 찾을 수 없습니다.');
    }

    // 해당 직급의 퇴사자 직원 찾기
    const resignedEmployees = employees.filter(
      (emp) => emp.position === id && getEmploymentStatus(emp.leaveDate) === '퇴사'
    );

    // 각 퇴사자의 이력에 직급 삭제 기록 추가
    for (const employee of resignedEmployees) {
      try {
        await employeeHistoryService.create({
          employeeId: employee.id,
          category: 'organization',
          categoryName: '조직정보',
          changes: [
            {
              fieldName: '직급',
              fieldKey: 'position',
              oldValue: id,
              newValue: null,
              displayOldValue: jobLevel.name,
              displayNewValue: '-(직급 삭제)',
            },
          ],
          modifiedBy: '시스템',
        });
      } catch (error) {
        console.error(`Failed to create history for employee ${employee.id}:`, error);
      }
    }

    // 직급 삭제
    const filtered = data.filter((item) => item.id !== id);
    saveData(filtered);
  },

  async updateOrder(items: JobLevel[]): Promise<void> {
    await delay(100);
    const data = items.map((item, index) => ({
      ...item,
      order: index + 1,
      updatedAt: new Date().toISOString(),
    }));
    saveData(data);
  },
};
