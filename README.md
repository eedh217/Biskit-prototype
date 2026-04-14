# Biskit HR System - 인사정보 및 간이지급명세서 관리 시스템

회사에서 사용하는 통합 HR 시스템으로, 인사정보 관리와 간이지급명세서(근로소득, 사업소득, 기타소득) 관리를 제공합니다.

## 📋 프로젝트 개요

### 현재 구현된 모듈

- ✅ **인사정보 모듈** (핵심 기능 완료)
  - 직원 관리 (등록/수정/삭제/상세/검색/다중 삭제)
  - 부서 관리 (조직도 트리, 드래그앤드롭)
  - 직급 관리 (인라인 편집, 순서 변경)
  - 근로형태 관리 (인라인 편집, 순서 변경)
  - 이력 관리 (발령 이력 타임라인)
  - 연차/휴가 관리 (기본 구조 구현, 4개 탭)

- ✅ **간이지급명세서 - 사업소득** (완료)
  - 월별 사업소득 관리 (검색, CRUD, 다중 삭제)
  - 전체 사업소득 목록 (지급 기준)
  - 사업소득 합산 화면 (연도별 타일)
  - 간이지급명세서 생성 (PDF 다운로드)
  - 엑셀 업로드/다운로드 (UI 준비)

- ✅ **간이지급명세서 - 기타소득** (완료)
  - 월별 기타소득 관리 (검색, CRUD, 다중 삭제)
  - 전체 기타소득 목록 (지급 기준)
  - 기타소득 합산 화면 (연도별 타일)
  - 간이지급명세서 생성 (PDF 다운로드)
  - 엑셀 업로드/다운로드 (UI 준비)

### 향후 추가 예정 모듈

- ⏳ **근로소득** (메뉴만 준비)
- ⏳ **근태관리** (메뉴만 준비)
- ⏳ **연차/휴가 관리** (탭 구조 완료, 세부 기능 진행 중)
- ⏳ **급여정보 모듈** (미구현)

## 🛠 기술 스택

### 핵심 기술
- **React 18** + **Vite** (빌드 도구)
- **TypeScript** (Strict Mode)
- **Shadcn/ui** + **Tailwind CSS** (UI 라이브러리)
- **LocalStorage** (데이터 저장소)
- **UUID** (고유 ID 생성)

### 주요 라이브러리
- **TanStack Table** v8 (데이터 테이블)
- **@dnd-kit** (드래그앤드롭)
- **Lucide React** (아이콘)
- **date-fns** (날짜 처리)
- **Axios** (설치됨, 현재 미사용)

### 설치되었으나 미사용
- ~~TanStack Router~~ (클라이언트 기반 라우팅 사용)
- ~~TanStack Query~~ (LocalStorage 서비스 직접 사용)
- ~~Zustand~~ (React Hooks로 상태 관리)
- ~~React Hook Form + Zod~~ (수동 폼 관리)

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
- **기본 화면**: 사업소득 월별 리스트

### 4. 더미 데이터 생성

직원 목록 화면(`/hr/employee`)에서 **"더미 데이터 생성"** 버튼을 클릭하면 테스트용 직원 데이터를 자동 생성할 수 있습니다.

### 5. 데이터 저장

- 모든 데이터는 **브라우저 LocalStorage**에 저장됩니다
- 브라우저 캐시를 지우기 전까지 데이터가 유지됩니다
- 중요한 데이터는 정기적으로 백업하시기 바랍니다

## 📚 주요 기능

## 📍 라우팅 구조

```
/                                                  → 사업소득 월별 리스트 (기본)
/statement/earned-income                           → 준비중 (근로소득)
/statement/business-income                         → 사업소득 월별 리스트
/statement/business-income/monthly?year=YYYY&month=MM → 특정 월 사업소득
/statement/business-income/all                     → 전체 사업소득 (지급 기준)
/statement/other-income                            → 기타소득 월별 리스트
/statement/other-income/monthly?year=YYYY&month=MM → 특정 월 기타소득
/statement/other-income/all                        → 전체 기타소득 (지급 기준)
/hr/employee                                       → 직원 목록
/hr/employee/add                                   → 직원 등록
/hr/employee/:id                                   → 직원 상세
/hr/organization/department                        → 부서 관리
/hr/organization/position                          → 직급 관리
/hr/organization/employment-type                   → 근로형태 관리
/hr/leave                                          → 연차/휴가 관리
/hr/attendance                                     → 준비중 (근태관리)
```

---

## 인사정보 모듈 (HR Module)

### 직원 관리 (HRIS_EMP_01, 02, 03)

- **직원 목록 화면**:
  - 검색 기능 (성명, 사번)
  - 필터링 (부서, 직급, 재직상태)
  - 페이지네이션
  - 엑셀 다운로드
  - 선택 삭제 / 전체 삭제

- **직원 등록 화면**:
  - **개인정보**:
    - 내외국인 구분 (내국인/외국인)
    - 신분증 정보 (주민등록번호/외국인등록번호/여권번호)
    - 국적 (ISO 3166-1 alpha-2, 194개 국가)
    - 거주구분 (거주자/비거주자)
    - 장애여부 (해당없음/장애인/상이자/중증장애인)
    - 이메일, 연락처, 휴대폰번호
    - 주소 (우편번호 검색)
  - **조직정보**:
    - 사번 (자동 생성 또는 수동 입력)
    - 입사일, 퇴사일
    - 부서 (조직도 트리에서 선택)
    - 직급 (직급 관리에서 등록한 직급)
    - 근로형태 (근로형태 관리에서 등록한 근로형태)
    - 부서장 여부
  - **급여정보**:
    - 급여 타입 (연봉/시급)
    - 급여 금액
    - 식대 (연봉: 월, 시급: 일)
    - 은행명, 예금주, 계좌번호

- **직원 상세 화면**:
  - 기본정보 표시 (개인정보/조직정보/급여정보)
  - 재직/퇴사 상태 표시
  - 근속기간 자동 계산 (N년 N개월)
  - 정보 수정 다이얼로그 (개인정보/조직정보/급여정보 각각 분리)
  - 이력 타임라인 (발령 이력)

### 부서 관리 (HRIS_DEPT_01)

- **조직도 트리 구조**:
  - 계층형 부서 구조 (depth, order 관리)
  - 부서별 재직자 수 표시
  - 부서 추가/수정/삭제
  - 부서 이동 (순서 변경, 상위 부서 변경)
- **부서 상세**:
  - 선택한 부서의 직원 목록 표시
  - 부서 정보 수정/삭제

### 직급 관리 (HRIS_POS_01)

- 직급 목록 (데이터테이블)
- 직급 추가/수정/삭제
- 표시순서 관리

### 근로형태 관리 (HRIS_EMP_TYPE_01)

- 근로형태 목록 (데이터테이블)
- 근로형태 추가/수정/삭제
- 표시순서 관리

### 이력 관리

- 직원 상세 화면에서 이력 타임라인 표시
- 이력 유형: 입사, 퇴사, 부서이동, 직급변경, 급여변경 등
- 이력 등록/수정/삭제

### 연차/휴가 관리 (HRIS_LEAVE_01~04) ⏳ 기본 구조

- **휴가 현황**: 부서별/직원별 연차 사용 현황
- **휴가 승인**: 휴가 신청 목록 및 승인/반려
- **휴가 종류 관리**: 연차, 반차, 병가 등 휴가 타입 관리
- **설정**: 연차 자동 부여 규칙, 공휴일 관리 등

---

## 간이지급명세서 모듈 (Statement Module)

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

**인사정보 모듈:**
- `biskit_employees`: 직원 데이터
- `biskit_organizations`: 부서/조직 데이터
- `biskit_job_levels`: 직급 마스터 데이터
- `biskit_employment_types`: 근로형태 마스터 데이터
- `biskit_employee_history`: 직원 이력 데이터 (발령 이력)
- `biskit_leave_requests`: 휴가 신청 내역
- `biskit_leave_balance`: 직원별 연차 잔여일
- `biskit_leave_history`: 휴가 사용 이력
- `biskit_leave_settings`: 연차 부여 설정
- `biskit_holidays`: 공휴일 데이터
- `biskit_vacation_types`: 휴가 종류 (연차, 반차, 병가 등)

**간이지급명세서 모듈:**
- `biskit_business_income`: 사업소득 데이터
- `biskit_other_income`: 기타소득 데이터
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
│   │   │   ├── hr/             # 인사정보 모듈
│   │   │   │   ├── components/ # 직원/부서 관련 컴포넌트
│   │   │   │   ├── pages/      # EmployeeList, AddEmployee, EmployeeDetail, DepartmentManagement 등
│   │   │   │   ├── hooks/      # useEmployee
│   │   │   │   ├── services/   # LocalStorage 기반 서비스
│   │   │   │   ├── types/      # employee, organization, jobLevel, employmentType 등
│   │   │   │   └── utils/      # validation
│   │   │   └── statement/      # 간이지급명세서 모듈
│   │   │       ├── components/
│   │   │       ├── pages/
│   │   │       ├── hooks/
│   │   │       ├── services/   # LocalStorage 기반 서비스
│   │   │       └── types/
│   │   ├── shared/
│   │   │   ├── components/
│   │   │   │   ├── ui/         # shadcn 컴포넌트
│   │   │   │   ├── layout/     # MainLayout, Sidebar, LNB
│   │   │   │   └── common/     # DataTable, TabContainer, PageHeader
│   │   │   ├── constants/      # countries (ISO 국가 코드)
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── policy/                     # 정책 문서
│   ├── common/
│   │   ├── common-ui-policy.md
│   │   └── excel-upload-policy.md
│   ├── HRIS/                   # 인사정보 정책 (예정)
│   └── SPS/
│       ├── BI/                 # 사업소득
│       └── OI/                 # 기타소득
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

- **[프로젝트 개발 가이드 (CLAUDE.md)](./CLAUDE.md)** - 개발 규칙, 정책, 워크플로우
- **[디자인 시스템 (DESIGN.md)](./DESIGN.md)** - 색상, 타이포그래피, 레이아웃, 컴포넌트 스타일
- [프론트엔드 README](./frontend/README.md)

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
