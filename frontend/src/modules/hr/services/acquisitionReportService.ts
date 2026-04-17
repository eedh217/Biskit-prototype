import { v4 as uuidv4 } from 'uuid';
import type { AcquisitionReport, ReportListResponse } from '../types/insuranceReport';

const STORAGE_KEY = 'biskit_acquisition_reports';

// LocalStorage 헬퍼
function getStoredData(): AcquisitionReport[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: AcquisitionReport[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 딜레이 함수 (API 호출 시뮬레이션)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const acquisitionReportService = {
  // 목록 조회 (검색, 페이징)
  async getAll(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportListResponse<AcquisitionReport>> {
    await delay(100);

    const { search = '', page = 1, limit = 30 } = params;
    let data = getStoredData();

    // 검색 (직원 이름 또는 사번)
    if (search) {
      data = data.filter((report) =>
        report.employees.some(
          (emp) => emp.employeeName === search || emp.employeeNumber === search
        )
      );
    }

    // 정렬: 작성중 최상위 → 각각 최신순
    data.sort((a, b) => {
      // 상태 우선 (작성중 > 신고완료)
      if (a.status === 'draft' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'draft') return 1;

      // 같은 상태 내에서 최신순 (reportDate 기준)
      return b.reportDate.localeCompare(a.reportDate);
    });

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

  // ID로 조회
  async getById(id: string): Promise<AcquisitionReport> {
    await delay(50);

    const data = getStoredData();
    const report = data.find((r) => r.id === id);

    if (!report) {
      throw new Error('신고 내역을 찾을 수 없습니다.');
    }

    return report;
  },

  // 임시저장 (신규)
  async saveDraft(reportData: Omit<AcquisitionReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<AcquisitionReport> {
    await delay(100);

    const data = getStoredData();
    const now = new Date().toISOString();

    const newReport: AcquisitionReport = {
      ...reportData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    data.push(newReport);
    saveData(data);

    return newReport;
  },

  // 임시저장 업데이트 (편집)
  async updateDraft(id: string, reportData: Partial<AcquisitionReport>): Promise<AcquisitionReport> {
    await delay(100);

    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('신고 내역을 찾을 수 없습니다.');
    }

    const updatedReport: AcquisitionReport = {
      ...data[index]!,
      ...reportData,
      updatedAt: new Date().toISOString(),
    };

    data[index] = updatedReport;
    saveData(data);

    return updatedReport;
  },

  // 신고 완료
  async complete(id: string, reportData: Partial<AcquisitionReport>): Promise<AcquisitionReport> {
    await delay(100);

    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Error('신고 내역을 찾을 수 없습니다.');
    }

    const now = new Date();

    const completedReport: AcquisitionReport = {
      ...data[index]!,
      ...reportData,
      status: 'completed',
      faxStatus: 'success', // 일단 모두 성공
      reportDate: now.toISOString(), // 신고완료 시점 날짜+시각
      updatedAt: now.toISOString(),
    };

    data[index] = completedReport;
    saveData(data);

    return completedReport;
  },

  // 삭제
  async delete(id: string): Promise<void> {
    await delay(100);

    const data = getStoredData();
    const filtered = data.filter((r) => r.id !== id);

    if (filtered.length === data.length) {
      throw new Error('신고 내역을 찾을 수 없습니다.');
    }

    saveData(filtered);
  },
};
