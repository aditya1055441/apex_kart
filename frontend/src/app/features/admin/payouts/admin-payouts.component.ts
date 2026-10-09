import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Payout } from '../../../core/models';

@Component({
  selector: 'app-admin-payouts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="admin-payouts-page py-8">
      <div class="container">
        <div class="header-row flex justify-between items-center mb-6">
          <div>
            <h1 class="page-title text-2xl font-bold">Seller Payout Disbursements</h1>
            <p class="text-xs text-muted">Review withdrawal requests and disburse platform funds to vendor accounts</p>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state text-center py-20">
            <p class="text-muted">Loading payout queues...</p>
          </div>
        } @else if (payouts().length === 0) {
          <div class="card p-12 text-center text-muted">
            No seller payout requests currently pending.
          </div>
        } @else {
          <div class="card overflow-hidden">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Store Name</th>
                    <th>Requested At</th>
                    <th>Amount</th>
                    <th>Beneficiary Bank Details</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of payouts(); track p.id) {
                    <tr>
                      <td><strong>{{ p.storeName }}</strong></td>
                      <td>{{ p.requestedAt | date:'mediumDate' }}</td>
                      <td class="font-bold text-base text-primary">₹{{ p.amount.toLocaleString() }}</td>
                      <td>
                        <span class="text-xs block">{{ p.bankAccount.accountName }}</span>
                        <span class="text-xs font-mono text-muted">A/C: {{ p.bankAccount.accountNumber }} | {{ p.bankAccount.ifsc }}</span>
                      </td>
                      <td>
                        <span class="badge" [class.badge-success]="p.status === 'PROCESSED'" [class.badge-warning]="p.status === 'PENDING'">
                          {{ p.status }}
                        </span>
                      </td>
                      <td>
                        @if (p.status === 'PENDING') {
                          <button class="btn btn-primary btn-sm" (click)="openProcessModal(p)">
                            Disburse Funds
                          </button>
                        } @else {
                          <span class="text-xs text-muted font-mono">Ref: {{ p.transactionRef }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Process Payout Modal -->
        @if (isModalOpen()) {
          <div class="modal-backdrop" (click)="closeModal()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3 class="font-bold text-base">Disburse Payout to {{ activePayout()?.storeName }}</h3>
                <button class="close-btn" (click)="closeModal()">✕</button>
              </div>
              <div class="modal-body">
                <p class="text-sm mb-4">
                  Disbursing <strong>₹{{ activePayout()?.amount?.toLocaleString() }}</strong> to {{ activePayout()?.bankAccount?.accountName }} ({{ activePayout()?.bankAccount?.bankName }} A/C {{ activePayout()?.bankAccount?.accountNumber }}).
                </p>

                <div class="form-group">
                  <label class="form-label">Bank UTR / Transaction Reference ID</label>
                  <input type="text" [(ngModel)]="transactionRef" class="form-control font-mono" placeholder="UTR1234567890" required />
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary btn-sm" (click)="closeModal()">Cancel</button>
                <button class="btn btn-primary btn-sm" (click)="submitDisbursement()" [disabled]="submitting() || !transactionRef.trim()">
                  {{ submitting() ? 'Processing...' : 'Confirm Disbursement' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .font-mono { font-family: monospace; }
  `]
})
export class AdminPayoutsComponent implements OnInit {
  private api = inject(ApiService);

  public payouts = signal<Payout[]>([]);
  public loading = signal<boolean>(true);
  public isModalOpen = signal<boolean>(false);
  public activePayout = signal<Payout | null>(null);
  public transactionRef = '';
  public submitting = signal<boolean>(false);

  ngOnInit() {
    this.loadPayouts();
  }

  loadPayouts() {
    this.loading.set(true);
    this.api.get<{ success: boolean; payouts: Payout[] }>('/admin/payouts').subscribe({
      next: res => {
        if (res.success) this.payouts.set(res.payouts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openProcessModal(p: Payout) {
    this.activePayout.set(p);
    this.transactionRef = `UTR-${Date.now().toString().slice(-8)}`;
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.activePayout.set(null);
  }

  submitDisbursement() {
    if (!this.activePayout() || !this.transactionRef.trim()) return;
    this.submitting.set(true);

    this.api.put(`/admin/payouts/${this.activePayout()!.id}/process`, {
      action: 'PROCESS',
      transactionRef: this.transactionRef
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.loadPayouts();
      },
      error: () => this.submitting.set(false)
    });
  }
}
