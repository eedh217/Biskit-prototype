import { PageHeader } from '@/shared/components/common/PageHeader';

export function PositionManagement(): JSX.Element {
  return (
    <div>
      <PageHeader title="직책" showBackButton={false} />

      <div className="mt-6">
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-700">직책 관리</h2>
          <p className="text-slate-500 mt-2">준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
}
