# FloraAI - Project Guide for Claude

## What this app is
FloraAI is an AI-powered plant care reminder app built with 
React Native and Expo. Users can add their plants, set watering 
schedules, and get reminders when to water them.

## Tech Stack
- React Native with Expo
- TypeScript
- React Navigation (bottom tab + stack)
- AsyncStorage for local data
- react-native-safe-area-context for device insets

## Project Structure
- src/screens/ — all app screens
- src/storage/ — AsyncStorage data layer
- src/types/ — TypeScript types
- src/constants/ — theme, colors, spacing
- src/navigation/ — navigation setup

## Code Rules
- Always use TypeScript, never plain JavaScript
- Always use functional components with hooks
- Always use SafeAreaView for screens
- Follow the existing green nature theme in theme.ts
- Keep components clean and well commented
- Test changes work on both iOS and Android

## Design Rules
- Primary color is green, keep nature theme consistent
- Use emojis for plant types
- Keep UI minimal and clean
- Cards should have subtle shadows and rounded corners

## Git Rules
- Use conventional commits: feat:, fix:, chore:, docs:
- Write clear descriptive commit messages
- Commit after every meaningful change

## Current Screens
- HomeScreen — plant list with water/delete actions
- AddPlantScreen — form to add new plants
- PlantDetailScreen — plant info and care history
- RemindersScreen — upcoming watering schedule

## Future Features to Build
- Plant identification via camera
- Push notifications for watering reminders
- Plant health diagnosis from photos
- Care tips per plant type
