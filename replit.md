# BiteRank - Food Review Platform

## Overview

BiteRank is a personalized food review and discovery platform that allows users to track and categorize restaurants with a simple three-tier rating system: "I like it", "It's alright", and "I didn't like it". The application features a modern React frontend with a Node.js/Express backend and PostgreSQL database using Drizzle ORM for data management.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI components with Tailwind CSS styling (shadcn/ui)
- **Build Tool**: Vite for development and production builds
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based auth with bcrypt password hashing
- **File Structure**: Monorepo with shared schema types

### Database Design
The application uses PostgreSQL with three main tables:
- **users**: User authentication and profile data
- **restaurants**: Restaurant information with external ratings
- **reviews**: User reviews with ratings, notes, and metadata

## Key Components

### Authentication System
- Session-based authentication using express-session
- Password hashing with bcrypt
- Middleware for protected routes
- User registration and login endpoints

### Review System
- Three-tier rating system: "like", "alright", "dislike"
- Numeric scoring mapped to rating brackets (10-6.7, 6.6-3.4, 3.3-0)
- Optional metadata: favorite dishes, photos, notes, labels
- Restaurant auto-creation when adding reviews

### Data Management
- Drizzle ORM for type-safe database operations
- Zod schemas for runtime validation
- Shared types between frontend and backend
- PostgreSQL database with UUID primary keys

### UI/UX Features
- Responsive design with Tailwind CSS
- Dashboard with statistics cards
- Filtering and search functionality
- Modal-based review creation
- Toast notifications for user feedback

## Data Flow

1. **User Authentication**: Users register/login through form submission, creating secure sessions
2. **Review Creation**: Users submit restaurant reviews through a modal form
3. **Data Validation**: Both client and server validate data using Zod schemas
4. **Database Operations**: Drizzle ORM handles type-safe database queries
5. **State Management**: TanStack Query manages server state and caching
6. **UI Updates**: Real-time updates through query invalidation

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon database
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **react-hook-form**: Form state management
- **bcrypt**: Password hashing
- **express-session**: Session management

### UI Dependencies
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **wouter**: Minimal routing library

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **drizzle-kit**: Database migration tool

## Deployment Strategy

### Development
- Replit environment with Node.js 20
- PostgreSQL 16 database module
- Vite dev server for frontend hot reloading
- Express server with TypeScript execution via tsx

### Production Build
- Vite builds optimized React bundle
- esbuild bundles server code for Node.js
- Static assets served from Express
- Database migrations via Drizzle Kit

### Environment Configuration
- Database connection via DATABASE_URL environment variable
- Session secret for authentication security
- Replit-specific optimizations for development

## Changelog

- June 13, 2025. Initial setup
- June 13, 2025. Added cuisine selection and filtering:
  - Added cuisine field to restaurant creation and review modal
  - Implemented flexible text-based cuisine filtering (replaces preset dropdown)
  - Enhanced tag search functionality to search both labels and notes
  - Added cuisine display on restaurant cards
  - Updated backend storage to handle cuisine and tag filtering

## User Preferences

Preferred communication style: Simple, everyday language.