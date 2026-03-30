import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import { employeeService } from '../services/employeeService';
import { organizationService } from '../services/organizationService';
import { jobLevelService } from '../services/jobLevelService';
import { employmentTypeService } from '../services/employmentTypeService';
import { employeeHistoryService } from '../services/employeeHistoryService';
import type { Employee } from '../types/employee';
import type { Organization, OrganizationNode } from '../types/organization';
import type { JobLevel } from '../types/jobLevel';
import type { EmploymentType } from '../types/employmentType';
import type { EmployeeHistoryChange } from '../types/employeeHistory';
import { toast } from '@/shared/hooks/use-toast';

interface EditOrganizationInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  onSuccess: () => void;
}

interface FormData {
  departmentId: string;
  position: string;
  employmentTypeId: string;
  isDepartmentHead: boolean;
}

interface FormErrors {
  isDepartmentHead?: string;
}

// 날짜 비교 헬퍼 함수
const getTodayString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const isBeforeToday = (dateStr: string): boolean => {
  if (!dateStr || dateStr.length !== 8) return false;
  return dateStr < getTodayString();
};

const isTodayOrAfter = (dateStr: string): boolean => {
  if (!dateStr || dateStr.length !== 8) return false;
  return dateStr >= getTodayString();
};

export function EditOrganizationInfoDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: EditOrganizationInfoDialogProps): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  // 초기값 설정
  const getInitialFormData = (): FormData => {
    return {
      departmentId: employee.departmentId || '',
      position: employee.position || '',
      employmentTypeId: employee.employmentTypeId || '',
      isDepartmentHead: employee.isDepartmentHead || false,
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  // 트리를 평면화하는 함수
  const flattenTree = (nodes: OrganizationNode[]): Organization[] => {
    const result: Organization[] = [];
    const traverse = (node: OrganizationNode): void => {
      const { children, ...org } = node;
      result.push(org);
      children.forEach(traverse);
    };
    nodes.forEach(traverse);
    return result;
  };

  // 조직의 전체 경로를 구하는 함수
  const getOrganizationPath = (org: Organization, allOrgs: Organization[]): string => {
    const path: string[] = [];
    let current: Organization | undefined = org;

    while (current) {
      path.unshift(current.name);
      current = allOrgs.find((o) => o.id === current?.parentId);
    }

    return path.join(' > ');
  };

  // 조직 데이터 로드
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const [orgTree, levels, types] = await Promise.all([
          organizationService.getTree(),
          jobLevelService.getList(),
          employmentTypeService.getList(),
        ]);
        const flatOrgs = flattenTree(orgTree);
        setOrganizations(flatOrgs);
        setJobLevels(levels);
        setEmploymentTypes(types);
      } catch (error) {
        console.error('Failed to load organization data:', error);
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  // Dialog가 열릴 때마다 폼 데이터 초기화
  useEffect(() => {
    if (open) {
      setFormData(getInitialFormData());
      setIsModified(false);
      setErrors({});
    }
  }, [open, employee]);

  const handleChange = (field: keyof FormData, value: string | boolean): void => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // 부서장 체크 변경 시 퇴사일 검증
      if (field === 'isDepartmentHead' && typeof value === 'boolean') {
        // 퇴사일 형식 변환 (YYYY-MM-DD → YYYYMMDD)
        const leaveDateStr = employee.leaveDate?.replace(/-/g, '');

        if (value && leaveDateStr && isBeforeToday(leaveDateStr)) {
          setErrors((prevErrors) => ({
            ...prevErrors,
            isDepartmentHead: '퇴사일을 오늘 이전 날짜로 지정한 경우, 부서장으로 선택할 수 없습니다.',
          }));
        } else {
          setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            delete newErrors.isDepartmentHead;
            return newErrors;
          });
        }
      }

      return newData;
    });
    setIsModified(true);
  };

  // Dialog 닫기 시도 시 confirm 체크
  const handleClose = (): void => {
    if (isModified) {
      const confirmed = window.confirm('조직정보 수정을 취소하시겠습니까?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  // Dialog의 onOpenChange override (ESC 키, 외부 영역 클릭 등)
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      if (isModified) {
        const confirmed = window.confirm('조직정보 수정을 취소하시겠습니까?');
        if (!confirmed) return;
      }
    }
    onOpenChange(open);
  };

  const handleSubmit = async (): Promise<void> => {
    // 에러가 있으면 저장 차단
    if (Object.keys(errors).length > 0) {
      return;
    }

    // 퇴사일 형식 변환 (YYYY-MM-DD → YYYYMMDD)
    const leaveDateStr = employee.leaveDate?.replace(/-/g, '');

    // 퇴사일(오늘 이후) + 부서장 체크 시 Confirm 팝업
    if (formData.isDepartmentHead && leaveDateStr && isTodayOrAfter(leaveDateStr)) {
      const confirmed = window.confirm(
        '퇴사일 이후에는 부서장이 체크해제됩니다. 부서장으로 수정하시겠습니까?'
      );

      if (!confirmed) {
        return; // 취소 시 저장 중단
      }
    }

    setIsSubmitting(true);

    try {
      // 변경 이력 추적
      const changes: EmployeeHistoryChange[] = [];

      let finalIsDepartmentHead = formData.isDepartmentHead;

      // 부서장 체크가 되어 있을 때 중복 확인
      if (formData.isDepartmentHead && formData.departmentId) {
        const existingHead = await employeeService.getDepartmentHead(formData.departmentId);

        // 기존 부서장이 있고, 현재 직원이 아닌 경우
        if (existingHead && existingHead.id !== employee.id) {
          const department = organizations.find((o) => o.id === formData.departmentId);
          const departmentPath = department
            ? getOrganizationPath(department, organizations)
            : '선택한 부서';

          const confirmed = window.confirm(
            `${departmentPath}의 부서장은 ${existingHead.name}님으로 지정되어 있습니다. ${employee.name}님으로 변경하시겠습니까?\n\n아니오 선택 시, 부서장은 ${existingHead.name}님으로 유지됩니다.`
          );

          if (!confirmed) {
            finalIsDepartmentHead = false;
          } else {
            // "예" 선택 시 기존 부서장 해제
            await employeeService.update(existingHead.id, { isDepartmentHead: false });
          }
        }
      }

      // 부서 변경
      const newDepartmentId = formData.departmentId || null;
      if (newDepartmentId !== employee.departmentId) {
        const getDepartmentName = (deptId: string | null): string => {
          if (!deptId) return '-';
          const dept = organizations.find((o) => o.id === deptId);
          return dept ? getOrganizationPath(dept, organizations) : '-';
        };
        changes.push({
          fieldName: '부서',
          fieldKey: 'departmentId',
          oldValue: employee.departmentId,
          newValue: newDepartmentId,
          displayOldValue: getDepartmentName(employee.departmentId),
          displayNewValue: getDepartmentName(newDepartmentId),
        });
      }

      // 직급 변경
      const newPosition = formData.position || null;
      if (newPosition !== employee.position) {
        const getPositionName = (positionId: string | null): string => {
          if (!positionId) return '-';
          const level = jobLevels.find((l) => l.id === positionId);
          return level?.name || '-';
        };
        changes.push({
          fieldName: '직급',
          fieldKey: 'position',
          oldValue: employee.position,
          newValue: newPosition,
          displayOldValue: getPositionName(employee.position),
          displayNewValue: getPositionName(newPosition),
        });
      }

      // 근로형태 변경
      const newEmploymentTypeId = formData.employmentTypeId || null;
      if (newEmploymentTypeId !== employee.employmentTypeId) {
        const getEmploymentTypeName = (typeId: string | null): string => {
          if (!typeId) return '-';
          const type = employmentTypes.find((t) => t.id === typeId);
          return type?.name || '-';
        };
        changes.push({
          fieldName: '근로형태',
          fieldKey: 'employmentTypeId',
          oldValue: employee.employmentTypeId,
          newValue: newEmploymentTypeId,
          displayOldValue: getEmploymentTypeName(employee.employmentTypeId),
          displayNewValue: getEmploymentTypeName(newEmploymentTypeId),
        });
      }

      // 부서장 여부 변경
      if (finalIsDepartmentHead !== employee.isDepartmentHead) {
        changes.push({
          fieldName: '부서장 여부',
          fieldKey: 'isDepartmentHead',
          oldValue: employee.isDepartmentHead,
          newValue: finalIsDepartmentHead,
          displayOldValue: employee.isDepartmentHead ? '부서장' : '일반',
          displayNewValue: finalIsDepartmentHead ? '부서장' : '일반',
        });
      }

      // 직원 정보 업데이트
      await employeeService.update(employee.id, {
        departmentId: newDepartmentId,
        position: newPosition,
        employmentTypeId: newEmploymentTypeId,
        isDepartmentHead: finalIsDepartmentHead,
      });

      // 이력 저장 (변경사항이 있을 때만)
      if (changes.length > 0) {
        await employeeHistoryService.create({
          employeeId: employee.id,
          category: 'organization',
          categoryName: '조직정보',
          changes,
          modifiedBy: '관리자',
        });
      }

      toast({
        title: '조직정보 수정을 완료했습니다.',
      });

      setIsModified(false);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: '조직정보 수정 실패',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>조직정보 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {/* 부서 */}
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => {
                  handleChange('departmentId', value);
                  // 부서 변경 시 부서장 체크박스 초기화
                  if (formData.isDepartmentHead) {
                    handleChange('isDepartmentHead', false);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="부서를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {getOrganizationPath(org, organizations)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 부서장 체크박스 */}
            <div className="space-y-2">
              <Label className="invisible">부서장</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="isDepartmentHead"
                  checked={formData.isDepartmentHead}
                  onChange={(e) => handleChange('isDepartmentHead', e.target.checked)}
                  disabled={!formData.departmentId}
                />
                <Label htmlFor="isDepartmentHead" className="cursor-pointer">
                  부서장
                </Label>
              </div>
              {errors.isDepartmentHead && (
                <p className="text-sm text-red-500 mt-1">{errors.isDepartmentHead}</p>
              )}
            </div>

            {/* 직급 */}
            <div className="space-y-2">
              <Label htmlFor="position">직급</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => handleChange('position', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="직급을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {jobLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 근로형태 */}
            <div className="space-y-2">
              <Label htmlFor="employmentType">근로형태</Label>
              <Select
                value={formData.employmentTypeId}
                onValueChange={(value) => handleChange('employmentTypeId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="근로형태를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button variant="default" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '수정 중...' : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
