import { useState } from 'react';
import { Download } from 'lucide-react';
import { useBusinessIncomeSummary } from '../hooks/useBusinessIncome';
import { ExcelUploadDialog } from '../components/ExcelUploadDialog';
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
import { formatCurrency, formatDateTime } from '../types/business-income.types';

export function BusinessIncomeSummary(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showExcelUpload, setShowExcelUpload] = useState(false);

  const { data: summary, isLoading, refetch } = useBusinessIncomeSummary(selectedYear);

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
    link.download = `${selectedYear}년 ${month}월 사업소득 간이지급명세서.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRowClick = (month: number): void => {
    const url = `/statement/business-income/monthly?year=${selectedYear}&month=${month}`;
    window.history.pushState({}, '', url);
    window.location.reload();
  };

  const handleExcelUpload = (): void => {
    setShowExcelUpload(true);
  };

  if (isLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <>
      <ExcelUploadDialog
        open={showExcelUpload}
        onOpenChange={setShowExcelUpload}
        onSuccess={() => refetch()}
      />

      <div>
        <PageHeader
          title="사업소득 합산"
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

          <Button onClick={handleExcelUpload} variant="default">엑셀 업로드</Button>
        </div>

        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-left">월</TableHead>
            <TableHead className="text-right">건수(소득자건수)</TableHead>
            <TableHead className="text-right">총 지급액</TableHead>
            <TableHead className="text-right">총 소득세</TableHead>
            <TableHead className="text-right">총 지방소득세</TableHead>
            <TableHead className="text-right">총 실지급액</TableHead>
            <TableHead className="text-center">신고파일 최종생성일</TableHead>
            <TableHead className="text-center">다운로드</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summary?.map((item, index) => (
            <TableRow
              key={`${item.month}-${index}`}
              onClick={item.isExceptionRow ? undefined : () => handleRowClick(item.month)}
              className={
                item.isExceptionRow
                  ? 'bg-gray-50 cursor-default'
                  : 'cursor-pointer hover:bg-gray-50'
              }
            >
              <TableCell className={item.isExceptionRow ? 'text-left pl-8 text-sm' : 'text-left'}>
                {item.isExceptionRow ? item.exceptionLabel : `${item.month}월`}
              </TableCell>
              <TableCell className={item.isExceptionRow ? 'text-right text-sm' : 'text-right'}>
                {item.count}
              </TableCell>
              <TableCell className={item.isExceptionRow ? 'text-right text-sm' : 'text-right'}>
                {formatCurrency(item.totalPaymentSum)}
              </TableCell>
              <TableCell className={item.isExceptionRow ? 'text-right text-sm' : 'text-right'}>
                {formatCurrency(item.totalIncomeTax)}
              </TableCell>
              <TableCell className={item.isExceptionRow ? 'text-right text-sm' : 'text-right'}>
                {formatCurrency(item.totalLocalIncomeTax)}
              </TableCell>
              <TableCell className={item.isExceptionRow ? 'text-right text-sm' : 'text-right'}>
                {formatCurrency(item.totalActualPayment)}
              </TableCell>
              <TableCell className="text-center">
                {item.isExceptionRow ? '' : formatDateTime(item.reportFileGeneratedAt)}
              </TableCell>
              <TableCell className="text-center">
                {item.isExceptionRow ? (
                  ''
                ) : item.reportFileGeneratedAt ? (
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
    </>
  );
}
