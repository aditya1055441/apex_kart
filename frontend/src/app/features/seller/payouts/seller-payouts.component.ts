import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Payout } from '../../../core/models';

@Component({
  selector: 'app-seller-payouts',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="seller-payouts-page py-8">
      <div class="container">
        <div class="header-row flex justify-between items-center mb-6">
          <div>
            <h1 class="page-title text-2xl font-bold">Seller Payouts & Settlement</h1>
            <p class="text-xs text-muted">Withdraw marketplace earnings directly to your registered bank account</p>
          </div>

          <button class="btn btn-primary btn-sm" (click)="openPayoutModal()">
            💸 Request Payout
          </button>
        </div>

        <!-- Balance overview cards -->
        <div class="grid grid-cols-3 gap-6 mb-8">
          <div class="card p-6">
            <span class="text-xs font-bold text-muted uppercase">Withdrawable Balance</span>
            <div class="text-3xl font-black text-primary font-display mt-1">
              ₹{{ (store()?.balance || 0).toLocaleString() }}
            </div>
            <p class="text-xs text-muted mt-2">Available for immediate disbursement</p>
          </div>

          <div class="card p-6">
            <span class="text-xs font-bold text-muted uppercase">Cumulative Lifetime Sales</span>
            <div class="text-3xl font-black text-main font-display mt-1">
              ₹{{ (store()?.totalEarnings || 0).toLocaleString() }}
            </div>
            <p class="text-xs text-muted mt-2">Marketplace Commission: {{ store()?.commissionRate || 10 }}%</p>
          </div>

          <div class="card p-6">
            <span class="text-xs font-bold text-muted uppercase">Linked Bank Account</span>
            <div class="mt-2 text-sm">
              <strong>{{ store()?.bankAccount?.bankName || 'HDFC Bank' }}</strong>
              <p class="text-xs text-muted font-mono">A/C: {{ store()?.bankAccount?.accountNumber || '••••••••' }}</p>
              <p class="text-xs text-muted font-mono">IFSC: {{ store()?.bankAccount?.ifsc || '••••••••' }}</p>
            </div>
          </div>
        </div>

        <!-- Payouts History Table -->
        <div class="card overflow-hidden">
          <div class="p-4 bg-muted border-b font-bold text-sm">
            Disbursement History
          </div>

          @if (payouts().length === 0) {
            <p class="text-center py-8 text-sm text-muted">No payout requests made yet.</p>
          } @else {
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Payout ID</th>
                    <th>Requested At</th>
                    <th>Amount</th>
                    <th>Bank Reference #</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of payouts(); track p.id) {
                    <tr>
                      <td class="font-mono text-xs">#{{ p.id }}</td>
                      <td>{{ p.requestedAt | date:'mediumDate' }}</td>
                      <td class="font-bold">₹{{ p.amount.toLocaleString() }}</td>
                      <td class="font-mono text-xs text-muted">{{ p.transactionRef || 'Pending Settlement' }}</td>
                      <td>
                        <span class="badge" [class.badge-success]="p.status === 'PROCESSED'" [class.badge-warning]="p.status === 'PENDING'">
                          {{ p.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Request Payout Modal -->
        @if (isPayoutModalOpen()) {
          <div class="modal-backdrop" (click)="closePayoutModal()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3 class="font-bold text-base">Request Bank Withdrawal</h3>
                <button class="close-btn" (click)="closePayoutModal()">✕</button>
              </div>
              <div class="modal-body">
                @if (errorMsg()) {
                  <div class="badge badge-danger p-2 mb-3 block text-center">{{ errorMsg() }}</div>
                }
                <p class="text-sm text-muted mb-4">
                  Funds will be wired via NEFT/IMPS to {{ store()?.bankAccount?.bankName }} (A/C: {{ store()?.bankAccount?.accountNumber }}).
                </p>
                <div class="form-group">
                  <label class="form-label">Withdrawal Amount (₹)</label>
                  <input type="number" [(ngModel)]="requestAmount" class="form-control text-lg font-bold" [max]="store()?.balance || 0" />
                  <span class="text-xs text-muted mt-1 block">Maximum available: ₹{{ (store()?.balance || 0).toLocaleString() }}</span>
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary btn-sm" (click)="closePayoutModal()">Cancel</button>
                <button class="btn btn-primary btn-sm" (click)="submitPayoutRequest()" [disabled]="submitting() || requestAmount <= 0">
                  {{ submitting() ? 'Submitting...' : 'Submit Request' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .border-b { border-bottom: 1px solid var(--border); }
    .font-mono { font-family: monospace; }
  `]
})
export class SellerPayoutsComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public store = signal<any>(null);
  public payouts = signal<Payout[]>([]);
  public isPayoutModalOpen = signal<boolean>(false);
  public requestAmount = 10000;
  public submitting = signal<boolean>(false);
  public errorMsg = signal<string>('');

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.get<{ success: boolean; store: any }>('/seller/store').subscribe(res => {
      if (res.success) {
        this.store.set(res.store);
        this.requestAmount = res.store.balance || 5000;
      }
    });

    this.api.get<{ success: boolean; payouts: Payout[] }>('/seller/payouts').subscribe(res => {
      if (res.success) this.payouts.set(res.payouts);
    });
  }

  openPayoutModal() {
    this.isPayoutModalOpen.set(true);
  }

  closePayoutModal() {
    this.isPayoutModalOpen.set(false);
    this.errorMsg.set('');
  }

  submitPayoutRequest() {
    if (this.requestAmount <= 0) return;
    this.submitting.set(true);
    this.errorMsg.set('');

    this.api.post('/seller/payouts', { amount: this.requestAmount }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closePayoutModal();
        this.loadData();
      },
      error: err => {
        this.submitting.set(false);
        this.errorMsg.set(err.error?.message || 'Payout request failed');
      }
    });
  }
}
