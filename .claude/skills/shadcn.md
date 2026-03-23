# shadcn/ui Skill

## Description
shadcn/ui 컴포넌트 설치 및 관리를 위한 스킬입니다.

## Usage

이 프로젝트는 shadcn/ui를 사용합니다. 새로운 UI 컴포넌트가 필요할 때 자동으로 설치하세요.

### 설치 명령어
```bash
cd frontend
npx shadcn@latest add {component-name}
```

### 자주 사용하는 컴포넌트

#### 폼 관련
- `button` - 버튼
- `input` - 입력 필드
- `label` - 라벨
- `form` - 폼 (react-hook-form 통합)
- `select` - 셀렉트 박스
- `textarea` - 텍스트 영역
- `checkbox` - 체크박스
- `radio-group` - 라디오 그룹
- `calendar` - 캘린더
- `date-picker` - 날짜 선택기

#### 레이아웃
- `card` - 카드
- `sheet` - 사이드 시트 (사이드바)
- `separator` - 구분선
- `scroll-area` - 스크롤 영역
- `tabs` - 탭

#### 데이터 표시
- `table` - 테이블
- `badge` - 뱃지
- `avatar` - 아바타
- `tooltip` - 툴팁

#### 피드백
- `alert` - 알림
- `alert-dialog` - 알림 다이얼로그
- `dialog` - 다이얼로그
- `toast` - 토스트 알림
- `skeleton` - 스켈레톤 로딩

#### 네비게이션
- `dropdown-menu` - 드롭다운 메뉴
- `navigation-menu` - 네비게이션 메뉴

## 컴포넌트 사용 예시

### Button
```tsx
import { Button } from '@/shared/components/ui/button';

<Button variant="default">클릭</Button>
<Button variant="destructive">삭제</Button>
<Button variant="outline">외곽선</Button>
<Button variant="ghost">고스트</Button>
```

### Form
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

const formSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
});

function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  return (
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
  );
}
```

### Dialog
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

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

### Table
```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead>이메일</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>홍길동</TableCell>
      <TableCell>hong@example.com</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## 설치 시 주의사항

1. **frontend 디렉토리에서 실행**: 반드시 `cd frontend` 후 실행
2. **자동 설치**: 필요한 컴포넌트는 자동으로 설치
3. **의존성**: 필요한 경우 추가 패키지 자동 설치 (class-variance-authority, clsx, tailwind-merge 등)
4. **경로**: 컴포넌트는 `src/shared/components/ui/` 에 설치됨

## 커스터마이징

shadcn 컴포넌트는 소스 코드가 프로젝트에 직접 복사되므로 자유롭게 수정 가능합니다.

수정이 필요한 경우 `src/shared/components/ui/{component}.tsx` 파일을 직접 편집하세요.
