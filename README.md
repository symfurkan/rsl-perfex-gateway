# RSL Perfex Gateway

Bu proje Perfex CRM uygulamasında API olmaması nedeniyle web crawling tabanlı API proxy çözümü sağlayan bir uygulamadır.

## 🎯 Proje Özeti

Perfex CRM sistemleri için native API eksikliği nedeniyle geliştirilmiş olan bu gateway, web crawling ve session management kullanarak REST API interface sağlar. Kullanıcılar Perfex credentials'larını bir kez kaydeder, sistem otomatik login yapıp task management işlemlerini gerçekleştirir.

## 🏗️ Teknoloji Yığını

### Backend
- **Framework**: Fastify (Node.js)
- **Database**: MongoDB + Mongoose ODM
- **Language**: TypeScript + ES Modules
- **Validation**: Zod
- **Authentication**: JWT + Cookie-based session

### Frontend
- **Framework**: React + Vite (SPA)
- **UI Kit**: shadcn/ui
- **State Management**: Zustand
- **Forms**: react-hook-form + zod

### Infrastructure
- **Monorepo**: npm workspaces
- **Package Manager**: npm

## 🚀 Kurulum

### Gereksinimler
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB

### Proje Kurulumu

```bash
# Repository'yi clone edin
git clone <repository-url>
cd rsl-perfex-gateway

# Dependencies'leri yükleyin
npm install

# Development server'ları başlatın
npm run dev

# Backend için (port 3000)
npm run dev:backend

# Frontend için (port 5173)
npm run dev:frontend
```

### Build

```bash
# Tüm workspace'leri build edin
npm run build

# Sadece backend build
npm run build:backend

# Sadece frontend build
npm run build:frontend
```

## 📁 Proje Yapısı

```
rsl-perfex-gateway/
├── package.json              # Root workspace config
├── backend/                  # Backend service
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── services/         # Business logic
│   │   ├── models/          # MongoDB models
│   │   ├── middleware/      # Auth & validation
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utilities
│   │   └── app.ts          # Fastify app
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand stores
│   │   └── utils/           # Frontend utilities
│   ├── package.json
│   └── tsconfig.json
└── docs/                     # Documentation
    └── mvp-architecture-plan.md
```

## 🔄 Perfex Integration

Sistem aşağıdaki Perfex endpoints'leri ile çalışır:

- **Authentication**: `POST /admin/authentication`
- **Task Management**: `POST /admin/tasks/table`
- **Timer Operations**: `POST /admin/tasks/timer_tracking`

## 📖 Geliştirme

### Available Scripts

```bash
npm run dev          # Backend dev server
npm run dev:frontend # Frontend dev server
npm run build        # Build all workspaces
npm run test         # Run tests
npm run lint         # Lint code
npm run typecheck    # TypeScript check
```

### Development Workflow

1. Backend geliştirme için `backend/` dizininde çalışın
2. Frontend geliştirme için `frontend/` dizininde çalışın
3. Root seviyede npm workspaces komutlarını kullanın

## 📄 Lisans

ISC

## 👨‍💻 Geliştirici

Resul Furkan Demirkaya
