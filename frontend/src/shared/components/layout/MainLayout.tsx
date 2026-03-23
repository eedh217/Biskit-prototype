import { ReactNode, useState } from 'react';
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

export function MainLayout({ children, currentPath, onNavigate }: MainLayoutProps): JSX.Element {
  const [selectedModule, setSelectedModule] = useState<string>('statement');

  const handleModuleChange = (module: string): void => {
    setSelectedModule(module);
    // 모듈 변경 시 기본 경로로 이동
    if (module === 'statement') {
      onNavigate('/statement/business-income/monthly');
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* 모듈 선택 사이드바 */}
      <Sidebar selectedModule={selectedModule} onModuleChange={handleModuleChange} />

      {/* LNB (1depth, 2depth 메뉴) */}
      {selectedModule === 'statement' && (
        <LNB
          menuItems={STATEMENT_MENU_ITEMS}
          currentPath={currentPath}
          onNavigate={onNavigate}
        />
      )}

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="mx-auto max-w-[1500px] px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
