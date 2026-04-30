<div align="center">

```
        🌿
       🌿🌿
      🌿🌿🌿
     🌿🌿🌿🌿
        ||
        ||
```

# FloraAI

**Your AI-powered plant care companion 🌿**

[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?style=flat-square&logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev)

</div>

---

## 🌱 About

FloraAI is an AI-powered plant care app built with React Native and Expo. It helps you track all your plants, stay on top of watering schedules, and get personalised care advice — all in one beautiful, nature-themed interface.

When you add a plant, FloraAI uses the **Google Gemini API** to instantly suggest a watering frequency, care tips, and difficulty level based on the specific plant name and type you enter. No guesswork — just smart, personalised plant care.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌱 **Plant Management** | Add, view, and remove plants from your personal garden |
| 💧 **Watering Schedules** | Set custom watering frequencies and track when plants need water |
| 🤖 **AI Care Suggestions** | Tap a plant type to get instant Gemini-powered care tips |
| 📅 **Watering History** | Track when each plant was last watered |
| 🔔 **Push Notifications** | Get reminded at 9 AM on each plant's watering day |
| 📸 **Plant Photos** | Attach camera or gallery photos to each plant |
| 📱 **Cross-Platform** | Works on both iOS and Android via Expo Go or a dev build |

---

## 📸 Screenshots

<!-- Add screenshots here -->

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| **React Native + Expo** | Cross-platform mobile framework |
| **TypeScript** | Type-safe development |
| **React Navigation** | Bottom tab + native stack navigation |
| **AsyncStorage** | Local persistent data storage |
| **Google Gemini AI** | AI-powered plant care suggestions (`gemini-2.5-flash`) |
| **expo-notifications** | Local push notifications for watering reminders |
| **expo-image-picker** | Camera and gallery photo selection |
| **React Native Gesture Handler** | Swipe-to-delete interactions |
| **expo-linear-gradient** | Gradient UI elements and AI sheet styling |
| **expo-haptics** | Haptic feedback throughout the app |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v18 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — `npm install -g expo-cli`
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
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   > ⚠️ Never commit your `.env` file. It is already listed in `.gitignore`.

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

## 🤖 AI Features

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

- **💧 Watering Frequency** — how often to water (in days), auto-selected on the frequency chips
- **🎯 Difficulty** — Easy / Medium / Hard badge with colour coding
- **💡 Care Tip** — a concise, plant-specific care tip (max 20 words)

> The AI call is triggered **only** when a plant type card is tapped — never while typing.

---

## 📁 Project Structure

```
FloraAI/
├── App.tsx                        # Root component, notifications setup
├── app.json                       # Expo config and plugins
├── .env                           # API keys (not committed)
└── src/
    ├── constants/
    │   └── theme.ts               # Colours, typography, spacing
    ├── navigation/
    │   └── AppNavigator.tsx       # Tab + stack navigation
    ├── screens/
    │   ├── AppSplashScreen.tsx    # Animated launch splash
    │   ├── HomeScreen.tsx         # Plant list with swipe-to-delete
    │   ├── AddPlantScreen.tsx     # Add plant form + AI suggestion sheet
    │   ├── PlantDetailScreen.tsx  # Plant detail, watering, photo edit
    │   └── RemindersScreen.tsx    # Upcoming watering schedule
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

## 👩‍💻 Development

This project was built using **[Claude Code](https://claude.ai/code)** as the primary AI development assistant.

Claude Code handled the full development workflow including:
- 🏗️ Project scaffolding and architecture decisions
- ✨ Feature implementation (AI suggestions, notifications, photo picker, swipe gestures)
- 🐛 Bug diagnosis and fixes
- 🎨 UI/UX design and animation work
- 🔒 Security (`.env` handling, API key safety)
- 📝 Code reviews and refactoring

> Claude Code is Anthropic's AI-powered CLI that works directly inside your terminal and IDE, turning natural language instructions into working code.

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 FloraAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

<div align="center">

Made with 🌿 and [Claude Code](https://claude.ai/code)

</div>
