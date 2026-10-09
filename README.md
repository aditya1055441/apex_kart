# ApexKart — Scalable Multi-Vendor E-Commerce Marketplace

A modern, responsive, and scalable multi-vendor e-commerce marketplace platform (similar in concept to Amazon and Flipkart), designed and built following modern headless commerce standards and referencing the `design/E-commerce UI Kit.penpot` UI architecture.

---

## 🌟 Platform Capabilities

### 1. Customer Shopping Portal
*   **Multi-Step Verified Registration:** Register with either **Email Address** OR **Mobile Phone Number**; generates a random verification code; once verified, the user enters their **Full Name** and **Date of Birth (DOB)** and clicks **OK / Register** to complete setup.
*   **Alternative Login Methods:** Email/Password sign-in, instant 6-digit OTP login, and 1-click demo persona switcher.
*   **Modern Storefront:** Hero promotion banner, category explorer, Deals of the Day, and trending products.
*   **Advanced Catalog Search & Filters:** Search by query with faceted filters (Category, Brand, Price slider, and in-stock items) and multi-option sorting (Price Low-to-High, High-to-Low, Top Rated, Newest).
*   **Product Details (PDP):** Multi-image gallery, interactive variant selection (size, color, editions), stock indicators, verified seller details, customer review summaries, and review submission.
*   **Shopping Cart & Drawer:** Slide-out drawer with dynamic quantity adjusters, subtotal/tax/delivery calculation, and promo coupon discounts (e.g., `WELCOME10`, `FLAT500`).
*   **Checkout & Razorpay Integration:** Multi-step checkout with address selection/creation, cash-on-delivery (COD) option, and full **Razorpay** checkout dialog supporting simulated sandbox payments and HMAC SHA-256 signature verification.
*   **Order Tracking & Lifecycle:** Real-time order progress stepper (`Placed` → `Processing` → `Shipped` → `Delivered`), logistics courier tracking numbers, order cancellations, and item-level return/refund requests.
*   **Account & Address Book:** Customer profile and address book management.

### 2. Seller / Vendor Central
*   **Onboarding & KYC:** Vendor registration collecting GSTIN, PAN, Bank Details (Account Number, IFSC), and business identity for admin review.
*   **Vendor Dashboard:** Real-time metrics on Available Balance, Cumulative Sales, Pending Shipments, Catalog items, and Store Ratings.
*   **Catalog & Inventory Management:** Add new products with SKU, variants, pricing, category taxonomy, and stock control.
*   **Order Logistics & Fulfillment:** Process orders containing store items, generate tracking numbers with courier selection (Blue Dart, Delhivery, DTDC, etc.), and mark as `SHIPPED` / `DELIVERED`.
*   **Returns Management:** Review and approve customer return/refund requests.
*   **Automated Payouts:** Request bank transfers from earned balance with automated commission deduction.

### 3. Super Admin Console
*   **Marketplace Analytics:** Gross Merchandise Value (GMV), Platform Commission Revenue, Total Sellers, Total Orders, and active transactions.
*   **Seller KYC Moderation:** Review vendor GSTIN/PAN documents, approve or reject seller stores with notes, and configure custom commission rates (%) per vendor.
*   **Catalog Taxonomy:** Manage categories, brands, and category commission schedules.
*   **Disbursement Engine:** Review pending vendor payout requests and disburse funds with bank transaction UTR references.
*   **System RBAC:** Role-based access control protecting customer, seller, and admin endpoints.

### 4. Interactive Persona Switcher
For effortless demonstration and testing, the application includes a top **Persona Switcher Bar** that enables 1-click toggling between:
*   🛒 **Customer** (`customer@gmail.com` / `Customer@123`)
*   🏬 **Apex Seller** (`seller@apextech.com` / `Seller@123`)
*   ⚡ **Super Admin** (`admin@marketplace.com` / `Admin@123`)

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Angular 18 (Standalone Components, Signals, Router, Vanilla CSS design system) |
| **Backend** | Node.js, Express, TypeScript, JWT, bcryptjs, crypto |
| **Database** | PostgreSQL with resilient in-memory storage fallback and `schema.sql` DDL |
| **Payment Gateway** | Razorpay SDK (Order creation, Checkout modal, Webhook handler, HMAC verification) |
| **Design Reference** | `design/E-commerce UI Kit.penpot` |

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm (v10+)
*   (Optional) Docker Desktop if running local PostgreSQL container

### 1. Database Setup (Optional Docker)
To start a live PostgreSQL database instance:
```bash
docker-compose up -d
```
*(Note: If Docker or PostgreSQL is not running, the backend automatically operates with its integrated persistent in-memory database pre-seeded with multi-vendor stores, products, reviews, and test accounts).*

### 2. Backend Setup & Run
```bash
cd backend
npm.cmd install
npm.cmd run build
npm.cmd start
```
The REST API will start at `http://localhost:5000`.
Health endpoint: `http://localhost:5000/api/health`

### 3. Frontend Setup & Run
In a separate terminal:
```bash
cd frontend
npm.cmd install
npm.cmd start
```
The Angular web application will launch at `http://localhost:4200`.

---

## ☁️ Deploying on Render (render.com)

This repository includes everything needed to deploy to Render:

### Method 1: 1-Click Render Blueprint (Recommended)
1. Push your repository to GitHub or GitLab.
2. In your Render Dashboard, click **New +** > **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml` and provision:
   * **`ecommerce-postgres`**: Managed PostgreSQL database.
   * **`ecommerce-backend`**: Docker Web Service running the Node.js API.
   * **`ecommerce-frontend`**: Docker Web Service running Angular on Nginx Alpine with automatic API proxying.
4. Set your `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the Render Environment settings.
5. Click **Apply**. Render will build and deploy the entire multi-vendor marketplace!

### Method 2: Deploying Services Individually via Docker
* **Backend Web Service**:
  * **Environment**: `Docker`
  * **Docker Command / Path**: `./backend/Dockerfile`
  * **Docker Context**: `./backend`
  * **Port**: `10000` (Render handles this automatically)
* **Frontend Web Service**:
  * **Environment**: `Docker`
  * **Docker Command / Path**: `./frontend/Dockerfile`
  * **Docker Context**: `./frontend`
  * **Environment Variable**: `BACKEND_URL = https://your-backend-name.onrender.com`

---

## 🧪 Automated Testing

The backend includes a comprehensive test suite covering all core business domains (Auth, RBAC, Catalog Search, Cart, Coupons, Order creation, Razorpay verification, Seller fulfillment, and Admin moderation).

To run the test suite:
```bash
cd backend
npm.cmd test
```

---

## 📁 Repository Structure

```
E-commerce/
├── backend/
│   ├── src/
│   │   ├── config/              # Server, JWT & Razorpay configuration
│   │   ├── controllers/         # Auth, Product, Cart, Order, Payment, Seller, Admin
│   │   ├── database/            # PostgreSQL DDL schema & repository
│   │   ├── middleware/          # JWT Auth, Optional Auth & RBAC
│   │   ├── routes/              # Express API route endpoints
│   │   ├── services/            # Razorpay SDK and OTP services
│   │   ├── types/               # TypeScript models and interfaces
│   │   ├── app.ts               # Express application initialization
│   │   └── server.ts            # Entrypoint listener
│   ├── tests/                   # Automated API integration tests (Jest + Supertest)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/            # Models, ApiService, AuthService, CartService, Guards
│   │   │   ├── features/
│   │   │   │   ├── customer/    # Home, Catalog, ProductDetail, Checkout, Orders, Profile
│   │   │   │   ├── seller/      # Register, Dashboard, Products, Orders, Payouts
│   │   │   │   └── admin/       # Dashboard, Sellers KYC, Payouts, Categories
│   │   │   ├── shared/          # Navbar with Role Switcher, Footer, CartDrawer, AuthModal
│   │   │   ├── app.routes.ts    # Application routing definitions
│   │   │   └── app.component.ts # Root layout wrapper
│   │   ├── index.html           # Razorpay script and fonts
│   │   └── styles.css           # Vanilla CSS design system
│   ├── angular.json
│   └── package.json
├── design/
│   └── E-commerce UI Kit.penpot # Penpot UI design specification
├── docker-compose.yml           # PostgreSQL container definition
└── README.md
```
