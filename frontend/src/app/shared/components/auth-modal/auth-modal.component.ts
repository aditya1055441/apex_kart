import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { FirebaseService } from '../../../core/services/firebase.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css']
})
export class AuthModalComponent implements OnDestroy {
  public auth = inject(AuthService);
  public firebaseService = inject(FirebaseService);

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

  // Background dispatch & Re-send cooldown tracking
  public resendCooldown = signal<number>(0);
  private cooldownTimer: any = null;
  private statusPollTimer: any = null;

  constructor() {
    effect(() => {
      // Re-run whenever authModalOpenCount triggers or isAuthModalOpen changes
      this.auth.authModalOpenCount();
      if (this.auth.isAuthModalOpen()) {
        const targetTab = this.auth.initialAuthTab();
        this.resetAllForms();
        this.activeTab.set(targetTab);
      }
    });
  }

  ngOnDestroy() {
    this.stopStatusPolling();
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  switchTab(tab: 'login' | 'otp' | 'register') {
    if (tab === 'register') {
      this.resetReg();
    } else {
      this.errorMessage.set('');
      this.successMessage.set('');
    }
    this.activeTab.set(tab);
  }

  changeRegMethod(method: 'email' | 'phone') {
    this.resetReg();
    this.regMethod.set(method);
  }

  resetReg() {
    this.stopStatusPolling();
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.resendCooldown.set(0);

    this.regMethod.set('email');
    this.regIdentifier = '';
    this.regCodeSent.set(false);
    this.regCodeVerified.set(false);
    this.regCode = '';
    this.regFullName = '';
    this.regDob = '';
    this.regPassword = '';
    this.regRole = 'CUSTOMER';
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loading.set(false);
  }

  resetAllForms() {
    this.resetReg();
    this.loginEmail = '';
    this.loginPassword = '';
    this.otpPhoneOrEmail = '';
    this.otpCode = '';
    this.otpSent.set(false);
    this.debugOtp.set('');
    this.errorMessage.set('');
    this.successMessage.set('');
    this.loading.set(false);
  }

  onCloseModal() {
    this.auth.closeAuthModal();
    this.resetAllForms();
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
        this.resetAllForms();
        this.auth.closeAuthModal();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Please check credentials.');
      }
    });
  }

  async onGoogleSignIn() {
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const userCredential = await this.firebaseService.signInWithGoogle();
      const idToken = await userCredential.user.getIdToken();

      this.auth.googleLogin({
        idToken,
        email: userCredential.user.email || undefined,
        name: userCredential.user.displayName || undefined
      }).subscribe({
        next: () => {
          this.loading.set(false);
          this.resetAllForms();
          this.auth.closeAuthModal();
        },
        error: err => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to authenticate Google user with backend');
        }
      });
    } catch (err: any) {
      this.loading.set(false);
      if (err.code === 'auth/popup-closed-by-user') {
        this.errorMessage.set('Google sign-in was cancelled.');
      } else {
        this.errorMessage.set(err.message || 'Google sign-in failed. Please try again.');
      }
    }
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
        this.resetAllForms();
        this.auth.closeAuthModal();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Invalid or expired OTP');
      }
    });
  }

  // Multi-step Registration Actions with Non-blocking Background Email Dispatch
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
        this.successMessage.set(res.message || 'Verification code sent. Valid for 5 mins.');
        this.startCooldownTimer(45);
        this.startStatusPolling(this.regIdentifier.trim());
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to send verification code');
      }
    });
  }

  onResendCode() {
    if (this.resendCooldown() > 0 || this.loading() || !this.regIdentifier.trim()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('Sending new verification code...');

    this.auth.sendRegistrationCode(this.regIdentifier.trim()).subscribe({
      next: res => {
        this.loading.set(false);
        this.regCode = '';
        this.successMessage.set(res.message || 'A new verification code is being sent in the background.');
        this.startCooldownTimer(45);
        this.startStatusPolling(this.regIdentifier.trim());
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to resend verification code');
      }
    });
  }

  private startCooldownTimer(durationSeconds: number = 45) {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.resendCooldown.set(durationSeconds);
    this.cooldownTimer = setInterval(() => {
      const remaining = this.resendCooldown() - 1;
      if (remaining <= 0) {
        this.resendCooldown.set(0);
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      } else {
        this.resendCooldown.set(remaining);
      }
    }, 1000);
  }

  private startStatusPolling(identifier: string) {
    this.stopStatusPolling();

    // Only background email dispatch needs polling
    if (!identifier.includes('@')) {
      return;
    }

    let pollAttempts = 0;
    const maxPolls = 15; // Max 22.5 seconds (15 * 1.5s)

    this.statusPollTimer = setInterval(() => {
      pollAttempts++;

      if (pollAttempts > maxPolls || !this.regCodeSent() || this.regCodeVerified() || !this.auth.isAuthModalOpen()) {
        this.stopStatusPolling();
        return;
      }

      this.auth.getRegistrationCodeStatus(identifier).subscribe({
        next: (res: any) => {
          if (res && res.status === 'FAILED') {
            this.stopStatusPolling();
            const failureDetail = res.error || 'Connection timed out or email delivery service failure.';
            this.errorMessage.set(`Failed to send verification code: ${failureDetail} Please check your email or click Re-send Code.`);
            this.successMessage.set('');
          } else if (res && res.status === 'SENT') {
            this.stopStatusPolling();
            this.successMessage.set(`Verification code successfully delivered to ${identifier}. Valid for 5 mins.`);
          }
        },
        error: () => {
          // Keep quiet on polling transport errors to not disturb user typing
        }
      });
    }, 1500);
  }

  private stopStatusPolling() {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer);
      this.statusPollTimer = null;
    }
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
        this.stopStatusPolling();
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
        this.resetAllForms();
        this.auth.closeAuthModal();
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed');
      }
    });
  }
}
