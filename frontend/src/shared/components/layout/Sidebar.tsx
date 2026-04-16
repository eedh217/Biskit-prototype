import { Button } from '@/shared/components/ui/button';
import { FileText, Users, Wallet } from 'lucide-react';

interface SidebarProps {
  selectedModule: string;
  onModuleChange: (module: string) => void;
}

export function Sidebar({ selectedModule, onModuleChange }: SidebarProps): JSX.Element {
  return (
    <aside className="w-16 bg-slate-900 flex flex-col items-center py-4 gap-2">
      <div className="mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
          B
        </div>
      </div>

      <Button
        variant={selectedModule === 'hr' ? 'secondary' : 'ghost'}
        size="icon"
        className={`w-12 h-12 ${
          selectedModule === 'hr'
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        onClick={() => onModuleChange('hr')}
        title="인사"
      >
        <Users className="h-6 w-6" />
      </Button>

      <Button
        variant={selectedModule === 'payroll' ? 'secondary' : 'ghost'}
        size="icon"
        className={`w-12 h-12 ${
          selectedModule === 'payroll'
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        onClick={() => onModuleChange('payroll')}
        title="급여"
      >
        <Wallet className="h-6 w-6" />
      </Button>

      <Button
        variant={selectedModule === 'statement' ? 'secondary' : 'ghost'}
        size="icon"
        className={`w-12 h-12 ${
          selectedModule === 'statement'
            ? 'bg-slate-700 text-white hover:bg-slate-600'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        onClick={() => onModuleChange('statement')}
        title="간이지급명세서"
      >
        <FileText className="h-6 w-6" />
      </Button>
    </aside>
  );
}
