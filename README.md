# Print Press Management System

A comprehensive web-based management system designed specifically for printing press businesses. This application streamlines operations by managing jobs, customers, inventory, payments, and expenses, while providing real-time notifications and separate dashboards for administrators and workers.

## 🌟 Key Features

### Role-Based Access Control (RBAC)
- **Admin Dashboard:** Full oversight of the business, financial reports, inventory management, and user/worker management.
- **Worker Dashboard:** Streamlined view for workers to manage assigned jobs, update statuses, record material usage, and view their customer assignments.

### Job & Workflow Management
- Create detailed print jobs/tickets with delivery deadlines, cost breakdowns, and payment tracking.
- Track job statuses (`not_started`, `in_progress`, `completed`, `delivered`).
- Automatically track materials used and waste generated per job.

### Customer Management
- Maintain a database of customers, their total spend, and job history.
- "New Job" quick actions directly from customer profiles.

### Inventory & Material Tracking
- Track paper sizes, types, grammage, and general operational materials.
- Deduct stock automatically as materials are assigned to jobs.
- Track waste and operational expenses.

### Real-Time & Push Notifications
- **WebSockets:** Live, real-time bell notifications for new jobs, payment updates, and status changes.
- **Push Notifications:** Progressive Web App (PWA) push notifications (via VAPID keys) to alert admins of critical updates even when the app is closed.

### Payments & Finance
- Track deposits, installments, and full payments for jobs.
- Generate Profit & Loss statements based on job revenue, material costs, and operational expenses.

---

## 🏗️ Technology Stack

### Frontend (`print-press-front-end`)
- **Framework:** [Next.js](https://nextjs.org/) (React)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management / Data Fetching:** Axios, React Hooks
- **Icons:** Lucide React
- **Features:** PWA capabilities, Responsive Design

### Backend (`print-press-backend`)
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** Express.js
- **Database:** PostgreSQL (with `pg` pool)
- **Authentication:** JSON Web Tokens (JWT) with Refresh Tokens, bcrypt
- **Real-Time:** `ws` (WebSockets)
- **Push Notifications:** `web-push`

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- pnpm (recommended package manager)

### 1. Database Setup
Ensure PostgreSQL is running. The application automatically handles table generation on startup via `databaseSetup.js`, but you will need to create the initial database and configure the `.env` file.

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd print-press-backend
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env` file in the `print-press-backend` directory:
   ```env
   PORT=5000
   DATABASE_URL=postgres://username:password@localhost:5432/print_press_db
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=8h
   JWT_REFRESH_SECRET=your_super_secret_refresh_key
   JWT_REFRESH_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:3000
   
   # Note: VAPID keys for push notifications will automatically be generated 
   # on first startup and printed to the console. You should copy them here:
   # VAPID_PUBLIC_KEY=...
   # VAPID_PRIVATE_KEY=...
   # VAPID_SUBJECT=mailto:admin@example.com
   ```
4. Start the backend development server:
   ```bash
   pnpm dev
   ```

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd print-press-front-end
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Create a `.env.local` file in the `print-press-front-end` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws
   ```
4. Start the frontend development server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛑 Important Development Notes

### Project Isolation
This repository contains two completely separate Node projects (Frontend and Backend) in the same parent folder. To prevent `pnpm` from incorrectly treating this as a monorepo workspace (which causes module resolution errors):
- Both directories contain an `.npmrc` file with `workspace-root=.`
- **Always** `cd` into the specific project folder before running `pnpm install` or `pnpm dev`. Do not run commands from the root folder.

### Default Admin Account
When the backend starts for the first time, it automatically creates a default admin account:
- **Email:** `admin@printpress.com`
- **Password:** `admin!123`

*(Note: Please change this password immediately in a production environment)*

---

## 📜 License
Proprietary software. Created for Beta Digital Consult.
