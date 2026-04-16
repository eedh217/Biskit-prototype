import { ReactNode, useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { LNB } from './LNB';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  children?: MenuItem[];
}

interface MainLayoutProps {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

// 간이지급명세서 메뉴 구조
const STATEMENT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'earned-income',
    label: '근로소득',
    path: '/statement/earned-income',
    children: [],
  },
  {
    id: 'business-income',
    label: '사업소득',
    path: '/statement/business-income',
    children: [
      {
        id: 'business-income-monthly',
        label: '월별목록',
        path: '/statement/business-income/monthly',
      },
      {
        id: 'business-income-all',
        label: '전체목록',
        path: '/statement/business-income/all',
      },
    ],
  },
  {
    id: 'other-income',
    label: '기타소득',
    path: '/statement/other-income',
    children: [
      {
        id: 'other-income-monthly',
        label: '월별목록',
        path: '/statement/other-income/monthly',
      },
      {
        id: 'other-income-all',
        label: '전체목록',
        path: '/statement/other-income/all',
      },
    ],
  },
];

// 인사 메뉴 구조
const HR_MENU_ITEMS: MenuItem[] = [
  {
    id: 'employee',
    label: '직원관리',
    path: '/hr/employee',
    children: [],
  },
  {
    id: 'organization',
    label: '조직관리',
    path: '/hr/organization',
    children: [
      {
        id: 'organization-department',
        label: '부서',
        path: '/hr/organization/department',
      },
      {
        id: 'organization-position',
        label: '직급',
        path: '/hr/organization/position',
      },
      {
        id: 'organization-employment-type',
        label: '근로형태',
        path: '/hr/organization/employment-type',
      },
    ],
  },
  {
    id: 'leave',
    label: '연차/휴가관리',
    path: '/hr/leave',
    children: [],
  },
  {
    id: 'insurance',
    label: '4대보험 관리',
    path: '/hr/insurance',
    children: [
      {
        id: 'insurance-acquisition',
        label: '자격 취득신고',
        path: '/hr/insurance/acquisition',
      },
      {
        id: 'insurance-loss',
        label: '자격 상실신고',
        path: '/hr/insurance/loss',
      },
      {
        id: 'insurance-dependent',
        label: '피부양자 관리',
        path: '/hr/insurance/dependent',
      },
      {
        id: 'insurance-salary-change',
        label: '보수월액 변경신고',
        path: '/hr/insurance/salary-change',
      },
      {
        id: 'insurance-total-salary',
        label: '보수총액신고',
        path: '/hr/insurance/total-salary',
      },
    ],
  },
];

// 급여 메뉴 구조
const PAYROLL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'payroll-ledger',
    label: '급여대장',
    path: '/payroll/ledger',
    children: [],
  },
  {
    id: 'payroll-items',
    label: '급여항목',
    path: '/payroll/items',
    children: [],
  },
];

export function MainLayout({ children, currentPath, onNavigate }: MainLayoutProps): JSX.Element {
  const [selectedModule, setSelectedModule] = useState<string>('statement');
  const mainRef = useRef<HTMLDivElement>(null);

  // currentPath를 기반으로 모듈 자동 선택
  useEffect(() => {
    const pathname = currentPath.split('?')[0] || '/';

    if (pathname.startsWith('/hr')) {
      setSelectedModule('hr');
    } else if (pathname.startsWith('/payroll')) {
      setSelectedModule('payroll');
    } else if (pathname.startsWith('/statement') || pathname === '/') {
      setSelectedModule('statement');
    }
  }, [currentPath]);

  // 페이지 전환 시 스크롤을 맨 위로 이동
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentPath]);

  const handleModuleChange = (module: string): void => {
    setSelectedModule(module);
    // 모듈 변경 시 기본 경로로 이동
    if (module === 'statement') {
      onNavigate('/statement/business-income/monthly');
    } else if (module === 'hr') {
      onNavigate('/hr/employee');
    } else if (module === 'payroll') {
      onNavigate('/payroll/ledger');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* 모듈 선택 사이드바 */}
      <Sidebar selectedModule={selectedModule} onModuleChange={handleModuleChange} />

      {/* LNB (1depth, 2depth 메뉴) */}
      {selectedModule === 'statement' && (
        <LNB
          title="간이지급명세서"
          menuItems={STATEMENT_MENU_ITEMS}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      )}

      {selectedModule === 'hr' && (
        <LNB
          title="인사"
          menuItems={HR_MENU_ITEMS}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      )}

      {selectedModule === 'payroll' && (
        <LNB
          title="급여"
          menuItems={PAYROLL_MENU_ITEMS}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      )}

      {/* 메인 콘텐츠 영역 */}
      <main ref={mainRef} className="flex-1 overflow-auto bg-white">
        <div className="mx-auto max-w-[1500px] px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
