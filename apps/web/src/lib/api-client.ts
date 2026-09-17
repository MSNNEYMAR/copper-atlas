/**
 * Copper Atlas — API Client
 * 全局铜矿床图谱 — API 客户端
 *
 * Thin wrapper around fetch with:
 * - Automatic base URL from environment
 * - Request timeout handling
 * - Structured error responses
 * - GeoJSON type safety
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: { error?: { code?: string; message?: string; details?: unknown } } = {};
      try {
        errorData = await response.json();
      } catch {
        // Response body is not JSON
      }
      throw new ApiError(
        response.status,
        errorData.error?.code || 'UNKNOWN',
        errorData.error?.message || `HTTP ${response.status}`,
        errorData.error?.details,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'TIMEOUT', 'Request timed out');
    }
    throw new ApiError(0, 'NETWORK_ERROR', (error as Error).message || 'Network error');
  }
}

/**
 * Build query parameter string from a filter object.
 * Skips null/undefined/empty values.
 */
export function buildQueryParams(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}
