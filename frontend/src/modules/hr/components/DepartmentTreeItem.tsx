import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { OrganizationNode } from '../types/organization';

interface DepartmentTreeItemProps {
  node: OrganizationNode;
  editingId: string | null;
  editingValue: string;
  editError: string;
  shakingEditId: string | null;
  onStartEdit: (id: string, name: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onDelete: (id: string, name: string) => void;
  onAddChild: (parentId: string) => void;
  addingChildParentId: string | null;
  addingChildValue: string;
  addChildError: string;
  shakingChildParentId: string | null;
  onAddingChildValueChange: (value: string) => void;
  onSaveAddingChild: () => void;
  onCancelAddingChild: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  employeeCountByDept: Map<string, number>;
}

export function DepartmentTreeItem({
  node,
  editingId,
  editingValue,
  editError,
  shakingEditId,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditValueChange,
  onDelete,
  onAddChild,
  addingChildParentId,
  addingChildValue,
  addChildError,
  shakingChildParentId,
  onAddingChildValueChange,
  onSaveAddingChild,
  onCancelAddingChild,
  selectedId,
  onSelect,
  employeeCountByDept,
}: DepartmentTreeItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);
  const addChildInputRef = useRef<HTMLInputElement>(null);

  const isEditing = editingId === node.id;
  const isAddingChild = addingChildParentId === node.id;
  const isShakingEdit = shakingEditId === node.id;
  const isShakingChild = shakingChildParentId === node.id;
  const isSelected = selectedId === node.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isAddingChild && addChildInputRef.current) {
      addChildInputRef.current.focus();
    }
  }, [isAddingChild]);

  // Shake 시 포커스
  useEffect(() => {
    if (isShakingEdit && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isShakingEdit]);

  useEffect(() => {
    if (isShakingChild && addChildInputRef.current) {
      addChildInputRef.current.focus();
      addChildInputRef.current.select();
    }
  }, [isShakingChild]);

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveEdit(node.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const handleAddChildKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSaveAddingChild();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelAddingChild();
    }
  };

  const canAddChild = node.depth < 4; // 최대 5depth (0~4)

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={`group flex items-center gap-1 py-1 px-2 pl-2 rounded hover:bg-slate-100 ${
            isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Spacer for depth indentation */}
          <div style={{ width: `${node.depth * 24}px` }} />

          {/* Chevron for expand/collapse or bullet point */}
          {node.children.length > 0 ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="h-6 w-6 flex items-center justify-center">
              <span className="text-slate-400 text-sm">•</span>
            </div>
          )}

          {/* Department Name or Edit Input */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {isEditing ? (
              <div className="flex-1">
                <Input
                  ref={editInputRef}
                  value={editingValue}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onBlur={() => onSaveEdit(node.id)}
                  className="h-7 text-sm"
                  style={isShakingEdit ? {
                    animation: 'shake 0.5s',
                  } : undefined}
                />
              </div>
            ) : (
              <div
                {...attributes}
                {...listeners}
                className="flex items-center gap-2 flex-1 cursor-grab active:cursor-grabbing"
                onClick={() => onSelect(node.id)}
              >
                <span className="text-sm text-slate-700">{node.name}</span>
                <span className="text-xs text-slate-500">
                  ({employeeCountByDept.get(node.id) || 0})
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons (visible on hover) */}
          {!isEditing && isHovered && (
            <div className="flex items-center gap-1">
              {canAddChild && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddChild(node.id)}
                  title="하위 부서 추가"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onStartEdit(node.id, node.name)}
                title="수정"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onDelete(node.id, node.name)}
                title="삭제"
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          )}
        </div>

        {/* Edit Error Message */}
        {isEditing && editError && (
          <div className="py-1 px-2">
            <div style={{ width: `${node.depth * 24 + 30}px` }} className="inline-block" />
            <div className="text-sm text-red-600 inline-block">{editError}</div>
          </div>
        )}

        {/* Children */}
        <CollapsibleContent>
          <div>
            <SortableContext
              items={node.children.map((child) => child.id)}
              strategy={verticalListSortingStrategy}
            >
              {node.children.map((child) => (
                <DepartmentTreeItem
                  key={child.id}
                  node={child}
                  editingId={editingId}
                  editingValue={editingValue}
                  editError={editError}
                  shakingEditId={shakingEditId}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onEditValueChange={onEditValueChange}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  addingChildParentId={addingChildParentId}
                  addingChildValue={addingChildValue}
                  addChildError={addChildError}
                  shakingChildParentId={shakingChildParentId}
                  onAddingChildValueChange={onAddingChildValueChange}
                  onSaveAddingChild={onSaveAddingChild}
                  onCancelAddingChild={onCancelAddingChild}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  employeeCountByDept={employeeCountByDept}
                />
              ))}
            </SortableContext>

            {/* Adding Child Input */}
            {isAddingChild && (
              <div>
                <div className="relative py-1 px-2 pl-8">
                  <div style={{ width: `${node.depth * 24 + 24}px` }} className="inline-block" />
                  <Input
                    ref={addChildInputRef}
                    value={addingChildValue}
                    onChange={(e) => onAddingChildValueChange(e.target.value)}
                    onKeyDown={handleAddChildKeyDown}
                    onBlur={onSaveAddingChild}
                    placeholder="부서명 입력 후 Enter"
                    className="h-7 text-sm inline-block"
                    style={isShakingChild ? {
                      width: 'calc(100% - ' + (node.depth * 24 + 24) + 'px)',
                      animation: 'shake 0.5s',
                    } : {
                      width: 'calc(100% - ' + (node.depth * 24 + 24) + 'px)',
                    }}
                  />
                </div>
                {addChildError && (
                  <div className="py-1 px-2 pl-8">
                    <div style={{ width: `${node.depth * 24 + 24}px` }} className="inline-block" />
                    <div className="text-sm text-red-600 inline-block">{addChildError}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
