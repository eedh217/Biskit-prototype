// 신고 상태
export type ReportStatus = 'draft' | 'completed';

// 팩스 발송 상태
export type FaxStatus = 'sending' | 'success' | 'failed';

// 기본 보험 신고 인터페이스
export interface BaseInsuranceReport {
  id: string;
  reportDate: string; // ISO 형식 - 신고일시 (작성중: 임시저장 날짜, 신고완료: 신고완료 날짜+시각)
  status: ReportStatus; // 상태 (작성중, 신고완료)
  faxStatus: FaxStatus; // 팩스 발송 상태
  createdAt: string; // 최초 작성일시
  updatedAt: string; // 최종 수정일시
}

// 자격취득신고
export interface AcquisitionReport extends BaseInsuranceReport {
  employees: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
  }>;
  // 신고 화면의 입력 데이터 (임시저장 시 필요)
  formData?: any;
}

// 상실신고
export interface LossReport extends BaseInsuranceReport {
  employees: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
  }>;
  formData?: any;
}

// 피부양자 관리
export interface DependentReport extends BaseInsuranceReport {
  employees: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
  }>;
  dependents: Array<{
    dependentName: string;
  }>;
  formData?: any;
}

// 보수월액변경신고
export interface SalaryChangeReport extends BaseInsuranceReport {
  employees: Array<{
    employeeId: string;
    employeeName: string;
    employeeNumber: string;
  }>;
  formData?: any;
}

// 리스트 응답
export interface ReportListResponse<T> {
  data: T[];
  total: number;
}
