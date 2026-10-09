import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  get baseUrl(): string {
    return this.getBaseUrl();
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      if ((window as any).__env?.apiUrl) {
        return (window as any).__env.apiUrl;
      }
      // If deployed in cloud (Render) or running on non-dev port, use relative /api route
      if (window.location.port !== '4200') {
        return '/api';
      }
    }
    return 'http://localhost:5000/api';
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const token = localStorage.getItem('token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    const guestId = this.getOrCreateGuestId();
    headers = headers.set('x-guest-id', guestId);
    return headers;
  }

  private getOrCreateGuestId(): string {
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('guest_id', guestId);
    }
    return guestId;
  }

  get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders(),
      params: httpParams
    });
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders()
    });
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, {
      headers: this.getHeaders()
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    });
  }
}
