# Biskit HR System - 간이지급명세서 모듈

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

- 요청한 기능과 직접 관련 없는 UI 변경은 절대 하지 않습니다
- 기존 레이아웃, 간격, 크기, 정렬을 임의로 변경하지 않습니다
- 버튼 위치, 컴포넌트 크기, 팝업 사이즈를 변경하지 않습니다

- 기존에 개발된 UI 스타일과 반드시 동일한 패턴을 유지합니다
- 새로운 디자인을 임의로 만들지 않습니다
- 기존 컴포넌트 구조와 스타일을 그대로 따릅니다

- "더 나은 UX", "디자인 개선", "정렬 수정" 등의 이유로 변경하지 않습니다
- UI 변경이 필요하다고 판단되면 반드시 먼저 사용자에게 질문합니다

### 10. 변경 범위 최소화 (강제)

- 요청한 기능과 관련된 코드만 수정합니다
- 수정 범위를 파일 단위가 아닌 "라인 단위"로 최소화합니다
- 불필요한 코드 이동, 정렬 변경, 스타일 변경을 금지합니다

### 개발 시작 전 체크리스트
- [ ] Policy 문서를 확인했는가?
- [ ] 요구사항이 명확한가?
- [ ] 모호한 부분이 있는가? → 질문 필요
- [ ] Policy 문서에 없는 기능인가? → 질문 필요
- [ ] 요청하지 않은 추가 기능은 없는가?
- [ ] **기존 코드(공통 컴포넌트, 유틸리티 등)를 수정하는가? → 반드시 질문 필요**

## 프로젝트 개요

회사에서 사용하는 간이지급명세서(근로소득, 사업소득, 기타소득) 관리 시스템입니다.
향후 인사정보, 급여정보 모듈을 추가할 수 있는 확장 가능한 구조로 설계되었습니다.

## 기술 스택

- React 18 + Vite
- TypeScript (strict mode)
- shadcn/ui (Tailwind CSS)
- TanStack Router (라우팅)
- TanStack Query (서버 상태)
- Zustand (클라이언트 상태)
- TanStack Table (데이터 테이블)
- React Hook Form + Zod (폼 관리)
- LocalStorage (데이터 저장소)
- UUID (고유 ID 생성)

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
    │   │   │   └── common/        # DataTable, TabContainer
    │   │   ├── hooks/
    │   │   ├── stores/
    │   │   ├── lib/
    │   │   └── types/
    │   ├── config/
    │   ├── routes/
    │   └── App.tsx
    └── package.json
```

## 메뉴 구조

- **모듈**: 사이드바 최상단에서 선택 (현재는 간이지급명세서만)
- **1depth**: LNB에 표시 (근로소득, 사업소득, 기타소득)
- **2depth**: LNB에 표시 (필요시)
- **3depth**: 화면 내 탭으로 표시 (필요시)

## 데이터 관리

- **LocalStorage 기반**: 모든 데이터는 브라우저 LocalStorage에 저장
- **Storage Keys**:
  - `biskit_business_income`: 사업소득 데이터
  - `biskit_industry_codes`: 업종코드 마스터 데이터
  - `biskit_sps_bi_creation_form`: 간이지급명세서 생성 폼 데이터 (입력값 저장)
- **데이터 영속성**: 브라우저 캐시를 지우기 전까지 데이터 유지
- **페이징/필터링/정렬**: 클라이언트 측에서 처리

## 개발 시 주의사항

1. **확장 가능성**: 새로운 모듈(HR, 급여) 추가 시 기존 코드 수정 최소화
2. **타입 안정성**: any 타입 절대 사용 금지, 모든 데이터 타입 명시
3. **에러 처리**: 모든 데이터 조작, 폼 제출에 에러 처리 필수
4. **로딩 상태**: 데이터 조작 시 로딩 상태 표시 필수
5. **재사용성**: 공통 컴포넌트는 shared에, 모듈 전용은 각 모듈에
6. **데이터 백업**: LocalStorage 기반이므로 중요 데이터는 정기적으로 백업 권장
7. **브라우저 호환성**: LocalStorage를 지원하는 모던 브라우저 필수

## shadcn/ui 사용 (필수)

### ⚠️ 중요: shadcn/ui 100% 활용 규칙

**모든 UI 컴포넌트는 반드시 shadcn/ui를 사용해야 합니다.**

#### 필수 규칙
1. **Button, Input, Select 등 모든 기본 UI 요소는 shadcn 컴포넌트 사용**
2. **커스텀 스타일링 금지** - shadcn 컴포넌트를 확장하거나 variant 추가만 허용
3. **순수 HTML 태그 직접 사용 금지** - `<button>`, `<input>` 대신 shadcn 컴포넌트 사용
4. **인라인 스타일 금지** - Tailwind className만 사용

#### 올바른 사용 예시 ✅
```tsx
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card } from '@/shared/components/ui/card';

<Button variant="default">저장</Button>
<Input placeholder="이름" />
<Card>...</Card>
```

#### 잘못된 사용 예시 ❌
```tsx
// ❌ 순수 HTML 태그 사용
<button className="px-4 py-2">저장</button>

// ❌ 커스텀 컴포넌트 직접 구현
function CustomButton() {
  return <button className="...">...</button>;
}

// ❌ 인라인 스타일
<div style={{ padding: '10px' }}>...</div>
```

#### shadcn 컴포넌트 설치
- 컴포넌트는 `src/shared/components/ui`에 설치
- `npx shadcn@latest add {component}` 명령어로 추가
- 필요시 shadcn 컴포넌트 파일 직접 수정 가능

#### 개발 전 체크리스트
- [ ] 필요한 shadcn 컴포넌트가 설치되어 있는가?
- [ ] 모든 버튼이 `<Button>` 컴포넌트를 사용하는가?
- [ ] 모든 입력 필드가 `<Input>`, `<Select>` 등을 사용하는가?
- [ ] 커스텀 스타일 대신 Tailwind className을 사용하는가?
- [ ] 순수 HTML 태그를 직접 사용한 곳이 없는가?

## 환경 변수

프로젝트는 LocalStorage 기반으로 동작하므로 별도의 환경 변수가 필요하지 않습니다.

## 개발 워크플로우

1. 기능 개발 시 타입 먼저 정의 (`types/`)
2. LocalStorage 서비스 구현 (`services/`)
3. 커스텀 훅 작성 (`hooks/`)
4. 컴포넌트 구현 (`components/`, `pages/`)
5. 라우팅 연결 (`routes/`)

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

## Popover 사용 패턴

메뉴 아이템 리스트 형태의 Popover를 사용할 때:

```typescript
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';

<Popover open={showPopover} onOpenChange={setShowPopover}>
  <PopoverTrigger asChild>
    <Button>액션 버튼</Button>
  </PopoverTrigger>
  <PopoverContent className="w-64" align="end">
    <div className="space-y-2">
      <button
        onClick={handleOption1}
        className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors"
      >
        <div className="text-sm font-medium">옵션 1</div>
      </button>
      <button
        onClick={handleOption2}
        className="w-full text-left p-3 rounded-md hover:bg-gray-100 transition-colors"
      >
        <div className="text-sm font-medium">옵션 2</div>
      </button>
    </div>
  </PopoverContent>
</Popover>
```

**스타일링 원칙**:
- 텍스트 크기: text-sm (14px)
- Popover 너비: w-64 (256px) ~ w-80 (320px)
- 정렬: align="end" (우측 정렬)

## 커밋 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 코드 포맷팅, 세미콜론 누락 등
docs: 문서 수정
chore: 빌드 업무, 패키지 매니저 설정 등
```
