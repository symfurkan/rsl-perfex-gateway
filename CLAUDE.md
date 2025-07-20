# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Perfex CRM Gateway project that provides an API proxy for Perfex CRM systems that lack native API functionality. The system uses web crawling and session management to provide a REST API interface for task management and time tracking.

**Current Status**: Planning/Architecture phase - no code implementation yet. Only documentation and architecture plans exist.

## Linear Project Information

- **Team**: rslfrkndmrky
- **Project**: rsl-perfex-gateway

## Technology Stack (Planned)

### Backend
- **Framework**: Fastify (Node.js)
- **Language**: TypeScript with ES Modules
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod schemas
- **Authentication**: JWT + Cookie-based sessions
- **Build**: TypeScript compiler (tsc)

### Frontend  
- **Framework**: React + Vite (SPA)
- **Language**: TypeScript with ES Modules
- **UI Library**: shadcn/ui (required)
- **Rich Editor**: platejs for markdown/rich text
- **State Management**: Zustand
- **Forms**: react-hook-form + Zod validation
- **HTTP Client**: Native fetch API
- **Routing**: react-router-dom

### Infrastructure
- **Architecture**: Monorepo with npm workspaces
- **Package Manager**: npm
- **Database**: Local MongoDB instance
- **Deployment**: Custom VPS

## Development Commands

**Note**: No package.json or build configuration exists yet. Based on the architecture plan, these commands will be available once implemented:

```bash
# Project setup (when implemented)
npm install                    # Install dependencies
npm run build                  # Build both frontend and backend
npm run dev                    # Start development servers
npm run test                   # Run test suites
npm run lint                   # Lint code
npm run typecheck             # TypeScript type checking

# Backend specific
npm run dev:backend           # Start backend development server
npm run build:backend         # Build backend only

# Frontend specific  
npm run dev:frontend          # Start frontend development server
npm run build:frontend        # Build frontend only
```

## Project Architecture

### Planned Directory Structure
```
/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic (auth, perfex, sync)
│   │   ├── models/          # MongoDB/Mongoose models
│   │   ├── middleware/      # Auth and validation middleware
│   │   ├── routes/          # API route definitions
│   │   ├── utils/           # Utilities (perfex-client, encryption)
│   │   └── app.ts          # Fastify app setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages (Login, Dashboard, Tasks, Profile)
│   │   ├── modules/        # Dynamic module system with manifests
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand state stores
│   │   ├── utils/          # Frontend utilities
│   │   └── App.tsx
│   ├── package.json
│   └── tsconfig.json
└── docs/                   # Architecture and planning documents
```

### Core Data Models

**Users**: Authentication with encrypted Perfex credentials
**PerfexSessions**: Managed session cookies for Perfex integration  
**LocalTasks**: Cached task data with sync capabilities
**TimeEntries**: Local time tracking with Perfex synchronization

### API Integration Strategy

The system integrates with Perfex CRM via web crawling:
- **Authentication**: POST to `/admin/authentication` with credentials
- **Task Management**: DataTables API at `/admin/tasks/table`
- **Timer Operations**: `/admin/tasks/timer_tracking` for start/stop

### Security Approach

- **Perfex Credentials**: AES-256-GCM encryption with user-specific keys
- **Sessions**: JWT access tokens (15 min) + refresh tokens (7 days)
- **Perfex Integration**: Auto-renewal and retry mechanisms for session management

### Module System

Dynamic frontend module system with:
- Module manifests for component registration
- Dashboard widget slots
- Lazy loading capabilities
- Hot-swappable components

## Key Implementation Notes

1. **Session Management**: Critical to handle Perfex session expiration and auto-renewal
2. **Error Handling**: Network failures require robust retry mechanisms with user feedback
3. **Encryption**: User Perfex credentials must be encrypted with individual keys
4. **Real-time Sync**: Timer operations should sync immediately to Perfex
5. **UI Requirements**: Must use shadcn/ui components exclusively for UI

## Development Priorities

1. Set up monorepo structure with npm workspaces
2. Implement core backend services (auth, perfex client, encryption)
3. Build React frontend with shadcn/ui integration
4. Develop Perfex integration and session management
5. Create dynamic module system for dashboard widgets

## Important Files

- `/docs/mvp-architecture-plan.md` - Complete technical architecture and implementation plan
- `/README.md` - Basic project description in Turkish
- `.gitignore` - Comprehensive Node.js/TypeScript ignore patterns

## Session Reports

Claude Code checks `docs/session-reports/` directory at session start for the latest updates. Session reports follow the naming convention: `session-SESSION_NAME-report.md`. This ensures awareness of recent developments and changes made in previous sessions.