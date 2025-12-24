import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalCount?: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  currentPage,
  totalCount = 0,
  limit,
  onPageChange,
  onLimitChange,
  isLoading = false
}: PaginationControlsProps) {
  // Calculate range
  const offset = (currentPage - 1) * limit;
  const start = Math.min(offset + 1, totalCount);
  const end = Math.min(offset + limit, totalCount);
  const totalPages = Math.ceil(totalCount / limit);

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between border-t px-4 py-4 bg-card rounded-b-md">
      {/* Rows per page selector */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline-block">Rows per page</span>
        {onLimitChange ? (
            <Select
            value={limit.toString()}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={isLoading}
            >
            <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        ) : (
             <span className="font-medium text-foreground">{limit}</span>
        )}

      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
           {totalCount > 0 ? `${start}-${end} of ${totalCount}` : "0 of 0"}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(1)}
            disabled={!hasPreviousPage || isLoading}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage || isLoading}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage || isLoading}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNextPage || isLoading}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
