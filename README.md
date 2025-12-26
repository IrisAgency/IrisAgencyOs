# IRIS Agency OS

IRIS Agency OS is a comprehensive operating system designed for creative agencies to streamline operations, manage clients, orchestrate production workflows, and handle financial tracking. It serves as a centralized hub for the entire agency lifecycle, from lead management to project delivery and invoicing.

## 🚀 Features

The platform is divided into functional "Hubs", each serving a specific operational domain:

### 🏢 Core Operations
- **Dashboard**: High-level overview of agency performance, urgent tasks, and upcoming deadlines.
- **Clients Hub**: Complete CRM for managing client profiles, brand assets, meeting notes, and marketing strategies.
- **Projects Hub**: End-to-end project management with milestone tracking, team assignment, and file management.
- **Tasks Hub**: Kanban-style task board with advanced filtering, time tracking, dependencies, and approval workflows.
- **Files Hub**: Centralized digital asset management with folder hierarchies and project associations.

### 🎬 Production & Creative
- **Production Hub**: Specialized tools for video/photo production, including shot lists, call sheets, location scouting, and equipment inventory.
- **Posting Hub**: Social media content planning and scheduling.
- **AI Assistant**: Integrated Gemini-powered assistant for creative ideation and content generation.

### 💰 Finance & HR
- **Finance Hub**: Management of invoices, quotations, payments, and expense tracking.
- **Vendors Hub**: Registry for freelancers and vendors, including service orders and assignments.
- **Team Hub**: HR management system for employee profiles, leave requests, and attendance tracking.

### ⚙️ Administration
- **Admin Hub**: System-wide settings, role-based access control (RBAC) configuration, and audit logs.
- **Notifications**: Real-time system notifications with user-configurable preferences.

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) with Workbox
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)

### Backend & Services
- **Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) (NoSQL)
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)
- **AI**: [Google Gemini API](https://ai.google.dev/) (`@google/genai`)

## 🏗 Architecture & Business Logic

### Data Flow
The application uses a real-time data architecture.
- **Firestore Listeners**: Custom hooks (`useFirestoreCollection`) subscribe to Firestore collections, ensuring the UI is always in sync with the database.
- **Optimistic Updates**: The UI reflects changes immediately while persisting them to the backend.

### Role-Based Access Control (RBAC)
Security and visibility are governed by a robust RBAC system.
- **Roles**: Defined in `types.ts` (e.g., General Manager, Creative Director, Account Manager, Client).
- **Permissions**: Granular permissions (e.g., `finance.view`, `projects.edit`) are assigned to roles.
- **Enforcement**:
  - **UI Level**: The `Sidebar` and Hubs conditionally render based on the current user's permissions via `useAuth().checkPermission()`.
  - **Data Level**: Firestore Security Rules (`firestore.rules`) enforce access policies at the database level.

### Project Structure
```
/
├── components/         # UI Components and Hubs
│   ├── dashboard/      # Dashboard specific widgets
│   ├── ...             # Feature-specific components (AdminHub, FinanceHub, etc.)
├── contexts/           # React Contexts (AuthContext)
├── hooks/              # Custom Hooks (useFirestore, useDashboardData)
├── lib/                # Service configurations (firebase.ts)
├── services/           # External API services (geminiService.ts)
├── types/              # TypeScript definitions
├── utils/              # Helper functions
├── App.tsx             # Main application layout and routing logic
├── constants.ts        # System constants and default data
└── firestore.rules     # Database security rules
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd iris-agency-os
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory with your Firebase and Gemini credentials:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📱 Progressive Web App (PWA)

IRIS Agency OS is a fully installable Progressive Web App, providing a native app-like experience on mobile and desktop devices.

### Features
- **Offline Support**: Service worker caches assets for offline functionality
- **Install Prompt**: Smart install banner appears on supported mobile browsers
- **App Icons**: Custom app icons for home screen installation
- **Standalone Mode**: Runs in standalone mode without browser UI
- **Auto Updates**: Automatically updates when new versions are deployed

### Installation
When you visit the app on a mobile browser (Chrome, Safari, Edge), you'll see a prompt to install the app. On desktop browsers, look for the install icon in the address bar.

Alternatively, you can manually install:
- **iOS Safari**: Tap the share button → "Add to Home Screen"
- **Android Chrome**: Tap the menu → "Install app" or "Add to Home Screen"
- **Desktop**: Click the install icon in the address bar

### Service Worker
The app uses Workbox for intelligent caching:
- Static assets are precached for instant loading
- Google Fonts are cached for offline use
- CDN resources use stale-while-revalidate strategy

## 📄 License

[MIT](LICENSE)
