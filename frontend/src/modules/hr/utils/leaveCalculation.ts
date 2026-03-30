import type { Employee } from '../types/employee';
import { parseDateString } from './dateUtils';

/**
 * 입사일 기준 연차 계산
 * - 1년 미만: 매월 입사일에 월차 1개씩 발생
 * - 1년 경과: 15일 + 근속가산 (2년마다 1일, 최대 25일)
 *
 * 예: 2025년 8월 5일 입사
 * - 2025년: 9/5, 10/5, 11/5, 12/5 = 4개
 * - 2026년: 1/5~7/5 (7개) → 8/5 이후 15개
 */
export function calculateAnnualLeaveByJoinDate(
  employee: Employee,
  targetYear: number
): number {
  const joinDate = parseDateString(employee.joinDate);
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth(); // 0-based

  // 입사일로부터 1년 경과 날짜
  const oneYearLater = new Date(joinDate);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const oneYearLaterYear = oneYearLater.getFullYear();

  const today = new Date();

  // 케이스 1: 입사년도
  if (targetYear === joinYear) {
    // 입사월 다음 달부터 12월까지 월차 (매월 입사일)
    // 예: 8월(7) 입사 → 9월~12월 = 4개월
    return Math.max(0, 12 - joinMonth - 1);
  }

  // 케이스 2: 1년 경과 연도
  if (targetYear === oneYearLaterYear) {
    // 현재 날짜가 1년 경과일 이후면 15개, 이전이면 월차
    if (today >= oneYearLater) {
      return 15;
    } else {
      // 1년 미만 → 1월~입사월까지 월차
      // 예: 8월(7) 1년 경과 → 1월~7월 = 7개
      return joinMonth;
    }
  }

  // 케이스 3: 1년 경과 연도 이후
  if (targetYear > oneYearLaterYear) {
    // 근속연수 계산 (1년 경과년도 기준)
    const yearsWorked = targetYear - oneYearLaterYear + 1;
    let annualLeave = 15;
    const additionalDays = Math.min(Math.floor((yearsWorked - 1) / 2), 10);
    return annualLeave + additionalDays;
  }

  // 케이스 4: 입사 다음 해 ~ 1년 경과 전
  // 1월~12월 매월 입사일에 1개씩
  return 12;
}

/**
 * 연초 기준 연차 계산
 * - 입사년도: 입사월 다음 달부터 12월까지 월차 1개씩
 * - 다음 해 (1년 미만): 비례 부여 (15 × 전년도 근무개월 / 12)
 * - 1년 이상: 전체 지급 (15 + 근속가산)
 */
export function calculateAnnualLeaveByYearStart(
  employee: Employee,
  targetYear: number,
  roundingMethod: 'floor' | 'ceil'
): number {
  const joinDate = parseDateString(employee.joinDate);
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth(); // 0-based

  // 케이스 1: 입사년도 (월차 부여)
  if (joinYear === targetYear) {
    // 입사월 다음 달부터 12월까지 월차 1개씩
    // 예: 5월(4) 입사 → 6월~12월 = 7개
    const monthsUntilYearEnd = 12 - joinMonth - 1;
    return Math.max(0, monthsUntilYearEnd);
  }

  // 케이스 2: 입사년도 이후
  const yearStartDate = new Date(targetYear, 0, 1); // 1월 1일

  // 입사일이 목표 연도 이후면 0
  if (joinDate > yearStartDate) {
    return 0;
  }

  // 입사일부터 목표 연도 1월 1일까지의 근속 개월 수
  const monthsWorked = calculateMonthsBetween(joinDate, yearStartDate);

  // 1년 미만 (비례 부여)
  if (monthsWorked < 12) {
    // 전년도 근무 개월수 = 입사월부터 12월까지
    const previousYearMonths = 12 - joinMonth;
    const proportionalDays = 15 * previousYearMonths / 12;

    // 소수점 처리
    return roundingMethod === 'floor'
      ? Math.floor(proportionalDays)
      : Math.ceil(proportionalDays);
  }

  // 1년 이상 (전체 지급 + 근속가산)
  const yearsWorked = Math.floor(monthsWorked / 12);

  // 기본 15일
  let annualLeave = 15;

  // 근속가산: 2년마다 1일 추가 (최대 10일까지)
  const additionalDays = Math.min(Math.floor((yearsWorked - 1) / 2), 10);
  annualLeave += additionalDays;

  return annualLeave;
}

/**
 * 두 날짜 사이의 개월 수 계산
 */
function calculateMonthsBetween(startDate: Date, endDate: Date): number {
  const yearDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthDiff = endDate.getMonth() - startDate.getMonth();
  let months = yearDiff * 12 + monthDiff;

  // 일 단위 보정 (시작일보다 종료일의 일자가 작으면 1개월 차감)
  if (endDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

/**
 * 연차 발생 계산 (설정에 따라)
 */
export function calculateAnnualLeave(
  employee: Employee,
  targetYear: number,
  grantType: 'join_date' | 'year_start',
  roundingMethod: 'floor' | 'ceil' = 'floor'
): number {
  if (grantType === 'join_date') {
    return calculateAnnualLeaveByJoinDate(employee, targetYear);
  } else {
    return calculateAnnualLeaveByYearStart(employee, targetYear, roundingMethod);
  }
}
