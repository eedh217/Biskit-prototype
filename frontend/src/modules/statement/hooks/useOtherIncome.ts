import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { otherIncomeService } from '../services/other-income.service';
import type {
  OtherIncome,
  OtherIncomeSummaryItem,
  OtherIncomeListResponse,
  CreateOtherIncomeDto,
  CreateAllOtherIncomeDto,
  UpdateOtherIncomeDto,
  UpdateAllOtherIncomeDto,
} from '../types/other-income.types';

// 월별 합산 조회
export function useOtherIncomeSummary(year: number) {
  return useQuery<OtherIncomeSummaryItem[]>({
    queryKey: ['otherIncomeSummary', year],
    queryFn: () => otherIncomeService.getSummary(year),
  });
}

// 월별 리스트 조회
export function useOtherIncomeMonthlyList(params: {
  year: number;
  month: number;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<OtherIncomeListResponse>({
    queryKey: ['otherIncomeMonthlyList', params],
    queryFn: () => otherIncomeService.getMonthlyList(params),
  });
}

// 전체 목록 조회
export function useOtherIncomeAllList(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<OtherIncomeListResponse>({
    queryKey: ['otherIncomeAllList', params],
    queryFn: () => otherIncomeService.getAllList(params),
  });
}

// 단건 조회
export function useOtherIncome(id: string) {
  return useQuery<OtherIncome | null>({
    queryKey: ['otherIncome', id],
    queryFn: () => otherIncomeService.getById(id),
    enabled: !!id,
  });
}

// 생성 (월별 리스트)
export function useCreateOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentYear, paymentMonth, ...dto }: CreateOtherIncomeDto & { paymentYear: number; paymentMonth: number }) =>
      otherIncomeService.create(paymentYear, paymentMonth, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}

// 생성 (전체 목록)
export function useCreateAllOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAllOtherIncomeDto) =>
      otherIncomeService.createAll(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}

// 수정 (월별 리스트)
export function useUpdateOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOtherIncomeDto }) =>
      otherIncomeService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}

// 수정 (전체 목록)
export function useUpdateAllOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAllOtherIncomeDto }) =>
      otherIncomeService.updateAll(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}

// 삭제
export function useDeleteOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => otherIncomeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}

// 선택 삭제
export function useDeleteManyOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => otherIncomeService.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}

// 전체 삭제
export function useDeleteAllOtherIncome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      otherIncomeService.deleteAll(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherIncomeSummary'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeMonthlyList'] });
      queryClient.invalidateQueries({ queryKey: ['otherIncomeAllList'] });
    },
  });
}
