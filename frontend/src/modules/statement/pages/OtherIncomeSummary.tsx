import { useState } from 'react';
import { Download } from 'lucide-react';
import { useOtherIncomeSummary } from '../hooks/useOtherIncome';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/common/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { formatCurrency, formatDateTime } from '../types/other-income.types';

export function OtherIncomeSummary(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { data: summary, isLoading } = useOtherIncomeSummary(selectedYear);

  // 연도 범위: 2026년 ~ (현재 연도 + 1)년
  const years = Array.from(
    { length: currentYear - 2026 + 2 },
    (_, i) => 2026 + i
  );

  const handleDownload = (month: number): void => {
    // PDF 다운로드 (테스트용 빈 PDF)
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000262 00000 n
0000000341 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
433
%%EOF`;

    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedYear}년 ${month}월 기타소득 간이지급명세서.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRowClick = (month: number): void => {
    const url = `/statement/other-income/monthly?year=${selectedYear}&month=${month}`;
    window.history.pushState({}, '', url);
    window.location.reload();
  };

  const handleExcelUpload = (): void => {
    // TODO: Excel upload implementation
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="기타소득 합산"
        showBackButton={false}
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleExcelUpload} variant="default">
          엑셀 업로드
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">월</TableHead>
            <TableHead className="text-right">건수(소득자건수)</TableHead>
            <TableHead className="text-right">총 지급액</TableHead>
            <TableHead className="text-right">총 필요경비</TableHead>
            <TableHead className="text-right">총 소득금액</TableHead>
            <TableHead className="text-right">총 소득세</TableHead>
            <TableHead className="text-right">총 지방소득세</TableHead>
            <TableHead className="text-right">총 실소득금액</TableHead>
            <TableHead className="text-center">신고파일 최종생성일</TableHead>
            <TableHead className="text-center">다운로드</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary?.map((item) => (
            <TableRow
              key={item.month}
              onClick={() => handleRowClick(item.month)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell className="text-left">{item.month}월</TableCell>
              <TableCell className="text-right">{item.count}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.totalPaymentAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.totalNecessaryExpenses)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.totalIncomeAmount)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.totalIncomeTax)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.totalLocalIncomeTax)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.totalActualIncomeAmount)}
              </TableCell>
              <TableCell className="text-center">
                {formatDateTime(item.reportFileGeneratedAt)}
              </TableCell>
              <TableCell className="text-center">
                {item.reportFileGeneratedAt ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item.month);
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors"
                    aria-label="다운로드"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
