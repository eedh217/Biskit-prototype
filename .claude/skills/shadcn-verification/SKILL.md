---
name: shadcn-verification
description: shadcn/ui 100% 사용 여부를 검증합니다.
user-invocable: true
---
## 목적

이 프로젝트는 **shadcn/ui를 100% 활용**해야 합니다.
커스텀 UI 컴포넌트를 직접 만들거나 순수 HTML 태그를 사용하는 것은 **절대 금지**입니다.

## 검증 체크리스트

### 1. 기본 UI 컴포넌트

#### ✅ 올바른 사용
```tsx
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

<div>
  <Label>이름</Label>
  <Input type="text" placeholder="이름 입력" />
  <Button>저장</Button>
</div>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 순수 HTML 사용
<div>
  <label>이름</label>
  <input type="text" placeholder="이름 입력" />
  <button>저장</button>
</div>

// ❌ 커스텀 컴포넌트 직접 구현
const CustomButton = ({ children }) => (
  <button className="bg-blue-500 px-4 py-2">{children}</button>
);
```

### 2. 폼 컴포넌트

#### ✅ 올바른 사용
```tsx
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';

<Form {...form}>
  <FormField
    control={form.control}
    name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>이름</FormLabel>
        <FormControl>
          <Input {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</Form>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 순수 HTML form 요소
<form>
  <label>이름</label>
  <input name="name" />

  <label>설명</label>
  <textarea name="description" />

  <input type="checkbox" />
</form>
```

### 3. 레이아웃 컴포넌트

#### ✅ 올바른 사용
```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { ScrollArea } from '@/shared/components/ui/scroll-area';

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <Separator />
  <CardContent>
    <ScrollArea className="h-[400px]">
      내용
    </ScrollArea>
  </CardContent>
  <CardFooter>
    <Button>확인</Button>
  </CardFooter>
</Card>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 커스텀 div 레이아웃
<div className="border rounded-lg p-4">
  <div className="font-bold mb-2">제목</div>
  <hr />
  <div className="overflow-auto h-[400px]">내용</div>
  <div className="mt-4">
    <button>확인</button>
  </div>
</div>
```

### 4. 테이블

#### ✅ 올바른 사용 - 옵션 1: shadcn Table
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead>이메일</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### ✅ 올바른 사용 - 옵션 2: TanStack Table + shadcn
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useReactTable, flexRender } from '@tanstack/react-table';

<Table>
  <TableHeader>
    {table.getHeaderGroups().map((headerGroup) => (
      <TableRow key={headerGroup.id}>
        {headerGroup.headers.map((header) => (
          <TableHead key={header.id}>
            {flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        ))}
      </TableRow>
    ))}
  </TableHeader>
  <TableBody>
    {/* ... */}
  </TableBody>
</Table>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 순수 HTML table
<table className="w-full">
  <thead>
    <tr>
      <th>이름</th>
      <th>이메일</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>홍길동</td>
      <td>hong@example.com</td>
    </tr>
  </tbody>
</table>
```

### 5. 다이얼로그 & 모달

#### ✅ 올바른 사용
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/shared/components/ui/alert-dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>열기</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
    </DialogHeader>
    <div>내용</div>
  </DialogContent>
</Dialog>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 커스텀 모달 구현
const CustomModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50">
      <div className="bg-white p-4 rounded">
        {children}
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
  );
};
```

### 6. 탭

#### ✅ 올바른 사용
```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">탭 1</TabsTrigger>
    <TabsTrigger value="tab2">탭 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">탭 1 내용</TabsContent>
  <TabsContent value="tab2">탭 2 내용</TabsContent>
</Tabs>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 커스텀 탭 구현
const [activeTab, setActiveTab] = useState('tab1');

<div>
  <div className="flex gap-2">
    <button onClick={() => setActiveTab('tab1')}>탭 1</button>
    <button onClick={() => setActiveTab('tab2')}>탭 2</button>
  </div>
  <div>
    {activeTab === 'tab1' && <div>탭 1 내용</div>}
    {activeTab === 'tab2' && <div>탭 2 내용</div>}
  </div>
</div>
```

### 7. 알림 & 피드백

#### ✅ 올바른 사용
```tsx
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert';
import { useToast } from '@/shared/components/ui/use-toast';
import { Skeleton } from '@/shared/components/ui/skeleton';

// Alert
<Alert>
  <AlertTitle>주의</AlertTitle>
  <AlertDescription>중요한 메시지입니다.</AlertDescription>
</Alert>

// Toast
const { toast } = useToast();
toast({
  title: "성공",
  description: "저장되었습니다.",
});

// Loading
<Skeleton className="h-4 w-full" />
```

#### ❌ 잘못된 사용
```tsx
// ❌ 커스텀 alert/toast
<div className="bg-yellow-100 border border-yellow-400 p-4">
  <strong>주의</strong>
  <p>중요한 메시지입니다.</p>
</div>

// ❌ 커스텀 로딩
<div className="animate-pulse bg-gray-200 h-4 w-full" />
```

### 8. 네비게이션

#### ✅ 올바른 사용
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/shared/components/ui/navigation-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">메뉴</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>항목 1</DropdownMenuItem>
    <DropdownMenuItem>항목 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### ❌ 잘못된 사용
```tsx
// ❌ 커스텀 드롭다운
const [isOpen, setIsOpen] = useState(false);

<div className="relative">
  <button onClick={() => setIsOpen(!isOpen)}>메뉴</button>
  {isOpen && (
    <div className="absolute bg-white shadow-lg">
      <div>항목 1</div>
      <div>항목 2</div>
    </div>
  )}
</div>
```

## 자동 검증 방법

### ESLint 규칙 추가 (선택사항)

```js
// .eslintrc.cjs
module.exports = {
  rules: {
    // 순수 HTML button 사용 금지
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXElement[openingElement.name.name="button"]:not([openingElement.attributes.*.name.name="asChild"])',
        message: 'Use Button component from shadcn/ui instead of <button>',
      },
      {
        selector: 'JSXElement[openingElement.name.name="input"]',
        message: 'Use Input component from shadcn/ui instead of <input>',
      },
    ],
  },
};
```

### 코드 리뷰 체크리스트

파일을 작성/수정한 후 반드시 확인:

```bash
# 1. 순수 HTML 태그 검색
grep -r "<button" src/
grep -r "<input" src/
grep -r "<select" src/
grep -r "<textarea" src/
grep -r "<table" src/

# 2. 인라인 스타일 검색
grep -r "style={{" src/

# 3. shadcn import 확인
grep -r "from '@/shared/components/ui/" src/
```

### 발견된 위반 사항 수정 방법

1. **순수 HTML 태그 발견 시**
   - 해당 shadcn 컴포넌트가 설치되어 있는지 확인
   - 없으면 `npx shadcn@latest add {component}` 실행
   - import 후 교체

2. **커스텀 컴포넌트 발견 시**
   - shadcn에 동일한 기능의 컴포넌트가 있는지 확인
   - 있으면 shadcn 컴포넌트로 교체
   - 없으면 shadcn 컴포넌트를 확장해서 구현

3. **인라인 스타일 발견 시**
   - Tailwind className으로 변환
   - 또는 shadcn 컴포넌트의 variant/size prop 사용

## 필수 shadcn 컴포넌트 목록

프로젝트 시작 시 반드시 설치해야 할 컴포넌트:

```bash
cd frontend

# 기본 컴포넌트
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add textarea
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group

# 레이아웃
npx shadcn@latest add card
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add tabs

# 폼
npx shadcn@latest add form

# 피드백
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add skeleton

# 데이터 표시
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add tooltip

# 네비게이션
npx shadcn@latest add dropdown-menu
npx shadcn@latest add navigation-menu
npx shadcn@latest add sheet

# 날짜
npx shadcn@latest add calendar
npx shadcn@latest add popover
```

## 최종 체크리스트

컴포넌트 개발 완료 시 반드시 확인:

- [ ] 모든 UI 요소가 shadcn 컴포넌트를 사용하는가?
- [ ] `<button>`, `<input>` 등 순수 HTML 태그가 없는가?
- [ ] 커스텀 UI 컴포넌트를 직접 만들지 않았는가?
- [ ] 인라인 스타일 (`style={}`)을 사용하지 않았는가?
- [ ] Tailwind className만 사용했는가?
- [ ] shadcn 컴포넌트의 variant/size prop을 활용했는가?

## 예외 사항

다음의 경우만 순수 HTML 태그 사용 허용:

1. **의미론적 HTML**: `<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`
2. **텍스트 요소**: `<h1>`~`<h6>`, `<p>`, `<span>`, `<strong>`, `<em>`
3. **리스트**: `<ul>`, `<ol>`, `<li>`
4. **컨테이너**: `<div>` (레이아웃 용도만)

이외의 모든 interactive 요소는 반드시 shadcn 사용!
