# Flourcast - Bakery Management System

Flourcast is a comprehensive mobile-first Android application designed for small, local bakeries like Panmasa Patisserie. It helps businesses track sales, manage inventory, and predict daily demand to minimize waste and stockouts.

## Features

### 🏠 Dashboard
- Real-time sales tracking
- Daily production and sales metrics
- Weekly sales visualization
- Inventory status overview
- Daily performance reports

### 📦 Inventory Management
- Product and ingredient tracking
- Stock level monitoring with alerts
- Easy quantity adjustments
- Low stock notifications
- Supplier information management

### 📊 Sales Tracking & Analytics
- Record sales transactions
- Track best-selling products
- Daily, weekly, and monthly performance analysis
- Revenue and transaction metrics
- Sales trend visualization

### 🤖 AI Demand Forecasting
- TensorFlow.js-powered predictions
- Historical data analysis
- Production recommendations
- Automated production planning
- Confidence-based forecasting

## Technology Stack

- **Frontend**: React Native with Expo
- **Database**: SQLite (offline-first)
- **Authentication**: Firebase
- **AI/ML**: TensorFlow.js
- **Charts**: React Native Chart Kit
- **State Management**: React Context API
- **UI Framework**: React Native Paper

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Firebase project setup

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/flourcast.git
   cd flourcast
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Install Expo CLI globally**
   ```bash
   npm install -g @expo/cli
   ```

4. **Setup Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication with Email/Password
   - Copy your Firebase configuration
   - Update `src/context/AuthContext.js` with your Firebase config

5. **Download Fonts**
   - Download Roboto fonts from [Google Fonts](https://fonts.google.com/specimen/Roboto)
   - Download Playfair Display fonts from [Google Fonts](https://fonts.google.com/specimen/Playfair+Display)
   - Place the font files in `assets/fonts/` directory

6. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

## Project Structure

```
flourcast/
├── src/
│   ├── context/
│   │   ├── AuthContext.js          # Firebase authentication
│   │   └── DatabaseContext.js      # SQLite database management
│   ├── screens/
│   │   ├── OnboardingScreen.js     # App introduction screens
│   │   ├── LoginScreen.js          # Authentication
│   │   ├── DashboardScreen.js      # Main dashboard
│   │   ├── InventoryScreen.js      # Inventory management
│   │   ├── SalesScreen.js          # Sales tracking
│   │   └── AnalysisScreen.js        # Analytics and forecasting
│   ├── services/
│   │   └── ForecastService.js      # AI forecasting logic
│   └── styles/
│       ├── theme.js                # App theme configuration
│       └── globalStyles.js         # Global styling
├── assets/
│   └── fonts/                      # Custom fonts
├── App.js                          # Main app component
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Key Features

### Offline-First Architecture
- All core features work without internet connection
- SQLite database for local data storage
- Optional cloud sync when internet is available
- Data persistence across app sessions

### AI-Powered Forecasting
- TensorFlow.js integration for local ML processing
- Historical sales data analysis
- Trend detection and seasonality analysis
- Confidence-based predictions
- Production planning recommendations

### Modern UI/UX
- Clean, bakery-themed design
- Intuitive navigation
- Responsive layouts
- Accessibility features
- Smooth animations and transitions

## Database Schema

### Tables
- **users**: User authentication and profiles
- **products**: Product catalog and pricing
- **ingredients**: Ingredient management
- **inventory**: Stock levels and tracking
- **sales**: Sales transactions
- **production**: Production records
- **forecasts**: AI-generated predictions

## Configuration

### Firebase Setup
1. Create a Firebase project
2. Enable Authentication
3. Add your web app to the project
4. Copy the configuration object
5. Update `src/context/AuthContext.js`

### Environment Variables
Create a `.env` file in the root directory:
```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Usage

### Getting Started
1. Launch the app
2. Complete the onboarding process
3. Create an account or sign in
4. Start adding products and ingredients
5. Record your first sale
6. View analytics and forecasts

### Adding Products
1. Go to Inventory tab
2. Tap "Add new stock"
3. Enter product details
4. Set initial quantity
5. Save the product

### Recording Sales
1. Go to Sales tab
2. Tap the "+" button
3. Select a product
4. Enter quantity sold
5. Confirm the transaction

### Viewing Analytics
1. Go to Analysis tab
2. View sales trends and charts
3. Check AI forecasts
4. Review production recommendations

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
# Android
expo build:android

# iOS
expo build:ios
```

### Code Style
- Use ESLint for code linting
- Follow React Native best practices
- Use TypeScript for type safety (optional)
- Write comprehensive comments

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@flourcast.com or create an issue in the GitHub repository.

## Roadmap

- [ ] Cloud synchronization
- [ ] Multi-location support
- [ ] Advanced reporting
- [ ] Barcode scanning
- [ ] Supplier management
- [ ] Recipe management
- [ ] Cost analysis
- [ ] Profit margin tracking

## Acknowledgments

- React Native community
- Expo team
- TensorFlow.js team
- Firebase team
- All contributors and testers

---

**Flourcast** - Bake Good Decisions 🥖✨
