# Biskit HR System - 간이지급명세서 관리 시스템

회사에서 사용하는 간이지급명세서(근로소득, 사업소득, 기타소득) 관리 시스템입니다.

## 📋 프로젝트 개요

### 현재 구현된 모듈

- ✅ **사업소득 모듈** (완료)
  - 월별 사업소득 관리
  - 사업소득 합산 화면
  - 엑셀 업로드/다운로드
  - 추가/수정/삭제 기능

### 향후 추가 예정 모듈

- ⏳ 근로소득 모듈
- ⏳ 기타소득 모듈
- ⏳ 인사정보 모듈
- ⏳ 급여정보 모듈

## 🛠 기술 스택

- React 18 + Vite
- TypeScript (Strict Mode)
- Shadcn/ui (Tailwind CSS)
- TanStack Query (서버 상태)
- Zustand (클라이언트 상태)
- React Hook Form + Zod
- LocalStorage (데이터 저장소)
- UUID (고유 ID 생성)

## 🚀 빠른 시작

### 1. 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- 모던 브라우저 (LocalStorage 지원)

### 2. 설치 및 실행

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 3. 접속

- **애플리케이션**: http://localhost:5173

### 4. 데이터 저장

- 모든 데이터는 **브라우저 LocalStorage**에 저장됩니다
- 브라우저 캐시를 지우기 전까지 데이터가 유지됩니다
- 중요한 데이터는 정기적으로 백업하시기 바랍니다

## 📚 주요 기능

### 사업소득 합산 화면 (SPS_BI_01)

- 연도별 월별 합산 데이터 조회
- 12월 예외 행 표시 (보험설계사/음료배달/방문판매원)
- 신고파일 다운로드
- 엑셀 업로드
- 월별 상세 화면 이동

### 사업소득 월별 리스트 화면 (SPS_BI_02)

- 검색 기능 (성명/상호)
- 상단 요약 정보 (건수, 총 지급액, 총 소득세 등)
- 리스트 테이블 (체크박스 멀티 선택)
- 선택 삭제 / 전체 삭제
- 사업소득 추가 버튼
- **간이지급명세서 생성** (Popover 대상 선택 → 팝업)
- 엑셀 다운로드
- 페이지네이션 (15/30/50/100개)

### 사업소득 추가 팝업 (SPS_BI_03)

- 모든 필수 입력 항목
- 세율 자동 계산 (실시간)
- 소득세/지방소득세/실지급액 자동 계산
- 체크디짓 검증 (주민등록번호/사업자등록번호)
- 유효성 검증 (blur/submit)

### 사업소득 수정 팝업 (SPS_BI_04)

- 기존 데이터 수정
- 삭제 기능
- 세율 자동 재계산
- 유효성 검증

### 간이지급명세서 생성 팝업 (SPS_BI_08)

- **대상 선택 Popover**:
  - 조회된 전체 대상자 (현재 리스트 기준)
  - 선택 대상자 (체크박스 선택 기준)
- **상단 요약 정보**: 건수, 총 지급액, 총 소득세, 총 지방소득세, 총 실지급액
- **입력 항목 (10개, 모두 필수)**:
  - 상호(법인명), 대표자 성명, 사업자등록번호, 법인등록번호
  - 담당자 성명, 담당자 부서, 담당자 전화번호
  - 홈택스ID, 관할세무서 코드, 생성목적
- **기능**:
  - 입력값 LocalStorage 저장 (다음 생성 시 자동 불러오기)
  - 유효성 검증 (blur 시)
  - PDF 다운로드 (테스트용 빈 PDF)
  - 신고파일 최종생성일 업데이트
  - 닫기/이탈 방지 confirm (변경 사항 있을 때만)

### 엑셀 업로드 기능

- 엑셀 양식 다운로드
- 파일 업로드 (최대 10MB, .xlsx/.xls만 허용)
- Row 단위 유효성 검증
- 업로드 결과 표시 (성공/실패 건수)
- 실패 데이터 다운로드

## 💾 데이터 관리

### LocalStorage Keys

- `biskit_business_income`: 사업소득 데이터
- `biskit_industry_codes`: 업종코드 마스터 데이터
- `biskit_sps_bi_creation_form`: 간이지급명세서 생성 폼 입력값 (자동 저장/불러오기)

### 데이터 백업

브라우저 개발자 도구를 통해 데이터를 백업할 수 있습니다:

```javascript
// 데이터 백업
const backup = {
  business_income: localStorage.getItem('biskit_business_income'),
  industry_codes: localStorage.getItem('biskit_industry_codes'),
};
console.log(JSON.stringify(backup));

// 데이터 복원
localStorage.setItem('biskit_business_income', backup.business_income);
localStorage.setItem('biskit_industry_codes', backup.industry_codes);
```

## 🧮 비즈니스 로직

### 세율 자동 계산

| 조건 | 세율 |
|------|------|
| 기본 | 3% |
| 봉사료수취자 (940905) | 5% |
| 내국인 직업운동가 (940904) | 3% |
| 외국인 직업운동가 (940904) | 3% 또는 20% (사용자 선택) |

### 소액부징수

소득세가 1,000원 미만인 경우 소득세 = 0원

### 귀속 기준 예외 규칙

**예외 업종**: 보험설계사(940906), 음료배달(940907), 방문판매원(940908)

- 귀속연도 ≠ 지급연도 → 귀속연도 12월로 표시
- 귀속연도 = 지급연도 → 지급월 기준 표시

## 📂 프로젝트 구조

```
biskit-hr-system/
├── frontend/                   # 프론트엔드
│   ├── src/
│   │   ├── modules/
│   │   │   └── statement/
│   │   │       ├── components/
│   │   │       ├── pages/
│   │   │       ├── hooks/
│   │   │       ├── services/   # LocalStorage 기반 서비스
│   │   │       └── types/
│   │   ├── shared/
│   │   │   ├── components/ui/
│   │   │   └── lib/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── policy/                     # 정책 문서
│   ├── common/
│   │   ├── common-ui-policy.md
│   │   └── excel-upload-policy.md
│   └── SPS/BI/
│       ├── policy_사업소득합산_merged.md
│       ├── policy_사업소득월별리스트_merged.md
│       ├── policy_사업소득추가팝업_merged.md
│       ├── policy_사업소득수정팝업_merged.md
│       ├── policy_사업소득엑셀업로드_merged.md
│       └── policy_간이지급명세서생성팝업_merged.md
│
├── CLAUDE.md                   # 프로젝트 컨텍스트
└── README.md                   # 이 파일
```

## 🎯 코딩 규칙

### TypeScript

- ✅ Strict Mode 필수
- ❌ any 타입 사용 금지
- ✅ 모든 함수/변수에 명시적 타입 지정
- ✅ 함수형 컴포넌트만 사용

### 스타일

- ✅ ESLint + Prettier 준수
- ✅ 2 spaces 들여쓰기
- ✅ 세미콜론 사용
- ✅ 싱글 쿼트 사용

### UI

- ✅ Shadcn/ui 100% 사용
- ❌ 순수 HTML 태그 직접 사용 금지
- ❌ 인라인 스타일 금지
- ✅ Tailwind CSS className만 사용

## 📖 상세 문서

- [프론트엔드 README](./frontend/README.md)
- [프로젝트 컨텍스트 (CLAUDE.md)](./CLAUDE.md)

## ⚠️ 주의사항

1. **데이터 영속성**: LocalStorage 기반이므로 브라우저 캐시 삭제 시 데이터가 손실됩니다
2. **백업 권장**: 중요한 데이터는 정기적으로 백업하시기 바랍니다
3. **브라우저 호환성**: LocalStorage를 지원하는 모던 브라우저가 필요합니다
4. **저장 용량**: 브라우저 LocalStorage는 일반적으로 5-10MB 제한이 있습니다

## 🤝 기여 가이드

1. 새로운 모듈 추가 시 `modules/` 폴더 구조 유지
2. 공통 컴포넌트는 `shared/components/` 에 배치
3. 정책 문서 먼저 작성 후 개발 시작
4. TypeScript strict mode 준수
5. Shadcn/ui 컴포넌트만 사용
6. LocalStorage 서비스 패턴 준수

## 📝 라이선스

Private

## 👥 팀

- 개발자: LG
- AI 어시스턴트: Claude (Anthropic)
