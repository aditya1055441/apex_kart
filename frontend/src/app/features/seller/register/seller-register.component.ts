import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-seller-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-register.component.html',
  styleUrls: ['./seller-register.component.css']
})
export class SellerRegisterComponent {
  private api = inject(ApiService);
  public auth = inject(AuthService);
  private router = inject(Router);

  public loading = signal<boolean>(false);
  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');

  public storeData = {
    name: 'Nordic Artisan Living',
    description: 'Designer Scandinavian furniture, handmade rugs, and minimalist ceramic decor.',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    logo: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200',
    banner: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200',
    bankAccount: {
      accountName: 'Nordic Artisan Living LLP',
      accountNumber: '918273645012',
      ifsc: 'HDFC0001234',
      bankName: 'HDFC Bank'
    }
  };

  onSubmit() {
    if (!this.auth.isAuthenticated()) {
      this.auth.openAuthModal();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.api.post('/seller/register', this.storeData).subscribe({
      next: () => {
        this.loading.set(false);
        this.auth.fetchProfile().subscribe();
        this.successMessage.set('Seller application & KYC submitted successfully! Awaiting Admin verification.');
        setTimeout(() => {
          this.router.navigate(['/seller/dashboard']);
        }, 1500);
      },
      error: err => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to submit seller registration');
      }
    });
  }
}
