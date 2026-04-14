import { useState, useEffect } from 'react';
import { MainLayout } from './shared/components/layout';
import { BusinessIncomeMonthlyList } from './modules/statement/pages/BusinessIncomeMonthlyList';
import { AllBusinessIncome } from './modules/statement/pages/AllBusinessIncome';
import { OtherIncomeMonthlyList } from './modules/statement/pages/OtherIncomeMonthlyList';
import { AllOtherIncome } from './modules/statement/pages/AllOtherIncome';
import { EmployeeList } from './modules/hr/pages/EmployeeList';
import { AddEmployee } from './modules/hr/pages/AddEmployee';
import { EmployeeDetail } from './modules/hr/pages/EmployeeDetail';
import { DepartmentManagement } from './modules/hr/pages/DepartmentManagement';
import { JobLevelManagement } from './modules/hr/pages/JobLevelManagement';
import { EmploymentTypeManagement } from './modules/hr/pages/EmploymentTypeManagement';
import { LeaveManagement } from './modules/hr/pages/LeaveManagement';
import { InsuranceAcquisition } from './modules/hr/pages/InsuranceAcquisition';
import { InsuranceLoss } from './modules/hr/pages/InsuranceLoss';
import { InsuranceSalaryChange } from './modules/hr/pages/InsuranceSalaryChange';
import { Toaster } from './shared/components/ui/toaster';

export function App(): JSX.Element {
  const [currentPath, setCurrentPath] = useState(
    window.location.pathname === '/'
      ? '/hr/employee'
      : window.location.pathname + window.location.search
  );

  useEffect(() => {
    const handleNavigation = (): void => {
      setCurrentPath(window.location.pathname + window.location.search);
    };

    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // 페이지 전환 시 스크롤을 맨 위로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  const handleNavigate = (path: string): void => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const renderPage = (): JSX.Element => {
    // pathname만 추출 (query string 제거)
    const pathname = currentPath.split('?')[0] || '/';

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

    // 인사 - 직원 추가
    if (pathname === '/hr/employee/add') {
      return <AddEmployee key={currentPath} />;
    }

    // 인사 - 직원 상세
    if (pathname.startsWith('/hr/employee/') && pathname !== '/hr/employee/add') {
      return <EmployeeDetail key={currentPath} />;
    }

    // 인사 - 직원관리
    if (pathname === '/hr/employee' || pathname === '/hr') {
      return <EmployeeList key={currentPath} />;
    }

    // 인사 - 조직관리 - 부서
    if (pathname === '/hr/organization/department') {
      return <DepartmentManagement key={currentPath} />;
    }

    // 인사 - 조직관리 - 직급
    if (pathname === '/hr/organization/position') {
      return <JobLevelManagement key={currentPath} />;
    }

    // 인사 - 조직관리 - 근로형태
    if (pathname === '/hr/organization/employment-type') {
      return <EmploymentTypeManagement key={currentPath} />;
    }

    // 인사 - 연차/휴가관리
    if (pathname === '/hr/leave') {
      return <LeaveManagement key={currentPath} />;
    }

    // 인사 - 4대보험 관리 - 자격 취득신고
    if (pathname === '/hr/insurance/acquisition') {
      return <InsuranceAcquisition key={currentPath} />;
    }

    // 인사 - 4대보험 관리 - 자격 상실신고
    if (pathname === '/hr/insurance/loss') {
      return <InsuranceLoss key={currentPath} />;
    }

    // 인사 - 4대보험 관리 - 보수월액 변경
    if (pathname === '/hr/insurance/salary-change') {
      return <InsuranceSalaryChange key={currentPath} />;
    }

    // 인사 - 4대보험 관리 - 피부양자 관리
    if (pathname === '/hr/insurance/dependent') {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-800">피부양자 관리</h1>
          <p className="text-slate-600 mt-2">준비 중입니다.</p>
        </div>
      );
    }

    // 인사 - 근태관리
    if (pathname === '/hr/attendance') {
      return (
        <div className="p-8">
          <h1 className="text-2xl font-bold text-slate-800">근태관리</h1>
          <p className="text-slate-600 mt-2">준비 중입니다.</p>
        </div>
      );
    }

    // 기본 페이지
    return <EmployeeList key={currentPath} />;
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
