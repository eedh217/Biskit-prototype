import { v4 as uuidv4 } from 'uuid';
import type {
  Employee,
  EmployeeListResponse,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  DeleteManyResult,
} from '../types/employee';

const STORAGE_KEY = 'biskit_employees';

// 로컬스토리지 헬퍼 함수들
function getStoredData(): Employee[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];

  const parsed = JSON.parse(data) as Employee[];

  // 기존 데이터 마이그레이션
  return parsed.map((emp) => ({
    ...emp,
    isDepartmentHead: emp.isDepartmentHead ?? false,
    annualSalary: emp.annualSalary ?? null,
    payrollTemplate: emp.payrollTemplate ?? [],
    bankName: emp.bankName ?? null,
    accountHolder: emp.accountHolder ?? null,
    accountNumber: emp.accountNumber ?? null,
  }));
}

function saveData(data: Employee[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 딜레이 함수 (API 호출 시뮬레이션)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const employeeService = {
  async getAll(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<EmployeeListResponse> {
    await delay(100);

    const { search = '', page = 1, limit = 30 } = params;
    let data = getStoredData();

    // 검색 (이름 또는 사번 완전 일치)
    if (search) {
      data = data.filter(
        (employee) =>
          employee.name === search || employee.employeeNumber === search
      );
    }

    // 정렬 (최근 등록 순)
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = data.length;

    // 페이징
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = data.slice(start, end);

    return {
      data: paginatedData,
      total,
    };
  },

  async getById(id: string): Promise<Employee> {
    await delay(50);

    const data = getStoredData();
    const employee = data.find((emp) => emp.id === id);

    if (!employee) {
      throw new Error('직원을 찾을 수 없습니다.');
    }

    return employee;
  },

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    await delay(100);

    const data = getStoredData();

    // 사번 중복 체크
    const duplicate = data.find(
      (emp) => emp.employeeNumber === dto.employeeNumber
    );

    if (duplicate) {
      throw new Error('중복된 사번은 사용하실 수 없습니다.');
    }

    // 이메일 중복 체크 (재직 중인 직원만)
    const emailDuplicate = data.find(
      (emp) => emp.email === dto.email && emp.leaveDate === null
    );

    if (emailDuplicate) {
      throw new Error('근로자 중 중복된 이메일이 등록되어 있습니다.');
    }

    const newEmployee: Employee = {
      id: uuidv4(),
      employeeNumber: dto.employeeNumber,
      name: dto.name,
      nationalityType: dto.nationalityType,
      residentRegistrationNumber: dto.residentRegistrationNumber ?? null,
      foreignerRegistrationNumber: dto.foreignerRegistrationNumber ?? null,
      passportNumber: dto.passportNumber ?? null,
      birthDate: dto.birthDate ?? null,
      gender: dto.gender ?? null,
      nationality: dto.nationality ?? null,
      residenceType: dto.residenceType,
      residenceCountry: dto.residenceCountry ?? null,
      disabilityType: dto.disabilityType,
      email: dto.email,
      contact: dto.contact ?? null,
      phone: dto.phone ?? null,
      zipCode: dto.zipCode ?? null,
      address: dto.address ?? null,
      detailAddress: dto.detailAddress ?? null,
      joinDate: dto.joinDate,
      leaveDate: dto.leaveDate ?? null,
      departmentId: dto.departmentId ?? null,
      position: dto.position ?? null,
      employmentTypeId: dto.employmentTypeId ?? null,
      isDepartmentHead: dto.isDepartmentHead ?? false,
      annualSalary: dto.annualSalary ?? null,
      payrollTemplate: dto.payrollTemplate ?? [],
      bankName: dto.bankName ?? null,
      accountHolder: dto.accountHolder ?? null,
      accountNumber: dto.accountNumber ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.push(newEmployee);
    saveData(data);

    return newEmployee;
  },

  async update(id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    await delay(100);

    const data = getStoredData();
    const index = data.findIndex((emp) => emp.id === id);

    if (index === -1) {
      throw new Error('직원을 찾을 수 없습니다.');
    }

    const currentEmployee = data[index]!;

    // 사번 중복 체크 (자기 자신 제외)
    if (dto.employeeNumber && dto.employeeNumber !== currentEmployee.employeeNumber) {
      const duplicate = data.find(
        (emp) => emp.employeeNumber === dto.employeeNumber && emp.id !== id
      );

      if (duplicate) {
        throw new Error('중복된 사번은 사용하실 수 없습니다.');
      }
    }

    const updatedEmployee: Employee = {
      ...currentEmployee,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    data[index] = updatedEmployee;
    saveData(data);

    return updatedEmployee;
  },

  async delete(id: string): Promise<void> {
    await delay(100);

    const data = getStoredData();
    const filtered = data.filter((emp) => emp.id !== id);

    if (filtered.length === data.length) {
      throw new Error('직원을 찾을 수 없습니다.');
    }

    saveData(filtered);
  },

  async deleteMany(ids: string[]): Promise<DeleteManyResult> {
    await delay(100);

    const data = getStoredData();
    const beforeCount = data.length;
    const filtered = data.filter((emp) => !ids.includes(emp.id));
    const afterCount = filtered.length;

    const deleted = beforeCount - afterCount;

    saveData(filtered);

    return {
      success: deleted,
      failed: ids.length - deleted,
    };
  },

  // 특정 부서의 부서장 조회
  async getDepartmentHead(departmentId: string): Promise<Employee | null> {
    await delay(50);
    const data = getStoredData();
    const head = data.find(
      (emp) => emp.departmentId === departmentId && emp.isDepartmentHead
    );
    return head || null;
  },
};
