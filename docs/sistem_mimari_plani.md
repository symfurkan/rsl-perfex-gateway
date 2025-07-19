# rsl-perfex-gateway MVP Mimari Planı

## 🎯 Proje Özeti

Perfex CRM API eksikliği nedeniyle web crawling tabanlı proxy API + UI çözümü. Kullanıcılar Perfex credentials'larını bir kez kaydeder, sistem otomatik login yapıp task management sağlar.

## 🏗️ Teknoloji Yığını

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: MongoDB + Mongoose ODM
- **Language**: TypeScript + ES Modules
- **Validation**: Zod
- **Authentication**: JWT + Cookie-based session
- **Build**: TypeScript compiler (tsc)

### Frontend
- **Framework**: React + Vite (SPA)
- **Language**: TypeScript + ES Modules
- **UI Kit**: shadcn/ui (zorunlu)
- **Editor**: platejs (markdown + rich editor)
- **State**: Zustand
- **Forms**: react-hook-form + zod
- **HTTP**: Native fetch API
- **Router**: react-router-dom

### Infrastructure
- **Monorepo**: npm workspaces
- **Database**: Local MongoDB
- **Deployment**: Özel VPS
- **Package Manager**: npm

## 🔄 Perfex Integration Endpoints

### Authentication
- **Login**: `POST /admin/authentication`
  - Form data: `email`, `password`
  - Response: `sp_session` cookie
  - Error: 200 + login form (başarısız login)

### Task Operations
- **Task List**: `POST /admin/tasks/table`
  - DataTables format request
  - Response: JSON with `aaData` array
  
- **Timer Start**: `POST /admin/tasks/timer_tracking?single_task=true`
  - Form data: `task_id=3949`
  - Response: JSON with timer_id + HTML
  
- **Timer Stop**: `POST /admin/tasks/timer_tracking?single_task=true`
  - Form data: `task_id=3949&timer_id=21635&notes=markdown_text`
  - Response: Completed timesheet

## 🗄️ Database Schema

### Users
```typescript
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string; // bcrypt
  perfexCredentials: {
    email: string;
    password: string; // AES encrypted
    encryptionKey: string; // user-specific
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### PerfexSessions
```typescript
interface PerfexSession {
  _id: ObjectId;
  userId: ObjectId;
  sessionCookie: string; // sp_session value
  expiresAt: Date;
  lastUsed: Date;
  isActive: boolean;
}
```

### LocalTasks (cache + offline support)
```typescript
interface LocalTask {
  _id: ObjectId;
  userId: ObjectId;
  perfexTaskId: string;
  title: string;
  status: string;
  priority: string;
  assignees: string[];
  startDate: Date;
  dueDate: Date;
  lastSynced: Date;
}
```

### TimeEntries (local tracking)
```typescript
interface TimeEntry {
  _id: ObjectId;
  userId: ObjectId;
  taskId: string; // perfex task id
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  notes?: string; // markdown
  syncedToPerfex: boolean;
  perfexTimerId?: string;
}
```

## 🏛️ Backend Mimari

### Klasör Yapısı
```
backend/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── perfex.controller.ts
│   │   └── tasks.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── perfex.service.ts
│   │   ├── encryption.service.ts
│   │   └── sync.service.ts
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── PerfexSession.model.ts
│   │   ├── LocalTask.model.ts
│   │   └── TimeEntry.model.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── tasks.routes.ts
│   │   └── profile.routes.ts
│   ├── utils/
│   │   ├── perfex-client.ts
│   │   └── encryption.util.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

### API Endpoints
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me

POST /api/perfex/credentials
GET  /api/tasks
POST /api/tasks/:id/start
POST /api/tasks/:id/stop
PUT  /api/tasks/:id/sync

GET  /api/profile
PUT  /api/profile
```

## 🎨 Frontend Mimari

### Klasör Yapısı
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Tasks.tsx
│   │   └── Profile.tsx
│   ├── modules/
│   │   ├── task-tracker/
│   │   │   ├── module.manifest.js
│   │   │   ├── TaskTracker.tsx
│   │   │   └── components/
│   │   └── perfex-status/
│   │       ├── module.manifest.js
│   │       └── StatusWidget.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── editor/ (platejs setup)
│   │   ├── layout/
│   │   └── common/
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   └── useTimer.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── taskStore.ts
│   │   └── timerStore.ts
│   ├── utils/
│   │   ├── api.ts
│   │   ├── validation.ts
│   │   └── helpers.ts
│   └── App.tsx
├── package.json
└── tsconfig.json
```

### Dynamic Module System
```javascript
// modules/task-tracker/module.manifest.js
export default {
  name: 'task-tracker',
  version: '1.0.0',
  components: {
    TaskTimer: () => import('./TaskTimer.tsx'),
    PomodoroWidget: () => import('./PomodoroWidget.tsx')
  },
  dashboard: {
    widgets: ['TaskTimer', 'PomodoroWidget']
  }
};
```

## 🔐 Authentication & Security

### JWT Strategy
- **Access Token**: 15 dakika (memory)
- **Refresh Token**: 7 gün (httpOnly cookie)
- **Perfex Session**: Auto-refresh mekanizması

### Encryption
- **Perfex Credentials**: AES-256-GCM
- **User-specific keys**: Kullanıcı registration'da generate
- **Salt**: bcrypt for password hashing

### Session Management
- Perfex session auto-renewal
- Network hatası durumunda retry + kullanıcı bilgilendirme
- Session expire'da otomatik re-login

## ⚡ Core Features (MVP 1.0)

### 1. User Management
- [x] Kullanıcı registration/login
- [x] Perfex credentials güvenli saklama
- [x] Profile management
- [x] Auto-login to Perfex

### 2. Task Management
- [x] Task listesi (Perfex'ten çekme)
- [x] Client-side filtering/searching
- [x] Task start/stop timer
- [x] Real-time sync with Perfex
- [x] Worklog entry (markdown support)

### 3. Time Tracking
- [x] Local timer (browser-based)
- [x] Immediate Perfex sync
- [x] Network error handling (retry button)
- [x] Timer state persistence

### 4. Dashboard
- [x] Active tasks overview
- [x] Running timer display
- [x] Dynamic widget system (modules)

## 🔄 Sync Strategy

### Real-time Sync
1. **Task Start**: Immediate Perfex API call
2. **Task Stop**: Worklog + timer stop to Perfex
3. **Network Error**: Local cache + retry mechanism
4. **Session Expire**: Auto re-login + retry

### Error Handling
- Network timeouts → Retry button
- Perfex session expire → Auto re-login
- Invalid credentials → User re-authentication
- API errors → User-friendly messages

## 📱 UI/UX Patterns

### Layout
- Sidebar navigation (tasks, dashboard, profile)
- Main content area
- Active timer widget (always visible)
- Notification system

### Task Management
- Table view with filtering
- Start/stop buttons
- Timer display
- Quick worklog entry
- Status indicators

### Dynamic Modules
- Dashboard widget slots
- Module registration system
- Lazy loading components
- Hot-swappable widgets

## 🚀 Development Roadmap

### Phase 1: Core Backend (Week 1)
- [ ] MongoDB setup + models
- [ ] Fastify app + routes
- [ ] Authentication system
- [ ] Perfex client service
- [ ] Encryption utilities

### Phase 2: Core Frontend (Week 2)
- [ ] Vite + React setup
- [ ] shadcn/ui integration
- [ ] Auth pages + flows
- [ ] Task management UI
- [ ] Timer components

### Phase 3: Integration (Week 3)
- [ ] API integration
- [ ] Timer sync logic
- [ ] Error handling
- [ ] Module system base
- [ ] Profile management

### Phase 4: Polish & Deploy (Week 4)
- [ ] UI improvements
- [ ] Testing & bug fixes
- [ ] VPS deployment setup
- [ ] Production optimizations
- [ ] Documentation

## 🎯 Success Metrics

- ✅ Kullanıcı Perfex'e manual login yapmadan task management yapabiliyor
- ✅ Timer start/stop işlemleri 1 saniye içinde sync oluyor
- ✅ Network kesintilerinde retry mekanizması çalışıyor
- ✅ Worklog girişi markdown formatında destekleniyor
- ✅ Dynamic module sistemi ile widget eklenebiliyor

---

**Not**: Bu plan MVP 1.0 için hazırlanmıştır. Gelecek versiyonlarda raporlama, team management, advanced filtering gibi özellikler eklenebilir.