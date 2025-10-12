# Wind Chaser 🌊💨

A web application for kitesurfers, windsurfers, and wind sports enthusiasts to track and get notified about optimal wind conditions at their favorite spots.

## Features

### Core Features
- **User Registration & Authentication**: Secure user accounts with login/logout functionality
- **Spot Management**: Save and manage your favorite wind spots with custom names and URLs
- **Wind Forecast Integration**: Supports Windguru forecasts (expandable to other providers)
- **Smart Notifications**: Email alerts when wind conditions match your criteria
- **Live Dashboard**: Real-time wind data display with intuitive interface

### Notification Criteria
Set custom alerts based on:
- **Wind Strength**: Minimum/maximum wind speed (knots or m/s)
- **Wind Direction**: Preferred wind directions (N, NE, E, SE, S, SW, W, NW)
- **Days of Week**: Choose which days you want to be notified about
- **Time Range**: Set specific time of day to be notified about

### Dashboard Features
- **Live Forecast Data**: Fresh data scraped in real-time when you open the dashboard
- **Multiple Spots**: View all your saved spots in one place
- **Forecast Details**: Wind speed, direction, gusts, and weather conditions
- **Quick Links**: Direct access to original forecast websites

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Nodemailer** for email notifications
- **Cheerio** for web scraping
- **Node-cron** for scheduled tasks

### Frontend
- **React** with modern hooks
- **Material-UI** or **Tailwind CSS** for styling
- **Axios** for API communication
- **React Router** for navigation

### Infrastructure
- **Docker** for containerization
- **PM2** for process management
- **Nginx** as reverse proxy (production)

## Project Structure

```
wind-chaser/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── app.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── contexts/
│   │   └── App.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── plan.md
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IvoDD/wind-chaser.git
   cd wind-chaser
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Setup Database**
   - Start MongoDB locally or use MongoDB Atlas
   - Update connection string in backend/.env

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/wind-chaser

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Scraping Configuration
SCRAPING_INTERVAL=30 # minutes
NOTIFICATION_INTERVAL=60 # minutes
```

## Usage

1. **Register** for a new account or **login** with existing credentials
2. **Add spots** by providing:
   - Spot name (e.g., "Tarifa Beach")
   - Windguru URL (e.g., https://www.windguru.cz/81565)
   - Notification criteria (wind speed, direction, days)
3. **View dashboard** to see live wind conditions
4. **Receive notifications** via email when conditions match your criteria

## Supported Forecast Providers

### Currently Supported
- **Windguru** (windguru.cz) - Full support for wind data extraction

### Planned Support
- Windy.com
- Weather Underground
- NOAA Marine Weather
- Local weather stations

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Spots
- `GET /api/spots` - Get user's spots
- `POST /api/spots` - Add new spot
- `PUT /api/spots/:id` - Update spot
- `DELETE /api/spots/:id` - Delete spot

### Forecasts
- `GET /api/forecasts/:spotId` - Get live forecast for spot
- `GET /api/forecasts/dashboard` - Get forecasts for all user spots

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Basic user authentication
- [ ] Spot management system
- [ ] Windguru scraping integration
- [ ] Email notification system
- [ ] React dashboard
- [ ] Advanced filtering options
- [ ] Mobile app (React Native)
- [ ] Weather forecast integration
- [ ] Community features (spot sharing)
- [ ] Premium features (SMS notifications, advanced analytics)

## Support

For support, email support@wind-chaser.app or create an issue in this repository.

---

**Happy wind chasing! 🏄‍♂️💨**
