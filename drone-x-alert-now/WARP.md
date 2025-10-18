# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

DroneX is an AI-powered disaster response platform that combines live drone feeds, real-time object detection, and intelligent emergency response coordination. The system includes user authentication, admin panels, rescue team coordination, and an AI assistant for emergency situations.

## Tech Stack Architecture

**Frontend (React/TypeScript/Vite)**
- React 18 with TypeScript for type safety
- Vite for fast development and building
- shadcn/ui components for consistent UI design
- Tailwind CSS for styling
- React Router for client-side routing
- TanStack Query for data fetching and caching

**Backend Services**
- Express.js proxy server (`/server`) for API routing
- Supabase for authentication, database, and real-time features
- Google Maps integration for GPS tracking
- TensorFlow.js with COCO-SSD for AI object detection

**Key Integrations**
- Google Maps API for location services
- Gemini AI for the assistant functionality
- Supabase for user management and real-time data

## Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Server Development
```bash
# Navigate to server directory
cd server

# Install server dependencies
npm install

# Start backend server (runs on port 4000)
npm start
```

## Application Architecture

### User Role System
The application has three primary user types:
1. **Regular Users** - Can create profiles, view live feeds, set emergency contacts
2. **Admin Users** - Full system control, stream management, user oversight
3. **Rescue Teams** - Specialized emergency response interface

### Core Page Structure
- `/` - Landing page with feature overview
- `/auth` - User authentication (sign in/up)
- `/admin-auth` - Admin-specific authentication
- `/rescue-team-auth` - Rescue team authentication
- `/dashboard` - Main user dashboard with live feeds, GPS, profile management
- `/admin` - Admin control center for system management
- `/rescue-team` - Rescue team coordination interface
- `/ai-assistant` - AI-powered emergency assistant
- `/mobile-stream` - Mobile device streaming interface

### Key Components Architecture

**Real-time Features**
- `RealtimeDroneStream` - Live video feed with AI detection
- `LiveMap`/`GoogleMap` - GPS tracking and location services
- `EmergencyGroupChat` - Real-time communication system

**Admin Components**
- `AdminStreamControls` - Stream management interface
- `EmergencyRequestsAdmin` - Emergency request handling
- `UserManagement` - User administration

**User Management**
- `ProfileForm` - User profile configuration
- `EmergencyContacts` - Emergency contact management
- `LocationSharing` - GPS location broadcasting

## Environment Configuration

The application uses environment variables for configuration:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project identifier

## Database Schema Considerations

The application uses Supabase with these key table patterns:
- User authentication through Supabase Auth
- `user_roles` table for role-based access control
- Real-time subscriptions for live updates

## Build and Deployment

**Production Build Process**
- Uses Vite for optimized bundling
- TypeScript compilation with strict settings disabled for rapid development
- Configured for Vercel deployment with SPA routing

**Development Setup**
- Hot module replacement via Vite
- ESLint configuration with React-specific rules
- Component tagging for development debugging (lovable-tagger)

## Code Patterns

**State Management**
- React hooks for local state
- TanStack Query for server state
- Supabase real-time subscriptions for live data

**Component Organization**
- Page components in `/pages`
- Reusable components in `/components`
- UI primitives from shadcn/ui in `/components/ui`

**Authentication Flow**
- Supabase Auth with role-based routing
- Protected routes with authentication checks
- Role verification for admin/rescue team access

## Testing and Quality

**Linting Configuration**
- ESLint with TypeScript support
- React hooks and refresh plugins
- Unused variables checking disabled for development speed

**TypeScript Settings**
- Relaxed TypeScript configuration for rapid prototyping
- Path aliases configured (`@/*` maps to `./src/*`)
- Skip lib checking for faster compilation