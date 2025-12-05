# 🥖 Flourcast

**Offline-first production and demand forecasting system for small local bakeries**

Flourcast is a React Native mobile app that helps bakery owners track sales, manage inventory, and forecast demand using AI—all while working completely offline.

---

## ✨ Features

- 📊 **Dashboard** - Real-time overview of sales, revenue, and inventory alerts
- 💰 **Sales Tracking** - Record transactions with automatic inventory updates
- 📦 **Inventory Management** - Track stock levels, prices, and low-stock warnings
- 🤖 **AI Forecasting** - Predict tomorrow's demand with confidence scores
- 📸 **Image Uploads** - Add photos to products and profile
- 🔒 **Secure Authentication** - Firebase-powered email/password login
- 📴 **Fully Offline** - SQLite local database, works without internet
- 🌙 **Dark Mode** - Automatic light/dark theme support

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Expo Go** app on your mobile device:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Installation

1. **Clone or download this repository**

2. **Navigate to the project directory**
   ```bash
   cd project
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up Firebase** (required for authentication)
   
   a. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   
   b. Enable **Email/Password** authentication:
      - Go to Authentication → Sign-in method
      - Enable "Email/Password"
   
   c. Get your Firebase config:
      - Go to Project Settings → General
      - Scroll to "Your apps" → Web app
      - Copy the configuration values
   
   d. Create a `.env` file in the `project` directory:
      ```env
      EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
      EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
      EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
      ```

5. **Start the development server**
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

6. **Open on your device**
   - Scan the QR code with:
     - **iOS**: Camera app (opens Expo Go automatically)
     - **Android**: Expo Go app (use the "Scan QR Code" button)

---

## 📱 How to Use

### First Time Setup

1. **Create an account**
   - Open the app and tap "Sign Up"
   - Enter your bakery name, email, and password
   - Tap "Create Account"

2. **Add your products**
   - Go to the **Inventory** tab
   - Tap the **+** button
   - Fill in product details (name, price, stock, cost)
   - Optionally add a product image
   - Tap "Add Product"

### Daily Workflow

#### Morning (5 minutes)
1. Open the **Forecast** tab
2. Review tomorrow's production predictions
3. Plan your baking schedule based on forecasts

#### Throughout the Day
1. Record each sale as it happens:
   - Go to **Sales** tab
   - Tap **+** button
   - Select product and enter quantity
   - Tap "Record Sale"
2. Inventory updates automatically!

#### Evening (5 minutes)
1. Check **Dashboard** for daily summary
2. Review **Inventory** tab for low stock alerts
3. Update stock quantities after production runs

### AI Forecasting

The forecasting system uses historical sales data to predict future demand.

**Requirements:**
- At least **7 days of sales history** for basic forecasts
- More data = more accurate predictions

**How it works:**
- Combines Simple Moving Average (SMA) and Exponential Smoothing
- Considers day-of-week patterns
- Provides confidence scores for each prediction
- Updates daily as you add more sales data

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React Native 0.81 |
| **Framework** | Expo 54 |
| **Navigation** | Expo Router 6 |
| **Local Database** | SQLite (expo-sqlite) |
| **Authentication** | Firebase Authentication |
| **Image Storage** | Expo FileSystem (local) |
| **Forecasting** | Custom algorithms (SMA + Exponential Smoothing) |
| **Charts** | React Native Chart Kit |
| **UI Icons** | Lucide React Native |
| **Language** | TypeScript |

---

## 📂 Project Structure

```
project/
├── app/                      # App screens and routes (Expo Router)
│   ├── (auth)/              # Authentication screens
│   │   ├── login.tsx        # Login screen
│   │   └── register.tsx     # Registration screen
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx        # Dashboard/Home
│   │   ├── sales.tsx        # Sales tracking
│   │   ├── inventory.tsx    # Inventory management
│   │   ├── forecast.tsx     # AI forecasting
│   │   └── settings.tsx     # User settings
│   ├── _layout.tsx          # Root layout
│   └── index.tsx            # Entry point
├── components/              # Reusable UI components
│   ├── CalendarModal.tsx    # Date picker modal
│   ├── CostCalculator.tsx   # Cost calculation component
│   ├── ImagePickerButton.tsx # Image upload component
│   └── RecipeManager.tsx    # Recipe management
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Authentication state
├── services/                # Business logic and data access
│   ├── firebase-auth.service.ts      # Firebase auth
│   ├── inventory.service.sqlite.ts   # Inventory operations
│   ├── product.service.sqlite.ts     # Product operations
│   ├── sales.service.sqlite.ts       # Sales operations
│   ├── recipe.service.sqlite.ts      # Recipe operations
│   ├── forecast.service.ts           # Forecasting algorithms
│   ├── profile.service.ts            # User profile
│   └── category.service.ts           # Product categories
├── lib/                     # Utilities and helpers
│   ├── database.ts          # SQLite database setup
│   ├── firebase.ts          # Firebase configuration
│   ├── image-storage.ts     # Image upload/compression
│   ├── currency.ts          # Currency formatting
│   └── error-messages.ts    # Error handling
├── types/                   # TypeScript type definitions
│   └── database.ts          # Database types
├── assets/                  # Images, fonts, etc.
├── .env                     # Environment variables (create this)
├── app.json                 # Expo configuration
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript configuration
```

---

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run dev` | Alias for `npm start` |
| `npm run android` | Open app in Android emulator |
| `npm run ios` | Open app in iOS simulator (Mac only) |
| `npm run web` | Open app in web browser |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |

---

## 🔐 Security & Privacy

- **All data stored locally** on device using SQLite
- **No cloud sync by default** - your data stays on your device
- **Firebase only for authentication** - no sales/inventory data sent to cloud
- **Passwords hashed** by Firebase Authentication
- **Environment variables** for sensitive credentials

---

## 📸 Image Storage

Product and profile images are stored locally on your device:
- **Automatic compression** - 800x800 for products, 400x400 for profiles
- **JPEG format at 80% quality** for optimal file size
- **Stored in app's document directory** - persists across app restarts
- **No internet required** - completely offline

---

## 🐛 Troubleshooting

### App won't start
- Make sure you're in the `project` directory
- Try deleting `node_modules` and running `npm install` again
- Clear Expo cache: `npx expo start -c`

### Can't connect to development server
- Ensure phone and computer are on the same WiFi network
- Try using tunnel mode: `npx expo start --tunnel`

### Firebase authentication errors
- Verify `.env` file has correct Firebase configuration
- Check that Email/Password authentication is enabled in Firebase Console
- Ensure API key has proper permissions

### Database errors
- Try clearing app data in Expo Go
- Uninstall and reinstall the app through Expo Go

### Images not showing
- Check camera/photo library permissions
- Ensure device has sufficient storage

---

## 🚀 Building for Production

### Android APK
```bash
npm install -g eas-cli
eas login
eas build -p android
```

### iOS App (requires Mac + Apple Developer account)
```bash
npm install -g eas-cli
eas login
eas build -p ios
```

For more details, see [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/).

---

## 📄 License

This project is private and proprietary.

---

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase setup in your console
3. Ensure all dependencies are installed correctly

---

## 🎯 Roadmap

Future enhancements planned:
- [ ] Multi-language support
- [ ] Export sales reports to CSV
- [ ] Cloud sync (optional Firestore integration)
- [ ] Recipe cost calculator
- [ ] Batch production planning
- [ ] Customer order management
- [ ] Advanced analytics dashboard

---

**Built with ❤️ for small bakeries**
