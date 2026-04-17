import { useState } from 'react';
import { PageHeader } from '@/shared/components/common/PageHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { PAYROLL_ITEMS_2026 } from '../constants/payrollItems2026';
import { PayrollItemsByYear } from '../types/payroll';

// 현재 사용 가능한 연도 목록 (하드코딩)
const AVAILABLE_YEARS = [2026];

// 연도별 급여항목 데이터 맵
const PAYROLL_ITEMS_MAP: Record<number, PayrollItemsByYear> = {
  2026: PAYROLL_ITEMS_2026,
};

export function PayrollItems(): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // 선택된 연도의 급여항목 데이터
  const payrollItems = PAYROLL_ITEMS_MAP[selectedYear];

  if (!payrollItems) {
    return (
      <div className="space-y-6">
        <PageHeader title="급여항목" showBackButton={false} />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              선택한 연도의 급여항목 데이터가 없습니다.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="급여항목" showBackButton={false} />

      {/* 연도 선택 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">연도</label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 급여항목 탭 */}
      <Tabs defaultValue="taxable" className="space-y-4">
        <TabsList>
          <TabsTrigger value="taxable">
            과세 ({payrollItems.taxableItems.length})
          </TabsTrigger>
          <TabsTrigger value="non-taxable">
            비과세 ({payrollItems.nonTaxableItems.length})
          </TabsTrigger>
        </TabsList>

        {/* 과세 항목 */}
        <TabsContent value="taxable">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">번호</TableHead>
                    <TableHead>항목명</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollItems.taxableItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 비과세 항목 */}
        <TabsContent value="non-taxable">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">코드</TableHead>
                    <TableHead>항목명</TableHead>
                    <TableHead className="w-[150px]">월 한도</TableHead>
                    <TableHead className="w-[200px]">연 한도</TableHead>
                    <TableHead className="w-[150px] text-center">
                      지급명세서 작성
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollItems.nonTaxableItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.code}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {item.monthlyLimit || '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 whitespace-pre-line">
                        {item.yearlyLimit || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.includeInStatement ? 'O' : 'X'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
