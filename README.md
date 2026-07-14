<div align="center">

# 🛍️ Bazaari

### *India's AI-Powered Peer-to-Peer Marketplace*

A modern, full-stack marketplace platform where buyers and sellers connect through intelligent AI features, real-time messaging, and smart pricing — designed and built for India.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-https://bazari-78io.vercel.app-6C3AED?style=for-the-badge)](https://bazari-78io.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-97%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

</div>

---

## ⚡ Quick Highlights

| | Feature | Description |
|---|---|---|
| 🤖 | **AI Marketplace Chatbot** | RAG-powered assistant using vector search + Mistral AI to help buyers find products |
| 💬 | **Real-time Messaging** | Socket.IO powered live chat with typing indicators & push notifications |
| 📊 | **AI Price Estimator** | Smart price analysis with historical trends via Gemini AI |
| 🛒 | **Group Buy System** | Co-buy deals where users pool together for discounted bulk pricing |
| 📸 | **AI Image Analysis** | Google Cloud Vision auto-generates listing descriptions from photos |
| 📍 | **Geo-aware Listings** | 2dsphere indexed location-based nearby discovery |
| 🌙 | **Dark Mode** | Full dark/light theme support with smooth transitions |
| 🔐 | **Dual Auth** | Google OAuth 2.0 + Email/Password with forgot/reset password flow |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│  Next.js 16 App Router  ·  React 19  ·  Tailwind CSS       │
│  Framer Motion  ·  Zustand (State)  ·  Socket.IO Client    │
├─────────────────────────────────────────────────────────────┤
│                       API LAYER                             │
│  Next.js API Routes (REST)  ·  JWT Auth Middleware          │
│  Cloudinary (Image Uploads)  ·  Nodemailer (Email)         │
├─────────────────────────────────────────────────────────────┤
│                     AI / ML LAYER                           │
│  Mistral AI (Chat)  ·  Google Gemini (Price Analysis)      │
│  HuggingFace (Embeddings)  ·  Google Cloud Vision (OCR)    │
├─────────────────────────────────────────────────────────────┤
│                      DATA LAYER                             │
│  MongoDB Atlas  ·  Mongoose ODM  ·  Atlas Vector Search    │
│  2dsphere Geo Index  ·  Text Search Index                  │
├─────────────────────────────────────────────────────────────┤
│                   REAL-TIME LAYER                           │
│  Socket.IO Server (Port 3002)  ·  Chat Rooms               │
│  Typing Indicators  ·  Push Notifications                  │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features Deep Dive

### 🛒 For Buyers

| Feature | Description |
|---|---|
| **AI Marketplace Chatbot** | Ask natural language questions like _"Find me a laptop under ₹30,000"_ — powered by RAG (vector search + Mistral AI) |
| **Price Estimator** | AI-powered fair price check on any listing with historical price trends |
| **Budget Shopping** | AI-curated deals filtered to your budget range |
| **Nearby Listings** | GeoJSON-based location discovery — find items near you |
| **Wishlist / Saved Ads** | Save and track your favourite items |
| **Direct Messaging** | Real-time Socket.IO chat with sellers, with typing indicators |
| **Category Browsing** | Electronics, Vehicles, Property, Fashion, Furniture, Fitness & more |
| **Reviews & Ratings** | Rate sellers after a transaction to build community trust |

### 🏪 For Sellers

| Feature | Description |
|---|---|
| **Seller Console** | Full command centre with Revenue, Leads, Views, and Rating analytics |
| **AI Listing Assistant** | Upload a photo → Google Vision auto-generates title & description |
| **Post Listings** | Rich listing creation with multi-image upload via Cloudinary |
| **Inventory Management** | Track active, pending, and sold listings with status controls |
| **Group Buy Deals** | Create co-buy listings with target quantities and discounted pricing |
| **Seller Analytics** | Detailed analytics page with performance insights |
| **Inquiry Management** | Manage buyer messages from one unified inbox |

### 🤖 AI-Powered Features

| AI Feature | Model / Service | How It Works |
|---|---|---|
| **Marketplace Chatbot** | Mistral Small + HuggingFace BGE | Vector embeddings → Atlas Vector Search → Mistral generates response |
| **Price Estimator** | Google Gemini | Analyzes market data and provides fair price ranges + history |
| **Image Analysis** | Google Cloud Vision | Extracts labels, text, and context from uploaded product photos |
| **Auto Descriptions** | Google Gemini | Generates compelling listing descriptions from minimal input |
| **AI Negotiation Simulator** | Rule-based (Landing Page) | Interactive demo showcasing the bargaining experience |

### 🔐 Authentication & Security

- **Google OAuth 2.0** — One-click sign in with Google
- **Email & Password** — Traditional credentials with bcrypt hashing
- **JWT Tokens** — Secure HTTP-only cookie-based sessions
- **Password Reset** — Email-based forgot/reset password flow via Nodemailer
- **Role-Based Access** — Buyer, Seller, and Admin roles with route protection

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (97%) |
| **Frontend** | React 19, Tailwind CSS, Framer Motion |
| **State** | Zustand |
| **Database** | MongoDB Atlas + Mongoose ODM |
| **Search** | Atlas Vector Search + Text Index + 2dsphere Geo Index |
| **Real-time** | Socket.IO (dedicated server on port 3002) |
| **Auth** | JWT + bcrypt + Google OAuth 2.0 |
| **AI/ML** | Mistral AI, Google Gemini, HuggingFace Inference, Google Cloud Vision |
| **Image Hosting** | Cloudinary |
| **Email** | Nodemailer |
| **Animations** | Framer Motion |
| **Icons** | React Icons (Feather) + Lucide React |
| **UI Components** | Radix UI Primitives + shadcn/ui |
| **Deployment** | Vercel |

---

## 🗂️ Project Structure

```
bazaari/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Main app routes (protected)
│   │   ├── ads/                  #   Ad listing & detail pages
│   │   ├── budget-shopping/      #   AI budget shopping page
│   │   ├── chats/                #   Chat interface
│   │   ├── create-ad/            #   Create new listing
│   │   ├── dashboard/            #   Buyer & Seller dashboards
│   │   │   ├── buyer/            #     Buyer dashboard
│   │   │   ├── seller/           #     Seller console + analytics
│   │   │   └── products/         #     Product management
│   │   ├── messages/             #   Messaging center
│   │   ├── nearby/               #   Location-based browsing
│   │   ├── price-estimator/      #   AI price estimation tool
│   │   ├── profile/              #   User profile
│   │   └── saved/                #   Wishlist / saved ads
│   ├── (auth)/                   # Auth routes
│   │   ├── login/                #   Login page
│   │   ├── register/             #   Registration page
│   │   ├── forgot-password/      #   Forgot password
│   │   └── reset-password/       #   Reset password
│   ├── api/                      # API route handlers
│   │   ├── ads/                  #   CRUD operations for ads
│   │   ├── ai/                   #   AI endpoints
│   │   │   ├── budget-deals/     #     Budget-aware recommendations
│   │   │   ├── group-buy-pricing/#     Group buy calculations
│   │   │   ├── negotiate/        #     AI negotiation
│   │   │   └── price-history/    #     Price trend analysis
│   │   ├── analyze-image/        #   Google Vision image analysis
│   │   ├── auth/                 #   Auth endpoints (login, register, OAuth)
│   │   ├── chat/                 #   Chat API
│   │   ├── generate-description/ #   AI description generator
│   │   ├── price-estimator/      #   Price estimation API
│   │   ├── reviews/              #   Review system
│   │   └── upload/               #   Cloudinary image upload
│   ├── privacy/                  # Privacy policy
│   ├── terms/                    # Terms of service
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
│
├── components/                   # Reusable React components
│   ├── MarketplaceChatbot.tsx    # AI chatbot widget
│   ├── ads/                     # Ad display components
│   ├── chats/                   # Messaging UI
│   ├── common/                  # Shared components
│   ├── layout/                  # Header, footer, sidebar
│   ├── providers/               # Context providers (auth, theme)
│   └── ui/                      # Base UI elements (shadcn)
│
├── lib/                         # Utility functions & DB connection
├── models/                      # Mongoose schemas
│   ├── Ad.ts                    #   Ad schema (with embeddings, geo, group buy)
│   ├── Chat.ts                  #   Chat schema
│   ├── Message.ts               #   Message schema
│   ├── Review.ts                #   Review schema
│   └── User.ts                  #   User schema (with roles, ratings)
│
├── server/                      # Socket.IO server
│   └── socket.ts                #   Real-time messaging server
│
├── services/                    # Service layer
│   ├── ai.service.ts            #   AI/ML service (embeddings, vector search, chat)
│   └── api.ts                   #   API client
│
├── store/                       # Global state management
│   └── userStore.ts             #   Zustand user store
│
├── types/                       # TypeScript type definitions
├── next.config.ts               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **MongoDB Atlas** cluster with Vector Search index
- **Google Cloud** project (OAuth + Vision API)
- **Cloudinary** account (image uploads)

### Installation

```bash
# Clone the repository
git clone https://github.com/mittal987-alt/bazaar.git
cd bazaar

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# ─── Database ───
MONGO_URI=your_mongodb_atlas_connection_string

# ─── Authentication ───
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# ─── AI Services ───
MISTRAL_API_KEY=your_mistral_ai_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
GEMINI_API_KEY=your_google_gemini_api_key

# ─── Google Cloud Vision ───
GOOGLE_CLOUD_VISION_KEY=your_google_cloud_vision_key

# ─── Image Upload ───
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# ─── Email (Password Reset) ───
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ─── App ───
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3002
```

### Running Locally

```bash
# Terminal 1: Start the Next.js dev server
npm run dev

# Terminal 2: Start the Socket.IO server (real-time chat)
npm run socket
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### MongoDB Atlas Setup

1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database named `bazzari`
3. Set up a **Vector Search Index** named `default` on the `ads` collection for the `embedding` field (768 dimensions)
4. The app auto-creates **2dsphere** and **text** indexes on first run

---

## 📦 Deployment

This project is deployed on **Vercel** with automatic deployments on every push to `main`.

| Service | Platform |
|---|---|
| Web App | [Vercel](https://vercel.com) |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) |
| Images | [Cloudinary](https://cloudinary.com) |
| Socket Server | Self-hosted / Railway |

> **Live URL:** [bazari-plum.vercel.app](https://bazari-plum.vercel.app)

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run socket` | Start Socket.IO real-time server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

This is a personal project, but feedback, suggestions, and contributions are welcome! Feel free to:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is private. All rights reserved © 2025 [mittal987-alt](https://github.com/mittal987-alt).

---

<div align="center">

**Built with ❤️ in India**

[Live Demo](https://bazari-plum.vercel.app) · [Report Bug](https://github.com/mittal987-alt/bazaar/issues) · [Request Feature](https://github.com/mittal987-alt/bazaar/issues)

</div>
