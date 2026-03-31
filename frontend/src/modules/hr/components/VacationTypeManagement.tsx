import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CardContent } from '@/shared/components/ui/card';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import { vacationTypeService } from '../services/vacationTypeService';
import type { VacationType, CreateVacationTypeDto } from '../types/vacation';
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
import { GripVertical, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Textarea } from '@/shared/components/ui/textarea';

interface SortableItemProps {
  vacationType: VacationType;
  isSelected: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string) => void;
  onSelect: (id: string) => void;
}

function SortableItem({
  vacationType,
  isSelected,
  onEdit,
  onDelete,
  onToggleActive,
  onSelect,
}: SortableItemProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: vacationType.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getDaysDisplay = (): string => {
    if (vacationType.days === null) {
      return '직원마다 부여';
    }
    return `${vacationType.days}일`;
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-3 border rounded-md p-3 group cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 border-blue-300'
            : vacationType.isActive
            ? 'bg-white border-gray-200 hover:bg-gray-50'
            : 'bg-gray-100 border-gray-300'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelect(vacationType.id)}
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${vacationType.isActive ? 'text-slate-700' : 'text-gray-500'}`}>
                {vacationType.name}
              </span>
              {vacationType.isLegal && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">법정</span>
              )}
              {!vacationType.isActive && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">비활성</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>{getDaysDisplay()}</span>
              <span>·</span>
              <span>{vacationType.isPaid ? '유급' : '무급'}</span>
              <span>·</span>
              <span>
                {vacationType.usageUnits && vacationType.usageUnits.length > 0
                  ? vacationType.usageUnits
                      .map((unit) =>
                        unit === 'day'
                          ? '일'
                          : unit === 'half-day'
                          ? '반일'
                          : '시간'
                      )
                      .join(', ')
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {isHovered && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleActive(vacationType.id)}
              className="h-8 w-8 p-0"
              title={vacationType.isActive ? '비활성화' : '활성화'}
            >
              {vacationType.isActive ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
            {!vacationType.isLegal && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(vacationType.id)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(vacationType.id)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function VacationTypeManagement(): JSX.Element {
  const [vacationTypes, setVacationTypes] = useState<VacationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVacationTypeId, setSelectedVacationTypeId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVacationType, setEditingVacationType] = useState<VacationType | null>(null);
  const { toast } = useToast();

  // 폼 데이터
  const [formData, setFormData] = useState<CreateVacationTypeDto>({
    name: '',
    days: null,
    isPaid: true,
    usageUnits: [],
    description: '',
    deductionDays: null,
    affectsLeaveBalance: false,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadVacationTypes();
  }, []);

  const loadVacationTypes = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const data = await vacationTypeService.getAll();
      setVacationTypes(data);

      // 첫 번째 항목 자동 선택
      if (data.length > 0 && !selectedVacationTypeId && data[0]) {
        setSelectedVacationTypeId(data[0].id);
      }
    } catch (error) {
      toast({
        title: '오류',
        description: '휴가 종류 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = (): void => {
    setFormData({
      name: '',
      days: null,
      isPaid: true,
      usageUnits: [],
      description: '',
      deductionDays: null,
      affectsLeaveBalance: false,
    });
    setIsAddDialogOpen(true);
  };

  const handleAddSave = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast({
        title: '오류',
        description: '휴가 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await vacationTypeService.create(formData);
      await loadVacationTypes();
      setIsAddDialogOpen(false);
      toast({
        title: '성공',
        description: '휴가 종류가 추가되었습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '휴가 종류 추가에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (id: string): void => {
    const vacationType = vacationTypes.find((item) => item.id === id);
    if (vacationType && !vacationType.isLegal) {
      setEditingVacationType(vacationType);
      setFormData({
        name: vacationType.name,
        days: vacationType.days,
        isPaid: vacationType.isPaid,
        usageUnits: vacationType.usageUnits || [],
        description: vacationType.description,
        deductionDays: vacationType.deductionDays,
        affectsLeaveBalance: vacationType.affectsLeaveBalance,
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleEditSave = async (): Promise<void> => {
    if (!editingVacationType) return;

    if (!formData.name.trim()) {
      toast({
        title: '오류',
        description: '휴가 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // affectsLeaveBalance 변경 감지
    const affectsLeaveBalanceChanged =
      editingVacationType.affectsLeaveBalance !== formData.affectsLeaveBalance;

    // 변경된 경우 confirm 노출
    if (affectsLeaveBalanceChanged) {
      const confirmed = window.confirm(
        '연차 잔액 영향 변경 시, 기존에 휴가를 신청하거나 승인한 대상자의 연차 사용 현황이 변동됩니다. 변경하시겠습니까?'
      );

      if (!confirmed) {
        // 취소: 다이얼로그 유지
        return;
      }
    }

    try {
      await vacationTypeService.update(editingVacationType.id, {
        name: formData.name,
        days: formData.days,
        isPaid: formData.isPaid,
        usageUnits: formData.usageUnits,
        description: formData.description,
        deductionDays: formData.deductionDays,
        affectsLeaveBalance: formData.affectsLeaveBalance,
        isActive: editingVacationType.isActive,
      });
      await loadVacationTypes();
      setIsEditDialogOpen(false);
      setEditingVacationType(null);

      toast({
        title: '성공',
        description: '휴가 종류가 수정되었습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '휴가 종류 수정에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    const vacationType = vacationTypes.find((item) => item.id === id);
    if (!vacationType || vacationType.isLegal) return;

    if (!window.confirm(`'${vacationType.name}' 휴가 종류를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await vacationTypeService.delete(id);
      await loadVacationTypes();
      toast({
        title: '성공',
        description: '휴가 종류가 삭제되었습니다.',
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '휴가 종류 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string): Promise<void> => {
    const vacationType = vacationTypes.find((item) => item.id === id);
    if (!vacationType) return;

    const newStatus = !vacationType.isActive;

    try {
      await vacationTypeService.toggleActive(id);
      await loadVacationTypes();
      toast({
        title: '성공',
        description: `${vacationType.name}이(가) ${newStatus ? '활성화' : '비활성화'}되었습니다.`,
      });
    } catch (error) {
      toast({
        title: '오류',
        description: '상태 변경에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = vacationTypes.findIndex((item) => item.id === active.id);
    const newIndex = vacationTypes.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(vacationTypes, oldIndex, newIndex);
    setVacationTypes(reorderedItems);

    try {
      await vacationTypeService.updateOrder(reorderedItems);
    } catch (error) {
      toast({
        title: '오류',
        description: '순서 변경에 실패했습니다.',
        variant: 'destructive',
      });
      await loadVacationTypes();
    }
  };

  const selectedVacationType = vacationTypes.find((vt) => vt.id === selectedVacationTypeId);

  if (isLoading) {
    return <div className="text-center text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Panel - Vacation Type List */}
        <div className="w-96 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
          <CardContent className="pt-6 flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">총 {vacationTypes.length}개</div>
              <Button onClick={handleAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                추가하기
              </Button>
            </div>

            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={vacationTypes.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {vacationTypes.map((vacationType) => (
                    <SortableItem
                      key={vacationType.id}
                      vacationType={vacationType}
                      isSelected={selectedVacationTypeId === vacationType.id}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleActive={handleToggleActive}
                      onSelect={setSelectedVacationTypeId}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {vacationTypes.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>등록된 휴가 종류가 없습니다.</p>
                  <p className="text-sm mt-1">추가하기 버튼을 눌러 휴가 종류를 등록해보세요.</p>
                </div>
              )}
            </div>
          </CardContent>
        </div>

        {/* Right Panel - Vacation Type Details */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-auto">
          {selectedVacationType ? (
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">휴가 종류 상세</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">휴가 이름</span>
                      <span className="col-span-2 font-medium">{selectedVacationType.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">구분</span>
                      <span className="col-span-2">
                        {selectedVacationType.isLegal ? (
                          <span className="text-blue-700 font-medium">법정 휴가</span>
                        ) : (
                          <span className="text-gray-700">회사 휴가</span>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">일수</span>
                      <span className="col-span-2 font-medium">
                        {selectedVacationType.days === null
                          ? '직원마다 부여'
                          : `${selectedVacationType.days}일`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">연차 잔액 영향</span>
                      <span className="col-span-2 font-medium">
                        {selectedVacationType.affectsLeaveBalance ? '영향 있음' : '영향 없음'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">유급/무급</span>
                      <span className="col-span-2 font-medium">
                        {selectedVacationType.isPaid ? '유급' : '무급'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">사용 단위</span>
                      <span className="col-span-2 font-medium">
                        {selectedVacationType.usageUnits && selectedVacationType.usageUnits.length > 0
                          ? selectedVacationType.usageUnits
                              .map((unit) =>
                                unit === 'day'
                                  ? '일 단위'
                                  : unit === 'half-day'
                                  ? '반일 단위'
                                  : '시간 단위'
                              )
                              .join(', ')
                          : '-'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">활성 상태</span>
                      <span className="col-span-2">
                        {selectedVacationType.isActive ? (
                          <span className="text-green-600 font-medium">활성</span>
                        ) : (
                          <span className="text-gray-500">비활성</span>
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <span className="text-gray-500">설명</span>
                      <span className="col-span-2 text-gray-700 whitespace-pre-wrap">
                        {selectedVacationType.description || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500">휴가 종류를 선택하면 상세 정보가 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>휴가 종류 추가</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">휴가 이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 리프레시 휴가"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">일수 *</Label>
              <Input
                id="days"
                type="number"
                value={formData.days ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, days: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="1 이상의 숫자를 입력하세요 (최대 999,999)"
                min={1}
                max={999999}
              />
            </div>

            <div className="space-y-2">
              <Label>연차 잔액 영향 *</Label>
              <RadioGroup
                value={formData.affectsLeaveBalance ? 'yes' : 'no'}
                onValueChange={(value) => setFormData({ ...formData, affectsLeaveBalance: value === 'yes' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="affects-no" />
                  <Label htmlFor="affects-no" className="cursor-pointer font-normal">
                    영향 없음 (법정 휴가, 회사 복지 등)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="affects-yes" />
                  <Label htmlFor="affects-yes" className="cursor-pointer font-normal">
                    영향 있음 (연차 잔액에서 차감)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>유급/무급 *</Label>
              <RadioGroup
                value={formData.isPaid ? 'paid' : 'unpaid'}
                onValueChange={(value) => setFormData({ ...formData, isPaid: value === 'paid' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="paid" />
                  <Label htmlFor="paid" className="cursor-pointer font-normal">
                    유급
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unpaid" id="unpaid" />
                  <Label htmlFor="unpaid" className="cursor-pointer font-normal">
                    무급
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>사용 단위 * (복수 선택 가능)</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unit-day"
                    checked={(formData.usageUnits || []).includes('day')}
                    onChange={(e) => {
                      const currentUnits = formData.usageUnits || [];
                      if (e.target.checked) {
                        if (!currentUnits.includes('day')) {
                          setFormData({ ...formData, usageUnits: [...currentUnits, 'day'] });
                        }
                      } else {
                        setFormData({ ...formData, usageUnits: currentUnits.filter((u) => u !== 'day') });
                      }
                    }}
                  />
                  <Label htmlFor="unit-day" className="cursor-pointer font-normal">
                    일 단위
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unit-half-day"
                    checked={(formData.usageUnits || []).includes('half-day')}
                    onChange={(e) => {
                      const currentUnits = formData.usageUnits || [];
                      if (e.target.checked) {
                        if (!currentUnits.includes('half-day')) {
                          setFormData({ ...formData, usageUnits: [...currentUnits, 'half-day'] });
                        }
                      } else {
                        setFormData({ ...formData, usageUnits: currentUnits.filter((u) => u !== 'half-day') });
                      }
                    }}
                  />
                  <Label htmlFor="unit-half-day" className="cursor-pointer font-normal">
                    반일 단위
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unit-hour"
                    checked={(formData.usageUnits || []).includes('hour')}
                    onChange={(e) => {
                      const currentUnits = formData.usageUnits || [];
                      if (e.target.checked) {
                        if (!currentUnits.includes('hour')) {
                          setFormData({ ...formData, usageUnits: [...currentUnits, 'hour'] });
                        }
                      } else {
                        setFormData({ ...formData, usageUnits: currentUnits.filter((u) => u !== 'hour') });
                      }
                    }}
                  />
                  <Label htmlFor="unit-hour" className="cursor-pointer font-normal">
                    시간 단위
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="휴가 종류에 대한 설명을 입력하세요"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="default"
              onClick={handleAddSave}
              disabled={
                !formData.name.trim() ||
                formData.days === null ||
                formData.days < 1 ||
                formData.isPaid === undefined ||
                formData.usageUnits.length === 0
              }
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>휴가 종류 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">휴가 이름 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 리프레시 휴가"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-days">일수 *</Label>
              <Input
                id="edit-days"
                type="number"
                value={formData.days ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, days: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="1 이상의 숫자를 입력하세요 (최대 999,999)"
                min={1}
                max={999999}
              />
            </div>

            <div className="space-y-2">
              <Label>연차 잔액 영향 *</Label>
              <RadioGroup
                value={formData.affectsLeaveBalance ? 'yes' : 'no'}
                onValueChange={(value) => setFormData({ ...formData, affectsLeaveBalance: value === 'yes' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="edit-affects-no" />
                  <Label htmlFor="edit-affects-no" className="cursor-pointer font-normal">
                    영향 없음 (법정 휴가, 회사 복지 등)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="edit-affects-yes" />
                  <Label htmlFor="edit-affects-yes" className="cursor-pointer font-normal">
                    영향 있음 (연차 잔액에서 차감)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>유급/무급 *</Label>
              <RadioGroup
                value={formData.isPaid ? 'paid' : 'unpaid'}
                onValueChange={(value) => setFormData({ ...formData, isPaid: value === 'paid' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paid" id="edit-paid" />
                  <Label htmlFor="edit-paid" className="cursor-pointer font-normal">
                    유급
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unpaid" id="edit-unpaid" />
                  <Label htmlFor="edit-unpaid" className="cursor-pointer font-normal">
                    무급
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>사용 단위 * (복수 선택 가능)</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-unit-day"
                    checked={(formData.usageUnits || []).includes('day')}
                    onChange={(e) => {
                      const currentUnits = formData.usageUnits || [];
                      if (e.target.checked) {
                        if (!currentUnits.includes('day')) {
                          setFormData({ ...formData, usageUnits: [...currentUnits, 'day'] });
                        }
                      } else {
                        setFormData({ ...formData, usageUnits: currentUnits.filter((u) => u !== 'day') });
                      }
                    }}
                  />
                  <Label htmlFor="edit-unit-day" className="cursor-pointer font-normal">
                    일 단위
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-unit-half-day"
                    checked={(formData.usageUnits || []).includes('half-day')}
                    onChange={(e) => {
                      const currentUnits = formData.usageUnits || [];
                      if (e.target.checked) {
                        if (!currentUnits.includes('half-day')) {
                          setFormData({ ...formData, usageUnits: [...currentUnits, 'half-day'] });
                        }
                      } else {
                        setFormData({ ...formData, usageUnits: currentUnits.filter((u) => u !== 'half-day') });
                      }
                    }}
                  />
                  <Label htmlFor="edit-unit-half-day" className="cursor-pointer font-normal">
                    반일 단위
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-unit-hour"
                    checked={(formData.usageUnits || []).includes('hour')}
                    onChange={(e) => {
                      const currentUnits = formData.usageUnits || [];
                      if (e.target.checked) {
                        if (!currentUnits.includes('hour')) {
                          setFormData({ ...formData, usageUnits: [...currentUnits, 'hour'] });
                        }
                      } else {
                        setFormData({ ...formData, usageUnits: currentUnits.filter((u) => u !== 'hour') });
                      }
                    }}
                  />
                  <Label htmlFor="edit-unit-hour" className="cursor-pointer font-normal">
                    시간 단위
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">설명</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="휴가 종류에 대한 설명을 입력하세요"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="default"
              onClick={handleEditSave}
              disabled={
                !formData.name.trim() ||
                formData.days === null ||
                formData.days < 1 ||
                formData.isPaid === undefined ||
                formData.usageUnits.length === 0
              }
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
