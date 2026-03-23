# Biskit HR System - Frontend

간이지급명세서 관리 시스템 프론트엔드

## 🛠 기술 스택

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript (Strict Mode)
- **UI Library**: Shadcn/ui (Tailwind CSS)
- **State Management**:
  - React Query (서버 상태)
  - Zustand (클라이언트 상태)
- **Form**: React Hook Form + Zod
- **HTTP Client**: Axios

## 📦 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
VITE_API_URL=http://localhost:3000/api
```

### 3. 개발 서버 실행

```bash
npm run dev
```

애플리케이션이 http://localhost:5173 에서 실행됩니다.

## 🎨 화면 구성

### 1. 사업소득 합산 화면 (SPS_BI_01)

**URL**: `/statement/business-income`

**기능**:
- 연도별 월별 합산 데이터 조회
- 12월 예외 행 표시 (보험설계사/음료배달/방문판매원)
- 신고파일 다운로드
- 엑셀 업로드
- 월별 상세 화면 이동

### 2. 사업소득 월별 리스트 화면 (SPS_BI_02)

**URL**: `/statement/business-income/monthly?year=2026&month=3`

**기능**:
- 검색 (성명/상호)
- 상단 요약 정보
- 리스트 테이블 (체크박스 멀티 선택)
- 선택 삭제 / 전체 삭제
- 사업소득 추가
- 엑셀 다운로드
- 페이지네이션 (15/30/50/100개)

### 3. 사업소득 추가 팝업 (SPS_BI_03)

**기능**:
- 모든 필수 입력 항목
- 세율 자동 계산 (실시간)
- 소득세/지방소득세/실지급액 자동 계산
- 체크디짓 검증
- 유효성 검증 (blur/submit)

### 4. 사업소득 수정 팝업 (SPS_BI_04)

**기능**:
- 기존 데이터 수정
- 삭제 기능
- 세율 자동 재계산
- 유효성 검증

### 5. 엑셀 업로드 기능

**기능**:
- 엑셀 양식 다운로드
- 파일 업로드 (최대 10MB, .xlsx/.xls만 허용)
- Row 단위 유효성 검증
- 업로드 결과 표시 (성공/실패 건수)
- 실패 데이터 다운로드

## 🗂 프로젝트 구조

```
frontend/
├── src/
│   ├── modules/
│   │   └── statement/
│   │       ├── components/
│   │       │   ├── BusinessIncomeAddDialog.tsx
│   │       │   ├── BusinessIncomeEditDialog.tsx
│   │       │   └── ExcelUploadDialog.tsx
│   │       ├── pages/
│   │       │   ├── BusinessIncomeSummary.tsx
│   │       │   └── BusinessIncomeMonthlyList.tsx
│   │       ├── hooks/
│   │       │   └── useBusinessIncome.ts
│   │       ├── services/
│   │       │   └── business-income.service.ts
│   │       └── types/
│   │           └── business-income.types.ts
│   ├── shared/
│   │   ├── components/
│   │   │   └── ui/                # Shadcn UI 컴포넌트
│   │   │       ├── button.tsx
│   │   │       ├── input.tsx
│   │   │       ├── select.tsx
│   │   │       ├── table.tsx
│   │   │       ├── checkbox.tsx
│   │   │       └── dialog.tsx
│   │   └── lib/
│   │       ├── api.ts             # Axios 인스턴스
│   │       └── utils.ts           # 유틸리티 함수
│   ├── App.tsx                    # 라우팅
│   └── main.tsx                   # 진입점
└── package.json
```

## 🎨 Shadcn UI 컴포넌트

### 사용된 컴포넌트

- **Button**: 모든 버튼 (추가, 삭제, 검색 등)
- **Input**: 텍스트 입력 필드
- **Select**: 드롭다운 셀렉트
- **Table**: 데이터 테이블
- **Checkbox**: 체크박스 (멀티 선택)
- **Dialog**: 팝업 (추가/수정/엑셀 업로드)

### 스타일링

- **Tailwind CSS**: 모든 스타일링
- **cn() 유틸리티**: 조건부 클래스 결합

## 📊 상태 관리

### React Query

- **useBusinessIncomeSummary**: 합산 데이터 조회
- **useBusinessIncomeList**: 월별 리스트 조회
- **useBusinessIncomeDetail**: 상세 조회
- **useIndustryCodes**: 업종코드 조회
- **useCreateBusinessIncome**: 사업소득 추가
- **useUpdateBusinessIncome**: 사업소득 수정
- **useDeleteBusinessIncome**: 사업소득 삭제
- **useDeleteManyBusinessIncome**: 선택 삭제

### 캐싱 전략

- 업종코드: `staleTime: Infinity` (변경 없음)
- 사업소득 데이터: 자동 갱신 (mutation 후 invalidate)

## 🧮 유틸리티 함수

### 금액 포맷팅

```typescript
formatCurrency(1000000) // "1,000,000원"
```

### 날짜 포맷팅

```typescript
formatDate("2026-03-15") // "2026-03-15"
formatDateTime("2026-03-15T10:30:00") // "2026-03-15 10:30:00"
```

### 세율 자동 계산

```typescript
calculateTaxes({
  paymentSum: 1000000,
  isForeign: false,
  industryCode: "940903",
  taxRate: 3
})
// {
//   taxRate: 3,
//   incomeTax: 30000,
//   localIncomeTax: 3000,
//   actualPayment: 967000
// }
```

### 체크디짓 검증

```typescript
validateCheckDigit("1234567890123") // true/false
```

## 🚀 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

## 🔧 코딩 규칙

### TypeScript

- **Strict Mode**: 모든 strict 옵션 활성화
- **any 타입 금지**: ESLint error
- **명시적 타입 지정**: 모든 함수/변수

### 컴포넌트

- **함수형 컴포넌트만 사용**
- **React Hooks 활용**
- **Shadcn UI 100% 사용** (순수 HTML 태그 금지)

### 스타일

- **Tailwind CSS만 사용**
- **인라인 스타일 금지**
- **className으로 스타일 적용**

## 🛠 유틸리티 명령어

```bash
# 타입 체크
npm run build

# 린트
npm run lint

# 포맷
npm run format
```
