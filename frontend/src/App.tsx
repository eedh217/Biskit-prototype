import { useState, useEffect } from 'react';
import { MainLayout } from './shared/components/layout';
import { BusinessIncomeMonthlyList } from './modules/statement/pages/BusinessIncomeMonthlyList';
import { AllBusinessIncome } from './modules/statement/pages/AllBusinessIncome';
import { OtherIncomeMonthlyList } from './modules/statement/pages/OtherIncomeMonthlyList';
import { AllOtherIncome } from './modules/statement/pages/AllOtherIncome';
import { Toaster } from './shared/components/ui/toaster';

export function App(): JSX.Element {
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname === '/'
      ? '/statement/business-income/monthly'
      : window.location.pathname + window.location.search
  );

  useEffect(() => {
    const handleNavigation = (): void => {
      setCurrentPath(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  const handleNavigate = (path: string): void => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderPage = (): JSX.Element => {
    // pathname만 추출 (query string 제거)
    const pathname = currentPath.split('?')[0];

    // 사업소득 - 월별목록 (사업소득 합산 화면 포함)
    if (
      pathname === '/statement/business-income/monthly' ||
      pathname === '/statement/business-income' ||
      pathname === '/'
    ) {
      return <BusinessIncomeMonthlyList key={currentPath} />;
    }

    // 사업소득 - 전체목록
    if (pathname === '/statement/business-income/all') {
      return <AllBusinessIncome key={currentPath} />;
    }

    // 근로소득 (추후 구현)
    if (pathname.startsWith('/statement/earned-income')) {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-800">근로소득</h1>
          <p className="text-slate-600 mt-2">준비 중입니다.</p>
        </div>
      );
    }

    // 기타소득 - 월별목록 (기타소득 합산 화면 + 월별 리스트)
    if (
      pathname === '/statement/other-income/monthly' ||
      pathname === '/statement/other-income' ||
      pathname.startsWith('/statement/other-income/monthly')
    ) {
      return <OtherIncomeMonthlyList key={currentPath} />;
    }

    // 기타소득 - 전체목록
    if (pathname === '/statement/other-income/all') {
      return <AllOtherIncome key={currentPath} />;
    }

    // 기본 페이지
    return <BusinessIncomeMonthlyList key={currentPath} />;
  };

  return (
    <>
      <MainLayout currentPath={currentPath} onNavigate={handleNavigate}>
        {renderPage()}
      </MainLayout>
      <Toaster />
    </>
  );
}
