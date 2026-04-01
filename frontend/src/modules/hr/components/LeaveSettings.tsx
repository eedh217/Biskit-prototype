import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from '@/shared/hooks/use-toast';
import { leaveSettingsService } from '../services/leaveSettingsService';
import { leaveBalanceService } from '../services/leaveBalanceService';
import { employeeService } from '../services/employeeService';
import { vacationTypeService } from '../services/vacationTypeService';
import type { LeaveSettings } from '../types/leave';
import type { VacationType } from '../types/vacation';
import { getEmploymentStatus } from '../types/employee';

export function LeaveSettings(): JSX.Element {
  const [settings, setSettings] = useState<LeaveSettings | null>(null);
  const [selectedHourlyLeaveEnabled, setSelectedHourlyLeaveEnabled] = useState(true);
  const [selectedGrantType, setSelectedGrantType] = useState<'join_date' | 'year_start'>(
    'join_date'
  );
  const [selectedRoundingMethod, setSelectedRoundingMethod] = useState<'floor' | 'ceil'>('floor');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingHourly, setIsSavingHourly] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasChangesForHourly, setHasChangesForHourly] = useState(false);
  const [hourlyVacationTypes, setHourlyVacationTypes] = useState<VacationType[]>([]);

  useEffect(() => {
    loadSettings();
    loadVacationTypes();
  }, []);

  const loadVacationTypes = async (): Promise<void> => {
    try {
      const types = await vacationTypeService.getAll();
      // 시간 단위가 포함된 휴가 종류만 필터링
      const hourlyTypes = types.filter((type) => type.usageUnits.includes('hour'));
      setHourlyVacationTypes(hourlyTypes);
    } catch (error) {
      console.error('Failed to load vacation types:', error);
    }
  };

  const loadSettings = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const currentSettings = await leaveSettingsService.get();
      setSettings(currentSettings);
      setSelectedHourlyLeaveEnabled(currentSettings.hourlyLeaveEnabled);
      setSelectedGrantType(currentSettings.grantType);
      setSelectedRoundingMethod(currentSettings.roundingMethod);
      setHasChanges(false);
      setHasChangesForHourly(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantTypeChange = (value: string): void => {
    const newType = value as 'join_date' | 'year_start';
    setSelectedGrantType(newType);
    setHasChanges(
      settings?.grantType !== newType || settings?.roundingMethod !== selectedRoundingMethod
    );
  };

  const handleRoundingMethodChange = (value: string): void => {
    const newMethod = value as 'floor' | 'ceil';
    setSelectedRoundingMethod(newMethod);
    setHasChanges(
      settings?.grantType !== selectedGrantType || settings?.roundingMethod !== newMethod
    );
  };

  const handleHourlyLeaveEnabledChange = (checked: boolean): void => {
    setSelectedHourlyLeaveEnabled(checked);
    setHasChangesForHourly(settings?.hourlyLeaveEnabled !== checked);
  };

  const handleSaveHourly = async (): Promise<void> => {
    if (!hasChangesForHourly || !settings) return;

    const confirmMessage = selectedHourlyLeaveEnabled
      ? '연차/휴가 시간 단위 사용을 허용하시겠습니까?'
      : '연차/휴가 시간 단위 사용을 제한하시겠습니까?';

    if (!confirm(confirmMessage)) return;

    setIsSavingHourly(true);
    try {
      // 설정 업데이트
      await leaveSettingsService.update(
        selectedHourlyLeaveEnabled,
        settings.grantType,
        settings.roundingMethod,
        'admin'
      ); // TODO: 실제 로그인 사용자 ID

      // 시간 단위만 설정된 휴가 종류의 활성/비활성 처리
      const allTypes = await vacationTypeService.getAll();
      const hourOnlyTypes = allTypes.filter(
        (type) => type.usageUnits.length === 1 && type.usageUnits[0] === 'hour'
      );

      for (const type of hourOnlyTypes) {
        if (type.isActive !== selectedHourlyLeaveEnabled) {
          await vacationTypeService.toggleActive(type.id);
        }
      }

      toast({
        title: '설정 변경 완료',
        description: `시간 단위 연차/휴가 사용이 ${selectedHourlyLeaveEnabled ? '활성화' : '비활성화'}되었습니다.`,
      });

      // 설정 및 휴가 종류 다시 로드
      await loadSettings();
      await loadVacationTypes();
    } catch (error) {
      console.error('Failed to save hourly leave settings:', error);
      toast({
        title: '설정 변경 실패',
        description: '설정 변경에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingHourly(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!hasChanges || !settings) return;

    const confirmMessage =
      '⚠️ 연차 발생 기준을 변경하면 모든 직원의 연차 현황에 영향을 미칩니다.\n' +
      '모든 직원의 연차가 자동으로 재계산됩니다.\n\n' +
      '변경하시겠습니까?';

    if (!confirm(confirmMessage)) return;

    setIsSaving(true);
    try {
      // 설정 업데이트
      await leaveSettingsService.update(
        settings.hourlyLeaveEnabled,
        selectedGrantType,
        selectedRoundingMethod,
        'admin'
      ); // TODO: 실제 로그인 사용자 ID

      // 모든 직원의 연차 재계산
      const emps = await employeeService.getAll({ limit: 9999 });
      const activeEmployees = emps.data.filter(
        (emp) => getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      await leaveBalanceService.recalculateAll(activeEmployees);

      toast({
        title: '설정 변경 완료',
        description: `연차 발생 기준이 변경되었습니다. (${activeEmployees.length}명 재계산)`,
      });

      // 설정 다시 로드
      await loadSettings();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: '설정 변경 실패',
        description: '설정 변경에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculate = async (): Promise<void> => {
    const confirmMessage =
      '⚠️ 모든 재직 직원의 연차를 현재 설정 기준으로 재계산합니다.\n\n' +
      '계속하시겠습니까?';

    if (!confirm(confirmMessage)) return;

    setIsRecalculating(true);
    try {
      // 모든 직원의 연차 재계산
      const emps = await employeeService.getAll({ limit: 9999 });
      const activeEmployees = emps.data.filter(
        (emp) => getEmploymentStatus(emp.leaveDate) === '재직중'
      );

      await leaveBalanceService.recalculateAll(activeEmployees);

      toast({
        title: '재계산 완료',
        description: `${activeEmployees.length}명의 연차가 재계산되었습니다.`,
      });
    } catch (error) {
      console.error('Failed to recalculate:', error);
      toast({
        title: '재계산 실패',
        description: '연차 재계산에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* 시간 단위 사용 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>연차/휴가 시간 단위 사용</CardTitle>
          <CardDescription>
            임직원이 연차/휴가를 시간 단위로 사용할 수 있는지 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex-1">
              <div className="font-medium mb-1">시간 단위 사용</div>
              <div className="text-sm text-gray-600">
                활성화 시, 임직원은 1시간 단위로 연차/휴가를 사용할 수 있습니다. (1시간 = 0.125일)
              </div>
            </div>
            <Switch
              checked={selectedHourlyLeaveEnabled}
              onCheckedChange={handleHourlyLeaveEnabledChange}
            />
          </div>

          {hasChangesForHourly && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>주의</AlertTitle>
              <AlertDescription>
                {selectedHourlyLeaveEnabled ? (
                  <div className="space-y-2">
                    <div>
                      on으로 변경 시, 임직원은 연차/휴가를 시간 단위로 사용할 수 있으며, 1시간 사용 시 0.125일이 차감됩니다.
                    </div>
                    {hourlyVacationTypes.length > 0 && (
                      <div className="pt-2 border-t border-red-200">
                        <div>또한, 시간 단위 사용이 설정된 휴가 종류도 시간 단위 사용이 허용됩니다.</div>
                        <div className="mt-1">
                          <span className="font-medium">영향 휴가 종류: {hourlyVacationTypes.length}개</span>
                          <div className="text-sm">({hourlyVacationTypes.map((vt) => vt.name).join(', ')})</div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      off로 변경 시, 임직원이 보유한 시간 단위 잔여 연차/휴가(예: 0.125일, 0.25일 등)는 더 이상 사용할 수 없습니다.
                      <br />
                      변경 전에 잔여 연차/휴가 사용 여부를 확인해주세요.
                    </div>
                    {hourlyVacationTypes.length > 0 && (
                      <div className="pt-2 border-t border-red-200">
                        <div>또한, 시간 단위 사용이 설정된 휴가 종류에서도 시간 단위 사용이 제한됩니다.</div>
                        <div className="mt-1">
                          <span className="font-medium">영향 휴가 종류: {hourlyVacationTypes.length}개</span>
                          <div className="text-sm">({hourlyVacationTypes.map((vt) => vt.name).join(', ')})</div>
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-red-200 text-sm">
                      ※ 이미 대기중인 시간 단위 신청은 유지되며, 정상적으로 승인/반려 처리할 수 있습니다.
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              onClick={handleSaveHourly}
              disabled={!hasChangesForHourly || isSavingHourly}
            >
              {isSavingHourly ? '저장 중...' : '저장'}
            </Button>
            {hasChangesForHourly && (
              <Button
                variant="outline"
                onClick={loadSettings}
                disabled={isSavingHourly}
              >
                취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 연차 발생 기준 */}
      <Card>
        <CardHeader>
          <CardTitle>연차 발생 기준</CardTitle>
          <CardDescription>
            직원의 연차를 어떻게 계산할지 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedGrantType} onValueChange={handleGrantTypeChange}>
            <div className="space-y-4">
              {/* 입사일 기준 */}
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="join_date" id="join_date" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="join_date" className="cursor-pointer">
                    <div className="font-semibold mb-1">입사일 기준</div>
                    <div className="text-sm text-gray-600">
                      입사일부터 1년 단위로 연차를 계산합니다.
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <div>• 1년 미만: 월 1일 발생 (예: 3월 입사 → 10개월 = 10일)</div>
                      <div>• 1년 이상: 15일 + 근속가산 (2년마다 1일, 최대 25일)</div>
                      <div>• 예: 입사 3주년 → 16일 (15 + 1)</div>
                    </div>
                  </Label>
                </div>
              </div>

              {/* 연초 기준 */}
              <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-gray-50">
                <RadioGroupItem value="year_start" id="year_start" className="mt-1" />
                <div className="flex-1 space-y-3">
                  <Label htmlFor="year_start" className="cursor-pointer">
                    <div className="font-semibold mb-1">연초 기준 (1월 1일 일괄 부여)</div>
                    <div className="text-sm text-gray-600">
                      매년 1월 1일에 해당 연도의 연차를 일괄적으로 부여합니다.
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <div>• 입사년도: 입사월 다음 달부터 12월까지 월차 1개씩</div>
                      <div>• 다음 해 (1년 미만): 비례 부여 (15 × 전년도 근무개월 / 12)</div>
                      <div>• 1년 이상: 15일 + 근속가산 (2년마다 1일, 최대 25일)</div>
                      <div>• 예: 2025년 5월 10일 입사 → 2025년 7개, 2026년 1월 1일 10개</div>
                    </div>
                  </Label>

                  {/* 비례부여 소수점 처리 */}
                  <div className="space-y-2 pt-3 border-t">
                    <Label htmlFor="rounding-method" className="text-sm font-medium">
                      비례부여 소수점 처리
                    </Label>
                    <Select
                      value={selectedRoundingMethod}
                      onValueChange={handleRoundingMethodChange}
                      disabled={selectedGrantType !== 'year_start'}
                    >
                      <SelectTrigger id="rounding-method" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="floor">버림 (예: 8.75개 → 8개)</SelectItem>
                        <SelectItem value="ceil">올림 (예: 8.75개 → 9개)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      중도입사자의 연차를 비례 계산할 때 소수점을 어떻게 처리할지 선택합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>

          {hasChanges && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>주의</AlertTitle>
              <AlertDescription>
                연차 발생 기준을 변경하면 모든 직원의 연차 현황이 자동으로 재계산됩니다.
                변경 전에 신중히 검토해주세요.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
            {hasChanges && (
              <Button
                variant="outline"
                onClick={loadSettings}
                disabled={isSaving}
              >
                취소
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={isRecalculating || isSaving}
            >
              {isRecalculating ? '재계산 중...' : '전체 직원 연차 재계산'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 현재 설정 정보 */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">현재 설정 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-4">
              <span className="text-gray-500">시간 단위 사용</span>
              <span className="col-span-2 font-medium">
                {settings.hourlyLeaveEnabled ? '활성화' : '비활성화'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="text-gray-500">현재 발생 기준</span>
              <span className="col-span-2 font-medium">
                {settings.grantType === 'join_date' ? '입사일 기준' : '연초 기준 (1월 1일)'}
              </span>
            </div>
            {settings.grantType === 'year_start' && (
              <div className="grid grid-cols-3 gap-4">
                <span className="text-gray-500">비례부여 소수점</span>
                <span className="col-span-2 font-medium">
                  {settings.roundingMethod === 'floor' ? '버림' : '올림'}
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <span className="text-gray-500">마지막 수정일</span>
              <span className="col-span-2">
                {new Date(settings.updatedAt).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="text-gray-500">수정자</span>
              <span className="col-span-2">{settings.updatedBy}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

