import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css']
})
export class AuthModalComponent {
  public auth = inject(AuthService);

  public activeTab = signal<'login' | 'otp' | 'register'>('login');
  public loading = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');

  // Password Login fields
  public loginEmail = '';
  public loginPassword = '';

  // OTP Login fields
  public otpPhoneOrEmail = '';
  public otpCode = '';
  public otpSent = signal<boolean>(false);
  public debugOtp = signal<string>('');

  // Enhanced Multi-step Registration fields
  public regMethod = signal<'email' | 'phone'>('email');
  public regIdentifier = '';
  public regCode = '';
  public regCodeSent = signal<boolean>(false);
  public regCodeVerified = signal<boolean>(false);
  public regFullName = '';
  public regDob = '';
  public regPassword = '';
  public regRole = 'CUSTOMER';

  changeRegMethod(method: 'email' | 'phone') {
    this.regMethod.set(method);
    this.resetReg();
  }

  resetReg() {
    this.regCodeSent.set(false);
    this.regCodeVerified.set(false);
    this.regCode = '';
    this.regFullName = '';
    this.regDob = '';
    this.regPassword = '';
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  fillCreds(email: string, pass: string) {
    this.loginEmail = email;
    this.loginPassword = pass;
    this.errorMessage.set('');
  }

  onPasswordLogin() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.closeAuthModal();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please check credentials.');
      }
    });
  }

  onSendOtp() {
    if (!this.otpPhoneOrEmail.trim()) {
      this.errorMessage.set('Please enter a valid phone number or email');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.sendOtp(this.otpPhoneOrEmail).subscribe({
      next: res => {
        this.loading.set(false);
        this.otpSent.set(true);
        if (res.otpDebug) {
          this.debugOtp.set(res.otpDebug);
          this.otpCode = res.otpDebug;
        }
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to send OTP');
      }
    });
  }

  onVerifyOtp() {
    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.verifyOtp(this.otpPhoneOrEmail, this.otpCode).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.closeAuthModal();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid or expired OTP');
      }
    });
  }

  // Multi-step Registration Actions
  onSendRegCode() {
    if (!this.regIdentifier.trim()) {
      this.errorMessage.set(`Please enter a valid ${this.regMethod() === 'email' ? 'email address' : 'mobile phone number'}`);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.auth.sendRegistrationCode(this.regIdentifier.trim()).subscribe({
      next: res => {
        this.loading.set(false);
        this.regCodeSent.set(true);
        this.regCode = '';
        this.successMessage.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to send verification code');
      }
    });
  }

  onVerifyRegCode() {
    if (!this.regCode.trim()) {
      this.errorMessage.set('Please enter the 6-digit verification code');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.auth.verifyRegistrationCode(this.regIdentifier.trim(), this.regCode.trim()).subscribe({
      next: res => {
        this.loading.set(false);
        this.regCodeVerified.set(true);
        this.regFullName = '';
        this.regDob = '';
        this.regPassword = '';
        this.successMessage.set(res.message);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid verification code');
      }
    });
  }

  onCompleteRegistration() {
    if (!this.regFullName.trim()) {
      this.errorMessage.set('Please enter your full name');
      return;
    }
    if (this.regFullName.includes('@')) {
      this.errorMessage.set('Please enter your actual personal name (e.g. Aditya Anand) rather than an email address.');
      return;
    }
    if (!this.regDob) {
      this.errorMessage.set('Please enter your date of birth (DOB)');
      return;
    }
    if (!this.regPassword || !this.regPassword.trim()) {
      this.errorMessage.set('Password is required');
      return;
    }
    if (this.regPassword.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Z]/.test(this.regPassword)) {
      this.errorMessage.set('Password must contain at least one uppercase letter (A-Z)');
      return;
    }
    if (!/[a-z]/.test(this.regPassword)) {
      this.errorMessage.set('Password must contain at least one lowercase letter (a-z)');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(this.regPassword)) {
      this.errorMessage.set('Password must contain at least one special character (!@#$%^&*...)');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.auth.completeRegistration({
      identifier: this.regIdentifier.trim(),
      code: this.regCode.trim(),
      fullName: this.regFullName.trim(),
      dob: this.regDob,
      password: this.regPassword.trim(),
      role: this.regRole
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.closeAuthModal();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed');
      }
    });
  }
}
