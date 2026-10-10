import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { User, Store, UserRole } from '../models';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  public currentUser = signal<User | null>(null);
  public currentStore = signal<Store | null>(null);
  public isAuthModalOpen = signal<boolean>(false);
  public initialAuthTab = signal<'login' | 'otp' | 'register'>('login');
  public authModalOpenCount = signal<number>(0);

  public isAuthenticated = computed(() => !!this.currentUser());
  public isSeller = computed(() => this.currentUser()?.role === 'SELLER');
  public isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');
  public isCustomer = computed(() => this.currentUser()?.role === 'CUSTOMER');

  constructor() {
    this.checkInitialSession();
  }

  private checkInitialSession() {
    // Purge any stale cached session for Rahul Sharma from previous versions
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && (u.email === 'customer@gmail.com' || u.name === 'Rahul Sharma') && !localStorage.getItem('auth_session_active')) {
          this.logout();
          return;
        }
      } catch (e) {
        this.logout();
        return;
      }
    }

    const token = localStorage.getItem('token');
    const storedStore = localStorage.getItem('store');

    if (token && storedUser) {
      try {
        this.currentUser.set(JSON.parse(storedUser));
        if (storedStore) this.currentStore.set(JSON.parse(storedStore));
        this.fetchProfile().subscribe();
      } catch (e) {
        this.logout();
      }
    }
  }

  public fetchProfile(): Observable<any> {
    return this.api.get<{ success: boolean; user: User; store?: Store }>('/auth/me').pipe(
      tap(res => {
        if (res.success) {
          this.currentUser.set(res.user);
          localStorage.setItem('user', JSON.stringify(res.user));
          if (res.store) {
            this.currentStore.set(res.store);
            localStorage.setItem('store', JSON.stringify(res.store));
          }
        }
      })
    );
  }

  public login(credentials: { email: string; password: string }): Observable<any> {
    return this.api.post<{ success: boolean; token: string; user: User }>('/auth/login', credentials).pipe(
      tap(res => {
        if (res.success) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  public register(data: any): Observable<any> {
    return this.api.post<{ success: boolean; token: string; user: User }>('/auth/register', data).pipe(
      tap(res => {
        if (res.success) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  public sendRegistrationCode(identifier: string): Observable<any> {
    return this.api.post('/auth/register/send-code', { identifier });
  }

  public getRegistrationCodeStatus(identifier: string): Observable<any> {
    return this.api.get('/auth/register/code-status', { identifier });
  }

  public verifyRegistrationCode(identifier: string, code: string): Observable<any> {
    return this.api.post('/auth/register/verify-code', { identifier, code });
  }

  public completeRegistration(data: {
    identifier: string;
    code: string;
    fullName: string;
    dob: string;
    password?: string;
    role?: string;
  }): Observable<any> {
    return this.api.post<{ success: boolean; token: string; user: User }>('/auth/register/complete', data).pipe(
      tap(res => {
        if (res.success) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  public sendOtp(phoneOrEmail: string): Observable<any> {
    return this.api.post('/auth/send-otp', { phoneOrEmail });
  }

  public verifyOtp(phoneOrEmail: string, otp: string, name?: string): Observable<any> {
    return this.api.post<{ success: boolean; token: string; user: User }>('/auth/verify-otp', {
      phoneOrEmail,
      otp,
      name
    }).pipe(
      tap(res => {
        if (res.success) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  public quickLogin(role: UserRole) {
    let email = 'customer@gmail.com';
    let password = 'Customer@123';

    if (role === 'SELLER') {
      email = 'seller@apextech.com';
      password = 'Seller@123';
    } else if (role === 'ADMIN') {
      email = 'admin@marketplace.com';
      password = 'Admin@123';
    }

    this.login({ email, password }).subscribe({
      next: () => {
        this.fetchProfile().subscribe();
      },
      error: err => {
        console.warn('Quick login fallback:', err.message);
      }
    });
  }

  private setSession(token: string, user: User) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('auth_session_active', 'true');
    this.currentUser.set(user);
    this.fetchProfile().subscribe();
  }

  public logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('store');
    localStorage.removeItem('auth_session_active');
    localStorage.removeItem('guest_id');
    localStorage.removeItem('user_explicit_login_v2');
    sessionStorage.clear();
    this.currentUser.set(null);
    this.currentStore.set(null);
    this.router.navigate(['/']);
  }

  public openAuthModal(tab: 'login' | 'otp' | 'register' = 'login') {
    this.initialAuthTab.set(tab);
    this.authModalOpenCount.update(c => c + 1);
    this.isAuthModalOpen.set(true);
  }

  public closeAuthModal() {
    this.isAuthModalOpen.set(false);
  }
}
