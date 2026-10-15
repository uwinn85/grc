# NFC Tap Smart Portal (Google Review & Table Hub)

A modern, high-performance web platform built with React, TypeScript, Tailwind CSS, and Supabase designed for physical NFC tags / QR stands used in F&B venues, cafes, restaurants, and retail spaces.

---

## Key Features

### 1. Dual Mode System
- **DIRECT_REVIEW**: Instant redirect to Google Maps write-review page or specific review URL for quick rating gathering.
- **TABLE_HUB**: Interactive guest landing page for dining tables featuring brand aesthetics, quick actions, and hospitality utilities.

### 2. Table Hub Guest Experience
- **Interactive Call-to-Actions:**
  - **Google Maps Review**: Direct link to write a review with auto-rating encouragement.
  - **View Menu (2 Opsi)**: Supports both direct PDF Menu document upload and external web/drive URLs.
  - **One-Tap Wi-Fi Connection**: Instant clipboard copy of the Wi-Fi password + auto-generated native Wi-Fi QR Code for camera scanning on Android & iOS.
  - **Anonymous Guest Feedback**: In-app private comment box and 5-star rating delivered straight to the merchant's CMS inbox.
  - **Loyalty & Rewards**: Link to rewards program or promo pages.
  - **Mini Games / Sudoku**: Keep waiting guests entertained at the table.
- **Social Media Bar**: Quick links for Instagram, YouTube, TikTok, and WhatsApp.

### 3. Merchant CMS & Admin Dashboard
- **Tag Activation Wizard**: First-time tap setup with secure 6-digit PIN.
- **Live Mobile Preview**: Real-time mockup showing exact look and feel of the table hub.
- **Integrated Image Compressor**: Zero-dependency browser-side WebP compressor that reduces uploaded avatars and banners down to small KBs before uploading to Supabase Storage.
- **Google Maps Live Search**: Dynamic search to pick places directly from Maps or paste any custom share link.
- **Private Feedback Inbox**: View and manage customer ratings & comments sent from each table.

---

## Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Frontend Framework**: React 19 + TypeScript
- **Bundler & Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Tailwind CSS + Lucide Icons + Radix UI Primitives
- **Database & Storage**: [Supabase](https://supabase.com/) (PostgreSQL with RLS, RPC functions, and Storage Buckets)

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/yogaprasetya22/nfc-google-review.git
cd nfc-google-review
bun install
```

### 2. Environment Setup

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Setup Supabase Database & Storage

Run the SQL script found in `supabase_schema.sql` inside your Supabase SQL Editor:
- Creates `nfc_tags` table with JSONB `hub_config`
- Sets up Row Level Security (RLS) policies
- Configures Storage bucket policies for `nfc` bucket (avatars, covers, PDF menus)

### 4. Run Development Server

```bash
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── admin/          # Admin tag tables & analytics
│   │   ├── hub/            # Table Hub portal, editor & live preview
│   │   └── ui/             # Radix & Tailwind design components
│   ├── lib/
│   │   ├── imageCompressor.ts # Client-side WebP image compressor
│   │   ├── supabase.ts     # Supabase client initialization
│   │   └── utils.ts        # Helper functions & Maps URL parsers
│   ├── pages/
│   │   ├── AdminDashboard.tsx # Global tag oversight
│   │   ├── ManageTag.tsx      # Merchant CMS for configuring tag
│   │   └── PublicHandler.tsx  # Dynamic route for NFC/QR scans (/t/:tagId)
│   ├── types/
│   │   └── nfc.ts          # Core data models and hub configs
│   ├── App.tsx             # Route declarations
│   └── main.tsx            # Entry point
├── supabase_schema.sql     # Database schema & migration
└── vite.config.ts          # Vite build config
```

---

## Security & Privacy
- Sensitive credentials (`.env`) are strictly excluded via `.gitignore`.
- Password changes and hub configuration updates are protected via database RPC PIN verification.

---

## License
MIT License. Created by [Yoga Prasetya](https://github.com/yogaprasetya22).
