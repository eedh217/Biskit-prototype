import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { DataTableColumnHeader } from '@/shared/components/common/data-table-column-header';
import { GroupedBusinessIncome, formatCurrency, formatDateTime } from '../types/business-income.types';

// 업종코드 매핑 (코드 -> 이름)
const INDUSTRY_CODE_MAP: Record<string, string> = {
  '940304': '가수',
  '940305': '성악가 등',
  '940301': '작곡가',
  '940100': '저술가/작가',
  '940200': '화가관련 예술가',
  '940302': '배우',
  '940303': '모델',
  '940500': '연예보조',
  '940306': '1인미디어 콘텐츠창작자',
  '940926': '소프트웨어 프리랜서',
  '940911': '기타 모집수당',
  '940923': '대출모집인',
  '940924': '신용카드 회원모집인',
  '940907': '음료배달',
  '940908': '방문판매원',
  '940929': '중고자동차 판매원',
  '940910': '다단계판매',
  '940912': '간병인',
  '940915': '목욕관리사',
  '940916': '행사도우미',
  '940600': '자문·고문',
  '940901': '바둑기사',
  '940902': '꽃꽂이교사',
  '940903': '학원강사',
  '940920': '학습지 방문강사',
  '940921': '교육교구 방문강사',
  '940925': '방과후강사',
  '940913': '대리운전',
  '940918': '퀵서비스',
  '940917': '심부름용역',
  '940919': '물품운반',
  '940914': '캐디',
  '940904': '직업운동가',
  '940906': '보험설계사',
  '940922': '대여제품 방문점검원',
  '940927': '관광통역안내사',
  '940928': '어린이 통학버스기사',
  '940905': '봉사료수취자',
  '851101': '병의원',
  '940909': '기타자영업',
};

function formatIndustryCode(code: string): string {
  const name = INDUSTRY_CODE_MAP[code];
  return name ? `${name}(${code})` : code;
}

export function createBusinessIncomeColumns(
  selectedIds: string[],
  onSelectionChange: (ids: string[]) => void,
  allData: GroupedBusinessIncome[]
): ColumnDef<GroupedBusinessIncome>[] {
  return [
    {
      id: 'select',
      header: () => {
        const allGroupedIds = allData.flatMap((item) => item.groupedIds);
        const isAllSelected =
          allGroupedIds.length > 0 &&
          allGroupedIds.every((id) => selectedIds.includes(id));

        return (
          <Checkbox
            checked={isAllSelected}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectionChange(allGroupedIds);
              } else {
                onSelectionChange([]);
              }
            }}
            aria-label="모두 선택"
          />
        );
      },
      cell: ({ row }) => {
        const groupedIds = row.original.groupedIds;
        const isSelected = groupedIds.every((id) => selectedIds.includes(id));

        return (
          <Checkbox
            checked={isSelected}
            onChange={(e) => {
              if (e.target.checked) {
                // 합산 행의 모든 ID 추가
                const newIds = [...new Set([...selectedIds, ...groupedIds])];
                onSelectionChange(newIds);
              } else {
                // 합산 행의 모든 ID 제거
                const newIds = selectedIds.filter((id) => !groupedIds.includes(id));
                onSelectionChange(newIds);
              }
            }}
            aria-label="행 선택"
            onClick={(e) => e.stopPropagation()}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'attributionYear',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="귀속연도" />
      ),
      cell: ({ row }) => <div>{row.getValue('attributionYear')}년</div>,
    },
    {
      accessorKey: 'attributionMonth',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="귀속월" />
      ),
      cell: ({ row }) => <div>{row.getValue('attributionMonth')}월</div>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="성명(상호)" />
      ),
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'iino',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="주민(사업자)등록번호" />
      ),
      cell: ({ row }) => <div>{row.getValue('iino')}</div>,
    },
    {
      accessorKey: 'industryCode',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="업종코드" />
      ),
      cell: ({ row }) => <div>{formatIndustryCode(row.getValue('industryCode'))}</div>,
    },
    {
      accessorKey: 'paymentSum',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="지급액" />
      ),
      cell: ({ row }) => {
        const isGrouped = row.original.isGrouped;
        const groupedCount = row.original.groupedCount;

        return (
          <div className="text-right flex items-center justify-end gap-2">
            <span>{formatCurrency(row.getValue('paymentSum'))}</span>
            {isGrouped && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {groupedCount}개 합산
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'incomeTax',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="소득세" />
      ),
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('incomeTax'))}</div>
      ),
    },
    {
      accessorKey: 'localIncomeTax',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="지방소득세" />
      ),
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('localIncomeTax'))}</div>
      ),
    },
    {
      accessorKey: 'actualPayment',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="실지급액" />
      ),
      cell: ({ row }) => (
        <div className="text-right">{formatCurrency(row.getValue('actualPayment'))}</div>
      ),
    },
    {
      accessorKey: 'reportFileGeneratedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="신고파일 최종 생성일" />
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {formatDateTime(row.getValue('reportFileGeneratedAt'))}
        </div>
      ),
    },
  ];
}
