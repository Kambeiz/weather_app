# Weather App

A web application that allows users to save their favorite cities and check the weather. Built with Node.js, Express, SQLite, and OpenWeatherMap API.

## Features

- User authentication (register/login)
- Add and remove favorite cities
- View current weather for saved cities
- Toggle between Celsius and Fahrenheit
- Responsive design that works on all devices

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- OpenWeatherMap API key (free tier available at [OpenWeatherMap](https://openweathermap.org/api))

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd weather-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables:
   ```bash
   cp .env.example .env
   ```
   Then edit the `.env` file and add your OpenWeatherMap API key and other configurations.

## Configuration

Edit the `.env` file with your configuration:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Session Secret (generate a strong secret for production)
SESSION_SECRET=your-session-secret-key

# OpenWeatherMap API Key (get one at https://openweathermap.org/api)
OPENWEATHER_API_KEY=your-openweather-api-key

# Database Configuration (SQLite is used by default)
DB_PATH=./database/weather.db
```

## Running the Application

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Development

- The application uses SQLite for the database, which will be created automatically on first run.
- The database schema is defined in `database/db.js`.
- Frontend assets are served from the `public` directory.
- Views are rendered using EJS templating engine.

## Project Structure

```
weather-app/
├── config/                 # Configuration files
├── controllers/            # Route controllers
├── database/               # Database configuration and migrations
├── middleware/             # Express middleware
├── models/                 # Database models
├── public/                 # Static files (CSS, JS, images)
│   ├── css/
│   └── js/
├── routes/                 # Route definitions
├── services/               # Business logic and external services
├── views/                  # EJS templates
│   ├── partials/           # Reusable view components
│   └── *.ejs               # Main view templates
├── .env.example            # Example environment variables
├── .env                    # Environment variables (not in version control)
├── app.js                  # Main application file
├── package.json            # Project dependencies and scripts
└── README.md               # This file
```

## API Endpoints

### Authentication

- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout

### Cities

- `GET /api/cities` - Get user's favorite cities
- `POST /api/cities` - Add a city to favorites
- `DELETE /api/cities/:id` - Remove a city from favorites

### Weather

- `GET /api/weather` - Get weather data for a location
  - Query parameters: `lat` (required), `lon` (required), `units` (optional, default: metric)

### Geocoding

- `GET /api/geocode` - Search for city coordinates
  - Query parameters: `q` (required, e.g., "London,GB")

## Dependencies

- **express**: Web framework
- **ejs**: Templating engine
- **sqlite3**: Database
- **bcryptjs**: Password hashing
- **express-session**: Session management
- **axios**: HTTP client for API requests
- **dotenv**: Environment variable management

## License

This project is open source and available under the [MIT License](LICENSE).
