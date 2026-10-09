import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Category, Brand } from '../../../core/models';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="admin-categories-page py-8">
      <div class="container">
        <div class="header-row flex justify-between items-center mb-6">
          <div>
            <h1 class="page-title text-2xl font-bold">Category & Taxonomy Management</h1>
            <p class="text-xs text-muted">Manage marketplace catalog hierarchy, commissions, and registered brands</p>
          </div>

          <button class="btn btn-primary btn-sm" (click)="openCatModal()">
            + Add New Category
          </button>
        </div>

        <div class="grid grid-cols-3 gap-8">
          <!-- Categories Column -->
          <div class="categories-col col-span-2 card overflow-hidden">
            <div class="p-4 bg-muted border-b font-bold text-sm">Active Product Categories</div>
            <div class="table-responsive border-0">
              <table class="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Slug</th>
                    <th>Commission Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of categories(); track c.id) {
                    <tr>
                      <td>
                        <div class="flex items-center gap-3">
                          <img [src]="c.image" class="w-10 h-10 rounded object-cover" />
                          <div>
                            <strong>{{ c.name }}</strong>
                            <p class="text-xs text-muted">{{ c.description }}</p>
                          </div>
                        </div>
                      </td>
                      <td class="font-mono text-xs text-muted">{{ c.slug }}</td>
                      <td><strong>10.0%</strong></td>
                      <td>
                        <span class="badge badge-success">Active</span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Brands Column -->
          <div class="brands-col card overflow-hidden">
            <div class="p-4 bg-muted border-b font-bold text-sm">Marketplace Brands</div>
            <div class="p-4 flex flex-col gap-2">
              @for (b of brands(); track b.id) {
                <div class="brand-item flex items-center justify-between p-2 border rounded">
                  <strong>{{ b.name }}</strong>
                  <span class="text-xs text-muted font-mono">{{ b.slug }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Add Category Modal -->
        @if (isCatModalOpen()) {
          <div class="modal-backdrop" (click)="closeCatModal()">
            <div class="modal-content" (click)="$event.stopPropagation()">
              <div class="modal-header">
                <h3 class="font-bold text-base">Add New Category</h3>
                <button class="close-btn" (click)="closeCatModal()">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">Category Name</label>
                  <input type="text" [(ngModel)]="newCatName" class="form-control" placeholder="e.g. Sports & Outdoors" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Description</label>
                  <textarea [(ngModel)]="newCatDesc" class="form-control" rows="2" placeholder="Brief summary of items..."></textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">Image URL</label>
                  <input type="url" [(ngModel)]="newCatImg" class="form-control" placeholder="https://..." />
                </div>
              </div>
              <div class="modal-footer">
                <button class="btn btn-secondary btn-sm" (click)="closeCatModal()">Cancel</button>
                <button class="btn btn-primary btn-sm" (click)="saveCategory()" [disabled]="!newCatName.trim()">
                  Create Category
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .col-span-2 { grid-column: span 2 / span 2; }
    .w-10 { width: 2.5rem; }
    .h-10 { height: 2.5rem; }
    .border-0 { border: none; }
    .border-b { border-bottom: 1px solid var(--border); }
    .font-mono { font-family: monospace; }
  `]
})
export class AdminCategoriesComponent implements OnInit {
  private api = inject(ApiService);

  public categories = signal<Category[]>([]);
  public brands = signal<Brand[]>([]);
  public isCatModalOpen = signal<boolean>(false);
  public newCatName = '';
  public newCatDesc = '';
  public newCatImg = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400';

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.get<{ success: boolean; categories: Category[] }>('/categories').subscribe(res => {
      if (res.success) this.categories.set(res.categories);
    });

    this.api.get<{ success: boolean; brands: Brand[] }>('/categories/brands').subscribe(res => {
      if (res.success) this.brands.set(res.brands);
    });
  }

  openCatModal() {
    this.isCatModalOpen.set(true);
  }

  closeCatModal() {
    this.isCatModalOpen.set(false);
  }

  saveCategory() {
    if (!this.newCatName.trim()) return;

    this.api.post('/categories', {
      name: this.newCatName,
      description: this.newCatDesc,
      image: this.newCatImg
    }).subscribe({
      next: () => {
        this.closeCatModal();
        this.newCatName = '';
        this.newCatDesc = '';
        this.loadData();
      }
    });
  }
}
