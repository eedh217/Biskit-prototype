import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Employee,
  EmployeeListResponse,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '../types/employee';
import { employeeService } from '../services/employeeService';

// Query Keys
const employeeKeys = {
  all: ['employees'] as const,
  list: (params: { search?: string; page?: number; limit?: number }) =>
    [...employeeKeys.all, 'list', params] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
};

// 직원 목록 조회
export function useEmployeeList(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<EmployeeListResponse, Error>({
    queryKey: employeeKeys.list(params),
    queryFn: () => employeeService.getAll(params),
  });
}

// 직원 상세 조회
export function useEmployee(id: string) {
  return useQuery<Employee, Error>({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.getById(id),
    enabled: !!id,
  });
}

// 직원 추가
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<Employee, Error, CreateEmployeeDto>({
    mutationFn: (dto) => employeeService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

// 직원 수정
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation<Employee, Error, { id: string; dto: UpdateEmployeeDto }>({
    mutationFn: ({ id, dto }) => employeeService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

// 직원 삭제
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}

// 직원 다중 삭제
export function useDeleteManyEmployees() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[]>({
    mutationFn: (ids) => employeeService.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all });
    },
  });
}
