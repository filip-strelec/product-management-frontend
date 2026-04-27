import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ThumbnailUploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface UploadConfig {
  maxBytes: number;
  allowedMimeTypes: string[];
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/uploads`;

  /** Constraints rarely change; cache the first successful response. */
  private config$: Observable<UploadConfig> | null = null;

  getConfig(): Observable<UploadConfig> {
    if (!this.config$) {
      this.config$ = this.http.get<UploadConfig>(`${this.base}/config`).pipe(
        tap({ error: () => (this.config$ = null) }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.config$;
  }

  uploadThumbnail(file: File): Observable<ThumbnailUploadResult> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<ThumbnailUploadResult>(`${this.base}/thumbnail`, body);
  }
}
