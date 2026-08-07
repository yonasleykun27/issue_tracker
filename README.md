# 📞 Ethio Telecom — Issue Tracker Portal

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.org/)
[![Swagger](https://img.shields.io/badge/Swagger-API%20Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://swagger.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E699?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Image%20CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![NextAuth](https://img.shields.io/badge/NextAuth.js-Auth-purple?style=for-the-badge)](https://next-auth.js.org/)

A **full-stack, multi-role incident management system** built for Ethio Telecom's internal IT operations. Employees can report network and service incidents, administrators can review and assign them to agents, and agents can track and resolve them — all in a single, secure portal.

---

## 🏗️ Architecture Overview

The application is structured as a **decoupled monorepo** using a **BFF (Backend-For-Frontend)** architecture:

```
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────┐
│   Browser (Client)   │───────▶│  Next.js (Port 3000) │───────▶│   NestJS     │
│                      │        │  ├─ NextAuth (auth)  │        │  (Port 4000) │
│                      │◀───────│  └─ BFF Proxy (/api) │◀───────│  /api/*      │
└──────────────────────┘        └──────────────────────┘        └──────┬───────┘
                                                                       │
                                                                       ▼
                                                                ┌──────────────┐
                                                                │  PostgreSQL  │
                                                                │  (Port 5433) │
                                                                └──────────────┘
```

1. **Next.js Frontend (Port 3000)**: Serves the client-side UI and manages authentication sessions using `NextAuth.js`. It exposes a catch-all proxy gateway (`app/api/[...catchall]/route.ts`) that decrypts user sessions and forwards request payloads to the NestJS backend with context headers (`x-user-id`, `x-user-role`, `x-user-status`).
2. **NestJS Backend (Port 4000)**: A decoupled, standalone API service containing modules, controllers, and services for core business validation, database interaction, audit logs, email dispatch (SMTP), and file storage.
3. **Database Layer**: Shared PostgreSQL database (using Prisma ORM v7 with `@prisma/adapter-pg` driver adapter for connection pooling).

---

## ✨ Features Overview

### 👤 Employee (USER)
- Submit incident reports with a **rich text description editor** (bold, italic, headings, bullet lists, numbered lists, undo/redo)
- Attach contact phone number, problem location/address, and an optional screenshot
- Set priority level (Low / Medium / High)
- View all submitted reports with real-time status tracking
- **Eye (View) icon** for resolved/rejected tickets — opens read-only detail
- **Edit icon** for open/in-progress tickets — opens editable form
- Delete own unassigned reports
- Receive in-app notifications on ticket status changes

### 🎧 Support Agent (AGENT)
- View assigned ticket queue from a dedicated dashboard
- Progress ticket status forward only: `OPEN → IN_PROGRESS → RESOLVED`
- Cannot change priority or reject tickets
- Receives notification on ticket assignment
- View read-only details for resolved/rejected tickets

### 👑 Administrator (ADMIN)
- **All Incidents** table with 4 actions per row: **Approve**, **Reject**, **View/Edit**, **Delete**
  - Approve & Reject enabled only for unassigned open tickets
  - Editing disabled for resolved tickets (delete only)
- Filter incidents by: All / Assigned / Unassigned / **Rejected** (separate category)
- See assigned agent name for each ticket
- Approve tickets — auto-assigns to a random available agent (round-robin / balance load)
- Reject tickets with a mandatory rejection reason
- Manage staff accounts: approve pending registrations, warn, ban/unban users
- View full **activity timeline** (audit log) on every ticket
- Delete any ticket regardless of status or assignment

---

## 🔐 Authentication & Security

- **Credential-based login** with bcrypt password hashing (NextAuth.js)
- **Email OTP verification** required on registration (Nodemailer / Gmail SMTP)
- **Password complexity enforcement** on registration and password change:
  - Minimum 8 characters
  - At least one uppercase letter (A–Z)
  - At least one lowercase letter (a–z)
  - At least one number (0–9)
  - At least one symbol (`!@#$%^&*` etc.)
- **Live password strength indicator** (5 bars: Very Weak → Very Strong) with checklist
- **Activation code** required to set user role on registration (`TELE_ADMIN`, `TELE_AGENT`, `TELE_EMPLOYEE`)
- Forgot password / reset password via email link
- Pending accounts blocked from portal access until admin approval

---

## 🎨 UI & Experience

- **Collapsible sidebar** with role-specific navigation
- **Dark mode / Light mode** toggle (persisted via ThemeProvider)
- **Notification bell** in the top nav bar with live badge count (polls every 10s)
- **Account warnings** indicator with dropdown showing warning logs
- **Rich text editor** (Tiptap) for issue descriptions — Word-like toolbar
- **Modal-Based Operations**: "New Task" and "New/Edit Project" open directly as interactive overlay modals without page reloads
- Responsive design — works on desktop and mobile (slide-in mobile drawer)
- Premium design with brand green/blue gradients, glassmorphism cards, micro-animations

---

## 📚 API Documentation (Swagger)

The NestJS backend includes built-in interactive **Swagger OpenAPI Documentation**:
- Local URL: `http://localhost:4000/api/docs`
- Features interactive endpoint testing (`GET`, `POST`, `PATCH`, `DELETE`) for all Modules: `Auth`, `Issues`, `Users`, `Divisions`, `Notifications`.

---

## 🗂️ Role-Based Access Matrix

| Feature | USER | AGENT | ADMIN |
|---|:---:|:---:|:---:|
| Submit new incident | ✅ | ❌ | ❌ |
| View own incidents | ✅ | — | — |
| Edit open/in-progress ticket | ✅ | ❌ | ✅ |
| Delete unassigned ticket | ✅ | ❌ | ✅ |
| Delete assigned/resolved ticket | ❌ | ❌ | ✅ |
| Change ticket status | ❌ | ✅ | ❌ |
| Change ticket priority | ✅ (own) | ❌ | ✅ |
| Approve / Reject ticket | ❌ | ❌ | ✅ |
| Assign ticket to agent | ❌ | ❌ | ✅ |
| View all incidents | ❌ | ✅ | ✅ |
| Manage user accounts | ❌ | ❌ | ✅ |
| View activity timeline | ❌ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ |

---

## 📂 Project Structure

```
issue_tracker/
├── app/                        # Next.js App Router (Frontend)
│   ├── api/
│   │   ├── [...catchall]/      # BFF Gateway proxy to NestJS
│   │   └── auth/               # NextAuth authentication config
│   ├── components/             # Reusable Client & Layout components
│   ├── issues/                 # Issues routing pages
│   ├── profile/                # Profile setting page
│   └── globals.css             # Main styling index
├── backend/                    # NestJS Standalone Application (Backend)
│   ├── src/
│   │   ├── auth/               # Custom guards for proxy-injected headers
│   │   ├── common/             # EmailService, Cloudinary modules
│   │   ├── divisions/          # Project CRUD & validation controllers
│   │   ├── issues/             # Ticket reports, assignation, logs controllers
│   │   ├── notifications/      # Fetch/Update notifications
│   │   ├── prisma/             # Database connection module
│   │   └── users/              # OTP validation, admin management
│   ├── .env                    # Backend environment config
│   └── main.ts                 # NestJS application bootstrapping
├── prisma/
│   └── schema.prisma           # Single source of truth DB Schema
└── tsconfig.json               # Root TS config (excludes backend/ directories)
```

---

## ⚙️ Getting Started (Local Setup)

### 1. Clone the repository
```bash
git clone https://github.com/yonasleykun27/issue_tracker.git
cd issue_tracker
```

### 2. Configure Environment Variables

#### Frontend Env
Create a `.env` file in the root directory:
```env
# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-strong-random-secret"

# PostgreSQL Connection url (NextAuth database access)
DATABASE_URL="postgresql://admin:adminpass@localhost:5433/issue_tracker?schema=public"
```

#### Backend Env
Create a `.env` file inside the `backend` directory:
```env
# PostgreSQL Connection url (Primary database access)
DATABASE_URL="postgresql://admin:adminpass@localhost:5433/issue_tracker?schema=public"

# Gmail SMTP (for OTP emails and password reset)
SMTP_EMAIL="your-gmail@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Install Dependencies & Generate Database Clients
Install packages in the root directory and the backend directory:
```bash
# In the root (Next.js)
npm install
npx prisma generate

# In the backend directory
cd backend
npm install
```

### 4. Running the Applications

Open two terminals:

**Terminal 1 (Backend)**:
```bash
cd backend
npm run start:dev
```
Runs the NestJS server on [http://localhost:4000](http://localhost:4000).

**Terminal 2 (Frontend)**:
```bash
npm run dev
```
Runs the Next.js server on [http://localhost:3000](http://localhost:3000).

---

## 🚀 Deployment

### Backend Deployment (NestJS)
You can deploy the NestJS API server to services like **Railway**, **Render**, **Heroku**, or a **VPS**:
1. Point your service to the `backend` folder as the root directory.
2. Build command: `npm run build`
3. Start command: `node dist/main.js`
4. Supply environment variables (`DATABASE_URL`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

### Frontend Deployment (Next.js)
You can deploy the Next.js frontend to **Vercel**:
1. Set Vercel's root directory to the project root (i.e. `./`).
2. Add environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
3. Set the API target environment variable inside Next.js to point to your deployed NestJS API url.

---

## 🔑 Registration Activation Codes

| Code | Role Granted |
|---|---|
| `TELE_ADMIN` | Administrator |
| `TELE_AGENT` | Support Agent |
| `TELE_EMPLOYEE` | Employee (User) |

> Admins are auto-activated. Agents and Users start as `PENDING` and must be approved by an Admin.

---

## 🚦 Ticket Status Flow

```
OPEN  ──► IN_PROGRESS ──► RESOLVED
  │
  └──► REJECTED  (Admin only, on unassigned OPEN tickets)
```

- **Resolved / Rejected** tickets are permanently read-only for all roles
- **Status cannot move backwards**

---

## 📄 License

Internal use only — Ethio Telecom IT Operations & Support Center.
