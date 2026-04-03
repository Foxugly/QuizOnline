export function logApiError(context: string, error: unknown): void {
  if (isTestRuntime()) {
    return;
  }
  console.error(`[API] ${context}`, error);
}

export function userFacingApiMessage(error: unknown, fallback: string): string {
  const detail = extractApiDetail(error);
  return detail || fallback;
}

function extractApiDetail(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const apiError = error as {
    error?: {
      detail?: string;
      message?: string;
    } | string;
    message?: string;
  };

  if (typeof apiError.error === 'string' && apiError.error.trim()) {
    return apiError.error.trim();
  }

  if (apiError.error && typeof apiError.error === 'object') {
    if (typeof apiError.error.detail === 'string' && apiError.error.detail.trim()) {
      return apiError.error.detail.trim();
    }
    if (typeof apiError.error.message === 'string' && apiError.error.message.trim()) {
      return apiError.error.message.trim();
    }
  }

  if (typeof apiError.message === 'string' && apiError.message.trim()) {
    return apiError.message.trim();
  }

  return null;
}

function isTestRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return '__karma__' in window || 'jasmine' in window;
}
