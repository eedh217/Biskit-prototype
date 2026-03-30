import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CardContent } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { employmentTypeService } from '../services/employmentTypeService';
import { employeeService } from '../services/employeeService';
import { getEmploymentStatus } from '../types/employee';
import type { EmploymentType } from '../types/employmentType';
import { EmploymentTypeDetail } from '../components/EmploymentTypeDetail';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2 } from 'lucide-react';

interface SortableItemProps {
  employmentType: EmploymentType;
  isEditing: boolean;
  editValue: string;
  editError: string;
  isSelected: boolean;
  employeeCount: number;
  onEdit: (id: string) => void;
  onEditChange: (value: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

function SortableItem({
  employmentType,
  isEditing,
  editValue,
  editError,
  isSelected,
  employeeCount,
  onEdit,
  onEditChange,
  onEditSave,
  onEditCancel,
  onDelete,
  onSelect,
}: SortableItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: employmentType.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onEditCancel();
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-3 border rounded-md p-3 group cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 border-blue-300'
            : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => !isEditing && onSelect(employmentType.id)}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        {isEditing ? (
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={onEditSave}
              className="w-full"
              maxLength={20}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-slate-700">{employmentType.name}</span>
            <span className="text-xs text-slate-500">({employeeCount})</span>
          </div>
        )}

        {!isEditing && isHovered && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(employmentType.id)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(employmentType.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {isEditing && editError && (
        <div className="text-sm text-red-600 mt-1 ml-11">{editError}</div>
      )}
    </div>
  );
}

export function EmploymentTypeManagement(): JSX.Element {
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newEmploymentTypeName, setNewEmploymentTypeName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [selectedEmploymentTypeId, setSelectedEmploymentTypeId] = useState<string | null>(null);
  const [employeeCountByEmploymentType, setEmployeeCountByEmploymentType] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const addInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadEmploymentTypes();
  }, []);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const loadEmploymentTypes = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await employmentTypeService.getList();
      setEmploymentTypes(data);

      // 첫 번째 근로형태 자동 선택
      if (data.length > 0 && !selectedEmploymentTypeId && data[0]) {
        setSelectedEmploymentTypeId(data[0].id);
      }

      // 직원 수 계산 (재직중인 직원만)
      const employees = await employeeService.getAll({ limit: 9999 });
      const activeEmployees = employees.data.filter((emp) =>
        getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      // 근로형태별 직원 수 계산
      const countMap = new Map<string, number>();
      activeEmployees.forEach((emp) => {
        if (emp.employmentTypeId) {
          const current = countMap.get(emp.employmentTypeId) || 0;
          countMap.set(emp.employmentTypeId, current + 1);
        }
      });
      setEmployeeCountByEmploymentType(countMap);
    } catch (error) {
      toast({
        title: '오류',
        description: '근로형태 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = (): void => {
    setIsAdding(true);
    setNewEmploymentTypeName('');
    setAddError('');
  };

  const handleAddSave = async (): Promise<void> => {
    const trimmedName = newEmploymentTypeName.trim();
    if (!trimmedName) {
      setIsAdding(false);
      setAddError('');
      return;
    }

    // 중복 체크
    const isDuplicate = employmentTypes.some(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddError('이미 동일한 근로형태가 등록되어 있습니다.');
      return;
    }

    try {
      await employmentTypeService.create({ name: trimmedName });
      await loadEmploymentTypes();
      setIsAdding(false);
      setNewEmploymentTypeName('');
      setAddError('');
    } catch (error) {
      toast({
        title: '오류',
        description: '근로형태 추가에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleAddCancel = (): void => {
    setIsAdding(false);
    setNewEmploymentTypeName('');
    setAddError('');
  };

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleAddCancel();
    }
  };

  const handleEdit = (id: string): void => {
    const employmentType = employmentTypes.find((item) => item.id === id);
    if (employmentType) {
      setEditingId(id);
      setEditValue(employmentType.name);
      setEditError('');
    }
  };

  const handleEditSave = async (): Promise<void> => {
    if (!editingId) return;

    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      setEditingId(null);
      setEditError('');
      return;
    }

    // 중복 체크 (자기 자신 제외)
    const isDuplicate = employmentTypes.some(
      (item) => item.id !== editingId && item.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (isDuplicate) {
      setEditError('이미 동일한 근로형태가 등록되어 있습니다.');
      return;
    }

    try {
      await employmentTypeService.update(editingId, { name: trimmedValue });
      await loadEmploymentTypes();
      setEditingId(null);
      setEditError('');
    } catch (error) {
      toast({
        title: '오류',
        description: '근로형태 수정에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleEditCancel = (): void => {
    setEditingId(null);
    setEditValue('');
    setEditError('');
  };

  const handleDelete = async (id: string): Promise<void> => {
    const employmentType = employmentTypes.find((item) => item.id === id);
    if (!employmentType) return;

    // 소속 직원 확인 (재직중인 직원만)
    const employeeCount = employeeCountByEmploymentType.get(id) || 0;
    if (employeeCount > 0) {
      alert('소속 직원이 존재하여 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`'${employmentType.name}' 근로형태를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await employmentTypeService.delete(id);
      await loadEmploymentTypes();
    } catch (error) {
      toast({
        title: '오류',
        description: '근로형태 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = employmentTypes.findIndex((item) => item.id === active.id);
    const newIndex = employmentTypes.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(employmentTypes, oldIndex, newIndex);
    setEmploymentTypes(reorderedItems);

    try {
      await employmentTypeService.updateOrder(reorderedItems);
    } catch (error) {
      toast({
        title: '오류',
        description: '순서 변경에 실패했습니다.',
        variant: 'destructive',
      });
      await loadEmploymentTypes();
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="근로형태" showBackButton={false} />
        <div className="mt-6 text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="근로형태" showBackButton={false} />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Employment Type List */}
        <div className="w-96 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <CardContent className="pt-6 flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">총 {employmentTypes.length}개</div>
              {!isAdding && (
                <Button onClick={handleAdd} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  추가하기
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={employmentTypes.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {employmentTypes.map((employmentType) => (
                    <SortableItem
                      key={employmentType.id}
                      employmentType={employmentType}
                      isEditing={editingId === employmentType.id}
                      editValue={editValue}
                      editError={editError}
                      isSelected={selectedEmploymentTypeId === employmentType.id}
                      employeeCount={employeeCountByEmploymentType.get(employmentType.id) || 0}
                      onEdit={handleEdit}
                      onEditChange={setEditValue}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onDelete={handleDelete}
                      onSelect={setSelectedEmploymentTypeId}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {isAdding && (
                <div>
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-md p-3">
                    <div className="w-5"></div>
                    <Input
                      ref={addInputRef}
                      value={newEmploymentTypeName}
                      onChange={(e) => setNewEmploymentTypeName(e.target.value)}
                      onKeyDown={handleAddKeyDown}
                      onBlur={handleAddSave}
                      placeholder="근로형태명 입력 후 Enter"
                      className="flex-1"
                      maxLength={20}
                    />
                  </div>
                  {addError && (
                    <div className="text-sm text-red-600 mt-1 ml-11">{addError}</div>
                  )}
                </div>
              )}

              {employmentTypes.length === 0 && !isAdding && (
                <div className="text-center py-12 text-gray-500">
                  <p>등록된 근로형태가 없습니다.</p>
                  <p className="text-sm mt-1">추가하기 버튼을 눌러 근로형태를 등록해보세요.</p>
                </div>
              )}
            </div>
          </CardContent>
        </div>

        {/* Right Panel - Employment Type Details */}
        <div className="flex-1 flex flex-col overflow-auto">
          {selectedEmploymentTypeId ? (
            <EmploymentTypeDetail employmentTypeId={selectedEmploymentTypeId} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">근로형태를 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
