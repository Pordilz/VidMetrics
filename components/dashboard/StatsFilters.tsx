'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SortOption = 'dateDesc' | 'dateAsc' | 'viewsDesc' | 'likesDesc';
export type DateFilterOption = 'all' | '30days' | '90days' | 'thisMonth';

interface StatsFiltersProps {
  sortOption: SortOption;
  setSortOption: (val: SortOption) => void;
  dateFilter: DateFilterOption;
  setDateFilter: (val: DateFilterOption) => void;
}

export function StatsFilters({ sortOption, setSortOption, dateFilter, setDateFilter }: StatsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort by:</span>
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewsDesc">Views (High to Low)</SelectItem>
            <SelectItem value="likesDesc">Likes (High to Low)</SelectItem>
            <SelectItem value="dateDesc">Newest First</SelectItem>
            <SelectItem value="dateAsc">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Timeframe:</span>
        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilterOption)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
