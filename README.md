# 📞 Ethio Telecom Issue Tracker

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A modern, robust, and secure multi-role **Issue Tracking & Management System** designed for **Ethio Telecom**. This application enables subscribers to report issues (with location details and attachments), while allowing designated agents and administrators to efficiently manage, assign, track, and resolve tickets.

---

## 🚀 Key Features by User Role

### 👤 Subscriber (USER)
- **Ticket Submission:** File new incident reports with descriptions, priority levels, contact details, addresses, and image attachments.
- **My Issues Dashboard:** View, filter, and track the real-time status of reported issues.
- **Notification Logs:** Keep track of updates on reported tickets.

### 🎧 Support Representative (AGENT)
- **Assigned Queue:** Review and update tickets specifically assigned to them.
- **State Transition:** Progress ticket status from `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` / `REJECTED`.
- **Reason Logging:** Record explanation notes when rejecting an issue.

### 👑 Administrator (ADMIN)
- **User Verification:** Review registered accounts and approve them from `PENDING` to `ACTIVE`.
- **System Management:** Assign open issues to agents or themselves.
- **Account Moderation:** Warn, ban, or unban users. Manage user profiles and roles.
- **Activity Logs:** View comprehensive issue lifecycle audits through `IssueLog`.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS (built on Shadcn UI/Radix primitives).
- **Backend & Database:** Next.js Server Actions, REST API Routes, Prisma ORM, and PostgreSQL.
- **Authentication:** NextAuth.js (Session-based, custom credentials provider).
- **Email Delivery:** NodeMailer for password reset OTP codes.
- **Containerization:** Docker & Docker Compose.

---

## 📂 Project Structure

```bash
issue_tracker/
├── app/                  # Next.js App Router folders
│   ├── api/              # API endpoints (Auth, Admin User Management, Issues, Reset OTP)
│   ├── auth/             # Sign-in & Sign-up pages
│   ├── components/       # Role-based dashboards (Admin, Agent, User) & shared components
│   ├── issues/           # Issue detail pages & forms
│   ├── layout.tsx        # Base shell, providers, and navigation header
│   └── page.tsx          # Main entry (handles role-based dashboard redirection)
├── components/           # Shadcn UI reusable components (Table, Dialog, Button, etc.)
├── lib/                  # Helper utilities (db, validation, email, etc.)
├── prisma/               # Prisma Database Schema and Migration Files
│   └── schema.prisma     # Core database relations, models, and enums
├── public/               # Static assets & uploads
├── Dockerfile            # Multi-stage production build script
└── docker-compose.yml    # Local services (PostgreSQL) definition
```

---

## 📊 Database Schema Details

The PostgreSQL database contains the following key entities (defined in [schema.prisma](file:///c:/Users/Yonas/Desktop/tele-internship/issue_tracker/prisma/schema.prisma)):

```mermaid
erDiagram
    User ||--o{ Issue : "reports (USER)"
    User ||--o{ Issue : "assignedTo (AGENT)"
    User ||--o{ Issue : "assignedAdmin (ADMIN)"
    User ||--o{ IssueLog : "logs actions"
    User ||--o{ WarningHistory : "warningLogs"
    Issue ||--o{ IssueLog : "has logs"
    
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
        String description
        Status status "OPEN | IN_PROGRESS | RESOLVED | REJECTED"
        Priority priority "LOW | MEDIUM | HIGH"
        String imageUrl
        String phone
        String address
        DateTime createdAt
        DateTime updatedAt
        String rejectionReason
    }

    IssueLog {
        Int id PK
        Int issueId FK
        Int actorId FK
        String action
        DateTime createdAt
    }
```

---

## ⚙️ Getting Started (Local Setup)

Follow these steps to run the application locally on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/yonasleykun27/issue_tracker.git
cd issue_tracker
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory based on your environment:
```env
DATABASE_URL="postgresql://admin:adminpass@localhost:5433/issue_tracker?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key"

# NodeMailer SMTP Config for Password Resets
SMTP_EMAIL="your-email@gmail.com"
SMTP_PASSWORD="your-app-specific-password"
```

### 3. Spin up the Database (Docker Compose)
Launch the PostgreSQL service:
```bash
docker-compose up -d
```

### 4. Install Dependencies & Prepare DB
Install all package packages, run migrations, and generate the Prisma Client:
```bash
npm install
npx prisma migrate dev
```

### 5. Launch the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🐳 Docker Deployment (Production)

You can run the full production-ready application using the optimized multi-stage [Dockerfile](file:///c:/Users/Yonas/Desktop/tele-internship/issue_tracker/Dockerfile).

1. Build the production image:
   ```bash
   docker build -t ethio-telecom-issue-tracker .
   ```
2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env ethio-telecom-issue-tracker
   ```
