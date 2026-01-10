# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wind Chaser is a web application for wind sports enthusiasts (kitesurfers, windsurfers) to track and get notified about optimal wind conditions. It scrapes Windguru forecasts and provides a dashboard with 115+ forecast periods.

## Development Commands

### Backend (Express.js + MongoDB)
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start dev server with nodemon (port 5000)
npm run start        # Start production server
npm test             # Run Jest tests
```

### Frontend (React + TypeScript + MUI)
```bash
cd frontend
npm install          # Install dependencies
npm start            # Start dev server (port 3000, proxies to backend)
npm run build        # Production build
npm test             # Run tests (interactive mode)
npm test -- --watchAll=false  # Run tests once
```

### Full Stack Development
```bash
./dev.sh start       # Start MongoDB, backend, and frontend
./dev.sh install     # Install all dependencies
./dev.sh docker      # Start with Docker Compose
./dev.sh stop        # Stop Docker services
```

### Docker
```bash
docker-compose up --build    # Start all services
docker-compose down          # Stop all services
```

## Architecture

### Backend Structure
- **Express.js** with JWT authentication (access + refresh tokens)
- **MongoDB/Mongoose** for data persistence
- Routes: `/api/auth`, `/api/spots`, `/api/forecasts`
- `WindguruScraper` service (`backend/src/services/WindguruScraper.js`) - uses Puppeteer for JS-rendered content with Cheerio fallback, includes 5-minute cache

### Frontend Structure
- **React 19** with TypeScript
- **Material-UI (MUI)** for components
- Two React contexts:
  - `AuthContext` - handles login/register/logout with token management
  - `SpotsContext` - manages user's saved wind spots
- API service layer in `frontend/src/services/api.ts`

### Data Flow
1. User adds a spot with Windguru URL
2. Dashboard requests forecast data via `/api/forecasts/:spotId`
3. Backend scrapes Windguru (Puppeteer if Axios/Cheerio fails)
4. Forecast data (wind speed, gusts, direction, temperature, clouds, precipitation) rendered in horizontal scrolling table

### Key Models
- **User**: email, password (bcrypt), firstName, lastName, refreshTokens
- **Spot**: name, url, userId, notificationCriteria (wind speed range, directions, days, time range)

## Environment Variables

Backend requires `.env` in `backend/` directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wind-chaser
JWT_SECRET=your-secret
FRONTEND_URL=http://localhost:3000
```
