import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * 숫자를 천 단위 콤마 포맷으로 변환
 * @param value - 포맷팅할 숫자
 * @returns 천 단위 콤마가 포함된 문자열 (예: "1,000,000")
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

/**
 * 천 단위 콤마가 포함된 문자열을 숫자로 변환
 * @param value - 변환할 문자열
 * @returns 숫자 (변환 실패 시 0)
 */
export function parseFormattedNumber(value: string): number {
  const parsed = parseInt(value.replace(/,/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 인풋 필드에서 입력된 값을 포맷팅 (양수만 허용, 천 단위 콤마 추가)
 * @param value - 입력된 문자열
 * @returns 포맷팅된 문자열 (숫자가 아닌 문자 제거, 천 단위 콤마 추가)
 */
export function formatNumberInput(value: string): string {
  // 숫자만 추출
  const digitsOnly = value.replace(/\D/g, '');

  // 빈 문자열이면 그대로 반환
  if (digitsOnly === '') {
    return '';
  }

  // 숫자로 변환 후 천 단위 콤마 추가
  const number = parseInt(digitsOnly, 10);
  return formatNumber(number);
}
