<div align="center">

# FloraAI

**Your AI-powered plant care companion**

[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)

</div>

---

## About

FloraAI is an AI-powered plant care app built with React Native and Expo. It helps you track all your plants, stay on top of watering schedules, get personalised care advice, and visualise your garden's health — all in one clean, nature-themed interface.

When you add a plant, FloraAI uses the **Google Gemini API** to instantly suggest a watering frequency, care tips, and difficulty level based on the specific plant name and type you enter.

---

## Screenshots

| Home | Reminders | Garden Stats |
|:---:|:---:|:---:|
| <img src="./screenshots/01_home.png" width="200"/> | <img src="./screenshots/02_reminders.png" width="200"/> | <img src="./screenshots/03_stats.png" width="200"/> |

| Plant Detail | Add Plant (AI Sheet) | Add Plant (Full) | Splash |
|:---:|:---:|:---:|:---:|
| <img src="./screenshots/04_plant_detail.png" width="200"/> | <img src="./screenshots/05_add_plant_ai.png" width="200"/> | <img src="./screenshots/06_add_plant.png" width="200"/> | <img src="./screenshots/07_splash.png" width="200"/> |

---

## Features

| Feature | Description |
|---|---|
| **Plant Management** | Add, view, and remove plants from your personal garden with swipe-to-delete |
| **Watering Schedules** | Set custom watering frequencies; new plants start as due for watering immediately |
| **AI Care Suggestions** | Tap a plant type to get instant Gemini-powered care tips via an animated bottom sheet |
| **Garden Stats** | Animated health score ring (0–100), watering streak, 7-day activity chart, and plant status overview |
| **Reminders** | Bell icon with overdue badge on the home header; full watering schedule categorised by urgency |
| **Push Notifications** | Get reminded at 9 AM on each plant's watering day |
| **Plant Photos** | Attach camera or gallery photos to each plant |
| **Watering Health Bar** | Per-plant progress bar showing days until next watering |
| **Consistent Icon System** | Ionicons used throughout — no emoji UI icons |
| **Design Token System** | Single `theme.ts` source of truth for all colours, typography, spacing, and border radii |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React Native + Expo** | Cross-platform mobile framework |
| **TypeScript** | Type-safe development |
| **React Navigation** | Bottom tab + native stack navigation |
| **AsyncStorage** | Local persistent data storage |
| **Google Gemini AI** | AI-powered plant care suggestions (`gemini-2.5-flash`) |
| **react-native-svg** | Animated health score ring in Garden Stats |
| **@expo/vector-icons (Ionicons)** | Consistent icon system across all screens |
| **expo-notifications** | Local push notifications for watering reminders |
| **expo-image-picker** | Camera and gallery photo selection |
| **expo-linear-gradient** | Gradient headers and AI sheet styling |
| **React Native Gesture Handler** | Swipe-to-delete interactions |
| **expo-haptics** | Haptic feedback throughout the app |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or later)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/harshalic19/FloraAI.git
   cd FloraAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your Gemini API key**

   Create a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   > Never commit your `.env` file — it is already listed in `.gitignore`.

4. **Start the development server**
   ```bash
   npx expo start --clear
   ```

5. **Open the app**
   - Scan the QR code with **Expo Go** on your phone, or
   - Press `i` for iOS Simulator / `a` for Android Emulator

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key and paste it into your `.env` file

---

## AI Features

FloraAI uses the **Google Gemini 2.5 Flash** model to provide intelligent, plant-specific care advice.

### How it works

```
User taps a plant type card (e.g. "Fern")
           ↓
FloraAI sends plant name + type to Gemini API
           ↓
Gemini returns: watering frequency, difficulty level, care tip
           ↓
A premium bottom sheet slides up with the AI suggestion
           ↓
User taps "Apply Suggestion" to auto-select the watering schedule
```

### What the AI returns

- **Watering Frequency** — how often to water (in days), auto-selected on the frequency chips
- **Difficulty** — Easy / Medium / Hard badge with colour coding
- **Care Tip** — a concise, plant-specific care tip

> The AI call is triggered **only** when a plant type card is tapped — never while typing.

---

## Garden Stats Screen

The Stats tab shows a live snapshot of your garden's health:

- **Health Score Ring** — animated SVG arc counting from 0 to your score (0–100) on load. Ring colour changes red → yellow → green based on score.
- **Score Calculation** — healthy plants (+10 pts each), due-soon plants (+5 pts), overdue plants (0 pts), plus a streak bonus of up to +20 pts.
- **Watering Streak** — counts consecutive days where at least one plant was watered.
- **7-Day Activity Chart** — bar chart built from pure React Native Views showing daily watering activity.
- **Plant Status Overview** — coloured pill badges (Overdue / Due Soon / Healthy) and a per-plant status list.

---

## Project Structure

```
FloraAI/
├── App.tsx                        # Root component, notifications setup
├── app.json                       # Expo config and plugins
├── screenshots/                   # App screenshots for README
├── .env                           # API keys (not committed)
└── src/
    ├── constants/
    │   └── theme.ts               # Single source of truth: colours, typography, spacing, border radii
    ├── navigation/
    │   └── AppNavigator.tsx       # Tab navigator (My Garden + Stats) + HomeStack
    ├── screens/
    │   ├── AppSplashScreen.tsx    # Animated launch splash
    │   ├── HomeScreen.tsx         # Plant list, bell icon with overdue badge, swipe-to-delete
    │   ├── AddPlantScreen.tsx     # Add plant form + AI suggestion sheet
    │   ├── PlantDetailScreen.tsx  # Plant detail, watering health bar, photo edit
    │   ├── RemindersScreen.tsx    # Watering schedule categorised by urgency
    │   └── GardenStatsScreen.tsx  # Health ring, streak, activity chart, plant status
    ├── services/
    │   └── gemini.ts              # Gemini API client
    ├── storage/
    │   └── plantStorage.ts        # AsyncStorage data layer
    ├── types/
    │   ├── index.ts               # Shared TypeScript types
    │   └── env.d.ts               # @env module declaration
    └── utils/
        └── notifications.ts       # Local push notification helpers
```

---

## Development

This project was built using **[Claude Code](https://claude.ai/code)** as the primary AI development assistant.

Claude Code handled the full development workflow including architecture decisions, feature implementation, UI/UX design, animation work, and code reviews.

---

## License

MIT License — Copyright (c) 2026 FloraAI

---

<div align="center">

Made with care and [Claude Code](https://claude.ai/code)

</div>
