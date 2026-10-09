import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="site-footer">
      <div class="features-bar">
        <div class="container grid grid-cols-4 gap-6">
          <div class="feature-item flex items-center gap-3">
            <span class="feat-icon">🚀</span>
            <div>
              <strong>Free Fast Delivery</strong>
              <p class="text-xs text-muted">On orders above ₹1,500</p>
            </div>
          </div>
          <div class="feature-item flex items-center gap-3">
            <span class="feat-icon">💳</span>
            <div>
              <strong>Secure Razorpay Payments</strong>
              <p class="text-xs text-muted">UPI, Cards, NetBanking, COD</p>
            </div>
          </div>
          <div class="feature-item flex items-center gap-3">
            <span class="feat-icon">🔄</span>
            <div>
              <strong>7 Days Easy Returns</strong>
              <p class="text-xs text-muted">Hassle-free refunds</p>
            </div>
          </div>
          <div class="feature-item flex items-center gap-3">
            <span class="feat-icon">🛡️</span>
            <div>
              <strong>100% Genuine Vendors</strong>
              <p class="text-xs text-muted">Strict KYC verified sellers</p>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-main py-12">
        <div class="container grid grid-cols-4 gap-8">
          <div>
            <div class="brand-logo flex items-center gap-2 mb-4">
              <div class="logo-mark">A</div>
              <span class="logo-name">ApexKart</span>
            </div>
            <p class="text-sm text-muted mb-4">
              A modern, high-performance multi-vendor marketplace connecting verified sellers with millions of happy shoppers nationwide.
            </p>
          </div>

          <div>
            <h4 class="footer-title">Customer Care</h4>
            <ul class="footer-links">
              <li><a routerLink="/orders">Track Your Orders</a></li>
              <li><a routerLink="/profile">Manage Addresses</a></li>
              <li><a routerLink="/products">Search Catalog</a></li>
              <li><a href="javascript:void(0)">Returns & Refunds Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-title">Sell on ApexKart</h4>
            <ul class="footer-links">
              <li><a routerLink="/seller/register">Seller Registration & KYC</a></li>
              <li><a routerLink="/seller/dashboard">Seller Dashboard</a></li>
              <li><a href="javascript:void(0)">Commission & Fee Schedule</a></li>
              <li><a href="javascript:void(0)">Fulfillment Guidelines</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-title">Super Admin</h4>
            <ul class="footer-links">
              <li><a routerLink="/admin/dashboard">Platform Overview</a></li>
              <li><a routerLink="/admin/sellers">Seller KYC Moderation</a></li>
              <li><a routerLink="/admin/payouts">Vendor Payouts</a></li>
              <li><a routerLink="/admin/categories">Taxonomy Management</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="footer-bottom py-4">
        <div class="container flex justify-between items-center text-xs text-muted">
          <p>© 2026 ApexKart Marketplace Inc. Built with Angular, Node.js, and Razorpay.</p>
          <div class="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .site-footer {
      background: #0f172a;
      color: #cbd5e1;
      margin-top: 5rem;
    }
    .features-bar {
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2rem 0;
      background: rgba(255, 255, 255, 0.02);
    }
    .feat-icon {
      font-size: 2rem;
    }
    .logo-mark {
      width: 32px;
      height: 32px;
      background: #4f46e5;
      color: #fff;
      font-weight: 800;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-name {
      font-size: 1.25rem;
      font-weight: 800;
      color: #fff;
    }
    .footer-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 1rem;
    }
    .footer-links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.875rem;
    }
    .footer-links a {
      color: #94a3b8;
      transition: color 0.2s;
    }
    .footer-links a:hover {
      color: #38bdf8;
    }
    .footer-bottom {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .text-muted { color: #94a3b8; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .mb-4 { margin-bottom: 1rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
  `]
})
export class FooterComponent {}
