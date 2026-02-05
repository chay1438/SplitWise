# Project Fully Migrated to React Native CLI

## 🚀 Status
This project has been fully migrated from an "Expo Prebuild" workflow to a standard **Vanilla React Native** workflow.

- **Removed**: `expo`, `expo-status-bar`, `expo-linear-gradient`, `@expo/vector-icons`
- **Updated**: `package.json` scripts, `index.ts` entry point

## 📜 New Command Reference

| Action | Old Command (DO NOT USE) | **New Command** |
| :--- | :--- | :--- |
| **Start Server** | `npx expo start` | `npm start` (or `npx react-native start`) |
| **Run Android** | `npx expo run:android` | `npm run android` (or `npx react-native run-android`) |
| **Run iOS** | `npx expo run:ios` | `npm run ios` (or `npx react-native run-ios`) |

## 🛠️ Debugging

### "Unable to resolve module expo"
If you see this error, check `index.ts`. It should use `AppRegistry` from `react-native`, not `registerRootComponent`.

### "No bundle URL present"
1.  Run `npm start` in one terminal.
2.  Run `npm run android` in another.

### "Task 'installDebug' not found"
This happens if the android project is out of sync.
Run:
```bash
cd android && gradlew clean
```
Then try `npm run android` again.

## ⚠️ Important Note on Native Modules
Since you are now using standard React Native, any new library you install that requires native linking (like `react-native-maps`, etc.) will be autolinked. ALWAYS run `npm run android` after installing a new library to rebuild the binary.
