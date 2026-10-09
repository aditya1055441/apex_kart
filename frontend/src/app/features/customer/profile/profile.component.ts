import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Address } from '../../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="profile-page py-8">
      <div class="container max-w-4xl">
        <h1 class="page-title text-2xl font-bold mb-6">Account Settings & Addresses</h1>

        <div class="grid grid-cols-3 gap-8">
          <!-- Left: User Info Card -->
          <div class="profile-card card p-6">
            <div class="avatar-large mx-auto mb-3">
              {{ auth.currentUser()?.name?.charAt(0) || 'U' }}
            </div>
            <h3 class="text-center font-bold text-lg mb-0.5">{{ auth.currentUser()?.name }}</h3>
            <p class="text-center text-xs text-muted mb-4">{{ auth.currentUser()?.email }}</p>

            <div class="user-details text-xs flex flex-col gap-2 border-t pt-4">
              <div class="flex justify-between">
                <span class="text-muted">Full Name:</span>
                <strong>{{ auth.currentUser()?.name }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Email:</span>
                <strong>{{ auth.currentUser()?.email }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Phone:</span>
                <strong>{{ auth.currentUser()?.phone }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Date of Birth:</span>
                <strong>{{ auth.currentUser()?.dob || 'Not specified' }}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Account Type:</span>
                <span class="badge badge-primary">{{ auth.currentUser()?.role }}</span>
              </div>
            </div>

            @if (!auth.isSeller() && !auth.isAdmin()) {
              <div class="mt-6 pt-4 border-t text-center">
                <p class="text-xs text-muted mb-3">Want to sell your products on ApexKart?</p>
                <a routerLink="/seller/register" class="btn btn-outline btn-sm btn-block">
                  Register as a Seller
                </a>
              </div>
            }
          </div>

          <!-- Right: Address Book -->
          <div class="addresses-section col-span-2">
            <div class="card p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="font-bold text-lg">Saved Delivery Addresses</h3>
                <button class="btn btn-primary btn-sm" (click)="toggleNewAddressForm()">
                  {{ showAddAddress() ? 'Close Form' : '+ Add New Address' }}
                </button>
              </div>

              @if (showAddAddress()) {
                <form (submit)="$event.preventDefault(); saveAddress()" class="mb-6 p-4 border rounded-lg bg-slate-50">
                  <h4 class="font-bold text-sm mb-3">Add New Address</h4>
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="form-group">
                      <label class="form-label">Full Name</label>
                      <input type="text" [(ngModel)]="newAddr.fullName" name="fullName" class="form-control" required />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Phone</label>
                      <input type="tel" [(ngModel)]="newAddr.phone" name="phone" class="form-control" required />
                    </div>
                    <div class="form-group col-span-2">
                      <label class="form-label">Address Line 1</label>
                      <input type="text" [(ngModel)]="newAddr.addressLine1" name="line1" class="form-control" required />
                    </div>
                    <div class="form-group col-span-2">
                      <label class="form-label">Address Line 2 (Optional)</label>
                      <input type="text" [(ngModel)]="newAddr.addressLine2" name="line2" class="form-control" />
                    </div>
                    <div class="form-group">
                      <label class="form-label">City</label>
                      <input type="text" [(ngModel)]="newAddr.city" name="city" class="form-control" required />
                    </div>
                    <div class="form-group">
                      <label class="form-label">State</label>
                      <input type="text" [(ngModel)]="newAddr.state" name="state" class="form-control" required />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Postal Code</label>
                      <input type="text" [(ngModel)]="newAddr.postalCode" name="postalCode" class="form-control" required />
                    </div>
                    <div class="form-group flex items-center mt-6">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" [(ngModel)]="newAddr.isDefault" name="isDefault" />
                        <span>Set as Default Address</span>
                      </label>
                    </div>
                  </div>
                  <div class="flex justify-end gap-2 mt-4">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="showAddAddress.set(false)">Cancel</button>
                    <button type="submit" class="btn btn-primary btn-sm">Save Address</button>
                  </div>
                </form>
              }

              <div class="addresses-list flex flex-col gap-3">
                @for (addr of addresses(); track addr.id) {
                  <div class="address-item p-4 border rounded-lg flex justify-between items-start">
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <strong>{{ addr.fullName }}</strong>
                        <span class="text-xs text-muted">({{ addr.phone }})</span>
                        @if (addr.isDefault) {
                          <span class="badge badge-success text-xs">Default</span>
                        }
                      </div>
                      <p class="text-xs text-muted leading-relaxed">
                        {{ addr.addressLine1 }}<br />
                        @if (addr.addressLine2) { {{ addr.addressLine2 }}<br /> }
                        {{ addr.city }}, {{ addr.state }} - {{ addr.postalCode }}, {{ addr.country }}
                      </p>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .avatar-large {
      width: 72px;
      height: 72px;
      border-radius: var(--radius-full);
      background: var(--primary-light);
      color: var(--primary);
      font-size: 2rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .border-t { border-top: 1px solid var(--border); }
    .col-span-2 { grid-column: span 2 / span 2; }
    .max-w-4xl { max-width: 56rem; margin-left: auto; margin-right: auto; }
    .bg-slate-50 { background-color: #f8fafc; }
    @media (max-width: 800px) {
      .grid-cols-3 { grid-template-columns: 1fr; }
      .col-span-2 { grid-column: span 1 / span 1; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public addresses = signal<Address[]>([]);
  public showAddAddress = signal<boolean>(false);

  public newAddr: Address = {
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false
  };

  ngOnInit() {
    this.loadAddresses();
  }

  loadAddresses() {
    this.api.get<{ success: boolean; addresses: Address[] }>('/auth/addresses').subscribe(res => {
      if (res.success) this.addresses.set(res.addresses);
    });
  }

  toggleNewAddressForm() {
    this.showAddAddress.update(v => !v);
  }

  saveAddress() {
    this.api.post<{ success: boolean; address: Address }>('/auth/addresses', this.newAddr).subscribe({
      next: res => {
        if (res.success) {
          this.addresses.update(list => [...list, res.address]);
          this.showAddAddress.set(false);
          this.newAddr = {
            fullName: '',
            phone: '',
            addressLine1: '',
            addressLine2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India',
            isDefault: false
          };
        }
      }
    });
  }
}
