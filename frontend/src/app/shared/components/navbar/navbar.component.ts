import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  public auth = inject(AuthService);
  public cart = inject(CartService);
  private router = inject(Router);

  public searchQuery = '';
  public isUserDropdownOpen = signal(false);

  onSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/products'], { queryParams: { search: this.searchQuery.trim() } });
    }
  }

  toggleDropdown() {
    this.isUserDropdownOpen.update(v => !v);
  }

  closeDropdown() {
    this.isUserDropdownOpen.set(false);
  }
}
