import { v4 as uuidv4 } from 'uuid';
import type { LossReport, ReportListResponse } from '../types/insuranceReport';

const STORAGE_KEY = 'biskit_loss_reports';

function getStoredData(): LossReport[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: LossReport[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const lossReportService = {
  async getAll(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ReportListResponse<LossReport>> {
    await delay(100);

    const { search = '', page = 1, limit = 30 } = params;
    let data = getStoredData();

    if (search) {
      data = data.filter((report) =>
        report.employees.some(
          (emp) => emp.employeeName === search || emp.employeeNumber === search
        )
      );
    }

    data.sort((a, b) => {
      if (a.status === 'draft' && b.status === 'completed') return -1;
      if (a.status === 'completed' && b.status === 'draft') return 1;
      return b.reportDate.localeCompare(a.reportDate);
    });

    const total = data.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: data.slice(start, end),
      total,
    };
  },

  async getById(id: string): Promise<LossReport> {
    await delay(50);
    const data = getStoredData();
    const report = data.find((r) => r.id === id);
    if (!report) throw new Error('신고 내역을 찾을 수 없습니다.');
    return report;
  },

  async saveDraft(reportData: Omit<LossReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<LossReport> {
    await delay(100);
    const data = getStoredData();
    const now = new Date().toISOString();
    const newReport: LossReport = { ...reportData, id: uuidv4(), createdAt: now, updatedAt: now };
    data.push(newReport);
    saveData(data);
    return newReport;
  },

  async updateDraft(id: string, reportData: Partial<LossReport>): Promise<LossReport> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('신고 내역을 찾을 수 없습니다.');
    const updatedReport: LossReport = { ...data[index]!, ...reportData, updatedAt: new Date().toISOString() };
    data[index] = updatedReport;
    saveData(data);
    return updatedReport;
  },

  async complete(id: string, reportData: Partial<LossReport>): Promise<LossReport> {
    await delay(100);
    const data = getStoredData();
    const index = data.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('신고 내역을 찾을 수 없습니다.');
    const now = new Date();
    const completedReport: LossReport = {
      ...data[index]!,
      ...reportData,
      status: 'completed',
      faxStatus: 'success',
      reportDate: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    data[index] = completedReport;
    saveData(data);
    return completedReport;
  },

  async delete(id: string): Promise<void> {
    await delay(100);
    const data = getStoredData();
    const filtered = data.filter((r) => r.id !== id);
    if (filtered.length === data.length) throw new Error('신고 내역을 찾을 수 없습니다.');
    saveData(filtered);
  },
};
