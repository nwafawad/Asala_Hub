# Asala Hub 100% Free Production Deployment Guide

This guide provides step-by-step instructions to deploy **Asala Hub** to production for **100% free forever** using **Vercel** (Frontend), **Render.com** (FastAPI Backend), and **Neon.tech** (Serverless PostgreSQL Database).

---

## 🏗️ 1. Database Deployment (Neon Serverless PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech) using your GitHub account.
2. Click **Create Project**, name it `asala-hub-db`, and choose PostgreSQL 16.
3. Once created, copy the connection string (`DATABASE_URL`). It will look like:
   ```env
   postgresql://alex:password123@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## 🐍 2. Backend Deployment (Render.com)

1. Sign up at [render.com](https://render.com) using your GitHub account.
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository `Asala_Hub`.
4. Configure service parameters:
   - **Name**: `asala-hub-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
5. Set Environment Variables:
   - `DATABASE_URL`: *(Paste your Neon connection string)*
   - `JWT_SECRET_KEY`: *(Generate a random 32-character secret key)*
   - `ALLOWED_HOSTS`: `*` *(or your Vercel URL once generated)*
   - `ENVIRONMENT`: `production`
   - `AUTO_SEED`: `true` *(Seeds default admin: admin@asalahub.org / AdminPassword123!)*
6. Click **Create Web Service**.
7. Render will build the container, execute database migrations via Alembic, and issue an HTTPS endpoint:
   ```
   https://asala-hub-backend.onrender.com
   ```

---

## ⚡ 3. Frontend Deployment (Vercel)

1. Sign up at [vercel.com](https://vercel.com) using your GitHub account.
2. Click **Add New...** → **Project** and select `Asala_Hub`.
3. Configure project settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select `frontend`
4. Set Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://asala-hub-backend.onrender.com`
5. Click **Deploy**. Vercel will build Next.js 15 and issue a free custom HTTPS domain:
   ```
   https://asala-hub.vercel.app
   ```

---

## 🔒 4. Post-Deployment Verification

1. **Verify Backend Health**: Visit `https://asala-hub-backend.onrender.com/healthz` (should return status OK).
2. **Verify Frontend**: Open `https://asala-hub.vercel.app`.
3. **Login as Admin**:
   - **Email**: `admin@asalahub.org`
   - **Password**: `AdminPassword123!`
4. Test course creation, student offline caching, YouTube video portal playback, and sync engine.
