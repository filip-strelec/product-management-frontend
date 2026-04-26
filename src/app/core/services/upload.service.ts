import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ThumbnailUploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/** Mirrors the backend MAX_UPLOAD_BYTES default; kept in sync via README. */
export const MAX_THUMBNAIL_BYTES = 1_048_576;
export const ALLOWED_THUMBNAIL_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/uploads/thumbnail`;

  uploadThumbnail(file: File): Observable<ThumbnailUploadResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ThumbnailUploadResult>(this.url, body);
  }
}
