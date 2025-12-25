/**
 * MLA Dashboard React Query Hooks
 *
 * Provides cached data fetching for MLA dashboard pages.
 * Data is cached for 5 minutes (staleTime) and kept for 30 minutes (gcTime).
 * This prevents refetching when switching between pages.
 */

import { useQuery } from '@tanstack/react-query';

// Cache configuration
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data considered fresh
const GC_TIME = 30 * 60 * 1000; // 30 minutes - cache garbage collection

// Query key factory for consistent cache keys
export const mlaQueryKeys = {
  all: ['mla-dashboard'] as const,
  dashboardAll: (acId: number) => [...mlaQueryKeys.all, 'all', acId] as const,
  booths: (acId: number, params: string) => [...mlaQueryKeys.all, 'booths', acId, params] as const,
  boothDetail: (acId: number, boothNo: string) => [...mlaQueryKeys.all, 'booth', acId, boothNo] as const,
  boothsSirStats: (acId: number) => [...mlaQueryKeys.all, 'booths-sir-stats', acId] as const,
  priorityTargets: (acId: number, limit: number) => [...mlaQueryKeys.all, 'priority-targets', acId, limit] as const,
  historicalTrends: (acId: number) => [...mlaQueryKeys.all, 'historical-trends', acId] as const,
  competitorAnalysis: (acId: number) => [...mlaQueryKeys.all, 'competitor-analysis', acId] as const,
  shareOfVoice: (acId: number, timeRange: string) => [...mlaQueryKeys.all, 'share-of-voice', acId, timeRange] as const,
  sentimentBreakdown: (acId: number, timeRange: string) => [...mlaQueryKeys.all, 'sentiment-breakdown', acId, timeRange] as const,
};

// Generic fetch function
async function fetchMLA<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Combined dashboard data hook - fetches ALL dashboard data in one request
 * Returns: overview, priorityTargets, genderDistribution, marginDistribution,
 *          boothSizeDistribution, currentVoterStats
 * This is the preferred hook for the main dashboard as it reduces API calls from 6 to 1
 */
export function useMLADashboardAll(acId: number | undefined) {
  return useQuery({
    queryKey: mlaQueryKeys.dashboardAll(acId!),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/all`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Booths list hook - for booth listing page with filters
export function useMLABooths(acId: number | undefined, params: URLSearchParams) {
  const paramsString = params.toString();
  return useQuery({
    queryKey: mlaQueryKeys.booths(acId!, paramsString),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/booths?${paramsString}`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Booths SIR stats hook - for SIR view on booth list page
export function useMLABoothsSirStats(acId: number | undefined) {
  return useQuery({
    queryKey: mlaQueryKeys.boothsSirStats(acId!),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/booths-sir-stats`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Booth detail hook - for individual booth page
export function useMLABoothDetail(acId: number | undefined, boothNo: string | undefined) {
  return useQuery({
    queryKey: mlaQueryKeys.boothDetail(acId!, boothNo!),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/booth/${boothNo}`),
    enabled: !!acId && !!boothNo,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Priority targets hook - for priority targets page (all flippable booths)
export function useMLAPriorityTargets(acId: number | undefined, limit: number = 100) {
  return useQuery({
    queryKey: mlaQueryKeys.priorityTargets(acId!, limit),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/priority-targets?limit=${limit}`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Historical trends hook - for historical trends page
export function useMLAHistoricalTrends(acId: number | undefined) {
  return useQuery({
    queryKey: mlaQueryKeys.historicalTrends(acId!),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/historical-trends`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Competitor analysis hook - for competitor analysis page
export function useMLACompetitorAnalysis(acId: number | undefined) {
  return useQuery({
    queryKey: mlaQueryKeys.competitorAnalysis(acId!),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/competitor-analysis`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Share of voice hook - for social media analytics
export function useMLAShareOfVoice(acId: number | undefined, timeRange: string = '30d') {
  return useQuery({
    queryKey: mlaQueryKeys.shareOfVoice(acId!, timeRange),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/social-media/share-of-voice?time_range=${timeRange}`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

// Sentiment breakdown hook - for social media analytics
export function useMLASentimentBreakdown(acId: number | undefined, timeRange: string = '30d') {
  return useQuery({
    queryKey: mlaQueryKeys.sentimentBreakdown(acId!, timeRange),
    queryFn: () => fetchMLA(`/api/mla-dashboard/${acId}/social-media/sentiment-breakdown?time_range=${timeRange}`),
    enabled: !!acId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}
