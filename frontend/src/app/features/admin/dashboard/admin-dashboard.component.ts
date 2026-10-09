import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);

  public analytics = signal<any>(null);
  public recentOrders = signal<any[]>([]);
  public topStores = signal<any[]>([]);
  public loading = signal<boolean>(true);

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.loading.set(true);
    this.api.get<{ success: boolean; analytics: any; recentOrders: any[]; topStores: any[] }>('/admin/analytics').subscribe({
      next: res => {
        if (res.success) {
          this.analytics.set(res.analytics);
          this.recentOrders.set(res.recentOrders || []);
          this.topStores.set(res.topStores || []);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
