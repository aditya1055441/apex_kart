import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrls: ['./seller-dashboard.component.css']
})
export class SellerDashboardComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public stats = signal<any>(null);
  public recentOrders = signal<any[]>([]);
  public loading = signal<boolean>(true);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);
    this.api.get<{ success: boolean; stats: any; recentOrders: any[] }>('/seller/dashboard').subscribe({
      next: res => {
        if (res.success) {
          this.stats.set(res.stats);
          this.recentOrders.set(res.recentOrders || []);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
