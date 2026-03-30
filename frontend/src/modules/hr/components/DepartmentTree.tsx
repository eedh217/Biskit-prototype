import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  CollisionDetection,
  pointerWithin,
  getFirstCollision,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { OrganizationNode } from '../types/organization';
import { DepartmentTreeItem } from './DepartmentTreeItem';
import { useToast } from '@/shared/hooks/use-toast';

interface DepartmentTreeProps {
  tree: OrganizationNode[];
  onAddRoot: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCheckCanDelete: (id: string) => Promise<{ canDelete: boolean; message: string; hasChildren: boolean }>;
  onAddChild: (parentId: string, name: string) => Promise<void>;
  onReorder: (activeId: string, overId: string) => Promise<void>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  employeeCountByDept: Map<string, number>;
}

export function DepartmentTree({
  tree,
  onAddRoot,
  onUpdate,
  onDelete,
  onCheckCanDelete,
  onAddChild,
  onReorder,
  selectedId,
  onSelect,
  employeeCountByDept,
}: DepartmentTreeProps): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editError, setEditError] = useState('');
  const [addingRootValue, setAddingRootValue] = useState('');
  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [addRootError, setAddRootError] = useState('');
  const [addingChildParentId, setAddingChildParentId] = useState<string | null>(null);
  const [addingChildValue, setAddingChildValue] = useState('');
  const [addChildError, setAddChildError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isShakingRoot, setIsShakingRoot] = useState(false);
  const [shakingEditId, setShakingEditId] = useState<string | null>(null);
  const [shakingChildParentId, setShakingChildParentId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const addRootInputRef = useRef<HTMLInputElement>(null);

  // 에러 상태 체크
  const hasError = Boolean(
    (isAddingRoot && addRootError) ||
    (editingId && editError) ||
    (addingChildParentId && addChildError)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isAddingRoot && addRootInputRef.current) {
      addRootInputRef.current.focus();
    }
  }, [isAddingRoot]);

  const handleAddRootClick = (): void => {
    if (hasError) {
      // 에러가 있는 입력 필드로 포커스 및 shake
      if (isAddingRoot) {
        setIsShakingRoot(true);
        addRootInputRef.current?.focus();
        setTimeout(() => setIsShakingRoot(false), 500);
      } else if (editingId) {
        setShakingEditId(editingId);
        setTimeout(() => setShakingEditId(null), 500);
      } else if (addingChildParentId) {
        setShakingChildParentId(addingChildParentId);
        setTimeout(() => setShakingChildParentId(null), 500);
      }
      return;
    }
    setIsAddingRoot(true);
    setAddingRootValue('');
    setAddRootError('');
  };

  const handleSaveAddingRoot = async (): Promise<void> => {
    if (!addingRootValue.trim()) {
      setIsAddingRoot(false);
      setAddRootError('');
      return;
    }

    try {
      await onAddRoot(addingRootValue.trim());
      setIsAddingRoot(false);
      setAddingRootValue('');
      setAddRootError('');
    } catch (error) {
      if (error instanceof Error) {
        setAddRootError(error.message);
      }
    }
  };

  const handleCancelAddingRoot = (): void => {
    setIsAddingRoot(false);
    setAddingRootValue('');
    setAddRootError('');
  };

  const handleAddRootKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveAddingRoot();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelAddingRoot();
    }
  };

  const handleStartEdit = (id: string, name: string): void => {
    if (hasError) {
      // 에러가 있는 입력 필드로 포커스 및 shake
      if (isAddingRoot) {
        setIsShakingRoot(true);
        addRootInputRef.current?.focus();
        setTimeout(() => setIsShakingRoot(false), 500);
      } else if (editingId) {
        setShakingEditId(editingId);
        setTimeout(() => setShakingEditId(null), 500);
      } else if (addingChildParentId) {
        setShakingChildParentId(addingChildParentId);
        setTimeout(() => setShakingChildParentId(null), 500);
      }
      return;
    }
    setEditingId(id);
    setEditingValue(name);
    setEditError('');
  };

  const handleSaveEdit = async (id: string): Promise<void> => {
    if (!editingValue.trim()) {
      setEditingId(null);
      setEditError('');
      return;
    }

    try {
      await onUpdate(id, editingValue.trim());
      setEditingId(null);
      setEditError('');
    } catch (error) {
      if (error instanceof Error) {
        setEditError(error.message);
      }
    }
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditingValue('');
    setEditError('');
  };

  const handleDelete = async (id: string, name: string): Promise<void> => {
    if (hasError) {
      // 에러가 있는 입력 필드로 포커스 및 shake
      if (isAddingRoot) {
        setIsShakingRoot(true);
        addRootInputRef.current?.focus();
        setTimeout(() => setIsShakingRoot(false), 500);
      } else if (editingId) {
        setShakingEditId(editingId);
        setTimeout(() => setShakingEditId(null), 500);
      } else if (addingChildParentId) {
        setShakingChildParentId(addingChildParentId);
        setTimeout(() => setShakingChildParentId(null), 500);
      }
      return;
    }

    try {
      // 삭제 가능 여부 체크
      const checkResult = await onCheckCanDelete(id);

      if (!checkResult.canDelete) {
        alert(checkResult.message);
        return;
      }

      // confirm 메시지 동적 생성
      const confirmMessage = checkResult.hasChildren
        ? `'${name}' 부서와 하위부서를 모두 삭제하시겠습니까?`
        : `'${name}' 부서를 삭제하시겠습니까?`;

      if (!confirm(confirmMessage)) {
        return;
      }

      await onDelete(id);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  const handleAddChild = (parentId: string): void => {
    if (hasError) {
      // 에러가 있는 입력 필드로 포커스 및 shake
      if (isAddingRoot) {
        setIsShakingRoot(true);
        addRootInputRef.current?.focus();
        setTimeout(() => setIsShakingRoot(false), 500);
      } else if (editingId) {
        setShakingEditId(editingId);
        setTimeout(() => setShakingEditId(null), 500);
      } else if (addingChildParentId) {
        setShakingChildParentId(addingChildParentId);
        setTimeout(() => setShakingChildParentId(null), 500);
      }
      return;
    }
    setAddingChildParentId(parentId);
    setAddingChildValue('');
    setAddChildError('');
  };

  const handleSaveAddingChild = async (): Promise<void> => {
    if (!addingChildValue.trim() || !addingChildParentId) {
      setAddingChildParentId(null);
      setAddChildError('');
      return;
    }

    try {
      await onAddChild(addingChildParentId, addingChildValue.trim());
      setAddingChildParentId(null);
      setAddingChildValue('');
      setAddChildError('');
    } catch (error) {
      if (error instanceof Error) {
        setAddChildError(error.message);
      }
    }
  };

  const handleCancelAddingChild = (): void => {
    setAddingChildParentId(null);
    setAddingChildValue('');
    setAddChildError('');
  };

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }

    setActiveId(null);
  };

  // Get root level IDs for SortableContext
  const getRootIds = (nodes: OrganizationNode[]): string[] => {
    return nodes.map((node) => node.id);
  };

  // Find node by ID in tree
  const findNodeById = (nodes: OrganizationNode[], id: string): OrganizationNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
    return null;
  };

  // Filter tree based on search query
  const filterTree = (nodes: OrganizationNode[], query: string): OrganizationNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    const filterNode = (node: OrganizationNode): OrganizationNode | null => {
      // 자식 노드 먼저 필터링
      const filteredChildren = node.children
        .map((child) => filterNode(child))
        .filter((child): child is OrganizationNode => child !== null);

      // 현재 노드 이름에 검색어가 포함되거나, 자식 중 하나라도 매치되면 포함
      const nameMatches = node.name.toLowerCase().includes(lowerQuery);
      const hasMatchingChildren = filteredChildren.length > 0;

      if (nameMatches || hasMatchingChildren) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return nodes
      .map((node) => filterNode(node))
      .filter((node): node is OrganizationNode => node !== null);
  };

  const filteredTree = filterTree(tree, searchQuery);
  const rootIds = getRootIds(filteredTree);

  // Custom collision detection: only allow dropping on siblings (same parent)
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    const collisions = pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);

    if (!activeId) return collisions;

    // Find active node's parent
    const activeNode = findNodeById(filteredTree, activeId);
    if (!activeNode) return collisions;

    // Filter collisions to only include siblings
    return collisions.filter((collision) => {
      const overNode = findNodeById(filteredTree, collision.id as string);
      if (!overNode) return false;

      // Allow collision only if both nodes have the same parent
      return activeNode.parentId === overNode.parentId;
    });
  };

  if (tree.length === 0 && !isAddingRoot) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="부서명을 입력해주세요."
              className="pl-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleAddRootClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">부서를 추가해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="부서명을 입력해주세요."
            className="pl-9"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleAddRootClick}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
            {/* Tree Items */}
            {filteredTree.length > 0 ? (
              filteredTree.map((node) => (
                <DepartmentTreeItem
                  key={node.id}
                  node={node}
                  editingId={editingId}
                  editingValue={editingValue}
                  editError={editError}
                  shakingEditId={shakingEditId}
                  onStartEdit={handleStartEdit}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditValueChange={setEditingValue}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  addingChildParentId={addingChildParentId}
                  addingChildValue={addingChildValue}
                  addChildError={addChildError}
                  shakingChildParentId={shakingChildParentId}
                  onAddingChildValueChange={setAddingChildValue}
                  onSaveAddingChild={handleSaveAddingChild}
                  onCancelAddingChild={handleCancelAddingChild}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  employeeCountByDept={employeeCountByDept}
                />
              ))
            ) : (
              !isAddingRoot && searchQuery && (
                <div className="flex items-center justify-center py-8">
                  <p className="text-slate-500 text-sm">검색 결과가 없습니다.</p>
                </div>
              )
            )}

            {/* Adding Root Input - 최하단에 배치 */}
            {isAddingRoot && (
              <div className="mt-2 py-1 px-2">
                <Input
                  ref={addRootInputRef}
                  value={addingRootValue}
                  onChange={(e) => setAddingRootValue(e.target.value)}
                  onKeyDown={handleAddRootKeyDown}
                  onBlur={handleSaveAddingRoot}
                  placeholder="부서명 입력 후 Enter"
                  className="h-7 text-sm"
                  style={isShakingRoot ? {
                    animation: 'shake 0.5s',
                  } : undefined}
                />
                {addRootError && (
                  <div className="text-sm text-red-600 mt-1">{addRootError}</div>
                )}
              </div>
            )}
          </SortableContext>

          <DragOverlay>
            {activeId ? (
              (() => {
                const activeNode = findNodeById(filteredTree, activeId);
                if (!activeNode) return null;

                const renderDragPreview = (node: OrganizationNode): JSX.Element => (
                  <div key={node.id}>
                    <div className="flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-100 bg-slate-50">
                      <div style={{ width: `${node.depth * 24}px` }} />
                      <div className="h-6 w-6 flex items-center justify-center">
                        {node.children.length > 0 ? (
                          <svg className="h-4 w-4 text-slate-400 rotate-90" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-slate-400 text-sm">•</span>
                        )}
                      </div>
                      <span className="text-sm text-slate-700">{node.name}</span>
                      <span className="text-xs text-slate-500">
                        ({employeeCountByDept.get(node.id) || 0})
                      </span>
                    </div>
                    {node.children.length > 0 && (
                      <div>
                        {node.children.map((child) => renderDragPreview(child))}
                      </div>
                    )}
                  </div>
                );

                return renderDragPreview(activeNode);
              })()
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
