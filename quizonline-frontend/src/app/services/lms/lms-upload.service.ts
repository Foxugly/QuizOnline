import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {resolveApiBaseUrl} from '../../shared/api/runtime-api-base-url';

/**
 * Thin file-upload wrapper for ``ContentBlock`` rows.
 *
 * The image and file block-editors call into this service when the
 * author selects a new asset; under the hood it issues a multipart
 * ``PATCH /api/lms/block/{id}/`` with a single file field, which the
 * backend serializer accepts in both JSON and multipart form. Keeping
 * the surface deliberately tiny (two methods) mirrors the existing
 * :class:`LmsCatalogService` pattern: the editors do their own toast
 * + state update via the observable so the service stays stateless.
 */
@Injectable({providedIn: 'root'})
export class LmsUploadService {
  private readonly http = inject(HttpClient);

  private buildUrl(blockId: number): string {
    return `${resolveApiBaseUrl().replace(/\/+$/, '')}/api/lms/block/${blockId}/`;
  }

  /** Upload a replacement image for the ``image`` block ``blockId``. */
  uploadImageForBlock(blockId: number, file: File): Observable<unknown> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.patch<unknown>(this.buildUrl(blockId), fd);
  }

  /** Upload a replacement file for the ``file`` block ``blockId``. */
  uploadFileForBlock(blockId: number, file: File): Observable<unknown> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.patch<unknown>(this.buildUrl(blockId), fd);
  }
}
