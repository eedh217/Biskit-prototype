import { useState } from 'react';
import { businessIncomeService } from '../services/business-income.service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UploadResult {
  total: number;
  success: number;
  failed: number;
  failures: Array<{ row: number; iino: string; reason: string }>;
}

export function ExcelUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExcelUploadDialogProps): JSX.Element {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      alert('엑셀 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 최대 10MB까지 가능합니다.');
      return;
    }

    setUploading(true);

    try {
      // 엑셀 파일 읽기 (간단한 구현)
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          if (!data) return;

          // 실제 구현에서는 xlsx 라이브러리로 파싱
          // 여기서는 임시로 JSON 형태로 가정
          const excelData = await parseExcelFile();

          const uploadResult = await businessIncomeService.uploadExcel(excelData);
          setResult(uploadResult);

          if (uploadResult.failed === 0) {
            alert('엑셀 업로드를 완료했습니다.');
            onSuccess();
            onOpenChange(false);
          }
        } catch (error) {
          alert('엑셀 파일 처리 중 오류가 발생했습니다.');
        } finally {
          setUploading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      alert('파일 업로드 중 오류가 발생했습니다.');
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async (): Promise<void> => {
    try {
      const template = await businessIncomeService.getExcelTemplate();

      // CSV 형식으로 다운로드 (간단한 구현)
      const headers = Object.keys(template[0]!);
      const csv = [
        headers.join(','),
        ...template.map((row) =>
          headers.map((h) => row[h] ?? '').join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = '간이지급명세서_사업소득_업로드_양식.csv';
      link.click();
    } catch (error) {
      alert('양식 다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleDownloadFailures = (): void => {
    if (!result || result.failures.length === 0) return;

    const csv = [
      'Row,주민(사업자)등록번호,실패사유',
      ...result.failures.map((f) => `${f.row},${f.iino},${f.reason}`),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0]?.replace(/-/g, '');
    link.download = `사업소득업로드_실패목록_${date}.csv`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>엑셀 업로드</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                className="w-full"
              >
                엑셀 양식 받기
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Button
                  type="button"
                  variant="default"
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? '업로드 중...' : '파일 올리기'}
                </Button>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p>• 허용 확장자: .xlsx, .xls</p>
              <p>• 최대 파일 크기: 10MB</p>
              <p>• 파일은 1개만 업로드 가능합니다.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>총 건수:</span>
                  <span className="font-semibold">{result.total}건</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>성공:</span>
                  <span className="font-semibold">{result.success}건</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>실패:</span>
                  <span className="font-semibold">{result.failed}건</span>
                </div>
              </div>
            </div>

            {result.failures.length > 0 && (
              <>
                <div className="max-h-60 overflow-y-auto border rounded p-4">
                  <div className="space-y-2">
                    {result.failures.map((failure, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-semibold">
                          Row {failure.row} - {failure.iino}
                        </div>
                        <div className="text-red-600">{failure.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadFailures}
                  className="w-full"
                >
                  실패 데이터 다운로드
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="default"
              onClick={() => {
                setResult(null);
                onOpenChange(false);
                onSuccess();
              }}
              className="w-full"
            >
              확인
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// 임시 파서 함수 (실제로는 xlsx 라이브러리 사용)
async function parseExcelFile(): Promise<unknown[]> {
  // 실제 구현에서는 xlsx 라이브러리로 파싱
  // 여기서는 임시로 빈 배열 반환
  return [];
}
