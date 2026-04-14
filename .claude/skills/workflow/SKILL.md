---
name: workflow
description: 개발 워크플로우 및 코딩 가이드를 제공합니다.
user-invocable: true
---
개발 워크플로우 및 코딩 가이드입니다.

## 새 기능 개발 워크플로우

### 1. 타입 정의 (types/)
먼저 필요한 타입을 정의합니다.

```typescript
// frontend/src/modules/statement/types/incomeStatement.ts
export type IncomeType = 'earned' | 'business' | 'other';

export interface IncomeStatement {
  id: string;
  type: IncomeType;
  recipientName: string;
  recipientId: string;
  year: number;
  month: number;
  amount: number;
  tax: number;
  details?: Record<string, unknown>;
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeStatementDto {
  type: IncomeType;
  recipientName: string;
  recipientId: string;
  year: number;
  month: number;
  amount: number;
  tax: number;
  details?: Record<string, unknown>;
}
```

### 2. API 서비스 (services/)
API 호출 함수를 작성합니다.

```typescript
// frontend/src/modules/statement/services/statementService.ts
import { api } from '@/shared/lib/api';
import type { IncomeStatement, CreateIncomeStatementDto } from '../types/incomeStatement';

export const statementService = {
  getStatements: async (params: {
    type?: IncomeType;
    year?: number;
    month?: number;
  }): Promise<IncomeStatement[]> => {
    const { data } = await api.get('/statements', { params });
    return data;
  },

  getStatement: async (id: string): Promise<IncomeStatement> => {
    const { data } = await api.get(`/statements/${id}`);
    return data;
  },

  createStatement: async (dto: CreateIncomeStatementDto): Promise<IncomeStatement> => {
    const { data } = await api.post('/statements', dto);
    return data;
  },

  updateStatement: async (
    id: string,
    dto: Partial<CreateIncomeStatementDto>
  ): Promise<IncomeStatement> => {
    const { data } = await api.put(`/statements/${id}`, dto);
    return data;
  },

  deleteStatement: async (id: string): Promise<void> => {
    await api.delete(`/statements/${id}`);
  },
};
```

### 3. 커스텀 훅 (hooks/)
React Query를 사용한 데이터 페칭 훅을 작성합니다.

```typescript
// frontend/src/modules/statement/hooks/useStatements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statementService } from '../services/statementService';
import type { IncomeType, CreateIncomeStatementDto } from '../types/incomeStatement';

export const useStatements = (params: {
  type?: IncomeType;
  year?: number;
  month?: number;
}) => {
  return useQuery({
    queryKey: ['statements', params],
    queryFn: () => statementService.getStatements(params),
  });
};

export const useCreateStatement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateIncomeStatementDto) => statementService.createStatement(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statements'] });
    },
  });
};
```

### 4. 컴포넌트 (components/, pages/)
UI 컴포넌트를 작성합니다.

```typescript
// frontend/src/modules/statement/pages/EarnedIncome.tsx
import { useState } from 'react';
import { useStatements } from '../hooks/useStatements';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/common/DataTable';

export function EarnedIncome(): JSX.Element {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data, isLoading, error } = useStatements({ type: 'earned', year });

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러: {error.message}</div>;

  return (
    <div>
      <h1>근로소득 명세서</h1>
      <DataTable data={data || []} columns={columns} />
    </div>
  );
}
```

### 5. 라우팅 연결 (routes/)
라우터에 페이지를 연결합니다.

## TypeScript 규칙

### ✅ 좋은 예시

```typescript
// 명시적 타입 정의
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}

// Props 타입 정의
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps): JSX.Element {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// 제네릭 사용
function ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}
```

### ❌ 나쁜 예시

```typescript
// any 사용 금지
function getData(): any { }  // ❌

// 타입 누락
function updateUser(user) { }  // ❌

// 암묵적 any
const data = await fetch('/api');  // ❌
```

## 에러 처리 패턴

### API 호출 에러

```typescript
// services/
export const statementService = {
  getStatements: async (): Promise<IncomeStatement[]> => {
    try {
      const { data } = await api.get('/statements');
      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message || '데이터를 불러올 수 없습니다');
      }
      throw error;
    }
  },
};
```

### 컴포넌트 에러

```typescript
export function StatementList(): JSX.Element {
  const { data, isLoading, error } = useStatements();

  if (isLoading) {
    return <Skeleton />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>오류</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return <div>{/* 정상 렌더링 */}</div>;
}
```

### Form 에러

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  email: z.string().email('올바른 이메일을 입력하세요'),
});

export function MyForm(): JSX.Element {
  const form = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: z.infer<typeof schema>): Promise<void> => {
    try {
      await submitData(values);
    } catch (error) {
      form.setError('root', {
        message: '저장에 실패했습니다',
      });
    }
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

## 로딩 상태 패턴

### React Query

```typescript
export function DataList(): JSX.Element {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
  });

  return (
    <div>
      {isFetching && <LoadingBar />}
      {isLoading ? <Skeleton /> : <Table data={data} />}
    </div>
  );
}
```

### Mutation

```typescript
export function CreateForm(): JSX.Element {
  const mutation = useCreateStatement();

  const handleSubmit = async (values: FormValues): Promise<void> => {
    await mutation.mutateAsync(values);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '저장 중...' : '저장'}
      </Button>
    </form>
  );
}
```

## 파일 네이밍 규칙

- 컴포넌트: PascalCase (예: `EmployeeForm.tsx`)
- 유틸/서비스: camelCase (예: `statementService.ts`)
- 타입: camelCase (예: `employee.ts`)
- 상수: UPPER_SNAKE_CASE (예: `API_URL`)

## Git 커밋 메시지

```
feat: 근로소득 명세서 조회 기능 추가
fix: 날짜 포맷 버그 수정
refactor: API 서비스 구조 개선
style: 코드 포맷팅
docs: README 업데이트
chore: 의존성 업데이트
```

## 체크리스트

새 기능 개발 시 확인사항:

### TypeScript 규칙
- [ ] TypeScript strict mode 준수
- [ ] any 타입 미사용
- [ ] 모든 함수에 명시적 반환 타입
- [ ] Props 인터페이스 정의

### shadcn/ui 필수 사용 검증 ⚠️
- [ ] 모든 Button이 shadcn `<Button>` 컴포넌트 사용
- [ ] 모든 Input이 shadcn `<Input>` 컴포넌트 사용
- [ ] 모든 Select가 shadcn `<Select>` 컴포넌트 사용
- [ ] Dialog/Modal이 shadcn `<Dialog>` 사용
- [ ] Table이 shadcn `<Table>` 또는 TanStack Table + shadcn 조합 사용
- [ ] Card/Panel이 shadcn `<Card>` 사용
- [ ] Form이 shadcn `<Form>` + react-hook-form 사용
- [ ] Alert/Toast가 shadcn 컴포넌트 사용
- [ ] 순수 HTML 태그 (`<button>`, `<input>` 등) 직접 사용 안 함
- [ ] 커스텀 스타일 컴포넌트 직접 구현 안 함
- [ ] 인라인 스타일 (`style={}`) 사용 안 함

### 에러 및 로딩 처리
- [ ] 에러 처리 구현
- [ ] 로딩 상태 처리

### 코드 품질
- [ ] ESLint 경고 없음
- [ ] Prettier 포맷팅 완료
