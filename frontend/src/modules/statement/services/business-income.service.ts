import { v4 as uuidv4 } from 'uuid';
import type {
  BusinessIncomeSummaryItem,
  BusinessIncomeListResponse,
  BusinessIncome,
  GroupedBusinessIncome,
  CreateBusinessIncomeDto,
  CreateAllBusinessIncomeDto,
  UpdateBusinessIncomeDto,
  UpdateAllBusinessIncomeDto,
  DeleteManyResult,
  IndustryCode,
} from '../types/business-income.types';
import { calculateTaxes, isExceptionIndustry } from '../types/business-income.types';

const STORAGE_KEY = 'biskit_business_income';
const INDUSTRY_CODES_KEY = 'biskit_industry_codes';

// 업종코드 초기 데이터
const INITIAL_INDUSTRY_CODES: IndustryCode[] = [
  { code: '940304', name: '가수', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940305', name: '성악가 등', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940301', name: '작곡가', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940100', name: '저술가/작가', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940200', name: '화가관련 예술가', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940302', name: '배우', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940303', name: '모델', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940500', name: '연예보조', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940306', name: '1인미디어 콘텐츠창작자', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940926', name: '소프트웨어 프리랜서', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940911', name: '기타 모집수당', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940923', name: '대출모집인', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940924', name: '신용카드 회원모집인', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940907', name: '음료배달', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940908', name: '방문판매원', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940929', name: '중고자동차 판매원', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940910', name: '다단계판매', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940912', name: '간병인', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940915', name: '목욕관리사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940916', name: '행사도우미', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940600', name: '자문·고문', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940901', name: '바둑기사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940902', name: '꽃꽂이교사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940903', name: '학원강사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940920', name: '학습지 방문강사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940921', name: '교육교구 방문강사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940925', name: '방과후강사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940913', name: '대리운전', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940918', name: '퀵서비스', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940917', name: '심부름용역', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940919', name: '물품운반', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940914', name: '캐디', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940904', name: '직업운동가', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940906', name: '보험설계사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940922', name: '대여제품 방문점검원', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940927', name: '관광통역안내사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940928', name: '어린이 통학버스기사', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940905', name: '봉사료수취자', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '851101', name: '병의원', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { code: '940909', name: '기타자영업', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// 로컬스토리지 헬퍼 함수들
function getStoredData(): BusinessIncome[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: BusinessIncome[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStoredIndustryCodes(): IndustryCode[] {
  const data = localStorage.getItem(INDUSTRY_CODES_KEY);
  if (!data) {
    // 초기 데이터 저장
    localStorage.setItem(INDUSTRY_CODES_KEY, JSON.stringify(INITIAL_INDUSTRY_CODES));
    return INITIAL_INDUSTRY_CODES;
  }
  return JSON.parse(data);
}

// 딜레이 함수 (API 호출 시뮬레이션)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 합산 로직 (2.13 예외 업종 합산 표시 규칙)
function groupBusinessIncome(data: BusinessIncome[]): GroupedBusinessIncome[] {
  // 그룹핑 키: 귀속연월 + 주민등록번호 + 업종코드
  const groupMap = new Map<string, BusinessIncome[]>();

  data.forEach((item) => {
    // 예외 업종 데이터는 합산 대상
    // - 조건①: 귀속연도 ≠ 지급연도
    // - 조건②: 12월 지급 합류 (이미 필터링 단계에서 12월 리스트에 포함됨)
    const isExceptionData = isExceptionIndustry(item.industryCode);

    if (isExceptionData) {
      // 그룹핑 키 생성
      const key = `${item.attributionYear}-${item.attributionMonth}-${item.iino}-${item.industryCode}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    } else {
      // 비예외 데이터는 개별 행으로 처리 (그룹핑 하지 않음)
      const key = `individual-${item.id}`;
      groupMap.set(key, [item]);
    }
  });

  // 그룹별로 합산하여 GroupedBusinessIncome 생성
  const grouped: GroupedBusinessIncome[] = [];

  groupMap.forEach((records) => {
    const isGrouped = records.length > 1;
    const firstRecord = records[0]!;

    // 합산값 계산
    const paymentSum = records.reduce((sum, r) => sum + r.paymentSum, 0);
    const incomeTax = records.reduce((sum, r) => sum + r.incomeTax, 0);
    const localIncomeTax = records.reduce((sum, r) => sum + r.localIncomeTax, 0);
    const actualPayment = records.reduce((sum, r) => sum + r.actualPayment, 0);

    grouped.push({
      ...firstRecord,
      paymentSum,
      incomeTax,
      localIncomeTax,
      actualPayment,
      isGrouped,
      groupedCount: records.length,
      groupedIds: records.map((r) => r.id),
      records,
    });
  });

  return grouped;
}

export const businessIncomeService = {
  async getSummary(year: number): Promise<BusinessIncomeSummaryItem[]> {
    await delay(100); // API 호출 시뮬레이션

    const data = getStoredData();

    // 월별로 그룹핑 (예외 규칙 적용)
    const monthlyMap = new Map<number, BusinessIncome[]>();

    data.forEach((item) => {
      // 예외 규칙: 보험설계사/음료배달/방문판매원이면서 귀속연도 ≠ 지급연도
      const isException = isExceptionIndustry(item.industryCode) && item.attributionYear !== item.paymentYear;

      let targetMonth: number | null = null;

      if (isException) {
        // 예외 규칙 적용: 귀속연도 12월에 표시
        if (item.attributionYear === year) {
          targetMonth = 12;
        }
      } else {
        // 일반 규칙: 지급연월에 표시
        if (item.paymentYear === year) {
          targetMonth = item.paymentMonth;
        }
      }

      if (targetMonth !== null) {
        if (!monthlyMap.has(targetMonth)) {
          monthlyMap.set(targetMonth, []);
        }
        monthlyMap.get(targetMonth)!.push(item);
      }
    });

    // Summary 생성
    const summary: BusinessIncomeSummaryItem[] = [];

    for (let month = 1; month <= 12; month++) {
      const items = monthlyMap.get(month) || [];

      // 합산 후 row 개수 계산
      const grouped = groupBusinessIncome(items);

      summary.push({
        month,
        count: grouped.length, // 합산 후 row 개수
        totalPaymentSum: items.reduce((sum, item) => sum + item.paymentSum, 0),
        totalIncomeTax: items.reduce((sum, item) => sum + item.incomeTax, 0),
        totalLocalIncomeTax: items.reduce((sum, item) => sum + item.localIncomeTax, 0),
        totalActualPayment: items.reduce((sum, item) => sum + item.actualPayment, 0),
        reportFileGeneratedAt: items.some((item) => item.reportFileGeneratedAt)
          ? new Date().toISOString()
          : null,
      });
    }

    // 12월 예외 데이터 존재 여부 확인 (2.8.1)
    const hasDecemberException = data.some(
      (item) =>
        isExceptionIndustry(item.industryCode) &&
        item.attributionYear !== item.paymentYear &&
        item.attributionYear === year
    );

    // 12월 예외 행 추가 (2.8.3)
    if (hasDecemberException) {
      const decemberItems = monthlyMap.get(12) || [];

      // "YYYY년 지급" 행: 업종 무관, 지급연월이 YYYY년 12월인 전체 데이터
      // 단, 예외 업종은 귀속연도와 지급연도가 다른 경우 제외
      const currentYearPayment = decemberItems.filter((item) => {
        const isException = isExceptionIndustry(item.industryCode);
        if (isException && item.attributionYear !== item.paymentYear) {
          return false; // 예외 업종 + 귀속연도 ≠ 지급연도 → 제외
        }
        return item.paymentYear === year && item.paymentMonth === 12;
      });

      // "YYYY년 이후 지급" 행: 귀속연도 = YYYY이고 지급연도가 YYYY년보다 이후인 데이터
      const afterYearPayment = decemberItems.filter((item) => {
        return item.attributionYear === year && item.paymentYear > year;
      });

      // "YYYY년 지급" 행 합산
      const currentYearGrouped = groupBusinessIncome(currentYearPayment);
      summary.push({
        month: 12,
        count: currentYearGrouped.length,
        totalPaymentSum: currentYearPayment.reduce((sum, item) => sum + item.paymentSum, 0),
        totalIncomeTax: currentYearPayment.reduce((sum, item) => sum + item.incomeTax, 0),
        totalLocalIncomeTax: currentYearPayment.reduce((sum, item) => sum + item.localIncomeTax, 0),
        totalActualPayment: currentYearPayment.reduce((sum, item) => sum + item.actualPayment, 0),
        reportFileGeneratedAt: null,
        isExceptionRow: true,
        exceptionLabel: `${year}년 지급`,
      });

      // "YYYY년 이후 지급" 행 합산
      const afterYearGrouped = groupBusinessIncome(afterYearPayment);
      summary.push({
        month: 12,
        count: afterYearGrouped.length,
        totalPaymentSum: afterYearPayment.reduce((sum, item) => sum + item.paymentSum, 0),
        totalIncomeTax: afterYearPayment.reduce((sum, item) => sum + item.incomeTax, 0),
        totalLocalIncomeTax: afterYearPayment.reduce((sum, item) => sum + item.localIncomeTax, 0),
        totalActualPayment: afterYearPayment.reduce((sum, item) => sum + item.actualPayment, 0),
        reportFileGeneratedAt: null,
        isExceptionRow: true,
        exceptionLabel: `${year}년 이후 지급`,
      });
    }

    return summary;
  },

  async getMonthlyList(params: {
    year: number;
    month: number;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<BusinessIncomeListResponse> {
    await delay(100);

    const { year, month, search = '', page = 1, limit = 20 } = params;
    const data = getStoredData();

    // 필터링 (예외 규칙 적용)
    let filtered = data.filter((item) => {
      // 예외 규칙: 보험설계사/음료배달/방문판매원이면서 귀속연도 ≠ 지급연도
      const isException = isExceptionIndustry(item.industryCode) && item.attributionYear !== item.paymentYear;

      if (isException) {
        // 예외 규칙 적용: 귀속연도 12월 리스트에 포함
        return item.attributionYear === year && month === 12;
      }

      // 12월 지급 합류 조건: 예외 업종이면서 귀속연도 = 지급연도, 지급월 = 12월
      // 동일 귀속연월+주민번호+업종코드로 조건①에 해당하는 데이터가 존재하는 경우
      if (isExceptionIndustry(item.industryCode) && item.attributionYear === item.paymentYear && item.paymentMonth === 12 && month === 12) {
        // 동일 귀속연월+주민번호+업종코드로 조건①에 해당하는 데이터가 존재하는지 확인
        const hasExceptionData = data.some(
          (otherItem) =>
            isExceptionIndustry(otherItem.industryCode) &&
            otherItem.attributionYear !== otherItem.paymentYear &&
            otherItem.attributionYear === item.attributionYear &&
            otherItem.attributionMonth === item.attributionMonth &&
            otherItem.iino === item.iino &&
            otherItem.industryCode === item.industryCode
        );

        if (hasExceptionData) {
          return item.attributionYear === year;
        }
      }

      // 일반 규칙: 지급연월 기준
      return item.paymentYear === year && item.paymentMonth === month;
    });

    // 검색
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.iino.includes(search)
      );
    }

    // 정렬 (최신순)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalRecords = filtered.length; // 합산 전 총 레코드 개수

    // 합산 로직 (2.13 예외 업종 합산 표시 규칙)
    const grouped = groupBusinessIncome(filtered);

    // 페이징
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = grouped.slice(start, end);

    return {
      data: paginatedData,
      total: grouped.length, // 합산 후 행 개수
      totalRecords, // 합산 전 총 레코드 개수
    };
  },

  async getAllList(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<BusinessIncomeListResponse> {
    await delay(100);

    const { search = '', page = 1, limit = 30 } = params;
    const data = getStoredData();

    // 검색
    let filtered = data;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchLower)
      );
    }

    // 정렬 (최신순)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalRecords = filtered.length;

    // 전체 사업소득에서는 합산하지 않고 모든 데이터를 각각 row로 표시
    // 각 레코드를 단일 레코드 그룹으로 변환
    const ungroupedData: GroupedBusinessIncome[] = filtered.map(item => ({
      id: item.id,
      attributionYear: item.attributionYear,
      attributionMonth: item.attributionMonth,
      paymentYear: item.paymentYear,
      paymentMonth: item.paymentMonth,
      name: item.name,
      iino: item.iino,
      industryCode: item.industryCode,
      paymentSum: item.paymentSum,
      incomeTax: item.incomeTax,
      localIncomeTax: item.localIncomeTax,
      actualPayment: item.actualPayment,
      paymentCount: item.paymentCount,
      isGrouped: false,
      groupedIds: [item.id],
      records: [item],
    }));

    // 페이징
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = ungroupedData.slice(start, end);

    return {
      data: paginatedData,
      total: ungroupedData.length,
      totalRecords,
    };
  },

  async getById(id: string): Promise<BusinessIncome> {
    await delay(50);

    const data = getStoredData();
    const item = data.find((item) => item.id === id);

    if (!item) {
      throw new Error('데이터를 찾을 수 없습니다.');
    }

    return item;
  },

  async create(
    dto: CreateBusinessIncomeDto,
    year: number,
    month: number
  ): Promise<BusinessIncome> {
    await delay(100);

    const data = getStoredData();

    // 중복 검사
    const duplicate = data.find(
      (item) =>
        item.paymentYear === year &&
        item.paymentMonth === month &&
        item.attributionYear === dto.attributionYear &&
        item.attributionMonth === dto.attributionMonth &&
        item.iino === dto.iino &&
        item.industryCode === dto.industryCode
    );

    if (duplicate) {
      throw new Error(
        '지급연월, 귀속연월, 주민(사업자)등록번호, 업종코드가 동일한 사업소득이 존재합니다.'
      );
    }

    // 세금 계산
    const taxes = calculateTaxes({
      paymentSum: dto.paymentSum,
      isForeign: dto.isForeign,
      industryCode: dto.industryCode,
      taxRate: dto.taxRate,
    });

    const newItem: BusinessIncome = {
      id: uuidv4(),
      attributionYear: dto.attributionYear,
      attributionMonth: dto.attributionMonth,
      paymentYear: year,
      paymentMonth: month,
      name: dto.name,
      iino: dto.iino,
      isForeign: dto.isForeign,
      industryCode: dto.industryCode,
      paymentSum: dto.paymentSum,
      taxRate: taxes.taxRate,
      incomeTax: taxes.incomeTax,
      localIncomeTax: taxes.localIncomeTax,
      actualPayment: taxes.actualPayment,
      reportFileGeneratedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.push(newItem);
    saveData(data);

    return newItem;
  },

  async createAll(dto: CreateAllBusinessIncomeDto): Promise<BusinessIncome> {
    await delay(100);

    const data = getStoredData();

    // 중복 검사
    const duplicate = data.find(
      (item) =>
        item.paymentYear === dto.paymentYear &&
        item.paymentMonth === dto.paymentMonth &&
        item.attributionYear === dto.attributionYear &&
        item.attributionMonth === dto.attributionMonth &&
        item.iino === dto.iino &&
        item.industryCode === dto.industryCode
    );

    if (duplicate) {
      throw new Error(
        '지급연월, 귀속연월, 주민(사업자)등록번호, 업종코드가 동일한 사업소득이 존재합니다.'
      );
    }

    // 세금 계산
    const taxes = calculateTaxes({
      paymentSum: dto.paymentSum,
      isForeign: dto.isForeign,
      industryCode: dto.industryCode,
      taxRate: dto.taxRate,
    });

    const newItem: BusinessIncome = {
      id: uuidv4(),
      attributionYear: dto.attributionYear,
      attributionMonth: dto.attributionMonth,
      paymentYear: dto.paymentYear,
      paymentMonth: dto.paymentMonth,
      name: dto.name,
      iino: dto.iino,
      isForeign: dto.isForeign,
      industryCode: dto.industryCode,
      paymentSum: dto.paymentSum,
      taxRate: taxes.taxRate,
      incomeTax: taxes.incomeTax,
      localIncomeTax: taxes.localIncomeTax,
      actualPayment: taxes.actualPayment,
      reportFileGeneratedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.push(newItem);
    saveData(data);

    return newItem;
  },

  async update(id: string, dto: UpdateBusinessIncomeDto): Promise<BusinessIncome> {
    await delay(100);

    const data = getStoredData();
    const index = data.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('데이터를 찾을 수 없습니다.');
    }

    const currentItem = data[index]!;

    // 업데이트된 필드 적용
    const updatedItem = {
      ...currentItem,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    // paymentSum이나 industryCode가 변경되면 세금 재계산
    if (dto.paymentSum !== undefined || dto.industryCode !== undefined || dto.isForeign !== undefined || dto.taxRate !== undefined) {
      const taxes = calculateTaxes({
        paymentSum: updatedItem.paymentSum,
        isForeign: updatedItem.isForeign,
        industryCode: updatedItem.industryCode,
        taxRate: updatedItem.taxRate,
      });

      updatedItem.taxRate = taxes.taxRate;
      updatedItem.incomeTax = taxes.incomeTax;
      updatedItem.localIncomeTax = taxes.localIncomeTax;
      updatedItem.actualPayment = taxes.actualPayment;
    }

    data[index] = updatedItem;
    saveData(data);

    return updatedItem;
  },

  async updateAll(id: string, dto: UpdateAllBusinessIncomeDto): Promise<BusinessIncome> {
    await delay(100);

    const data = getStoredData();
    const index = data.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('데이터를 찾을 수 없습니다.');
    }

    const currentItem = data[index]!;

    // 중복 검사 (자기 자신 제외)
    const updatedPaymentYear = dto.paymentYear ?? currentItem.paymentYear;
    const updatedPaymentMonth = dto.paymentMonth ?? currentItem.paymentMonth;
    const updatedAttributionYear = dto.attributionYear ?? currentItem.attributionYear;
    const updatedAttributionMonth = dto.attributionMonth ?? currentItem.attributionMonth;
    const updatedIino = dto.iino ?? currentItem.iino;
    const updatedIndustryCode = dto.industryCode ?? currentItem.industryCode;

    const duplicate = data.find(
      (item) =>
        item.id !== id &&
        item.paymentYear === updatedPaymentYear &&
        item.paymentMonth === updatedPaymentMonth &&
        item.attributionYear === updatedAttributionYear &&
        item.attributionMonth === updatedAttributionMonth &&
        item.iino === updatedIino &&
        item.industryCode === updatedIndustryCode
    );

    if (duplicate) {
      throw new Error(
        '지급연월, 귀속연월, 주민(사업자)등록번호, 업종코드가 동일한 사업소득이 존재합니다.'
      );
    }

    // 업데이트된 필드 적용
    const updatedItem = {
      ...currentItem,
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    // paymentSum이나 industryCode가 변경되면 세금 재계산
    if (
      dto.paymentSum !== undefined ||
      dto.industryCode !== undefined ||
      dto.isForeign !== undefined ||
      dto.taxRate !== undefined
    ) {
      const taxes = calculateTaxes({
        paymentSum: updatedItem.paymentSum,
        isForeign: updatedItem.isForeign,
        industryCode: updatedItem.industryCode,
        taxRate: updatedItem.taxRate,
      });

      updatedItem.taxRate = taxes.taxRate;
      updatedItem.incomeTax = taxes.incomeTax;
      updatedItem.localIncomeTax = taxes.localIncomeTax;
      updatedItem.actualPayment = taxes.actualPayment;
    }

    data[index] = updatedItem;
    saveData(data);

    return updatedItem;
  },

  async delete(id: string): Promise<void> {
    await delay(100);

    const data = getStoredData();
    const filtered = data.filter((item) => item.id !== id);

    if (filtered.length === data.length) {
      throw new Error('데이터를 찾을 수 없습니다.');
    }

    saveData(filtered);
  },

  async deleteMany(ids: string[]): Promise<DeleteManyResult> {
    await delay(100);

    const data = getStoredData();
    const beforeCount = data.length;
    const filtered = data.filter((item) => !ids.includes(item.id));
    const afterCount = filtered.length;

    const deleted = beforeCount - afterCount;

    saveData(filtered);

    return {
      success: deleted,
      failed: ids.length - deleted,
    };
  },

  async getIndustryCodes(): Promise<IndustryCode[]> {
    await delay(50);
    return getStoredIndustryCodes();
  },

  async uploadExcel(rows: unknown[]): Promise<{
    total: number;
    success: number;
    failed: number;
    failures: Array<{ row: number; iino: string; reason: string }>;
  }> {
    await delay(200);

    // 간단한 엑셀 업로드 시뮬레이션
    // 실제 구현 시에는 rows를 파싱하여 BusinessIncome으로 변환하고 저장해야 함
    return {
      total: rows.length,
      success: 0,
      failed: rows.length,
      failures: rows.map((_, index) => ({
        row: index + 1,
        iino: '',
        reason: '로컬스토리지 모드에서는 엑셀 업로드가 지원되지 않습니다.',
      })),
    };
  },

  async getExcelTemplate(): Promise<Record<string, unknown>[]> {
    await delay(50);

    // 엑셀 템플릿 반환
    return [
      {
        귀속년도: 2024,
        귀속월: 1,
        성명: '홍길동',
        '주민등록번호/사업자등록번호': '1234567890123',
        외국인여부: 'N',
        업종코드: '940904',
        지급액: 1000000,
        세율: 3,
      },
    ];
  },
};
