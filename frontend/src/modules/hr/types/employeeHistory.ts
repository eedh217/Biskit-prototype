/**
 * 직원 정보 이력 관리
 */

export type HistoryCategory = 'personal' | 'organization' | 'salary';

export interface EmployeeHistoryChange {
  fieldName: string; // 필드명 (예: "기본급", "부서", "직급")
  fieldKey: string; // 실제 필드 키 (예: "salaryAmount", "departmentId")
  oldValue: unknown; // 변경 전 값 (any type 지원)
  newValue: unknown; // 변경 후 값 (any type 지원)
  displayOldValue: string; // 화면에 표시할 변경 전 값
  displayNewValue: string; // 화면에 표시할 변경 후 값
}

export interface EmployeeHistory {
  id: string;
  employeeId: string; // 직원 ID
  category: HistoryCategory; // 카테고리 (personal, organization, salary)
  categoryName: string; // 카테고리명 (개인정보, 조직정보, 급여정보)
  changes: EmployeeHistoryChange[]; // 변경 항목들
  modifiedBy: string; // 수정자 (현재는 "관리자"로 고정)
  modifiedAt: string; // 수정 일시 (ISO 8601 형식)
}

export interface CreateEmployeeHistoryDto {
  employeeId: string;
  category: HistoryCategory;
  categoryName: string;
  changes: EmployeeHistoryChange[];
  modifiedBy: string;
}
