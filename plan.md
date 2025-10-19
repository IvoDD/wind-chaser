# Wind Chaser Development Plan

## Project Overview
Build a full-stack web application for wind sports enthusiasts to track and receive notifications about optimal wind conditions at their favorite spots.

## Phase 1: Project Setup & Foundation (Days 1-2)

### 1.1 Initialize Project Structure
- [x] Create backend directory with Node.js/Express setup
- [x] Create frontend directory with React setup
- [ ] Initialize MongoDB database (needs Docker Compose setup)
- [x] Setup version control and repository structure
- [x] Configure Docker containers for development

### 1.2 Backend Foundation
- [x] Install core dependencies:
  - Express.js for server framework
  - Mongoose for MongoDB ODM
  - bcryptjs for password hashing
  - jsonwebtoken for authentication
  - cors for cross-origin requests
  - dotenv for environment variables
  - helmet for security
- [x] Setup basic Express server with middleware
- [ ] Configure MongoDB connection (created but needs Docker setup)
- [x] Setup environment variables structure

### 1.3 Frontend Foundation
- [x] Create React app with TypeScript
- [x] Install UI framework (Material-UI)
- [ ] Setup routing with React Router (for Phase 2)
- [x] Configure API client (Axios)
- [x] Setup basic component structure

### 1.4 MongoDB Integration Fix
- [ ] Install Docker and Docker Compose
- [ ] Start MongoDB container using Docker Compose
- [ ] Update backend to use full MongoDB connection
- [ ] Test database connectivity
- [ ] Verify health check shows database status

## Phase 1.5: Complete MongoDB Integration (Day 2)

### 1.5.1 Docker Setup
- [x] Install Docker and Docker Compose on development machine
- [x] Test Docker installation with hello-world container
- [x] Verify docker-compose.yml configuration

### 1.5.2 MongoDB Connection
- [x] Start MongoDB using: `docker-compose up mongodb -d`
- [x] Update backend to use the original app.js with MongoDB connection
- [x] Test MongoDB connection in backend startup
- [x] Add database connection status to health check endpoint

### 1.5.3 Verification
- [x] Restart backend with MongoDB integration
- [x] Test health check shows database connection status
- [x] Verify frontend can still communicate with backend
- [x] Test complete Phase 1 setup with database

## Phase 2: User Authentication System (Days 3-4)

### 2.1 Backend Authentication
- [x] Create User model with Mongoose schema:
  ```javascript
  {
    email: String (unique),
    password: String (hashed),
    firstName: String,
    lastName: String,
    createdAt: Date,
    lastLogin: Date,
    isEmailVerified: Boolean
  }
  ```
- [x] Implement JWT authentication middleware
- [x] Create authentication controllers:
  - Register user
  - Login user
  - Logout user
  - Get current user profile
- [x] Setup authentication routes
- [x] Add password validation and security measures

### 2.2 Frontend Authentication
- [x] Create authentication context/state management
- [x] Build login page component
- [x] Build registration page component
- [x] Create protected route wrapper
- [x] Implement token storage and management
- [x] Add form validation

### 2.3 Testing Authentication
- [x] Test user registration flow
- [x] Test login/logout functionality
- [x] Verify protected routes work correctly
- [x] Test token refresh mechanism

## Phase 3: Spots Management System ✅ COMPLETED (Days 5-6)

### 3.1 Backend Spots System ✅ COMPLETED
- [x] Create Spot model:
  ```javascript
  {
    userId: ObjectId (ref to User),
    name: String,
    windguruUrl: String,
    notificationCriteria: {
      minWindSpeed: Number,
      maxWindSpeed: Number,
      preferredDirections: [String], // ['N', 'NE', 'E', etc.]
      daysOfWeek: [Number], // [1, 2, 3, 4, 5, 6, 0] for Mon-Sun
      timeRange: {
        start: String, // "08:00"
        end: String    // "18:00"
      }
    },
    isActive: Boolean,
    createdAt: Date,
    updatedAt: Date
  }
  ```
- [x] Create spots controllers:
  - Get user spots
  - Create new spot
  - Update spot
  - Delete spot (soft delete)
  - Toggle spot active status
  - Test Windguru URL accessibility
- [x] Setup spots routes with authentication middleware
- [x] Add input validation for spot creation/updates
- [x] Tested all API endpoints successfully

### 3.2 Frontend Spots Management ✅ COMPLETED
- [x] Create spots dashboard page
- [x] Build add spot form component with:
  - Spot name, location, Windguru URL, description
  - Notification criteria (wind speed, directions, days, time)
  - Real-time URL testing functionality
  - Form validation and error handling
- [x] Create spot card/list component with:
  - Comprehensive spot information display
  - Wind criteria visualization
  - Status indicators (active/inactive)
  - Action buttons (edit, delete, toggle, open URL)
- [x] Implement edit spot functionality
- [x] Add delete spot confirmation dialog
- [x] Create notification criteria form with:
  - Wind speed range sliders
  - Direction multi-select
  - Days of week checkboxes
  - Time range pickers
- [x] Integration with spots context and API
- [x] Navigation between dashboard and spots management

### 3.3 URL Validation ✅ COMPLETED
- [x] Add Windguru URL format validation
- [x] Test URL accessibility before saving
- [x] Provide user feedback for invalid URLs

## Phase 4: Real-time Web Scraping for Dashboard ✅ COMPLETED (Days 7-9)

### 4.1 Windguru Scraper Development ✅ COMPLETED
- [x] Install scraping dependencies:
  - cheerio for HTML parsing
  - axios for HTTP requests  
  - puppeteer for dynamic content and cookie consent
- [x] Create Windguru scraper service:
  ```javascript
  class WindguruScraper {
    async scrapeSpot(url) {
      // Extract wind data from Windguru page
      // Return structured wind forecast data
    }
  }
  ```
- [x] Analyze Windguru HTML structure for https://www.windguru.cz/2346 and https://www.windguru.cz/81565
- [x] Extract relevant wind forecast structure:
  - Spot identification and naming
  - Forecast period headers (dates/times)
  - Table structure parsing with fixed row positions
  - Cookie consent handling
  - Anti-bot protection bypass
- [x] Handle different Windguru page formats with flexible selectors
- [x] Add error handling for failed scrapes
- [x] Implement caching mechanism (5-minute cache)
- [x] Add retry logic with fallback from Axios to Puppeteer
- [x] **Fixed row-based parsing**: Correctly extracts data based on fixed table structure:
  - Row 0: Date/Time headers (e.g., "Su12.10h")
  - Row 1: Wind speed in knots (e.g., 6)
  - Row 2: Wind gusts in knots (e.g., 8)
  - Row 3: Wind direction in degrees (e.g., "249°")
  - Row 4: Temperature in Celsius (e.g., 13)
  - Row 5-7: Cloud coverage (low/mid/high levels)
  - Row 8: Precipitation
- [x] **Comprehensive forecast coverage**: Extracting 109 forecast periods (4-5 days of data)
- [x] **Accurate data extraction**: Wind direction from HTML title attributes, numeric parsing for all values

### 4.2 Real-time Scraping API ✅ COMPLETED
- [x] Create forecast controllers for real-time data:
  - Get live forecast for spot (scrape on-demand)
  - Trigger manual forecast update
  - Get dashboard with all user spots
  - Test forecast URL accessibility
- [x] Add caching mechanism to prevent excessive scraping (5-minute cache)
- [x] Setup rate limiting for scraper requests (increased for development)
- [x] Add retry logic for failed scrapes (Axios → Puppeteer fallback)
- [x] Return structured wind data to frontend
- [x] Comprehensive error handling per spot
- [x] **Fixed database query issues**: Removed non-existent `isDeleted` field checks
- [x] **API endpoints working**: Test endpoint returns complete forecast data structure

### 4.3 Dashboard Integration ✅ COMPLETED
- [x] Create API endpoints for dashboard:
  - GET /api/forecasts/live/:spotId - Get current conditions
  - GET /api/forecasts/dashboard - Get all user spots with live data
  - POST /api/forecasts/refresh/:spotId - Manual refresh
  - POST /api/forecasts/test - Test URL scraping
  - DELETE /api/forecasts/cache - Clear cache
- [x] Implement error handling for unavailable forecasts
- [x] Add loading states for scraping operations
- [x] Integration with spots ownership verification
- [x] **Data structure validation**: Confirmed all 109 forecast periods are available for dashboard
- [x] **Multi-day forecast support**: Full forecast data covering multiple days for optimal wind session planning

**Phase 4 Results**: The scraper successfully extracts comprehensive wind data from Windguru including wind speed, gusts, direction, temperature, and cloud cover for 109 forecast periods (multiple days). All API endpoints are functional and ready for frontend dashboard integration.

### 4.3 Dashboard Integration ✅ COMPLETED
- [x] Create API endpoints for dashboard:
  - GET /api/forecasts/live/:spotId - Get current conditions
  - GET /api/forecasts/dashboard - Get all user spots with live data
  - POST /api/forecasts/refresh/:spotId - Manual refresh
  - POST /api/forecasts/test - Test URL scraping
  - DELETE /api/forecasts/cache - Clear cache
- [x] Implement error handling for unavailable forecasts
- [x] Add loading states for scraping operations
- [x] Integration with spots ownership verification

## Phase 5: Dashboard & Frontend Development ✅ COMPLETED (Days 10-12)

### 5.1 Main Dashboard ✅ COMPLETED
- [x] Create dashboard layout component (ForecastDashboard.tsx)
- [x] Build forecast table component with Windguru-style layout:
  - Horizontal scrolling forecast table with enhanced scrollbars
  - Time/date headers row with proper sizing
  - Wind speed, gusts, direction rows with color-coded wind strength
  - Temperature and precipitation rows
  - Responsive design with sticky row headers
- [x] Add loading states and error handling components
- [x] Create spot card structure for displaying multiple spots
- [x] Implement Material-UI Grid layout for dashboard
- [x] Fix TypeScript compilation issues with MUI Grid components
- [x] **FIXED**: Dashboard API integration - resolved userId extraction issue in auth middleware
- [x] Integrate real-time data refresh from API showing 115+ forecast periods
- [x] Add manual refresh button for each spot
- [x] Test forecast data display with live Windguru data

### 5.2 Enhanced UI/UX ✅ COMPLETED
- [x] Add responsive design framework with Material-UI
- [x] Implement wind speed color coding with smooth gradients (white → green → yellow → orange → red → purple)
- [x] Add loading animations and skeleton components
- [x] Create comprehensive error handling system
- [x] Add helpful user interface elements (scroll indicators, tooltips)
- [x] Enhanced horizontal scrolling with visible scrollbars and smooth navigation

### 5.3 Dashboard Features ✅ COMPLETED
- [x] Complete forecast table with speed, direction, gusts, temperature, cloud coverage
- [x] Spot management integration (edit, delete, refresh actions)
- [x] Quick action buttons with confirmation dialogs
- [x] Direct links to original Windguru pages
- [x] Last updated timestamps and spot statistics
- [x] Horizontal scrolling for extended forecast periods (115+ periods)
- [x] Sticky headers for easy navigation during scrolling
- [x] Wind strength visual indicators with color gradients

### 5.4 Advanced Styling & UX Improvements ✅ COMPLETED
- [x] **Wind Speed Color Coding**: Beautiful gradient system indicating wind strength
  - 0-10 knots: White to light green
  - 10-18 knots: Light green to yellow  
  - 18-25 knots: Yellow to orange
  - 25-30 knots: Orange to red
  - 30+ knots: Red to deep purple
- [x] **Enhanced Horizontal Scrolling**: 
  - Visible scrollbars with primary color theming
  - Smooth scroll behavior and hover effects
  - Scroll indicators and visual feedback
  - Sticky time column and row headers
- [x] **Improved Column Sizing**: 
  - Wider time columns (120px) for full date/time visibility
  - Enhanced row headers (120px) for complete label display
  - Better typography and spacing throughout
- [x] **Spot Management Integration**:
  - Edit/delete/refresh buttons for each spot
  - Delete confirmation dialogs with loading states
  - Integration with SpotsContext for seamless updates
  - Enhanced header with spot statistics display

**Phase 5 Status**: ✅ **COMPLETELY FINISHED** - Full-featured dashboard with professional Windguru-style forecast tables, wind speed color coding, comprehensive spot management, and enhanced horizontal scrolling experience.

## Phase 6: Periodic Scraping & Historical Data (Days 13-15)

### 6.1 Data Standardization & Backend Improvements
- [ ] **Standardize cloud coverage data format**: Modify WindguruScraper to calculate and return average cloud coverage percentage (0-100%) instead of raw level data, ensuring uniform interface for future forecast sources (windyweek, etc.)
- [ ] **Backend data normalization**: Ensure all forecast sources return consistent data structure:
  ```javascript
  {
    windSpeed: Number,     // knots
    windGusts: Number,     // knots  
    windDirection: String, // degrees (e.g., "249°")
    temperature: Number,   // celsius
    cloudCover: Number,    // percentage 0-100
    precipitation: Number  // mm or probability
  }
  ```
- [ ] Add validation for normalized forecast data
- [ ] Update existing forecast parsing to use standardized format

### 6.2 Forecast Data Model & Storage
- [ ] Create Forecast model for historical data:
  ```javascript
  {
    spotId: ObjectId (ref to Spot),
    timestamp: Date,
    windData: {
      speed: Number,
      direction: String,
      gusts: Number,
      temperature: Number,
      conditions: String
    },
    forecastTime: Date,
    scrapedAt: Date
  }
  ```
- [ ] Setup database indexes for efficient querying
- [ ] Create data retention policies (e.g., keep 30 days of history)

### 6.2 Scheduled Scraping System
- [ ] Install node-cron for scheduling
- [ ] Create periodic scraping service:
  ```javascript
  class PeriodicScraper {
    async scrapeAllActiveSpots() {
      // Scrape all user spots every 30 minutes
      // Store results in database
    }
  }
  ```
- [ ] Setup scraping intervals (every 30 minutes)
- [ ] Add error handling and retry logic
- [ ] Implement rate limiting between spot scrapes
- [ ] Log scraping activities and failures

### 6.3 Historical Data API
- [ ] Create forecast history controllers:
  - Get forecast history for spot
  - Get historical data for dashboard
  - Get forecast trends and statistics
- [ ] Add data aggregation endpoints
- [ ] Implement data cleanup for old forecasts

### 6.4 Enhanced Dashboard with History
- [ ] Add forecast history charts/graphs
- [ ] Show forecast trends over time
- [ ] Add historical data filtering options
- [ ] Display forecast accuracy indicators

## Phase 7: Email Notification System (Days 16-17)

### 7.1 Email Service Setup
- [ ] Install nodemailer and email dependencies
- [ ] Configure email service (Gmail, SendGrid, or similar)
- [ ] Create email templates:
  - Wind condition alert email
  - Welcome email
  - Password reset email
- [ ] Setup email service with authentication

### 7.2 Notification Logic
- [ ] Create notification service:
  ```javascript
  class NotificationService {
    async checkWindConditions() {
      // Check stored forecast data against user criteria
      // Send notifications for matches
    }
    
    async sendWindAlert(user, spot, windData) {
      // Send email notification to user
    }
  }
  ```
- [ ] Implement wind condition matching algorithm
- [ ] Add notification history tracking
- [ ] Prevent duplicate notifications (same conditions, same day)

### 7.3 Scheduled Notifications
- [ ] Setup periodic notification checking (every hour)
- [ ] Create notification queue system
- [ ] Add user notification preferences
- [ ] Implement notification scheduling based on user time zones

### 7.4 Notification Management
- [ ] Add notification settings to user profile
- [ ] Create notification history page
- [ ] Add unsubscribe functionality
- [ ] Allow users to test notifications

## Phase 8: Testing & Quality Assurance (Days 18-19)

### 8.1 Backend Testing
- [ ] Write unit tests for authentication
- [ ] Test API endpoints with different scenarios
- [ ] Test real-time scraping functionality with various URLs
- [ ] Test periodic scraping and data storage
- [ ] Test notification system end-to-end
- [ ] Load testing for concurrent users

### 8.2 Frontend Testing
- [ ] Test user registration and login flows
- [ ] Test spot creation and management
- [ ] Test dashboard functionality and real-time updates
- [ ] Test historical data visualization
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness testing

### 8.3 Integration Testing
- [ ] End-to-end user workflow testing
- [ ] Email delivery testing
- [ ] Scraping reliability across different conditions
- [ ] Error handling and edge cases
- [ ] Performance optimization

## Phase 9: Deployment & Production Setup (Days 20-21)

### 9.1 Production Environment
- [ ] Setup production MongoDB (Atlas)
- [ ] Configure production environment variables
- [ ] Setup HTTPS certificates
- [ ] Configure reverse proxy (Nginx)

### 9.2 Docker Deployment
- [ ] Create production Dockerfiles
- [ ] Setup docker-compose for production
- [ ] Configure volume mounts for data persistence
- [ ] Setup health checks

### 9.3 Monitoring & Logging
- [ ] Setup application logging
- [ ] Configure error tracking (Sentry)
- [ ] Setup uptime monitoring
- [ ] Create backup strategy for database
- [ ] Monitor scraping performance and success rates

## Phase 10: Additional Features & Improvements (Days 22+)

### 10.1 Advanced Features
- [ ] User profile management
- [ ] Notification history and statistics
- [ ] Export spot configurations
- [ ] Bulk spot operations
- [ ] Advanced filtering and search
- [ ] Forecast accuracy tracking

### 10.2 Performance Optimizations
- [ ] Implement Redis caching for forecasts
- [ ] Optimize database queries
- [ ] Add API rate limiting
- [ ] Compress static assets
- [ ] Optimize scraping performance

### 10.3 Security Enhancements
- [ ] Add input sanitization
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Security headers configuration

## Technical Decisions & Considerations

### Database Design
- Use MongoDB for flexibility with forecast data structure
- Index frequently queried fields (userId, spotId, timestamp)
- Consider data retention policies for old forecasts

### Scraping Strategy
- Start with Windguru only, design for extensibility
- Implement respectful scraping (delays, user agents)
- Handle anti-scraping measures gracefully
- Consider using proxy rotation if needed

### Notification System
- Use cron jobs for periodic checks
- Implement exponential backoff for retries
- Allow users to set notification frequency
- Track notification delivery status

### Frontend Architecture
- Use React Context for global state management
- Implement component lazy loading
- Use React Query for API state management
- Progressive Web App features (optional)

### Security Best Practices
- Hash passwords with bcrypt
- Use HTTPS in production
- Validate all user inputs
- Implement proper error handling without exposing internals

## Potential Challenges & Solutions

### Challenge: Windguru Anti-Scraping
**Solution**: Use proper headers, delays between requests, and consider headless browser if needed

### Challenge: Email Deliverability
**Solution**: Use reputable email service (SendGrid), implement SPF/DKIM records

### Challenge: Scale for Many Users
**Solution**: Implement caching, database optimization, consider microservices architecture

### Challenge: Different Windguru Page Formats
**Solution**: Create flexible scraper with fallback parsing strategies

## Success Metrics

- [ ] Users can register and login successfully
- [ ] Users can add and manage wind spots
- [ ] Scraper accurately extracts wind data from Windguru
- [ ] Notifications are sent reliably when conditions match
- [ ] Dashboard displays live wind data correctly
- [ ] Application handles concurrent users without issues
- [ ] Email notifications have good deliverability rate

## Future Enhancements (Post-MVP)

- Support for additional forecast providers
- Mobile app (React Native)
- SMS notifications
- Weather alerts and warnings
- Community features (spot sharing, reviews)
- Advanced analytics and historical data
- Premium subscription model
- API for third-party integrations
- Machine learning for forecast accuracy
- Weather station integration

## Resource Requirements

### Development Tools
- Code editor (VS Code)
- MongoDB Compass for database management
- Postman for API testing
- Browser developer tools

### External Services
- MongoDB Atlas (database hosting)
- Email service (Gmail SMTP or SendGrid)
- Domain name and SSL certificate
- Hosting platform (VPS, AWS, or similar)

### Time Estimation
- **Total Development Time**: 21+ days
- **Working Dashboard MVP**: 12 days
- **Historical Data System**: 15 days  
- **Full System with Notifications**: 17 days
- **Production Ready**: 21 days
- **Additional Features**: Ongoing

This plan provides a structured approach to building the Wind Chaser application, prioritizing a working dashboard first, then adding data persistence and historical tracking, and finally implementing the email notification system.
