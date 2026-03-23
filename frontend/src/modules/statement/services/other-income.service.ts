import { v4 as uuidv4 } from 'uuid';
import type {
  OtherIncome,
  OtherIncomeSummaryItem,
  OtherIncomeListResponse,
  CreateOtherIncomeDto,
  CreateAllOtherIncomeDto,
  UpdateOtherIncomeDto,
  UpdateAllOtherIncomeDto,
  DeleteManyResult,
} from '../types/other-income.types';
import { calculateOtherIncomeTaxes } from '../types/other-income.types';

const STORAGE_KEY = 'biskit_other_income';

// 로컬스토리지 헬퍼 함수들
function getStoredData(): OtherIncome[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: OtherIncome[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 딜레이 함수 (API 호출 시뮬레이션)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 월별 합산 조회 (SPS_OI_01)
export const otherIncomeService = {
  // 월별 합산 조회
  async getSummary(year: number): Promise<OtherIncomeSummaryItem[]> {
    await delay(100);

    const allData = getStoredData();

    // 1월~12월 기본 12행 생성
    const summary: OtherIncomeSummaryItem[] = [];

    for (let month = 1; month <= 12; month++) {
      // 해당 연도+월의 기타소득 데이터 필터링 (지급연월 기준)
      const monthData = allData.filter(
        (item) => item.paymentYear === year && item.paymentMonth === month
      );

      // 합산
      const count = monthData.length;
      const totalPaymentAmount = monthData.reduce((sum, item) => sum + item.paymentAmount, 0);
      const totalNecessaryExpenses = monthData.reduce((sum, item) => sum + item.necessaryExpenses, 0);
      const totalIncomeAmount = monthData.reduce((sum, item) => sum + item.incomeAmount, 0);
      const totalIncomeTax = monthData.reduce((sum, item) => sum + item.incomeTax, 0);
      const totalLocalIncomeTax = monthData.reduce((sum, item) => sum + item.localIncomeTax, 0);
      const totalActualIncomeAmount = monthData.reduce((sum, item) => sum + item.actualIncomeAmount, 0);

      // 신고파일 최종생성일: reportFileGeneratedAt의 최댓값
      const reportFileDates = monthData
        .map((item) => item.reportFileGeneratedAt)
        .filter((date): date is string => date !== null);

      const reportFileGeneratedAt =
        reportFileDates.length > 0
          ? reportFileDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]!
          : null;

      summary.push({
        month,
        count,
        totalPaymentAmount,
        totalNecessaryExpenses,
        totalIncomeAmount,
        totalIncomeTax,
        totalLocalIncomeTax,
        totalActualIncomeAmount,
        reportFileGeneratedAt,
      });
    }

    return summary;
  },

  // 월별 리스트 조회 (SPS_OI_02)
  async getMonthlyList(params: {
    year: number;
    month: number;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<OtherIncomeListResponse> {
    await delay(100);

    const { year, month, search, page = 1, pageSize = 30 } = params;

    const allData = getStoredData();

    // 해당 연도+월의 기타소득 데이터 필터링 (지급연월 기준)
    let filteredData = allData.filter(
      (item) => item.paymentYear === year && item.paymentMonth === month
    );

    // 검색 필터 (성명(상호) 부분 일치)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // 최근 등록 순 정렬
    filteredData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filteredData.length;

    // 페이지네이션
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
    };
  },

  // 전체 목록 조회 (SPS_OI_05)
  async getAllList(params: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<OtherIncomeListResponse> {
    await delay(100);

    const { search, page = 1, pageSize = 30 } = params;

    let allData = getStoredData();

    // 검색 필터 (성명(상호) 부분 일치)
    if (search) {
      const searchLower = search.toLowerCase();
      allData = allData.filter((item) =>
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // 최근 등록 순 정렬
    allData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allData.length;

    // 페이지네이션
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = allData.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
    };
  },

  // 단건 조회
  async getById(id: string): Promise<OtherIncome | null> {
    await delay(50);

    const allData = getStoredData();
    return allData.find((item) => item.id === id) || null;
  },

  // 생성 (월별 리스트 - 지급연월 고정)
  async create(paymentYear: number, paymentMonth: number, dto: CreateOtherIncomeDto): Promise<OtherIncome> {
    await delay(100);

    const allData = getStoredData();

    // 중복 검사: 지급연월 + 귀속연월 + 주민등록번호 + 소득구분
    const duplicate = allData.find(
      (item) =>
        item.paymentYear === paymentYear &&
        item.paymentMonth === paymentMonth &&
        item.attributionYear === dto.attributionYear &&
        item.attributionMonth === dto.attributionMonth &&
        item.iino === dto.iino &&
        item.incomeType === dto.incomeType
    );

    if (duplicate) {
      throw new Error('지급연월, 귀속연월, 주민(사업자)등록번호, 소득구분이 동일한 기타소득이 존재합니다.');
    }

    // 세금 계산
    const taxes = calculateOtherIncomeTaxes({
      paymentAmount: dto.paymentAmount,
      necessaryExpenses: dto.necessaryExpenses,
    });

    const newItem: OtherIncome = {
      id: uuidv4(),
      paymentYear,
      paymentMonth,
      attributionYear: dto.attributionYear,
      attributionMonth: dto.attributionMonth,
      name: dto.name,
      iino: dto.iino,
      isForeign: dto.isForeign,
      incomeType: dto.incomeType,
      paymentCount: dto.paymentCount,
      paymentAmount: dto.paymentAmount,
      necessaryExpenses: dto.necessaryExpenses,
      incomeAmount: taxes.incomeAmount,
      taxRate: taxes.taxRate,
      incomeTax: taxes.incomeTax,
      localIncomeTax: taxes.localIncomeTax,
      actualIncomeAmount: taxes.actualIncomeAmount,
      reportFileGeneratedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    allData.push(newItem);
    saveData(allData);

    return newItem;
  },

  // 생성 (전체 목록 - 지급연월 입력)
  async createAll(dto: CreateAllOtherIncomeDto): Promise<OtherIncome> {
    await delay(100);

    const allData = getStoredData();

    // 중복 검사
    const duplicate = allData.find(
      (item) =>
        item.paymentYear === dto.paymentYear &&
        item.paymentMonth === dto.paymentMonth &&
        item.attributionYear === dto.attributionYear &&
        item.attributionMonth === dto.attributionMonth &&
        item.iino === dto.iino &&
        item.incomeType === dto.incomeType
    );

    if (duplicate) {
      throw new Error('지급연월, 귀속연월, 주민(사업자)등록번호, 소득구분이 동일한 기타소득이 존재합니다.');
    }

    // 세금 계산
    const taxes = calculateOtherIncomeTaxes({
      paymentAmount: dto.paymentAmount,
      necessaryExpenses: dto.necessaryExpenses,
    });

    const newItem: OtherIncome = {
      id: uuidv4(),
      paymentYear: dto.paymentYear,
      paymentMonth: dto.paymentMonth,
      attributionYear: dto.attributionYear,
      attributionMonth: dto.attributionMonth,
      name: dto.name,
      iino: dto.iino,
      isForeign: dto.isForeign,
      incomeType: dto.incomeType,
      paymentCount: dto.paymentCount,
      paymentAmount: dto.paymentAmount,
      necessaryExpenses: dto.necessaryExpenses,
      incomeAmount: taxes.incomeAmount,
      taxRate: taxes.taxRate,
      incomeTax: taxes.incomeTax,
      localIncomeTax: taxes.localIncomeTax,
      actualIncomeAmount: taxes.actualIncomeAmount,
      reportFileGeneratedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    allData.push(newItem);
    saveData(allData);

    return newItem;
  },

  // 수정 (월별 리스트)
  async update(id: string, dto: UpdateOtherIncomeDto): Promise<OtherIncome> {
    await delay(100);

    const allData = getStoredData();
    const index = allData.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('기타소득을 찾을 수 없습니다.');
    }

    const existing = allData[index]!;

    // 중복 검사 (자기 자신 제외)
    if (dto.attributionYear !== undefined || dto.attributionMonth !== undefined || dto.iino !== undefined || dto.incomeType !== undefined) {
      const duplicate = allData.find(
        (item) =>
          item.id !== id &&
          item.paymentYear === existing.paymentYear &&
          item.paymentMonth === existing.paymentMonth &&
          item.attributionYear === (dto.attributionYear ?? existing.attributionYear) &&
          item.attributionMonth === (dto.attributionMonth ?? existing.attributionMonth) &&
          item.iino === (dto.iino ?? existing.iino) &&
          item.incomeType === (dto.incomeType ?? existing.incomeType)
      );

      if (duplicate) {
        throw new Error('지급연월, 귀속연월, 주민(사업자)등록번호, 소득구분이 동일한 기타소득이 존재합니다.');
      }
    }

    // 업데이트
    const updated: OtherIncome = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    // 지급액 또는 필요경비가 변경된 경우 세금 재계산
    if (dto.paymentAmount !== undefined || dto.necessaryExpenses !== undefined) {
      const taxes = calculateOtherIncomeTaxes({
        paymentAmount: updated.paymentAmount,
        necessaryExpenses: updated.necessaryExpenses,
      });

      updated.incomeAmount = taxes.incomeAmount;
      updated.taxRate = taxes.taxRate;
      updated.incomeTax = taxes.incomeTax;
      updated.localIncomeTax = taxes.localIncomeTax;
      updated.actualIncomeAmount = taxes.actualIncomeAmount;
    }

    allData[index] = updated;
    saveData(allData);

    return updated;
  },

  // 수정 (전체 목록 - 지급연월 수정 가능)
  async updateAll(id: string, dto: UpdateAllOtherIncomeDto): Promise<OtherIncome> {
    await delay(100);

    const allData = getStoredData();
    const index = allData.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('기타소득을 찾을 수 없습니다.');
    }

    const existing = allData[index]!;

    // 중복 검사 (자기 자신 제외)
    const duplicate = allData.find(
      (item) =>
        item.id !== id &&
        item.paymentYear === (dto.paymentYear ?? existing.paymentYear) &&
        item.paymentMonth === (dto.paymentMonth ?? existing.paymentMonth) &&
        item.attributionYear === (dto.attributionYear ?? existing.attributionYear) &&
        item.attributionMonth === (dto.attributionMonth ?? existing.attributionMonth) &&
        item.iino === (dto.iino ?? existing.iino) &&
        item.incomeType === (dto.incomeType ?? existing.incomeType)
    );

    if (duplicate) {
      throw new Error('지급연월, 귀속연월, 주민(사업자)등록번호, 소득구분이 동일한 기타소득이 존재합니다.');
    }

    // 업데이트
    const updated: OtherIncome = {
      ...existing,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    // 지급액 또는 필요경비가 변경된 경우 세금 재계산
    if (dto.paymentAmount !== undefined || dto.necessaryExpenses !== undefined) {
      const taxes = calculateOtherIncomeTaxes({
        paymentAmount: updated.paymentAmount,
        necessaryExpenses: updated.necessaryExpenses,
      });

      updated.incomeAmount = taxes.incomeAmount;
      updated.taxRate = taxes.taxRate;
      updated.incomeTax = taxes.incomeTax;
      updated.localIncomeTax = taxes.localIncomeTax;
      updated.actualIncomeAmount = taxes.actualIncomeAmount;
    }

    allData[index] = updated;
    saveData(allData);

    return updated;
  },

  // 삭제
  async delete(id: string): Promise<void> {
    await delay(100);

    const allData = getStoredData();
    const filtered = allData.filter((item) => item.id !== id);

    if (filtered.length === allData.length) {
      throw new Error('기타소득을 찾을 수 없습니다.');
    }

    saveData(filtered);
  },

  // 선택 삭제
  async deleteMany(ids: string[]): Promise<DeleteManyResult> {
    await delay(100);

    const allData = getStoredData();
    const filtered = allData.filter((item) => !ids.includes(item.id));

    const success = allData.length - filtered.length;
    const failed = ids.length - success;

    saveData(filtered);

    return { success, failed };
  },

  // 전체 삭제 (특정 연월)
  async deleteAll(year: number, month: number): Promise<number> {
    await delay(100);

    const allData = getStoredData();
    const filtered = allData.filter(
      (item) => !(item.paymentYear === year && item.paymentMonth === month)
    );

    const deletedCount = allData.length - filtered.length;

    saveData(filtered);

    return deletedCount;
  },
};
