import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Store } from '../../../core/models';

@Component({
  selector: 'app-admin-sellers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="admin-sellers-page py-8">
      <div class="container">
        <div class="header-row flex justify-between items-center mb-6">
          <div>
            <h1 class="page-title text-2xl font-bold">Seller Management & KYC Moderation</h1>
            <p class="text-xs text-muted">Review business credentials, manage commission rates, and approve vendor stores</p>
          </div>

          <!-- Status filter pills -->
          <div class="flex gap-2 text-xs">
            <button class="btn btn-outline btn-sm" [class.btn-primary]="filterStatus() === ''" (click)="setFilter('')">All Sellers</button>
            <button class="btn btn-outline btn-sm" [class.btn-primary]="filterStatus() === 'PENDING'" (click)="setFilter('PENDING')">Awaiting KYC</button>
            <button class="btn btn-outline btn-sm" [class.btn-primary]="filterStatus() === 'APPROVED'" (click)="setFilter('APPROVED')">Approved</button>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state text-center py-20">
            <p class="text-muted">Loading sellers directory...</p>
          </div>
        } @else {
          <div class="card overflow-hidden">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Store Name</th>
                    <th>GSTIN / PAN</th>
                    <th>KYC Status</th>
                    <th>Commission Rate</th>
                    <th>Balance</th>
                    <th>Lifetime Sales</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (store of stores(); track store.id) {
                    <tr>
                      <td>
                        <div class="flex items-center gap-3">
                          <img [src]="store.logo" class="w-10 h-10 rounded object-cover" />
                          <div>
                            <strong>{{ store.name }}</strong>
                            <p class="text-xs text-muted line-clamp-1">{{ store.description }}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="font-mono text-xs block">GST: {{ store.gstin }}</span>
                        <span class="font-mono text-xs text-muted">PAN: {{ store.pan }}</span>
                      </td>
                      <td>
                        <span class="badge" 
                          [class.badge-success]="store.kycStatus === 'APPROVED'"
                          [class.badge-warning]="store.kycStatus === 'PENDING'"
                          [class.badge-danger]="store.kycStatus === 'REJECTED'">
                          {{ store.kycStatus }}
                        </span>
                      </td>
                      <td>
                        <strong>{{ store.commissionRate }}%</strong>
                      </td>
                      <td>₹{{ store.balance.toLocaleString() }}</td>
                      <td class="font-bold text-primary">₹{{ store.totalEarnings.toLocaleString() }}</td>
                      <td>
                        <button class="btn btn-outline btn-sm" (click)="openKycModal(store)">
                          Review KYC
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- KYC Review Modal -->
        @if (isModalOpen()) {
          <div class="modal-backdrop" (click)="closeKycModal()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3 class="font-bold text-base">KYC Compliance Review: {{ activeStore()?.name }}</h3>
                <button class="close-btn" (click)="closeKycModal()">✕</button>
              </div>
              <div class="modal-body">
                <div class="tax-info mb-4 p-3 bg-muted rounded text-xs flex flex-col gap-1">
                  <div><strong>GSTIN:</strong> {{ activeStore()?.gstin }}</div>
                  <div><strong>PAN:</strong> {{ activeStore()?.pan }}</div>
                  <div><strong>Bank Beneficiary:</strong> {{ activeStore()?.bankAccount?.accountName }}</div>
                  <div><strong>Account Number:</strong> {{ activeStore()?.bankAccount?.accountNumber }}</div>
                  <div><strong>Bank & IFSC:</strong> {{ activeStore()?.bankAccount?.bankName }} ({{ activeStore()?.bankAccount?.ifsc }})</div>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label">Platform Commission Rate (%)</label>
                  <input type="number" [(ngModel)]="commissionInput" class="form-control" min="0" max="100" step="0.5" />
                  <span class="text-xs text-muted">Platform fee deducted from each sold item</span>
                </div>

                <div class="form-group">
                  <label class="form-label">Review Notes / Reason (sent to seller)</label>
                  <textarea [(ngModel)]="reviewNotes" class="form-control" rows="2" placeholder="e.g. Valid GST verified. Approved."></textarea>
                </div>
              </div>
              <div class="modal-footer flex justify-between">
                <button class="btn btn-danger btn-sm" (click)="submitReview('REJECT')" [disabled]="submitting()">
                  Reject Seller
                </button>
                <div class="flex gap-2">
                  <button class="btn btn-secondary btn-sm" (click)="closeKycModal()">Cancel</button>
                  <button class="btn btn-primary btn-sm" (click)="submitReview('APPROVE')" [disabled]="submitting()">
                    ✓ Approve Seller
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .font-mono { font-family: monospace; }
    .w-10 { width: 2.5rem; }
    .h-10 { height: 2.5rem; }
    .line-clamp-1 {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class AdminSellersComponent implements OnInit {
  private api = inject(ApiService);

  public stores = signal<Store[]>([]);
  public loading = signal<boolean>(true);
  public filterStatus = signal<string>('');
  public isModalOpen = signal<boolean>(false);
  public activeStore = signal<Store | null>(null);
  public commissionInput = 10.0;
  public reviewNotes = 'All documents checked and verified';
  public submitting = signal<boolean>(false);

  ngOnInit() {
    this.loadSellers();
  }

  loadSellers() {
    this.loading.set(true);
    this.api.get<{ success: boolean; stores: Store[] }>('/admin/sellers', { kycStatus: this.filterStatus() || undefined }).subscribe({
      next: res => {
        if (res.success) this.stores.set(res.stores);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
    this.loadSellers();
  }

  openKycModal(store: Store) {
    this.activeStore.set(store);
    this.commissionInput = store.commissionRate;
    this.reviewNotes = 'All tax documents checked and verified';
    this.isModalOpen.set(true);
  }

  closeKycModal() {
    this.isModalOpen.set(false);
    this.activeStore.set(null);
  }

  submitReview(action: 'APPROVE' | 'REJECT') {
    if (!this.activeStore()) return;
    this.submitting.set(true);

    this.api.put(`/admin/sellers/${this.activeStore()!.id}/kyc`, {
      action,
      notes: this.reviewNotes,
      commissionRate: this.commissionInput
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeKycModal();
        this.loadSellers();
      },
      error: () => this.submitting.set(false)
    });
  }
}
