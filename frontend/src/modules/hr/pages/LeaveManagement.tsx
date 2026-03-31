import { useState } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { LeaveDashboard } from '../components/LeaveDashboard';
import { LeaveApproval } from '../components/LeaveApproval';
import { VacationTypeManagement } from '../components/VacationTypeManagement';
import { LeaveSettings } from '../components/LeaveSettings';

export function LeaveManagement(): JSX.Element {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div>
      <PageHeader title="연차/휴가관리" showBackButton={false} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">휴가 현황</TabsTrigger>
          <TabsTrigger value="approval">휴가 승인</TabsTrigger>
          <TabsTrigger value="vacation-types">휴가 종류 관리</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <LeaveDashboard />
        </TabsContent>

        <TabsContent value="approval" className="mt-6">
          <LeaveApproval />
        </TabsContent>

        <TabsContent value="vacation-types" className="mt-6">
          <VacationTypeManagement />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <LeaveSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
