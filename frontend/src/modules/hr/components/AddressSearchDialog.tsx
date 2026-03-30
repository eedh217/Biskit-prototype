import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

interface DaumPostcodeData {
  zonecode: string; // 우편번호
  address: string; // 도로명주소 또는 지번주소
  addressType: 'R' | 'J'; // R: 도로명, J: 지번
  roadAddress: string; // 도로명주소
  jibunAddress: string; // 지번주소
}

declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        width: string | number;
        height: string | number;
      }) => {
        embed: (element: HTMLElement | null) => void;
      };
    };
  }
}

interface AddressSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (zipCode: string, address: string) => void;
}

export function AddressSearchDialog({
  open,
  onOpenChange,
  onComplete,
}: AddressSearchDialogProps): JSX.Element {
  useEffect(() => {
    if (!open) return;

    // Daum Postcode 스크립트 로드
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = (): void => {
      // 스크립트 로드 완료 후 우편번호 검색 UI 생성
      const container = document.getElementById('daum-postcode-container');
      if (container && window.daum) {
        new window.daum.Postcode({
          oncomplete: (data: DaumPostcodeData) => {
            // 도로명주소 우선, 없으면 지번주소
            const fullAddress = data.roadAddress || data.jibunAddress;
            onComplete(data.zonecode, fullAddress);
            onOpenChange(false);
          },
          width: '100%',
          height: '100%',
        }).embed(container);
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [open, onComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px]">
        <DialogHeader>
          <DialogTitle>주소 검색</DialogTitle>
          <p className="text-sm text-gray-500">도로명 또는 지번으로 검색하세요.</p>
        </DialogHeader>
        <div id="daum-postcode-container" className="flex-1 overflow-auto"></div>
      </DialogContent>
    </Dialog>
  );
}
