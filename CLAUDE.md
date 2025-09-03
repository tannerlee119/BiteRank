# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BiteRank is a restaurant review and recommendation platform built with React + Express, using Drizzle ORM with PostgreSQL and a comprehensive Radix UI component library. The app supports user authentication, restaurant reviews with ratings, bookmarks, and analytics features.

## Project Structure

```
├── client/                     # React frontend
│   ├── src/
│   │   ├── components/        # Custom React components
│   │   │   ├── ui/           # Radix UI components with custom styling
│   │   │   └── *.tsx         # App-specific components
│   │   ├── pages/            # Page components using wouter routing
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utilities and configurations
├── server/                    # Express backend
│   ├── routes.ts            # API route definitions
│   ├── db.ts               # Database connection setup
│   └── services/           # External API integrations
├── shared/                   # Shared types and schemas
│   └── schema.ts           # Drizzle database schema and Zod validation
└── migrations/              # Database migration files
```

## Development Commands

- **Start development server**: `npm run dev` (starts both frontend and backend)
- **Build for production**: `npm run build` (builds client with Vite, bundles server with esbuild)
- **Start production server**: `npm run start`
- **Type checking**: `npm run check` (TypeScript compilation check)
- **Database operations**: `npm run db:push` (push schema changes to database)

## Architecture

### Frontend (Client)
- **Framework**: React 18 with TypeScript
- **Routing**: wouter for client-side routing
- **Styling**: Tailwind CSS with custom component library based on Radix UI
- **State Management**: TanStack React Query for server state, custom hooks for local state
- **Authentication**: Session-based auth using custom `useAuth` hook
- **Build Tool**: Vite with path aliases (`@/` for client src, `@shared/` for shared types)

### Backend (Server)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL via Neon with connection pooling
- **ORM**: Drizzle ORM with schema-first approach
- **Validation**: Zod schemas derived from Drizzle tables
- **Authentication**: Passport.js with local and Google OAuth strategies
- **Session Management**: express-session with PostgreSQL store
- **Development**: tsx for TypeScript execution, esbuild for production bundling

### Database Schema
- **Users**: Authentication and profile data
- **Restaurants**: Restaurant information with external ratings
- **Reviews**: User reviews with like/alright/dislike system and 0-10 scores
- **Bookmarks**: Saved restaurants with external source data

### Key Features
- User registration and authentication (local + Google OAuth)
- Restaurant search and reviews with photo uploads
- Three-tier rating system (like/alright/dislike) plus numerical scores
- Bookmark system for saving restaurants
- Analytics dashboard with review statistics
- Maps integration for restaurant locations
- Achievement system for user engagement

## Technology Stack

### Core Dependencies
- **React ecosystem**: React, React DOM, React Hook Form, React Query
- **UI Framework**: Extensive Radix UI component set with Tailwind styling
- **Backend**: Express, Passport, bcrypt for auth
- **Database**: Drizzle ORM, @neondatabase/serverless, postgres
- **Validation**: Zod for runtime type checking
- **Utilities**: date-fns, axios, lucide-react icons

### Development Tools
- **TypeScript**: Strict typing throughout
- **Vite**: Fast development and optimized builds
- **ESBuild**: Server bundling for production
- **Drizzle Kit**: Database migrations and schema management

## Code Conventions

### From Cursor Rules
- Use TypeScript with strict typing, avoid `any`
- Functional components with hooks over class components
- PascalCase for components, camelCase for functions/variables
- Use Zod schemas for validation and type inference
- Implement proper error handling with early returns
- Use Tailwind classes exclusively for styling
- Follow Radix UI patterns for accessible components
- Use TanStack React Query for server state management

### Authentication Flow
- Server-side sessions using express-session
- Client-side auth state managed by `useAuth` hook
- Protected routes handled in component-level guards
- Google OAuth integration for social login

### Database Operations
- Use Drizzle ORM query builder
- Zod schemas for input validation derived from database schema
- Prepared statements for query optimization
- Proper foreign key relationships with cascade deletes

## File Organization

### Adding New Features
- **Components**: Create in `client/src/components/` with proper TypeScript props
- **Pages**: Add to `client/src/pages/` following wouter routing patterns
- **API Routes**: Extend `server/routes.ts` with proper validation
- **Database**: Update `shared/schema.ts` and run migrations
- **Types**: Export shared types from `shared/schema.ts`

### UI Components
- Use existing Radix UI components from `client/src/components/ui/`
- Follow established patterns for form handling and validation
- Implement proper loading states and error handling
- Ensure mobile responsiveness with Tailwind utilities

## Configuration

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (required)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth secret
- `SESSION_SECRET`: Express session secret

### Development Setup
1. Install dependencies: `npm install`
2. Set up database and environment variables
3. Run initial migration: `npm run db:push`
4. Start development: `npm run dev`

## Testing and Quality

- Type safety enforced through TypeScript compilation
- Runtime validation via Zod schemas
- Error boundaries and proper error handling
- Responsive design tested across screen sizes
- Database constraints ensure data integrity

## Deployment Notes

- Single-port application (port 5000) serving both frontend and API
- Production build separates client assets and server bundle
- Database migrations managed through Drizzle Kit
- Environment-specific configuration through NODE_ENV