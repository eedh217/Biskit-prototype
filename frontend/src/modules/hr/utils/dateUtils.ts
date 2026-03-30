import type { Holiday } from '../types/leave';

/**
 * YYYYMMDD 형식의 문자열을 Date 객체로 변환
 */
export function parseDateString(dateStr: string): Date {
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-based
  const day = parseInt(dateStr.substring(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * Date 객체를 YYYYMMDD 형식으로 변환
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 주말 여부 체크
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
}

/**
 * 공휴일 여부 체크
 */
export function isHoliday(dateStr: string, holidays: Holiday[]): boolean {
  return holidays.some((holiday) => holiday.date === dateStr);
}

/**
 * 평일 개수 계산 (주말 제외, 공휴일 제외)
 * @param startDate YYYYMMDD
 * @param endDate YYYYMMDD
 * @param holidays 공휴일 목록
 * @returns 평일 개수
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  holidays: Holiday[]
): number {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dateStr = formatDateToYYYYMMDD(current);

    // 주말이 아니고 공휴일이 아니면 평일
    if (!isWeekend(current) && !isHoliday(dateStr, holidays)) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/**
 * 두 날짜 사이의 일수 계산 (당일 포함)
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // 당일 포함
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 */
export function getTodayYYYYMMDD(): string {
  return formatDateToYYYYMMDD(new Date());
}

/**
 * 연도 추출
 */
export function getYear(dateStr: string): number {
  return parseInt(dateStr.substring(0, 4), 10);
}
