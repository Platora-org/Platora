## Platora – Food Court Management System

Platora is a full-featured, scalable Food Court Management System built using the PERN stack (PostgreSQL, Express, React, Node.js) and Tailwind CSS. It is designed to streamline and digitize the operations of modern food courts, covering everything from user onboarding and wallet payments to food ordering, delivery, and financial management.

---

## Purpose & Scope

- **Primary goal:** Provide an internal, role-driven platform for a food court to manage day-to-day operations efficiently: orders, reservations, inventory, payouts, and auditing.
- **Intended audience:** Food court administrators, restaurant managers/staff, inventory staff, cashiers, delivery personnel, and support/finance teams.

---

## Major Functions (Quick Overview)

- **User & Role Management** — accounts, roles, permissions, KYC and verifications.
- **Restaurant (Tenant) Management** — profiles, menus, plate/recipes, availability.
- **Menu & Catalog Management** — menu categories, items, pricing, specials.
- **Order Management** — order lifecycle: placed → preparing → ready → pickup/delivery → complete.
- **Reservations & Time Slots** — availability, booking, confirmations, cancellations.
- **Inventory Management** — stock tracking, adjustments, recipe-driven consumption, reorder alerts.
- **Payments & Wallet** — customer payments, refunds, internal wallet & ledger, payouts to restaurants.
- **Delivery Management** — assignment, status updates, delivery agent tracking.
- **Reporting & Analytics** — sales, restaurant performance, reservation and inventory reports.
- **Payouts & Finance** — earnings calculation, approval workflow, payout processing.
- **Security & Audit** — activity logging, security audits, role-based access control.
- **Uploads & Media** — photos, menus, KYC documents, file uploads.

---

## Roles & Duties (What each role does)

### 1. **System Admin / Food Court Manager** 

- **Duties:** Global configuration, tenant onboarding & approval, payouts approval, blackout scheduling, analytics oversight, role assignment, system-wide reports.
- **Workflow:** Approve tenants → set court rules & fees → configure blackouts/time slots → review analytics → approve payouts.

### 2. **Restaurant Manager** 

- **Duties:** Manage menu/catalog, set availability, configure items/recipes, view restaurant-level reports, receive orders and manage staff.
- **Workflow:** Publish menu → receive orders → update order status → reconcile sales & inventory → request payouts.

### 3. **Kitchen Staff / Chef** 

- **Duties:** Manage order tickets, update preparation status (preparing, ready), maintain recipe/plate details.
- **Workflow:** Accept ticket → prepare → mark ready → notify cashier/delivery.

### 4. **Inventory Manager / Stock Keeper** 

- **Duties:** Track stock, log adjustments, receive supplies, manage reorder alerts based on thresholds.
- **Workflow:** Monitor stock → create purchase receipts → update inventory → reconcile discrepancies.

### 5. **Cashier / Front-desk** 

- **Duties:** Process on-site orders and payments, manage reservation check-ins, process refunds.
- **Workflow:** Receive customer → confirm order/reservation → accept payment → print receipt and update system.

### 6. **Delivery Agent** 

- **Duties:** Accept delivery tasks, update delivery status (picked up, in transit, delivered), handle delivery issues.
- **Workflow:** Receive assignment → pickup → deliver → update completion → customer feedback.

### 7. **Customer (User)** 

- **Duties:** Browse menus, place orders, make reservations, use wallet, request refunds or support.
- **Workflow:** Sign up → browse → place order or reserve → pay → collect/delivery → rate/feedback.

### 8. **KYC / Verification Team** 

- **Duties:** Validate tenant documents, approve onboarding.
- **Workflow:** Review documents → approve/reject → notify tenant & admin.

### 9. **Finance / Auditor** 

- **Duties:** Review transactions, run audits, reconcile payouts, check refund cases, examine security logs.
- **Workflow:** Run reports → reconcile → sign off payouts → escalate discrepancies.

---

## Workflows (High-level sequences)

1. **Order Lifecycle**

   - Customer selects items → payment → order created → restaurant notified → kitchen updates status → order ready → pickup or delivery → completed → accounting update & inventory consumption.

2. **Reservation Lifecycle**

   - Customer checks availability → creates booking → restaurant & admin notified → confirmation or rejection → check-in and completion.

3. **Inventory / Recipe Consumption**

   - Recipe defined → orders reference recipe → stock auto-decrements → low-stock alerts → create purchase order & receive stock.

4. **Onboarding & KYC**

   - Restaurant submits info → KYC review → approval → admin activates account → restaurant configures menu & availability.

5. **Payout & Finance**

   - System computes earnings & fees → accrues to restaurant ledger → admin verifies → processes payout → records transaction audit.

6. **Refund / Dispute**
   - Customer raises dispute → support triages → admin/restaurant decision → refund processed and logs updated.

---

## 🛠️ Tech Stack & Project Layout

- Backend: **Node.js / Express** (`server/`) — controllers, models, routes, middleware (`server/controllers`, `server/models`, `server/routes`).
- Frontend: **React + Vite** (`client/`) — component-based UI, pages, and utilities.
- Database: SQL schema file present (`newDB.sql`) — relational DB (MySQL/Postgres style).
- Auth: Passport-based auth (`server/config/passport.js`) and role middleware (`server/middleware/requireRole.js`).
- File Uploads: Upload middleware (`server/middleware/upload.js`) for images & docs.

---

## ⚙️ Getting Started (Developer quick start)

1. Clone the repo.
2. Back-end:
   - cd `server/`
   - Create a `server/.env` locally and fill environment variables (DB credentials, JWT, API keys, SMTP credentials) using the examples below.
   - npm install
   - npm run dev (or the project script used for development)
3. Front-end:
   - cd `client/`
   - Create a `client/.env` locally and set `VITE_*` variables (API base URLs only) using the examples below.
   - npm install
   - npm run dev
4. Initialize database with  `server/newDB.sql`.

---

### Environment variables

**Server / backend** (copy into `server/.env` locally; do not commit)

```env
# Server (local)
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/foodcourt
JWT_SECRET=your_jwt_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Email (SMTP)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
EMAIL_FROM="Platora <noreply@example.com>"

# App URL (frontend)
APP_URL=http://localhost:5173

# Third-party APIs
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

**Client / frontend (Vite)** (copy into `client/.env` locally; `VITE_*` values are public)

```env
# Client (Vite)
VITE_API_URL=http://localhost:3000/api
VITE_API_BASE_URL=http://localhost:3000
```

---

**- Team Platora**

