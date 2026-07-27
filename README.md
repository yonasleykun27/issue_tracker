# 📞 Ethio Telecom — Issue Tracker Portal

[![Next.js](https://img.shields.io/badge/Next.js-16.x-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-00E699?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://tele-issue-tracker.vercel.app/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Image%20CDN-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![NextAuth](https://img.shields.io/badge/NextAuth.js-Auth-purple?style=for-the-badge)](https://next-auth.js.org/)

A **full-stack, multi-role incident management system** built for Ethio Telecom's internal IT operations. Employees can report network and service incidents, administrators can review and assign them to agents, and agents can track and resolve them — all in a single, secure portal.

### 🌐 Live Demo → [tele-issue-tracker.vercel.app](https://tele-issue-tracker.vercel.app/)

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
- Approve tickets — auto-assigns to a random available agent
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
- Responsive design — works on desktop and mobile (slide-in mobile drawer)
- Premium design with brand green/blue gradients, glassmorphism cards, micro-animations

---

## 👤 Profile & Settings

Every user has a `/profile` page accessible from the sidebar:
- Displays name, email, and role badge
- **Change Password** form with:
  - Current password verification
  - New password with live strength meter
  - Confirm password with match indicator

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

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, shadcn/ui components |
| **Database** | [Neon](https://neon.tech/) — Serverless PostgreSQL via Prisma ORM |
| **Auth** | NextAuth.js (credentials provider, bcryptjs) |
| **Image Storage** | [Cloudinary](https://cloudinary.com/) — 25 GB free CDN storage |
| **Rich Text** | Tiptap (`@tiptap/react`, StarterKit, Underline) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Data Fetching** | TanStack React Query v5 |
| **Tables** | TanStack React Table v8 |
| **Charts** | Recharts (admin analytics) |
| **Icons** | React Icons (Font Awesome), Lucide React |
| **Notifications** | react-hot-toast |
| **Deployment** | [Vercel](https://vercel.com/) — Serverless Edge Network |

---

## ☁️ Cloud Infrastructure

```
┌─────────────────────────────────────────────────┐
│                  USER BROWSER                   │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│           VERCEL (Serverless Hosting)           │
│     https://tele-issue-tracker.vercel.app       │
│                                                 │
│  Next.js App Router  │  API Routes (Edge Fn)    │
└──────┬───────────────┴──────────┬───────────────┘
       │                          │
       ▼                          ▼
┌─────────────────┐    ┌─────────────────────────┐
│   NEON DATABASE │    │   CLOUDINARY CDN        │
│  (PostgreSQL)   │    │   Image Storage         │
│  Serverless DB  │    │   25 GB Free Tier       │
│  Auto-scaling   │    │   Global CDN Delivery   │
└─────────────────┘    └─────────────────────────┘
```

### Why these services?

| Service | Why chosen |
|---|---|
| **Vercel** | Zero-config Next.js deployment, global CDN, auto-deploys from GitHub |
| **Neon** | Serverless PostgreSQL — scales to zero when idle, perfect for Vercel |
| **Cloudinary** | 25 GB free image storage, auto-optimization, CDN delivery worldwide |

---

## 📂 Project Structure

```
issue_tracker/
├── app/
│   ├── api/
│   │   ├── admin/users/[id]/        # Admin: approve, warn, ban, role update
│   │   ├── auth/[...nextauth]/      # NextAuth credential provider
│   │   ├── auth/forgot-password/    # Send reset link email
│   │   ├── auth/reset-password/     # Verify token and update password
│   │   ├── issues/                  # CRUD for incidents
│   │   ├── issues/[id]/approve/     # Auto-assign to agent + notify
│   │   ├── issues/[id]/logs/        # Fetch activity timeline
│   │   ├── issues/upload/           # Cloudinary image upload handler
│   │   ├── notifications/           # Fetch + mark-as-read notifications
│   │   ├── profile/change-password/ # Authenticated password change
│   │   ├── register/                # User registration with OTP check
│   │   ├── register/send-otp/       # Send email OTP for registration
│   │   └── users/warnings/          # Fetch current user warnings
│   ├── auth/
│   │   ├── signin/                  # Login page
│   │   ├── signup/                  # Registration page with OTP + complexity
│   │   ├── forgot-password/         # Forgot password page
│   │   └── reset-password/          # Reset password page
│   ├── components/
│   │   ├── AdminDashboard.tsx       # Full admin incident + staff management UI
│   │   ├── AgentDashboard.tsx       # Agent ticket queue
│   │   ├── UserDashboard.tsx        # User incident list
│   │   ├── NavBar.tsx               # Top nav with notifications + warnings
│   │   ├── Sidebar.tsx              # Collapsible role-based sidebar
│   │   ├── SidebarLayout.tsx        # Layout wrapper with sidebar
│   │   ├── RichTextEditor.tsx       # Tiptap WYSIWYG editor component
│   │   ├── LandingPage.tsx          # Public landing page
│   │   ├── ThemeProvider.tsx        # Dark/light mode context
│   │   └── QueryProvider.tsx        # TanStack Query client provider
│   ├── issues/
│   │   ├── new/page.tsx             # Report new incident form
│   │   ├── [id]/page.tsx            # Incident detail + edit page
│   │   └── page.tsx                 # All incidents table (admin/agent)
│   ├── profile/
│   │   └── page.tsx                 # Profile & Settings page
│   ├── lib/
│   │   ├── prisma.ts                # Prisma client singleton
│   │   ├── email.ts                 # Nodemailer email helper
│   │   ├── validatePassword.ts      # Shared password complexity validator
│   │   └── stripHtml.ts             # Strip HTML tags for table previews
│   ├── globals.css                  # Global styles + Tailwind tokens
│   ├── layout.tsx                   # Root layout with all providers
│   └── page.tsx                     # Root entry (role-based dashboard router)
├── components/ui/                   # shadcn/ui primitives (Button, Input, Card…)
├── prisma/
│   └── schema.prisma                # Database schema
└── public/
    └── uploads/                     # Local dev uploads (Cloudinary used in prod)
```

---

## 📊 Database Schema

```mermaid
erDiagram
    User ||--o{ Issue : "reports"
    User ||--o{ Issue : "assignedTo"
    User ||--o{ IssueLog : "performs action"
    User ||--o{ Notification : "receives"
    User ||--o{ WarningHistory : "warning logs"
    Issue ||--o{ IssueLog : "has logs (cascade delete)"

    User {
        Int id PK
        String name
        String email UK
        String passwordHash
        Role role "ADMIN | AGENT | USER"
        UserStatus status "PENDING | ACTIVE | WARNED | BANNED | ON_LEAVE"
        Int warningCount
        String statusReason
    }

    Issue {
        Int id PK
        String title
        String description "HTML from rich text editor"
        Status status "OPEN | IN_PROGRESS | RESOLVED | REJECTED"
        Priority priority "LOW | MEDIUM | HIGH"
        String imageUrl "Cloudinary CDN URL"
        String phone
        String address
        String rejectionReason
        DateTime createdAt
    }

    IssueLog {
        Int id PK
        Int issueId FK
        Int actorId FK
        String action
        DateTime createdAt
    }

    Notification {
        Int id PK
        Int userId FK
        String title
        String message
        Boolean isRead
        DateTime createdAt
    }

    OtpCode {
        Int id PK
        String email UK
        String code
        DateTime expiresAt
    }
```

---

## ⚙️ Getting Started (Local Setup)

### 1. Clone the repository
```bash
git clone https://github.com/yonasleykun27/issue_tracker.git
cd issue_tracker
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Neon PostgreSQL (or local PostgreSQL for dev)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/issue_tracker?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-strong-random-secret"

# Gmail SMTP (for OTP emails and password reset)
SMTP_EMAIL="your-gmail@gmail.com"
SMTP_PASSWORD="your-gmail-app-password"

# Cloudinary (image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Push Database Schema
```bash
npx prisma db push
npx prisma generate
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deployment (Vercel + Neon + Cloudinary)

### Step 1 — Set up Neon Database
1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **Connection String**
3. Run `npx prisma db push` with your Neon URL to create tables

### Step 2 — Set up Cloudinary
1. Create a free account at [cloudinary.com](https://cloudinary.com)
2. From your dashboard, copy: **Cloud Name**, **API Key**, **API Secret**

### Step 3 — Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project** → Import `yonasleykun27/issue_tracker`
2. Add these **Environment Variables** in Vercel:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Any strong random string |
| `SMTP_EMAIL` | Gmail address |
| `SMTP_PASSWORD` | Gmail App Password |
| `CLOUDINARY_CLOUD_NAME` | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From Cloudinary dashboard |

3. Click **Deploy** → update `NEXTAUTH_URL` with your actual Vercel URL → Redeploy ✅

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
