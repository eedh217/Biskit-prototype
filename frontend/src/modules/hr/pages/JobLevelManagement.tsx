import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useToast } from '@/shared/hooks/use-toast';
import { jobLevelService } from '../services/jobLevelService';
import { employeeService } from '../services/employeeService';
import { getEmploymentStatus } from '../types/employee';
import type { JobLevel } from '../types/jobLevel';
import { JobLevelDetail } from '../components/JobLevelDetail';
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
  jobLevel: JobLevel;
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
  jobLevel,
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
    id: jobLevel.id,
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
        onClick={() => !isEditing && onSelect(jobLevel.id)}
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
            <span className="text-sm text-slate-700">{jobLevel.name}</span>
            <span className="text-xs text-slate-500">({employeeCount})</span>
          </div>
        )}

        {!isEditing && isHovered && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(jobLevel.id)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(jobLevel.id)}
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

export function JobLevelManagement(): JSX.Element {
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newJobLevelName, setNewJobLevelName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState('');
  const [selectedJobLevelId, setSelectedJobLevelId] = useState<string | null>(null);
  const [employeeCountByJobLevel, setEmployeeCountByJobLevel] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const addInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadJobLevels();
  }, []);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [isAdding]);

  const loadJobLevels = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await jobLevelService.getList();
      setJobLevels(data);

      // 첫 번째 직급 자동 선택
      if (data.length > 0 && !selectedJobLevelId) {
        setSelectedJobLevelId(data[0].id);
      }

      // 직원 수 계산 (재직중인 직원만)
      const employees = await employeeService.getAll({ limit: 9999 });
      const activeEmployees = employees.data.filter((emp) =>
        getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      // 직급별 직원 수 계산
      const countMap = new Map<string, number>();
      activeEmployees.forEach((emp) => {
        if (emp.position) {
          const current = countMap.get(emp.position) || 0;
          countMap.set(emp.position, current + 1);
        }
      });
      setEmployeeCountByJobLevel(countMap);
    } catch (error) {
      toast({
        title: '오류',
        description: '직급 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = (): void => {
    setIsAdding(true);
    setNewJobLevelName('');
    setAddError('');
  };

  const handleAddSave = async (): Promise<void> => {
    const trimmedName = newJobLevelName.trim();
    if (!trimmedName) {
      setIsAdding(false);
      setAddError('');
      return;
    }

    // 중복 체크
    const isDuplicate = jobLevels.some(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddError('이미 동일한 직급이 등록되어 있습니다.');
      return;
    }

    try {
      await jobLevelService.create({ name: trimmedName });
      await loadJobLevels();
      setIsAdding(false);
      setNewJobLevelName('');
      setAddError('');
    } catch (error) {
      toast({
        title: '오류',
        description: '직급 추가에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleAddCancel = (): void => {
    setIsAdding(false);
    setNewJobLevelName('');
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
    const jobLevel = jobLevels.find((item) => item.id === id);
    if (jobLevel) {
      setEditingId(id);
      setEditValue(jobLevel.name);
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
    const isDuplicate = jobLevels.some(
      (item) => item.id !== editingId && item.name.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (isDuplicate) {
      setEditError('이미 동일한 직급이 등록되어 있습니다.');
      return;
    }

    try {
      await jobLevelService.update(editingId, { name: trimmedValue });
      await loadJobLevels();
      setEditingId(null);
      setEditError('');
    } catch (error) {
      toast({
        title: '오류',
        description: '직급 수정에 실패했습니다.',
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
    const jobLevel = jobLevels.find((item) => item.id === id);
    if (!jobLevel) return;

    // 소속 직원 확인 (재직중인 직원만)
    const employeeCount = employeeCountByJobLevel.get(id) || 0;
    if (employeeCount > 0) {
      alert('소속 직원이 존재하여 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`'${jobLevel.name}' 직급을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await jobLevelService.delete(id);
      await loadJobLevels();
    } catch (error) {
      toast({
        title: '오류',
        description: '직급 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = jobLevels.findIndex((item) => item.id === active.id);
    const newIndex = jobLevels.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(jobLevels, oldIndex, newIndex);
    setJobLevels(reorderedItems);

    try {
      await jobLevelService.updateOrder(reorderedItems);
    } catch (error) {
      toast({
        title: '오류',
        description: '순서 변경에 실패했습니다.',
        variant: 'destructive',
      });
      await loadJobLevels();
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="직급" showBackButton={false} />
        <div className="mt-6 text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <PageHeader title="직급" showBackButton={false} />

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Job Level List */}
        <div className="w-96 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <CardContent className="pt-6 flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">총 {jobLevels.length}개</div>
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
                <SortableContext items={jobLevels.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {jobLevels.map((jobLevel) => (
                    <SortableItem
                      key={jobLevel.id}
                      jobLevel={jobLevel}
                      isEditing={editingId === jobLevel.id}
                      editValue={editValue}
                      editError={editError}
                      isSelected={selectedJobLevelId === jobLevel.id}
                      employeeCount={employeeCountByJobLevel.get(jobLevel.id) || 0}
                      onEdit={handleEdit}
                      onEditChange={setEditValue}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onDelete={handleDelete}
                      onSelect={setSelectedJobLevelId}
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
                      value={newJobLevelName}
                      onChange={(e) => setNewJobLevelName(e.target.value)}
                      onKeyDown={handleAddKeyDown}
                      onBlur={handleAddSave}
                      placeholder="직급명 입력 후 Enter"
                      className="flex-1"
                      maxLength={20}
                    />
                  </div>
                  {addError && (
                    <div className="text-sm text-red-600 mt-1 ml-11">{addError}</div>
                  )}
                </div>
              )}

              {jobLevels.length === 0 && !isAdding && (
                <div className="text-center py-12 text-gray-500">
                  <p>등록된 직급이 없습니다.</p>
                  <p className="text-sm mt-1">추가하기 버튼을 눌러 직급을 등록해보세요.</p>
                </div>
              )}
            </div>
          </CardContent>
        </div>

        {/* Right Panel - Job Level Details */}
        <div className="flex-1 flex flex-col overflow-auto">
          {selectedJobLevelId ? (
            <JobLevelDetail jobLevelId={selectedJobLevelId} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">직급을 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
