import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

export function adminApiBaseUrl(): string {
  return `${resolveApiBaseUrl().replace(/\/+$/, '')}/api`;
}
