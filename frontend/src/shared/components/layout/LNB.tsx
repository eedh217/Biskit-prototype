import { Button } from '@/shared/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MenuItem {
  id: string;
  label: string;
  path: string;
  children?: MenuItem[];
}

interface LNBProps {
  title: string;
  menuItems: MenuItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
}

const STORAGE_KEY = 'biskit_lnb_expanded_items';

export function LNB({ title, menuItems, currentPath, onNavigate }: LNBProps): JSX.Element {
  // localStorage에서 초기 펼침 상태 로드
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // expandedItems 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedItems));
  }, [expandedItems]);

  // currentPath가 변경될 때마다 펼침 상태 업데이트
  useEffect(() => {
    const expanded: string[] = [];

    const findParent = (items: MenuItem[], path: string): void => {
      items.forEach((item) => {
        if (item.children) {
          // 자식 중 하나가 활성화되어 있는지 확인
          const hasActiveChild = item.children.some(
            (child) => path === child.path || path.startsWith(child.path + '/')
          );
          // 부모 경로 자체가 활성화되어 있는지 확인 (방어적 처리)
          const isParentActive = path === item.path;

          if (hasActiveChild || isParentActive) {
            expanded.push(item.id);
          }
          findParent(item.children, path);
        }
      });
    };

    findParent(menuItems, currentPath);

    setExpandedItems((prev) => {
      // 기존에 펼쳐진 항목과 새로 펼쳐야 할 항목을 합침
      const combined = [...new Set([...prev, ...expanded])];
      return combined;
    });
  }, [currentPath, menuItems]);

  const toggleExpand = (id: string): void => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isActive = (path: string): boolean => {
    // 쿼리 파라미터를 제거하고 경로만 비교
    const currentPathWithoutQuery = currentPath.split('?')[0] || '/';
    return currentPathWithoutQuery === path || currentPathWithoutQuery.startsWith(path + '/');
  };

  const renderMenuItem = (item: MenuItem, level: number = 0): JSX.Element => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.path);

    return (
      <div key={item.id}>
        <Button
          variant="ghost"
          className={`w-full justify-between text-left h-auto py-3 px-4 ${
            level > 0 ? 'pl-8' : ''
          } ${
            active
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.id);
            } else {
              onNavigate(item.path);
            }
          }}
        >
          <span>{item.label}</span>
          {hasChildren && (
            <ChevronRight
              className={`h-4 w-4 ml-2 transition-transform ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </Button>

        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => renderMenuItem(item))}
      </nav>
    </aside>
  );
}
