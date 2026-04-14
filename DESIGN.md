# Biskit HR System - 디자인 시스템

> **중요**: 이 문서는 Biskit HR System의 모든 UI/디자인 규칙을 정의합니다.
>
> - **DESIGN.md**: 색상, 타이포그래피, 레이아웃, 컴포넌트 스타일 등 디자인 시스템 (이 문서)
> - **CLAUDE.md**: 개발 규칙, 정책, 워크플로우, 코딩 컨벤션

---

## ⚠️ 디자인 시스템 최우선 원칙

### 절대 규칙
1. **shadcn/ui 컴포넌트만 사용** - 순수 HTML 태그 직접 사용 금지
2. **Tailwind CSS만 사용** - 인라인 스타일 (`style={}`) 절대 금지
3. **기존 디자인 패턴 유지** - 임의로 새로운 디자인 만들지 않음
4. **요청 외 UI 변경 금지** - 레이아웃, 간격, 크기, 정렬 변경 금지

### 개발 전 필수 확인
- [ ] shadcn/ui 컴포넌트를 사용하는가?
- [ ] 인라인 스타일을 사용하지 않는가?
- [ ] 기존 디자인 패턴과 일치하는가?
- [ ] 요청하지 않은 UI 변경은 없는가?

---

## 1. 색상 시스템 (Color System)

### CSS 변수 기반 색상
`src/index.css`에 정의된 CSS 변수를 사용합니다.

```css
:root {
  --background: 0 0% 100%;        /* 배경 흰색 */
  --foreground: 0 0% 3.9%;        /* 텍스트 검정 */
  --primary: 0 0% 9%;             /* 주 색상 (검정) */
  --primary-foreground: 0 0% 98%; /* 주 색상 텍스트 (흰색) */
  --secondary: 0 0% 96.1%;        /* 보조 색상 (밝은 회색) */
  --muted: 0 0% 96.1%;            /* 음소거 (밝은 회색) */
  --accent: 0 0% 96.1%;           /* 강조 (밝은 회색) */
  --destructive: 0 84.2% 60.2%;   /* 파괴적 액션 (빨강) */
  --border: 0 0% 89.8%;           /* 테두리 (회색) */
  --input: 0 0% 89.8%;            /* 입력 필드 테두리 */
  --ring: 0 0% 3.9%;              /* 포커스 링 */
  --radius: 0.375rem;             /* 6px */
}
```

### Tailwind 색상 클래스 사용

#### 배경색
```tsx
// ✅ 올바른 사용
<div className="bg-white">...</div>
<div className="bg-slate-50">...</div>
<div className="bg-gray-50">...</div>
<div className="bg-blue-50">...</div>

// ❌ 잘못된 사용
<div style={{ backgroundColor: '#ffffff' }}>...</div>
```

#### 텍스트 색상
```tsx
// ✅ 올바른 사용
<span className="text-slate-700">...</span>
<span className="text-blue-600">...</span>
<span className="text-gray-500">...</span>

// ❌ 잘못된 사용
<span style={{ color: '#334155' }}>...</span>
```

### 레이아웃별 배경색

| 영역 | 배경색 | Tailwind 클래스 |
|------|--------|------------------|
| 전체 배경 | slate-50 | `bg-slate-50` |
| Sidebar | slate-900 | `bg-slate-900` |
| LNB | gray-50 | `bg-gray-50` |
| Main Content | white | `bg-white` |

### 상태별 색상

| 상태 | 색상 | 사용 예시 |
|------|------|-----------|
| Active (활성) | blue-50/blue-600 | `bg-blue-50 text-blue-600` |
| Hover | slate-100 | `hover:bg-slate-100` |
| Disabled | opacity-50 | `disabled:opacity-50` |
| Error | destructive (빨강) | `text-destructive` |

---

## 2. 타이포그래피 (Typography)

### 폰트 패밀리
**Pretendard Variable** 폰트를 기본으로 사용합니다.

```javascript
// tailwind.config.js
fontFamily: {
  sans: [
    'Pretendard Variable',
    'Pretendard',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Roboto',
    'Helvetica Neue',
    'Segoe UI',
    'Apple SD Gothic Neo',
    'Noto Sans KR',
    'Malgun Gothic',
    'sans-serif',
  ],
}
```

### 텍스트 크기 및 굵기

| 용도 | 크기 | 굵기 | Tailwind 클래스 |
|------|------|------|------------------|
| 페이지 제목 | 2xl (24px) | bold | `text-2xl font-bold` |
| 섹션 제목 | lg (18px) | semibold | `text-lg font-semibold` |
| 다이얼로그 제목 | lg (18px) | semibold | `text-lg font-semibold` |
| 일반 텍스트 | sm (14px) | medium | `text-sm font-medium` |
| 작은 텍스트 | xs (12px) | normal | `text-xs` |
| 버튼 텍스트 | sm (14px) | medium | `text-sm font-medium` |

### 사용 예시

```tsx
// 페이지 제목
<h1 className="text-2xl font-bold">직원 관리</h1>

// 섹션 제목
<h2 className="text-lg font-semibold text-slate-800">개인정보</h2>

// 일반 텍스트
<p className="text-sm text-slate-700">직원 목록</p>

// 작은 텍스트 (설명)
<span className="text-xs text-gray-500">총 123명</span>
```

---

## 3. 레이아웃 (Layout)

### 전체 레이아웃 구조

```
┌─────────────────────────────────────────┐
│  Sidebar  │  LNB  │  Main Content       │
│  (64px)   │(256px)│  (flex-1)           │
│           │       │  max-w-[1500px]     │
│           │       │  px-6 py-6          │
└─────────────────────────────────────────┘
```

### Sidebar (모듈 선택)
```tsx
<aside className="w-16 bg-slate-900 flex flex-col items-center py-4 gap-2">
  {/* 로고 */}
  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
    B
  </div>

  {/* 모듈 아이콘 버튼 */}
  <Button
    variant={selectedModule === 'hr' ? 'secondary' : 'ghost'}
    size="icon"
    className={`w-12 h-12 ${
      selectedModule === 'hr'
        ? 'bg-slate-700 text-white hover:bg-slate-600'
        : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`}
  >
    <Users className="h-6 w-6" />
  </Button>
</aside>
```

### LNB (좌측 네비게이션 바)
```tsx
<aside className="w-64 bg-gray-50 border-r border-slate-200 flex flex-col">
  {/* 헤더 */}
  <div className="p-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-slate-800">인사</h2>
  </div>

  {/* 메뉴 */}
  <nav className="flex-1 overflow-y-auto py-2">
    {/* 메뉴 아이템 */}
  </nav>
</aside>
```

### Main Content (메인 콘텐츠)
```tsx
<main className="flex-1 overflow-auto bg-white">
  <div className="mx-auto max-w-[1500px] px-6 py-6">
    {/* 페이지 내용 */}
  </div>
</main>
```

### 간격 및 여백

| 용도 | 값 | Tailwind 클래스 |
|------|-----|------------------|
| 메인 콘텐츠 패딩 | 24px (1.5rem) | `px-6 py-6` |
| 메인 콘텐츠 최대 너비 | 1500px | `max-w-[1500px]` |
| 섹션 간 여백 | 24px (1.5rem) | `gap-6` 또는 `mb-6` |
| 컴포넌트 간 여백 | 16px (1rem) | `gap-4` 또는 `mb-4` |
| 작은 여백 | 8px (0.5rem) | `gap-2` 또는 `mb-2` |

---

## 4. 컴포넌트 스타일 (Component Styles)

### 4.1 PageHeader (페이지 헤더)

**위치**: `src/shared/components/common/PageHeader.tsx`

#### 기본 구조
```tsx
<div className="mb-6">
  <div className="flex items-center justify-between">
    {/* 왼쪽: 뒤로가기 + 제목 */}
    <div className="flex items-center gap-3">
      {showBackButton && (
        <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
      )}
      <h1 className="text-2xl font-bold">제목</h1>
    </div>

    {/* 오른쪽: 액션 버튼 */}
    <div className="flex items-center gap-2">
      {/* 버튼들 */}
    </div>
  </div>
</div>
```

#### 사용 예시
```tsx
<PageHeader
  title="직원 목록"
  showBackButton={false}
  actions={
    <>
      <Button variant="outline">등록</Button>
      <Button variant="outline">삭제</Button>
    </>
  }
/>
```

### 4.2 Button (버튼)

**위치**: `src/shared/components/ui/button.tsx`

#### Variants (변형)

| Variant | 용도 | 스타일 |
|---------|------|--------|
| `default` | 기본 버튼 | 검정 배경, 흰색 텍스트 |
| `outline` | 아웃라인 버튼 (가장 많이 사용) | 흰색 배경, 테두리, 검정 텍스트 |
| `secondary` | 보조 버튼 | 회색 배경 |
| `ghost` | 배경 없는 버튼 | 투명, hover 시 배경 |
| `destructive` | 삭제/취소 버튼 | 흰색 배경, 테두리 |
| `link` | 링크 스타일 버튼 | 밑줄, 텍스트만 |

#### Sizes (크기)

| Size | 높이 | 패딩 | 사용 예시 |
|------|------|------|-----------|
| `default` | 36px (h-9) | px-4 py-2 | 일반 버튼 |
| `sm` | 32px (h-8) | px-3 | 작은 버튼 |
| `lg` | 40px (h-10) | px-8 | 큰 버튼 |
| `icon` | 36px (h-9 w-9) | - | 아이콘 버튼 |

#### 사용 예시
```tsx
// 기본 버튼
<Button variant="outline">등록</Button>

// 아이콘 버튼
<Button variant="ghost" size="icon">
  <Search className="h-4 w-4" />
</Button>

// 삭제 버튼
<Button variant="destructive">삭제</Button>

// 링크 버튼
<Button variant="link">자세히 보기</Button>
```

#### 버튼 기본값
```tsx
// 이 프로젝트의 기본 variant는 'outline'입니다
defaultVariants: {
  variant: 'outline',  // ← 기본값
  size: 'default',
}
```

### 4.3 Input (입력 필드)

**위치**: `src/shared/components/ui/input.tsx`

#### 기본 스타일
```tsx
<Input
  type="text"
  placeholder="검색어를 입력하세요"
  className="h-10 w-full"
/>
```

#### 스타일 클래스
- 높이: `h-10` (40px)
- 테두리: `border border-input rounded-md`
- 패딩: `px-3 py-2`
- 포커스: `focus-visible:ring-2 focus-visible:ring-ring`

#### 검색 입력 필드 패턴
```tsx
<div className="flex gap-2">
  <Input
    ref={searchInputRef}
    type="text"
    placeholder="검색"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    }}
    className="h-10"
  />

  {searchInput && (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClearSearch}
      className="h-10"
    >
      <X className="h-4 w-4" />
    </Button>
  )}

  <Button
    onClick={handleSearch}
    onMouseDown={(e) => e.preventDefault()}
    className="h-10"
  >
    <Search className="h-4 w-4 mr-2" />
    검색
  </Button>
</div>
```

### 4.4 DataTable (데이터 테이블)

**위치**: `src/shared/components/common/data-table.tsx`

#### 기본 구조
```tsx
<DataTable
  columns={columns}
  data={data}
  toolbar={
    <div className="flex items-center justify-between">
      {/* 검색 등 */}
    </div>
  }
  onRowClick={(row) => navigate(`/detail/${row.id}`)}
  pageSize={30}
/>
```

#### 테이블 스타일
- 테두리: `rounded-md border`
- 배경: 기본 흰색
- 헤더: 고정 (`sticky`)
- 행 hover: `hover:bg-slate-50`

#### Column Header 정렬
```tsx
// 정렬 가능한 컬럼
<DataTableColumnHeader column={column} title="이름" />

// 정렬 불가능한 컬럼
<div className="text-left">이름</div>
```

### 4.5 Dialog (다이얼로그/모달)

**위치**: `src/shared/components/ui/dialog.tsx`

#### 기본 구조
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명 (선택사항)</DialogDescription>
    </DialogHeader>

    {/* 내용 */}
    <div className="space-y-4">
      {/* 폼 필드 등 */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        취소
      </Button>
      <Button onClick={handleSubmit}>
        확인
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 다이얼로그 크기

| 크기 | 클래스 | 용도 |
|------|--------|------|
| 작음 | `max-w-md` (448px) | 확인/경고 메시지 |
| 중간 (기본) | `max-w-lg` (512px) | 일반 폼 |
| 큰 | `max-w-2xl` (672px) | 복잡한 폼 |
| 매우 큰 | `max-w-4xl` (896px) | 상세 정보 |

#### 다이얼로그 스타일
- 배경 오버레이: `bg-black/50`
- 다이얼로그 배경: `bg-white`
- 테두리: `rounded-lg border`
- 패딩: `p-6`
- 닫기 버튼: 우측 상단 (X 아이콘)

### 4.6 Select (셀렉트 박스)

**위치**: `src/shared/components/ui/select.tsx`

#### 기본 사용
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="h-10 w-full">
    <SelectValue placeholder="선택하세요" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">옵션 1</SelectItem>
    <SelectItem value="option2">옵션 2</SelectItem>
  </SelectContent>
</Select>
```

### 4.7 Checkbox (체크박스)

**위치**: `src/shared/components/ui/checkbox.tsx`

#### ⚠️ 중요: 이 프로젝트의 Checkbox는 특수합니다!

**일반 HTML input을 래핑**한 것으로 **`onCheckedChange`를 지원하지 않습니다!**

#### 올바른 사용법
```tsx
// ✅ 올바른 사용
<Checkbox
  checked={isChecked}
  onChange={(e) => setIsChecked(e.target.checked)}
/>

// ❌ 잘못된 사용 (작동하지 않음!)
<Checkbox
  checked={isChecked}
  onCheckedChange={(checked) => setIsChecked(checked)}
/>
```

---

## 5. 디자인 패턴 (Design Patterns)

### 5.1 페이지 레이아웃 패턴

#### 기본 페이지 구조
```tsx
export function SomePage(): JSX.Element {
  return (
    <>
      {/* 페이지 헤더 */}
      <PageHeader
        title="페이지 제목"
        showBackButton={false}
        actions={
          <Button variant="outline">액션</Button>
        }
      />

      {/* 검색/필터 영역 */}
      <div className="mb-6 flex items-center gap-2">
        <Input placeholder="검색" />
        <Button>검색</Button>
      </div>

      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={data}
      />
    </>
  );
}
```

#### 상세 페이지 구조 (depth가 있는 페이지)
```tsx
export function DetailPage(): JSX.Element {
  return (
    <>
      {/* 뒤로가기 버튼 포함 헤더 */}
      <PageHeader
        title="상세 정보"
        showBackButton={true}  // ← 중요!
        actions={
          <>
            <Button variant="outline">수정</Button>
            <Button variant="destructive">삭제</Button>
          </>
        }
      />

      {/* 상세 내용 */}
      <div className="space-y-6">
        {/* 섹션별 정보 */}
      </div>
    </>
  );
}
```

### 5.2 폼 레이아웃 패턴

#### 기본 폼 구조
```tsx
<div className="space-y-6">
  {/* 섹션 1 */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">개인정보</h3>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">성명</label>
        <Input placeholder="홍길동" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">생년월일</label>
        <Input type="date" />
      </div>
    </div>
  </div>

  {/* 섹션 2 */}
  <div className="space-y-4">
    <h3 className="text-lg font-semibold">조직정보</h3>
    {/* ... */}
  </div>
</div>
```

#### 2열 그리드 폼
```tsx
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-2">
    <label className="text-sm font-medium">필드명</label>
    <Input />
  </div>
  {/* ... */}
</div>
```

#### 1열 폼
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <label className="text-sm font-medium">필드명</label>
    <Input />
  </div>
  {/* ... */}
</div>
```

### 5.3 카드 레이아웃 패턴

#### 기본 카드
```tsx
<div className="rounded-lg border bg-white p-6">
  <h3 className="text-lg font-semibold mb-4">카드 제목</h3>
  {/* 카드 내용 */}
</div>
```

#### 카드 그리드
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="rounded-lg border bg-white p-6">
    {/* 카드 1 */}
  </div>
  <div className="rounded-lg border bg-white p-6">
    {/* 카드 2 */}
  </div>
  <div className="rounded-lg border bg-white p-6">
    {/* 카드 3 */}
  </div>
</div>
```

### 5.4 검색 영역 패턴

#### 기본 검색
```tsx
<div className="flex gap-2 mb-6">
  <Input
    ref={searchInputRef}
    placeholder="검색"
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') handleSearch();
    }}
    className="h-10"
  />

  {searchInput && (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClearSearch}
      className="h-10"
    >
      <X className="h-4 w-4" />
    </Button>
  )}

  <Button
    onClick={handleSearch}
    onMouseDown={(e) => e.preventDefault()}
    className="h-10"
  >
    <Search className="h-4 w-4 mr-2" />
    검색
  </Button>
</div>
```

#### 고급 검색 (필터 포함)
```tsx
<div className="space-y-4 mb-6">
  <div className="flex gap-2">
    <Input placeholder="검색" className="h-10" />
    <Button className="h-10">검색</Button>
  </div>

  <div className="flex gap-2">
    <Select>
      <SelectTrigger className="h-10 w-[180px]">
        <SelectValue placeholder="부서 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
        {/* ... */}
      </SelectContent>
    </Select>

    <Select>
      <SelectTrigger className="h-10 w-[180px]">
        <SelectValue placeholder="직급 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체</SelectItem>
        {/* ... */}
      </SelectContent>
    </Select>
  </div>
</div>
```

### 5.5 액션 버튼 그룹 패턴

#### 우측 정렬 버튼 그룹
```tsx
<div className="flex justify-end gap-2">
  <Button variant="outline">취소</Button>
  <Button>확인</Button>
</div>
```

#### 좌우 정렬 버튼 그룹
```tsx
<div className="flex items-center justify-between">
  <Button variant="destructive">삭제</Button>

  <div className="flex gap-2">
    <Button variant="outline">취소</Button>
    <Button>저장</Button>
  </div>
</div>
```

### 5.6 빈 상태 (Empty State) 패턴

```tsx
{data.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="text-gray-400 mb-4">
      <FileText className="h-12 w-12" />
    </div>
    <p className="text-sm text-gray-500">데이터가 없습니다.</p>
    <Button className="mt-4" onClick={handleCreate}>
      생성하기
    </Button>
  </div>
) : (
  <DataTable columns={columns} data={data} />
)}
```

---

## 6. 아이콘 (Icons)

### Lucide React 사용
```tsx
import { Search, X, Plus, Trash, Edit, ChevronRight, ArrowLeft } from 'lucide-react';

// 기본 크기: h-4 w-4 (16px)
<Search className="h-4 w-4" />

// 큰 아이콘: h-6 w-6 (24px)
<Users className="h-6 w-6" />

// 색상 지정
<X className="h-4 w-4 text-gray-600" />
```

### 자주 사용하는 아이콘

| 아이콘 | 용도 | 크기 |
|--------|------|------|
| `Search` | 검색 | h-4 w-4 |
| `X` | 닫기/지우기 | h-4 w-4 |
| `Plus` | 추가 | h-4 w-4 |
| `Trash` | 삭제 | h-4 w-4 |
| `Edit` | 수정 | h-4 w-4 |
| `ChevronRight` | 펼치기/다음 | h-4 w-4 |
| `ArrowLeft` | 뒤로가기 | h-5 w-5 |
| `Users` | 인사/직원 | h-6 w-6 |
| `FileText` | 문서/명세서 | h-6 w-6 |

---

## 7. 애니메이션 및 전환 (Animation & Transition)

### Tailwind 전환 클래스
```tsx
// hover 전환
<button className="transition-colors hover:bg-gray-100">

// transform 전환
<ChevronRight className="transition-transform rotate-90" />

// opacity 전환
<div className="transition-opacity opacity-0 hover:opacity-100">
```

### 일반적인 전환 패턴

| 용도 | 클래스 |
|------|--------|
| 버튼 hover | `transition-colors` |
| 아이콘 회전 | `transition-transform` |
| 페이드 인/아웃 | `transition-opacity` |
| 전체 전환 | `transition-all` |

---

## 8. 반응형 디자인 (Responsive Design)

### 브레이크포인트
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### 반응형 그리드 패턴
```tsx
// 모바일: 1열, 태블릿: 2열, 데스크톱: 3열
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 카드들 */}
</div>

// 모바일: 1열, 데스크톱: 2열
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
  {/* 폼 필드들 */}
</div>
```

### 반응형 패딩/마진
```tsx
// 모바일: px-4, 데스크톱: px-6
<div className="px-4 md:px-6 py-6">

// 모바일: text-xl, 데스크톱: text-2xl
<h1 className="text-xl md:text-2xl font-bold">
```

---

## 9. 접근성 (Accessibility)

### ARIA 레이블
```tsx
<button aria-label="검색">
  <Search className="h-4 w-4" />
</button>

<input
  type="text"
  aria-label="직원 이름 검색"
  placeholder="검색"
/>
```

### 포커스 상태
```tsx
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  버튼
</button>
```

### 시맨틱 HTML
```tsx
// ✅ 올바른 사용
<button onClick={handleClick}>클릭</button>

// ❌ 잘못된 사용
<div onClick={handleClick}>클릭</div>
```

---

## 10. 체크리스트

### 새 컴포넌트 개발 시 확인사항

- [ ] shadcn/ui 컴포넌트를 사용했는가?
- [ ] Tailwind CSS만 사용했는가? (인라인 스타일 없음)
- [ ] 기존 디자인 패턴을 따랐는가?
- [ ] 색상 시스템을 준수했는가?
- [ ] 타이포그래피 규칙을 따랐는가?
- [ ] 간격/여백이 일관적인가?
- [ ] 반응형 디자인을 고려했는가?
- [ ] 접근성을 고려했는가?

### 페이지 개발 시 확인사항

- [ ] PageHeader를 사용했는가?
- [ ] depth가 있는 화면은 `showBackButton={true}`인가?
- [ ] 검색 기능이 있다면 포커스 유지 패턴을 적용했는가?
- [ ] 데이터 테이블은 DataTable 컴포넌트를 사용했는가?
- [ ] 빈 상태 처리를 했는가?
- [ ] 로딩 상태 처리를 했는가?
- [ ] 에러 상태 처리를 했는가?

---

## 11. 금지 사항

### 절대 하지 말아야 할 것

1. **인라인 스타일 사용 금지**
   ```tsx
   // ❌ 절대 금지
   <div style={{ backgroundColor: '#fff', padding: '24px' }}>

   // ✅ 올바른 사용
   <div className="bg-white p-6">
   ```

2. **순수 HTML 태그 직접 사용 금지**
   ```tsx
   // ❌ 절대 금지
   <button onClick={handleClick}>클릭</button>

   // ✅ 올바른 사용
   <Button onClick={handleClick}>클릭</Button>
   ```

3. **임의의 색상 값 사용 금지**
   ```tsx
   // ❌ 절대 금지
   <div className="bg-[#f5f5f5]">

   // ✅ 올바른 사용
   <div className="bg-gray-50">
   ```

4. **CSS 파일에 직접 스타일 작성 금지**
   - Tailwind CSS만 사용
   - 커스텀 CSS는 최소화

5. **요청하지 않은 UI 변경 금지**
   - 레이아웃 변경 금지
   - 간격 변경 금지
   - 크기 변경 금지
   - 정렬 변경 금지

---

## 12. 참고 자료

- [shadcn/ui 공식 문서](https://ui.shadcn.com/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/)
- [Lucide React 아이콘](https://lucide.dev/)
- [TanStack Table 문서](https://tanstack.com/table/latest)

---

**이 문서는 Biskit HR System의 디자인 시스템 표준입니다.**
**모든 UI 개발은 이 문서의 규칙을 준수해야 합니다.**
