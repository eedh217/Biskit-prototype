import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  showBackButton = false,
  onBack,
  actions,
}: PageHeaderProps): JSX.Element {
  const handleBackClick = (): void => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h1
            className={`text-2xl font-bold ${showBackButton ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
            onClick={showBackButton ? handleBackClick : undefined}
          >
            {title}
          </h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
