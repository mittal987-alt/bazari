# 🛍️ Bazaari

> A modern peer-to-peer marketplace platform for buying and selling — built for India.

[![Live Demo](https://img.shields.io/badge/Live-bazari--plum.vercel.app-blueviolet?style=flat-square)](https://bazari-plum.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-97%25-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

---

## 📸 Screenshots

| Buyer Dashboard | Seller Console |
|---|---|
| ![Buyer Dashboard](./screenshots/buyer-dashboard.png) | ![Seller Console](./screenshots/seller-console.png) |

---

## ✨ Features

### For Buyers
- **Price Estimator** — AI-powered fair price check on any listing
- **Budget Shop** — Browse deals filtered to your budget
- **Nearby Listings** — Discover items available close to you
- **Wishlist** — Save and track your favourite items
- **Messages** — Chat directly with sellers
- **Category Browsing** — Electronics, Vehicles, Property, Fashion, Furniture, Fitness

### For Sellers
- **Seller Console** — Full command centre with Revenue, Leads, Views, and Rating stats
- **Post New Listing** — List items in minutes
- **Inventory Management** — Track active and sold listings
- **Recent Inquiries** — Manage buyer messages from one place

### Platform
- 🔐 Google OAuth login + Email/Password auth
- 🌙 Dark mode UI
- 📱 Fully responsive design
- ⚡ Real-time chat between buyers and sellers
- 🤖 Budget AI assistant
- 🏪 Lounge (community/social feed)

---

## 🗂️ Project Structure

```
bazaari/
├── app/                        # Next.js App Router
│   ├── (app)/                  # Main app routes
│   ├── (auth)/                 # Auth routes (login, register, forgot password)
│   ├── (dashboard)/buyer/      # Buyer dashboard pages
│   ├── api/                    # API route handlers
│   ├── cookies/                # Cookie consent pages
│   ├── privacy/                # Privacy policy
│   ├── terms/                  # Terms of service
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                 # Reusable React components
│   ├── ads/                    # Ad display components
│   ├── chats/                  # Messaging UI
│   ├── common/                 # Shared components
│   ├── layout/                 # Header, footer, sidebar
│   ├── providers/              # Context providers (auth, theme, etc.)
│   └── ui/                     # Base UI elements
│
├── lib/                        # Utility functions and helpers
├── models/                     # Data models / types
├── scratch/                    # Experimental / WIP code
├── server/                     # Server-side logic
├── services/                   # API service layer
├── store/                      # Global state management
│
├── next.config.ts
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── proxy.ts
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Google OAuth 2.0 + Credentials |
| Deployment | Vercel |
| AI Features | Budget AI (price estimation) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google OAuth credentials (for auth)

### Installation

```bash
# Clone the repository
git clone https://github.com/mittal987-alt/bazaar.git
cd bazaar

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file with the following:

```env
# Auth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Database
DATABASE_URL=your_database_url

# Other
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Deployment

This project is deployed on **Vercel**. Every push to `main` triggers a production deployment automatically.

**Live URL:** [bazari-plum.vercel.app](https://bazari-plum.vercel.app)

---

## 🔒 Auth Flow

Bazaari supports two login methods:

1. **Google OAuth 2.0** — One-click sign in with Google
2. **Email & Password** — Traditional credentials with forgot password support

---

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome! Feel free to open an issue.

---

## 📄 License

This project is private. All rights reserved © 2026 mittal987-alt.

---

<div align="center">
  Made with ❤️ in India
</div>
