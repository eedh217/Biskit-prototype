/**
 * 직원 관리 유효성 검증 유틸리티
 */

/**
 * 날짜 유효성 검증 (YYYYMMDD)
 */
export function isValidDate(dateStr: string): boolean {
  if (!/^\d{8}$/.test(dateStr)) {
    return false;
  }

  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);

  // 월 범위 체크
  if (month < 1 || month > 12) {
    return false;
  }

  // 일 범위 체크
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return false;
  }

  return true;
}

/**
 * 주민등록번호 유효성 검증
 * - 앞 6자리: 날짜 (YYMMDD)
 * - 뒤 7자리 첫 번째 숫자: 1,2 (1900년대) / 3,4 (2000년대)
 */
export function isValidResidentRegistrationNumber(
  front: string,
  back: string
): boolean {
  // 길이 체크
  if (front.length !== 6 || back.length !== 7) {
    return false;
  }

  // 숫자만 허용
  if (!/^\d{6}$/.test(front) || !/^\d{7}$/.test(back)) {
    return false;
  }

  // 앞 6자리 날짜 유효성 검증
  const yy = parseInt(front.substring(0, 2), 10);
  const mm = parseInt(front.substring(2, 4), 10);
  const dd = parseInt(front.substring(4, 6), 10);

  // 월 범위 체크
  if (mm < 1 || mm > 12) {
    return false;
  }

  // 세기 판별
  const genderCode = parseInt(back.charAt(0), 10);
  if (genderCode !== 1 && genderCode !== 2 && genderCode !== 3 && genderCode !== 4) {
    return false;
  }

  let year: number;
  if (genderCode === 1 || genderCode === 2) {
    year = 1900 + yy;
  } else {
    year = 2000 + yy;
  }

  // 일 범위 체크
  const daysInMonth = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return false;
  }

  return true;
}

/**
 * 외국인등록번호 유효성 검증
 * - 앞 6자리: 날짜 (YYMMDD)
 * - 뒤 7자리 첫 번째 숫자: 5,6 (1900년대) / 7,8 (2000년대)
 */
export function isValidForeignerRegistrationNumber(
  front: string,
  back: string
): boolean {
  // 길이 체크
  if (front.length !== 6 || back.length !== 7) {
    return false;
  }

  // 숫자만 허용
  if (!/^\d{6}$/.test(front) || !/^\d{7}$/.test(back)) {
    return false;
  }

  // 앞 6자리 날짜 유효성 검증
  const yy = parseInt(front.substring(0, 2), 10);
  const mm = parseInt(front.substring(2, 4), 10);
  const dd = parseInt(front.substring(4, 6), 10);

  // 월 범위 체크
  if (mm < 1 || mm > 12) {
    return false;
  }

  // 세기 판별
  const genderCode = parseInt(back.charAt(0), 10);
  if (genderCode !== 5 && genderCode !== 6 && genderCode !== 7 && genderCode !== 8) {
    return false;
  }

  let year: number;
  if (genderCode === 5 || genderCode === 6) {
    year = 1900 + yy;
  } else {
    year = 2000 + yy;
  }

  // 일 범위 체크
  const daysInMonth = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) {
    return false;
  }

  return true;
}

/**
 * 이메일 형식 검증
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 특수문자 포함 여부 체크
 */
export function hasSpecialCharacters(str: string): boolean {
  // 한글, 영문, 숫자, 공백만 허용
  const regex = /^[가-힣a-zA-Z0-9\s]*$/;
  return !regex.test(str);
}

/**
 * 허용된 특수문자만 포함하는지 체크 (사번용)
 * 허용 특수문자: !"#$%&'()*+,-./:;<>=?@[\]^_`{|}~
 */
export function isValidEmployeeNumber(str: string): boolean {
  // 한글, 영문, 숫자, 허용된 특수문자만 허용
  const regex = /^[가-힣a-zA-Z0-9!"#$%&'()*+,\-./:;<>=?@\[\\\]^_`{|}~]*$/;
  return regex.test(str);
}

/**
 * 연락처 형식 검증 (+ ( ) - 숫자만 허용)
 */
export function isValidContact(contact: string): boolean {
  const regex = /^[0-9+\-() ]*$/;
  return regex.test(contact);
}

/**
 * 휴대폰번호 숫자만 체크
 */
export function isOnlyDigits(str: string): boolean {
  return /^\d*$/.test(str);
}

/**
 * 여권번호 유효성 검증 (특수문자 불가)
 */
export function isValidPassportNumber(str: string): boolean {
  // 영문, 숫자만 허용
  const regex = /^[a-zA-Z0-9]*$/;
  return regex.test(str);
}
