import { useEffect, useRef } from 'react';
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
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string | number;
        height?: string | number;
      }) => {
        embed: (element: HTMLElement | null) => void;
      };
    };
  }
}

interface AddressSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: { zonecode: string; address: string }) => void;
}

export function AddressSearchDialog({
  open,
  onOpenChange,
  onComplete,
}: AddressSearchDialogProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Daum Postcode 스크립트 로드
    const scriptId = 'daum-postcode-script';

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    const initPostcode = (): void => {
      if (!window.daum || !window.daum.Postcode) {
        setTimeout(initPostcode, 100);
        return;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = '';

        new window.daum.Postcode({
          oncomplete: (data: DaumPostcodeData) => {
            const fullAddress = data.roadAddress || data.jibunAddress;
            onComplete({ zonecode: data.zonecode, address: fullAddress });
            onOpenChange(false);
          },
          width: '100%',
          height: '100%',
        }).embed(containerRef.current);
      }
    };

    // 약간의 지연 후 실행 (DialogContent가 완전히 렌더링될 때까지 기다림)
    setTimeout(initPostcode, 100);
  }, [open, onComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>주소 검색</DialogTitle>
          <p className="text-sm text-gray-500">도로명 또는 지번으로 검색하세요.</p>
        </DialogHeader>
        <div
          ref={containerRef}
          className="w-full h-[500px] border rounded-md"
        ></div>
      </DialogContent>
    </Dialog>
  );
}
