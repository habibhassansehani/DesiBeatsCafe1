# Desi Beats Café - POS System

## Overview

A full-featured Point of Sale (POS) system built for Desi Beats Café, a Pakistani restaurant serving 800+ food and beverage items. The system handles dine-in and takeaway orders, table management, kitchen display, order tracking, payment processing, and analytics. Built with a modern MERN-inspired stack (MongoDB, Express, React, Node.js) designed for fast-paced restaurant operations with touch-optimized interfaces.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast hot module replacement
- **Wouter** for lightweight client-side routing instead of React Router
- **TanStack Query (React Query)** for server state management, caching, and data synchronization

**UI Component System**
- **shadcn/ui** component library based on Radix UI primitives (New York style variant)
- **Tailwind CSS** for utility-first styling with custom design tokens
- Custom theme system supporting light/dark modes stored in localStorage
- Touch-optimized POS interface design following the guidelines in `design_guidelines.md`

**State Management Strategy**
- Server state managed via TanStack Query with automatic refetching (5-30 second intervals for real-time updates)
- Authentication state managed via React Context (`AuthProvider`) with localStorage persistence
- Local UI state managed with React hooks
- No global state management library (Redux/Zustand) - keeping it simple with context and query cache

**Key Design Decisions**
- Chose shadcn/ui over Material-UI or Ant Design for better customization and smaller bundle size
- TanStack Query eliminates need for Redux by handling async state, caching, and background updates
- Wouter chosen over React Router for minimal bundle size (1.3KB vs 40KB+)
- Component-first architecture with co-located logic for maintainability

### Backend Architecture

**Runtime & Framework**
- **Node.js** with **Express.js** REST API server
- **TypeScript** throughout with ES modules (type: "module" in package.json)
- **tsx** for development execution and **esbuild** for production bundling

**API Design Pattern**
- RESTful API with resource-based endpoints under `/api/*`
- JWT-based authentication using `jsonwebtoken` library
- Bearer token authentication via Authorization headers
- Role-based access control (RBAC) with 4 roles: admin, cashier, waiter, kitchen

**Authentication & Authorization**
- Password hashing with **bcryptjs** (10 rounds)
- JWT tokens stored in client-side localStorage (not HTTP-only cookies)
- Auth middleware validates tokens on protected routes
- Admin-only middleware for management endpoints
- Default admin account created on first run (username: admin, password: admin)

**Key API Endpoints Structure**
- `/api/auth/*` - Login, user management
- `/api/products/*` - Product CRUD operations
- `/api/categories/*` - Category management
- `/api/tables/*` - Table status and management
- `/api/orders/*` - Order creation, updates, status tracking
- `/api/dashboard/stats` - Analytics and reporting
- `/api/settings/*` - System configuration

**Build Strategy**
- Development: Direct TypeScript execution via tsx with Vite dev server
- Production: esbuild bundles server to single CJS file, Vite builds client to static assets
- Server dependencies selectively bundled (allowlist in `script/build.ts`) to reduce cold start syscalls
- Static file serving from `dist/public` directory

### Data Storage

**Database System**
- **MongoDB** as the primary database via Mongoose ODM
- Connection string via `MONGO_URI` environment variable
- Cloud-ready (designed for MongoDB Atlas deployment)

**Schema Design**
- **Users**: Authentication, roles, active status
- **Categories**: Product categorization with sort ordering
- **Products**: Items with pricing, variants (Small/Medium/Large), tax flags, availability toggles
- **Tables**: Capacity, status (available/occupied/billed)
- **Orders**: Line items, payment records, status tracking (preparing/served/completed/cancelled), order numbers, timestamps
- **Settings**: System-wide configuration (cafe name, tax rate, currency, receipt footer)

**Data Modeling Decisions**
- MongoDB ObjectId as primary keys (stored as strings in schemas for easier JSON serialization)
- Denormalized order items (product data embedded) to preserve order history even if products change
- Auto-incrementing order numbers via separate counter collection
- Soft deletes via `isActive` flags for users/categories/products
- Embedded payment array in orders for split payment support

**Schema Validation**
- **Zod** schemas defined in `shared/schema.ts` for runtime validation
- Shared between client and server for consistent type safety
- Mongoose schemas in `server/models.ts` for database validation
- TypeScript interfaces derived from Zod schemas

### External Dependencies

**Third-Party UI Libraries**
- **Radix UI** primitives (@radix-ui/*) - Accessible, unstyled component foundations
- **Recharts** - Dashboard charts and analytics visualizations
- **lucide-react** - Icon system
- **class-variance-authority** - Type-safe variant styling for components
- **tailwind-merge** & **clsx** - Utility for conditional CSS class composition

**Development Tools**
- **Drizzle Kit** - Database migration toolkit (configured but not actively used; kept for potential future use)
- **@replit/* plugins** - Development banner, error overlay, and source mapping for Replit environment
- **postcss** with autoprefixer for CSS processing

**Database & Backend Libraries**
- **mongoose** - MongoDB ODM
- **@neondatabase/serverless** - Listed in dependencies but MongoDB is the active database (Neon was likely considered initially)
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token generation and validation
- **date-fns** - Date/time manipulation and formatting

**Runtime Configuration**
- Environment variables: `MONGO_URI`, `JWT_SECRET`, `NODE_ENV`, `DATABASE_URL` (for Drizzle, unused)
- Default to development mode unless explicitly set to production
- Auto-initialization of default admin user and settings on first database connection

**Notable Architecture Decisions**
- Serverless-ready design (stateless API, connection pooling friendly)
- No session store (stateless JWT authentication)
- Manual server bundling strategy to optimize cold starts
- Path aliases configured for clean imports (@/, @shared/, @assets/)
- Strict TypeScript configuration with ES modules throughout