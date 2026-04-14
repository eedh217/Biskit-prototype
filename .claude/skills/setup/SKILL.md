---
name: setup
description: Biskit HR System 프로젝트 초기 설정을 수행합니다.
user-invocable: true
---
Biskit HR System 프로젝트 초기 설정을 위한 스킬입니다.

## 프로젝트 초기 설정 순서

### 1. Frontend 설정

```bash
# Vite + React + TypeScript 프로젝트 생성
cd frontend
npm create vite@latest . -- --template react-ts

# 의존성 설치
npm install

# shadcn/ui 초기화
npx shadcn@latest init

# 추가 패키지 설치
npm install @tanstack/react-router @tanstack/react-query @tanstack/react-table
npm install zustand react-hook-form @hookform/resolvers zod
npm install axios date-fns lucide-react
npm install -D @types/node

# ESLint & Prettier
npm install -D eslint prettier eslint-config-prettier eslint-plugin-react-hooks
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 2. Backend 설정

```bash
# 프로젝트 초기화
cd backend
npm init -y

# 의존성 설치
npm install express @prisma/client jsonwebtoken bcrypt zod dotenv cors
npm install -D typescript @types/express @types/node @types/jsonwebtoken @types/bcrypt @types/cors
npm install -D tsx nodemon prisma

# TypeScript 설정
npx tsc --init

# Prisma 초기화
npx prisma init
```

### 3. 환경 변수 설정

**frontend/.env**
```
VITE_API_URL=http://localhost:3000/api
```

**backend/.env**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/biskit_hr
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
```

### 4. 데이터베이스 설정

```bash
# PostgreSQL 설치 확인
psql --version

# 데이터베이스 생성
psql -U postgres
CREATE DATABASE biskit_hr;

# Prisma 마이그레이션
cd backend
npx prisma migrate dev --name init

# Seed 데이터 실행 (선택)
npx prisma db seed
```

### 5. 설정 파일들

#### frontend/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### frontend/.eslintrc.cjs
```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
};
```

#### frontend/.prettierrc
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

#### backend/tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### backend/package.json (scripts 추가)
```json
{
  "scripts": {
    "dev": "nodemon --exec tsx src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:seed": "tsx prisma/seed.ts"
  }
}
```

## 개발 서버 실행

### Frontend
```bash
cd frontend
npm run dev
# http://localhost:5173
```

### Backend
```bash
cd backend
npm run dev
# http://localhost:3000
```

## 체크리스트

- [ ] PostgreSQL 설치 및 실행 확인
- [ ] Node.js 18+ 설치 확인
- [ ] Frontend 의존성 설치 완료
- [ ] Backend 의존성 설치 완료
- [ ] 환경 변수 설정 완료
- [ ] Prisma 마이그레이션 완료
- [ ] shadcn/ui 초기화 완료
- [ ] ESLint, Prettier 설정 완료
- [ ] 개발 서버 정상 실행 확인
