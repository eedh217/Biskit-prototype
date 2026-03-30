import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnPinningState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  getRowClassName?: (row: TData) => string;
  columnPinning?: ColumnPinningState;
  enableInfiniteScroll?: boolean;
  infiniteScrollThreshold?: number;
  infiniteScrollIncrement?: number;
  maxHeight?: string;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (selection: Record<string, boolean>) => void;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  onRowClick,
  pageSize = 30,
  getRowClassName,
  columnPinning,
  enableInfiniteScroll = false,
  infiniteScrollThreshold = 200,
  infiniteScrollIncrement = 30,
  maxHeight = '600px',
  rowSelection: externalRowSelection,
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalRowSelection, setInternalRowSelection] = useState({});
  const [displayedRows, setDisplayedRows] = useState<number>(infiniteScrollIncrement);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 외부에서 rowSelection을 제어하는 경우 외부 값 사용, 아니면 내부 상태 사용
  const rowSelection = externalRowSelection ?? internalRowSelection;
  const setRowSelection = onRowSelectionChange
    ? (updater: ((old: Record<string, boolean>) => Record<string, boolean>) | Record<string, boolean>) => {
        const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
        onRowSelectionChange(newSelection);
      }
    : setInternalRowSelection;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(columnPinning && { columnPinning }),
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(enableInfiniteScroll ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    ...(getRowId && { getRowId }),
    initialState: {
      ...(enableInfiniteScroll ? {} : {
        pagination: {
          pageSize,
        },
      }),
      ...(columnPinning && { columnPinning }),
    },
  });

  const handleScroll = useCallback((): void => {
    if (!enableInfiniteScroll || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // 스크롤이 하단에 가까워지면 더 많은 행 표시
    if (scrollHeight - scrollTop - clientHeight < infiniteScrollThreshold) {
      setDisplayedRows((prev) => {
        const filteredRowsCount = table.getFilteredRowModel().rows.length;
        const newCount = Math.min(prev + infiniteScrollIncrement, filteredRowsCount);
        return newCount;
      });
    }
  }, [enableInfiniteScroll, infiniteScrollThreshold, infiniteScrollIncrement, table]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!enableInfiniteScroll || !container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [enableInfiniteScroll, handleScroll]);

  // 데이터나 필터가 변경되면 표시 행 수 초기화
  useEffect(() => {
    if (enableInfiniteScroll) {
      setDisplayedRows(infiniteScrollIncrement);
    }
  }, [data, columnFilters, enableInfiniteScroll, infiniteScrollIncrement]);

  // 인피니트 스크롤 모드에서는 표시할 행 수를 제한
  const rowsToDisplay = enableInfiniteScroll
    ? table.getFilteredRowModel().rows.slice(0, displayedRows)
    : table.getRowModel().rows;

  // 무한 스크롤 컨테이너의 스타일 계산
  const getScrollContainerStyle = (): string => {
    if (!enableInfiniteScroll) return 'rounded-md border overflow-x-auto';

    if (maxHeight === 'full' || maxHeight === 'none') {
      return 'rounded-md border overflow-x-auto h-full overflow-y-auto';
    }

    return `rounded-md border overflow-x-auto overflow-y-auto`;
  };

  const getScrollContainerInlineStyle = (): React.CSSProperties => {
    if (!enableInfiniteScroll || maxHeight === 'full' || maxHeight === 'none') {
      return {};
    }
    return { maxHeight };
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {toolbar}

      <div
        ref={scrollContainerRef}
        className={getScrollContainerStyle()}
        style={getScrollContainerInlineStyle()}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  return (
                    <TableHead
                      key={header.id}
                      className={isPinned ? 'bg-white' : ''}
                      style={{
                        position: isPinned ? 'sticky' : 'relative',
                        left: isPinned === 'left' ? `${header.column.getStart('left')}px` : undefined,
                        right: isPinned === 'right' ? `${header.column.getAfter('right')}px` : undefined,
                        zIndex: isPinned ? 1 : 0,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rowsToDisplay?.length ? (
              rowsToDisplay.map((row) => {
                const customClassName = getRowClassName?.(row.original) ?? '';
                const baseClassName = onRowClick ? 'cursor-pointer' : '';
                const className = `${baseClassName} ${customClassName}`.trim();

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={() => onRowClick?.(row.original)}
                    className={className}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isPinned = cell.column.getIsPinned();
                      return (
                        <TableCell
                          key={cell.id}
                          className={isPinned ? 'bg-inherit' : ''}
                          style={{
                            position: isPinned ? 'sticky' : 'relative',
                            left: isPinned === 'left' ? `${cell.column.getStart('left')}px` : undefined,
                            right: isPinned === 'right' ? `${cell.column.getAfter('right')}px` : undefined,
                            zIndex: isPinned ? 1 : 0,
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {enableInfiniteScroll && rowsToDisplay.length < table.getFilteredRowModel().rows.length && (
          <div className="py-4 text-center text-sm text-slate-500">
            스크롤하여 더 보기...
          </div>
        )}
      </div>

      {!enableInfiniteScroll && <DataTablePagination table={table} />}
    </div>
  );
}
