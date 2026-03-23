import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { businessIncomeService } from '../services/business-income.service';
import type {
  CreateBusinessIncomeDto,
  CreateAllBusinessIncomeDto,
  UpdateBusinessIncomeDto,
  UpdateAllBusinessIncomeDto,
} from '../types/business-income.types';

export const businessIncomeKeys = {
  all: ['business-income'] as const,
  summary: (year: number) => [...businessIncomeKeys.all, 'summary', year] as const,
  list: (year: number, month: number, search?: string) =>
    [...businessIncomeKeys.all, 'list', year, month, search] as const,
  allList: (search?: string) => [...businessIncomeKeys.all, 'all-list', search] as const,
  detail: (id: string) => [...businessIncomeKeys.all, 'detail', id] as const,
  industryCodes: () => ['industry-codes'] as const,
};

export function useBusinessIncomeSummary(year: number) {
  return useQuery({
    queryKey: businessIncomeKeys.summary(year),
    queryFn: () => businessIncomeService.getSummary(year),
  });
}

export function useBusinessIncomeList(params: {
  year: number;
  month: number;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: businessIncomeKeys.list(params.year, params.month, params.search),
    queryFn: () => businessIncomeService.getMonthlyList(params),
  });
}

export function useAllBusinessIncomeList(params: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: businessIncomeKeys.allList(params.search),
    queryFn: () => businessIncomeService.getAllList(params),
  });
}

export function useBusinessIncomeDetail(id: string) {
  return useQuery({
    queryKey: businessIncomeKeys.detail(id),
    queryFn: () => businessIncomeService.getById(id),
    enabled: !!id,
  });
}

export function useIndustryCodes() {
  return useQuery({
    queryKey: businessIncomeKeys.industryCodes(),
    queryFn: () => businessIncomeService.getIndustryCodes(),
    staleTime: Infinity,
  });
}

export function useCreateBusinessIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      dto: CreateBusinessIncomeDto;
      year: number;
      month: number;
    }) => businessIncomeService.create(params.dto, params.year, params.month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessIncomeKeys.all });
    },
  });
}

export function useUpdateBusinessIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; dto: UpdateBusinessIncomeDto }) =>
      businessIncomeService.update(params.id, params.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessIncomeKeys.all });
    },
  });
}

export function useDeleteBusinessIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => businessIncomeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessIncomeKeys.all });
    },
  });
}

export function useDeleteManyBusinessIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => businessIncomeService.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessIncomeKeys.all });
    },
  });
}

export function useCreateAllBusinessIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAllBusinessIncomeDto) => businessIncomeService.createAll(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessIncomeKeys.all });
    },
  });
}

export function useUpdateAllBusinessIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { id: string; dto: UpdateAllBusinessIncomeDto }) =>
      businessIncomeService.updateAll(params.id, params.dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessIncomeKeys.all });
    },
  });
}
