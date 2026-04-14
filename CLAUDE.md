# Biskit HR System - 개발 가이드

> **중요**: UI/디자인 관련 규칙은 [`DESIGN.md`](./DESIGN.md) 문서를 참조하세요.
>
> - **DESIGN.md**: 색상, 타이포그래피, 레이아웃, 컴포넌트 스타일 등 디자인 시스템
> - **CLAUDE.md**: 개발 규칙, 정책, 워크플로우, 코딩 컨벤션 (이 문서)

---

## ⚠️ 최우선 개발 원칙 (매우 중요)

### 1. Policy 문서 기준 필수
- **모든 구현은 반드시 `policy/` 디렉토리의 정책 문서를 기준으로 해야 합니다**
- Policy 문서에 명시되지 않은 기능은 임의로 구현하지 않습니다
- Policy 문서의 내용과 다르게 구현하면 안 됩니다

### 2. 애매한 부분은 반드시 질문
- Policy 문서에 **모호하거나 애매한 표현**이 있으면 즉시 질문합니다
- **정의되지 않은 정책**이 있으면 구현하지 말고 반드시 질문합니다
- 추측하거나 임의로 해석하지 않습니다

### 3. 요청하지 않은 부분 수정/추가 금지
- 사용자가 **명시적으로 요청하지 않은 기능**은 추가하지 않습니다
- 사용자가 **요청하지 않은 코드**는 수정하지 않습니다
- "더 나은 UX", "개선", "최적화" 등의 이유로 임의로 변경하지 않습니다

### 4. 필요한 부분은 사전 질문
- 구현을 위해 **꼭 필요한 정보**가 부족하면 먼저 질문합니다
- 여러 구현 방법이 있을 때는 사용자에게 선택을 요청합니다
- 확신이 없으면 구현하지 말고 질문합니다

### 5. 기존 코드에 영향을 주는 변경 시 필수 질문 (매우 중요)
- **공통 컴포넌트나 유틸리티 파일을 수정할 때는 반드시 먼저 질문합니다**
- 다른 파일에서 사용 중인 컴포넌트/함수/타입을 변경할 때는 영향 범위를 확인하고 질문합니다
- 예시:
  - `ui/` 폴더의 shadcn 컴포넌트 수정 시
  - `shared/` 폴더의 공통 컴포넌트 수정 시
  - `types/` 폴더의 공통 타입 수정 시
  - `lib/` 폴더의 유틸리티 함수 수정 시
- **절대 규칙: 기존 코드에 영향을 줄 수 있는 변경은 사용자 승인 없이 진행하지 않습니다**

## Additional Important Rules

### 6. 코드 출력 규칙
- 코드는 생략하지 말고 완전한 형태로 작성합니다
- 여러 파일 수정 시 파일별로 구분해서 작성합니다
- 실행 가능한 상태의 코드만 제공합니다

### 7. 기술 스택 준수
- 기존 프로젝트의 기술 스택을 벗어나지 않습니다
- 새로운 라이브러리는 사용자 승인 없이 추가하지 않습니다

### 8. 불필요한 변경 금지 (보강)
- 리팩토링, 코드 스타일 변경, 파일 구조 변경은 요청 시에만 수행합니다

### 9. UI / 레이아웃 변경 금지 및 디자인 일관성 유지 (매우 중요)

**모든 UI/디자인 관련 규칙은 [`DESIGN.md`](./DESIGN.md) 문서를 따릅니다.**

- 요청한 기능과 직접 관련 없는 UI 변경은 절대 하지 않습니다
- 기존 레이아웃, 간격, 크기, 정렬을 임의로 변경하지 않습니다
- 버튼 위치, 컴포넌트 크기, 팝업 사이즈를 변경하지 않습니다
- 기존에 개발된 UI 스타일과 반드시 동일한 패턴을 유지합니다
- 새로운 디자인을 임의로 만들지 않습니다
- "더 나은 UX", "디자인 개선", "정렬 수정" 등의 이유로 변경하지 않습니다
- UI 변경이 필요하다고 판단되면 반드시 먼저 사용자에게 질문합니다
- **디자인 시스템 상세 내용**: [`DESIGN.md`](./DESIGN.md) 참조

### 10. 변경 범위 최소화 (강제)

- 요청한 기능과 관련된 코드만 수정합니다
- 수정 범위를 파일 단위가 아닌 "라인 단위"로 최소화합니다
- 불필요한 코드 이동, 정렬 변경, 스타일 변경을 금지합니다

### 개발 시작 전 체크리스트
- [ ] **[`DESIGN.md`](./DESIGN.md) 문서를 확인했는가?** (UI/디자인 규칙)
- [ ] Policy 문서를 확인했는가? (`policy/` 디렉토리)
- [ ] 요구사항이 명확한가?
- [ ] 모호한 부분이 있는가? → 질문 필요
- [ ] Policy 문서에 없는 기능인가? → 질문 필요
- [ ] 요청하지 않은 추가 기능은 없는가?
- [ ] **기존 코드(공통 컴포넌트, 유틸리티 등)를 수정하는가? → 반드시 질문 필요**

## 프로젝트 개요

회사에서 사용하는 HR 시스템으로, 인사정보 관리와 간이지급명세서(근로소득, 사업소득, 기타소득) 관리를 통합한 시스템입니다.
향후 급여정보 모듈을 추가할 수 있는 확장 가능한 구조로 설계되었습니다.

### 현재 구현된 모듈

#### 1. 인사정보 모듈 (HR Module) - 핵심 기능 완료
- **직원 관리**: 등록/수정/삭제/상세/검색/다중 삭제, 더미 데이터 생성
- **부서 관리**: 트리 구조의 조직도, 드래그앤드롭, 부서별 직원 목록
- **직급 관리**: 인라인 편집, 순서 변경 (드래그앤드롭)
- **근로형태 관리**: 인라인 편집, 순서 변경 (드래그앤드롭)
- **이력 관리**: 발령 이력 타임라인 (입사/퇴사/이동/승진 등)
- **연차/휴가 관리**: 기본 구조 (4개 탭: 현황/승인/종류관리/설정) ⏳

#### 2. 간이지급명세서 모듈 (Statement Module) - 완료
- **사업소득**: 월별 리스트, 전체 목록, 합산, CRUD, 간이지급명세서 생성
- **기타소득**: 월별 리스트, 전체 목록, 합산, CRUD, 간이지급명세서 생성
- **근로소득**: 메뉴만 준비 ⏳

## 기술 스택

### 실제 사용 중
- **React 18** + **Vite** (빌드 도구)
- **TypeScript** (strict mode)
- **shadcn/ui** + **Tailwind CSS** (UI 라이브러리)
- **TanStack Table** v8 (데이터 테이블)
- **@dnd-kit** (드래그앤드롭)
- **LocalStorage** (데이터 저장소)
- **UUID** (고유 ID 생성)
- **Lucide React** (아이콘)
- **date-fns** (날짜 처리)

### 설치되었으나 미사용
- ~~TanStack Router~~ → 클라이언트 기반 라우팅 사용 (`window.location`, `history.pushState`)
- ~~TanStack Query~~ → LocalStorage 서비스 직접 사용
- ~~Zustand~~ → React Hooks로 상태 관리
- ~~React Hook Form + Zod~~ → 수동 폼 관리
- ~~Axios~~ → 현재 API 호출 없음 (LocalStorage만 사용)

## 코딩 규칙

### TypeScript
- **strict mode 필수**
- **any 타입 사용 금지**
- 모든 함수/변수에 명시적 타입 지정
- 함수형 컴포넌트만 사용 (클래스 컴포넌트 금지)

### 코드 스타일
- ESLint + Prettier 기준 준수
- 2 spaces 들여쓰기
- 세미콜론 사용
- 싱글 쿼트 사용

### 컴포넌트 규칙
- 함수형 컴포넌트만 사용
- React Hooks 활용
- 재사용 가능한 컴포넌트는 shared/components에 배치
- 모듈별 컴포넌트는 각 모듈 폴더에 배치

### 에러 처리
- 모든 API 호출에 에러 처리 포함
- 로딩 상태 명시적 관리
- 사용자에게 명확한 에러 메시지 표시

## 프로젝트 구조

```
biskit-hr-system/
└── frontend/
    ├── src/
    │   ├── modules/
    │   │   ├── hr/                 # 인사정보 모듈
    │   │   │   ├── components/     # 직원/부서 관련 컴포넌트
    │   │   │   ├── pages/          # EmployeeList, DepartmentManagement 등
    │   │   │   ├── hooks/          # useEmployee 등
    │   │   │   ├── services/       # LocalStorage 기반 서비스
    │   │   │   ├── types/          # employee, organization, jobLevel 등
    │   │   │   └── utils/          # validation
    │   │   └── statement/          # 간이지급명세서 모듈
    │   │       ├── components/
    │   │       ├── pages/
    │   │       ├── hooks/
    │   │       ├── services/       # LocalStorage 기반 서비스
    │   │       └── types/
    │   ├── shared/
    │   │   ├── components/
    │   │   │   ├── ui/            # shadcn 컴포넌트
    │   │   │   ├── layout/        # MainLayout, Sidebar, LNB
    │   │   │   └── common/        # DataTable, TabContainer, PageHeader
    │   │   ├── constants/         # countries (ISO 국가 코드)
    │   │   ├── hooks/
    │   │   ├── stores/
    │   │   ├── lib/
    │   │   └── types/
    │   ├── config/
    │   ├── routes/
    │   └── App.tsx
    └── package.json
```

## 라우팅 및 메뉴 구조

### 라우팅 방식
- **클라이언트 기반 라우팅**: `window.location.pathname`과 query string 사용
- **동적 네비게이션**: `window.history.pushState()` 및 `popstate` 이벤트
- **TanStack Router 미사용**: App.tsx에서 직접 라우팅 처리

### 메뉴 구조
- **모듈** (Sidebar): 인사정보, 간이지급명세서
- **1depth** (LNB):
  - 인사정보: 직원 관리, 조직 관리, 연차/휴가, 근태관리
  - 간이지급명세서: 근로소득, 사업소득, 기타소득
- **2depth** (LNB):
  - 조직 관리: 부서 관리, 직급 관리, 근로형태 관리
- **3depth**: 화면 내 탭으로 표시
  - 직원 상세: 개인정보, 조직정보, 급여정보, 연차/휴가
  - 연차/휴가 관리: 휴가현황, 휴가승인, 휴가종류관리, 설정

## 데이터 관리

- **LocalStorage 기반**: 모든 데이터는 브라우저 LocalStorage에 저장
- **Storage Keys**:

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
  - `biskit_sps_bi_creation_form`: 간이지급명세서 생성 폼 데이터 (입력값 저장)

- **데이터 영속성**: 브라우저 캐시를 지우기 전까지 데이터 유지
- **페이징/필터링/정렬**: 클라이언트 측에서 처리

## 개발 시 주의사항

1. **확장 가능성**: 새로운 모듈(급여) 추가 시 기존 코드 수정 최소화
2. **타입 안정성**: any 타입 절대 사용 금지, 모든 데이터 타입 명시
3. **에러 처리**: 모든 데이터 조작, 폼 제출에 에러 처리 필수
4. **로딩 상태**: 데이터 조작 시 로딩 상태 표시 필수
5. **재사용성**: 공통 컴포넌트는 shared에, 모듈 전용은 각 모듈에
6. **데이터 백업**: LocalStorage 기반이므로 중요 데이터는 정기적으로 백업 권장
7. **브라우저 호환성**: LocalStorage를 지원하는 모던 브라우저 필수

## 인사정보 모듈 (HR Module) 주요 기능

### 직원 관리 (Employee Management)
- **직원 목록**: 검색(성명/사번), 페이징, 정렬
- **직원 등록**:
  - 개인정보: 내외국인 구분, 주민등록번호/외국인등록번호/여권번호, 이메일, 연락처, 주소 등
  - 조직정보: 입사일, 퇴사일, 부서, 직급, 근로형태, 부서장 여부
  - 급여정보: 급여 타입(연봉/시급), 급여 금액, 식대, 계좌 정보
- **직원 상세**:
  - 기본정보 표시 및 수정 (개인정보/조직정보/급여정보)
  - 이력 관리 (발령 이력 타임라인)
- **재직/퇴사 상태**: 퇴사일 기준 자동 계산
- **근속기간**: 입사일 ~ 현재(or 퇴사일) 자동 계산 (N년 N개월)
- **체크디짓 검증**: 주민등록번호, 외국인등록번호, 사업자등록번호
- **주소 검색**: 우편번호 + 주소 검색 (Daum 우편번호 서비스 연동 가능)

### 부서 관리 (Department Management)
- **조직도 트리**: 계층형 부서 구조 (depth, order 관리)
- **부서 CRUD**: 추가, 수정, 삭제, 이동 (드래그앤드롭 지원 가능)
- **부서별 직원 목록**: 선택한 부서의 직원 목록 표시
- **부서별 재직자 수**: 트리에 직원 수 표시

### 직급 관리 (JobLevel Management)
- 직급 코드 CRUD (코드명, 표시순서)
- 데이터테이블 + 인라인 편집

### 근로형태 관리 (EmploymentType Management)
- 근로형태 코드 CRUD (코드명, 표시순서)
- 데이터테이블 + 인라인 편집

### 이력 관리 (Employee History)
- 발령 이력 타임라인 표시
- 이력 유형: 입사, 퇴사, 부서이동, 직급변경, 급여변경 등
- 이력 등록/수정/삭제

### 연차/휴가 관리 (Leave Management) ⏳ 기본 구조
- **휴가 현황 (LeaveDashboard)**: 부서별/직원별 연차 사용 현황
- **휴가 승인 (LeaveApproval)**: 휴가 신청 목록 및 승인/반려
- **휴가 종류 관리 (VacationTypeManagement)**: 연차, 반차, 병가 등 휴가 타입 관리
- **설정 (LeaveSettings)**: 연차 자동 부여 규칙, 공휴일 관리, 시간 단위 연차 설정
- 4개 탭 구조로 구현, 세부 기능은 진행 중

### 국가 코드 (ISO 3166-1 alpha-2)
- 외국인 직원의 국적 관리
- 194개 국가 코드 지원 (한글/영문 이름)
- `shared/constants/countries.ts`에 정의

### 은행 코드
- 계좌 정보 입력 시 은행 선택
- 주요 시중 은행 코드 지원
- `shared/constants/banks.ts`에 정의

## UI/디자인 시스템

**모든 UI/디자인 관련 규칙은 [`DESIGN.md`](./DESIGN.md) 문서를 참조하세요.**

### 핵심 요약

1. **shadcn/ui 컴포넌트만 사용** - 순수 HTML 태그 금지
2. **Tailwind CSS만 사용** - 인라인 스타일 금지
3. **DESIGN.md의 색상/간격/타이포그래피 준수**
4. **기존 디자인 패턴 유지** (PageHeader, DataTable 등)

> 상세 내용은 [`DESIGN.md`](./DESIGN.md) 참조

## 환경 변수

프로젝트는 LocalStorage 기반으로 동작하므로 별도의 환경 변수가 필요하지 않습니다.

## 더미 데이터 생성

직원 목록 화면(`/hr/employee`)에서 **"더미 데이터 생성"** 버튼을 통해 테스트용 데이터를 자동 생성할 수 있습니다.
- 생성 위치: `modules/hr/services/seedEmployees.ts`
- 20명의 샘플 직원 데이터 생성
- 부서, 직급, 근로형태는 사전에 등록되어 있어야 함

## 개발 워크플로우

1. **Policy 문서 확인** (`policy/` 디렉토리)
2. **DESIGN.md 확인** (디자인 시스템)
3. 기능 개발 시 타입 먼저 정의 (`types/`)
4. LocalStorage 서비스 구현 (`services/`)
5. 커스텀 훅 작성 (`hooks/`) - 선택사항
6. 컴포넌트 구현 (`components/`, `pages/`)
7. App.tsx에 라우팅 추가 (클라이언트 기반 라우팅)

## LocalStorage 서비스 패턴

모든 데이터 서비스는 다음 패턴을 따릅니다:

```typescript
// 1. Storage Key 정의
const STORAGE_KEY = 'biskit_{module_name}';

// 2. 데이터 읽기/쓰기 헬퍼
function getStoredData(): DataType[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveData(data: DataType[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 3. API 호출 시뮬레이션 (로딩 UX)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 4. CRUD 메서드 구현
export const service = {
  async getList() {
    await delay(100); // 로딩 시뮬레이션
    return getStoredData();
  },

  async create(dto: CreateDto) {
    await delay(100);
    const data = getStoredData();
    const newItem = { id: uuidv4(), ...dto, createdAt: new Date().toISOString() };
    data.push(newItem);
    saveData(data);
    return newItem;
  },

  // update, delete 등...
};
```

## 한글 입력 처리 패턴

한글 입력 시 조합 문자로 인한 문제를 방지하기 위해 다음 패턴을 사용합니다:

```typescript
// 1. 조합 상태 관리
const [isComposing, setIsComposing] = useState(false);

// 2. 입력 핸들러에서 조합 중 검증 건너뛰기
const handleInputChange = (field: string, value: string): void => {
  // 한글 조합 중에는 검증 건너뛰기
  if (isComposing) {
    handleChange(field, value);
    return;
  }

  // 정상 검증 로직
  if (!validatePattern(value)) return;
  handleChange(field, value);
};

// 3. Input 컴포넌트에 이벤트 추가
<Input
  value={formData.field}
  onChange={(e) => handleInputChange('field', e.target.value)}
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={() => setIsComposing(false)}
/>
```

**적용 대상**: 한글 입력이 가능한 모든 필드
- 상호(법인명), 대표자 성명, 담당자 성명, 담당자 부서, 생성목적 등

## UI 컴포넌트 사용 패턴

**상세 패턴은 [`DESIGN.md`](./DESIGN.md)의 "Design Patterns" 섹션 참조**

- PageHeader: depth가 있는 화면
- DataTable: 리스트 화면
- Dialog: 모달
- Popover: 팝오버

## 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 코드 포맷팅, 세미콜론 누락 등
docs: 문서 수정
chore: 빌드 업무, 패키지 매니저 설정 등
```
