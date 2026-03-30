/**
 * 대한민국 시중 은행 목록
 */
export const BANKS = [
  { code: 'KB', name: 'KB국민은행' },
  { code: 'SHINHAN', name: '신한은행' },
  { code: 'WOORI', name: '우리은행' },
  { code: 'HANA', name: '하나은행' },
  { code: 'NH', name: 'NH농협은행' },
  { code: 'IBK', name: 'IBK기업은행' },
  { code: 'KBANK', name: '케이뱅크' },
  { code: 'KAKAO', name: '카카오뱅크' },
  { code: 'TOSS', name: '토스뱅크' },
  { code: 'SC', name: 'SC제일은행' },
  { code: 'CITI', name: '씨티은행' },
  { code: 'BUSAN', name: '부산은행' },
  { code: 'KYONGNAM', name: '경남은행' },
  { code: 'DAEGU', name: '대구은행' },
  { code: 'KWANGJU', name: '광주은행' },
  { code: 'JEONBUK', name: '전북은행' },
  { code: 'JEJU', name: '제주은행' },
  { code: 'KDB', name: 'KDB산업은행' },
  { code: 'SUHYUP', name: '수협은행' },
] as const;

export type BankCode = (typeof BANKS)[number]['code'];
