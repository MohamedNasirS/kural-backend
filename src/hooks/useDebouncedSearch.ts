import { useState, useEffect, useCallback } from 'react';

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
}

interface UseDebouncedSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedTerm: string;
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Custom hook for debounced search functionality
 *
 * @param options.delay - Debounce delay in milliseconds (default: 300)
 * @param options.minLength - Minimum characters before search triggers (default: 3)
 * @returns Object with searchTerm, setSearchTerm, debouncedTerm, isSearching, clearSearch
 *
 * @example
 * const { searchTerm, setSearchTerm, debouncedTerm, isSearching, clearSearch } = useDebouncedSearch();
 *
 * // Use searchTerm for the input value
 * <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 *
 * // Use debouncedTerm in your useEffect to trigger API calls
 * useEffect(() => {
 *   if (debouncedTerm) {
 *     fetchData(debouncedTerm);
 *   }
 * }, [debouncedTerm]);
 */
export function useDebouncedSearch(options: UseDebouncedSearchOptions = {}): UseDebouncedSearchReturn {
  const { delay = 300, minLength = 3 } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // If search term is empty or below minimum length, clear debounced term immediately
    if (!searchTerm || searchTerm.length < minLength) {
      setDebouncedTerm('');
      setIsSearching(false);
      return;
    }

    // Show searching indicator while waiting for debounce
    setIsSearching(true);

    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, delay, minLength]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedTerm('');
    setIsSearching(false);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    isSearching,
    clearSearch,
  };
}

/**
 * Hook for client-side filtering with debounce
 * Useful when data is already loaded and you want to filter locally
 *
 * @param items - Array of items to filter
 * @param filterFn - Function that returns true if item matches search term
 * @param options - Debounce options
 * @returns Object with search controls and filtered items
 */
export function useDebouncedFilter<T>(
  items: T[],
  filterFn: (item: T, searchTerm: string) => boolean,
  options: UseDebouncedSearchOptions = {}
) {
  const { searchTerm, setSearchTerm, debouncedTerm, isSearching, clearSearch } = useDebouncedSearch(options);
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  useEffect(() => {
    if (!debouncedTerm) {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item => filterFn(item, debouncedTerm));
      setFilteredItems(filtered);
    }
  }, [items, debouncedTerm, filterFn]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    isSearching,
    clearSearch,
    filteredItems,
    totalItems: items.length,
    filteredCount: filteredItems.length,
  };
}

export default useDebouncedSearch;
