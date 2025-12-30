@echo off
echo Stopping Gradle Dmeons...
cd android
call gradlew.bat --stop
cd ..

echo Cleaning Build Folders...
rmdir /s /q android\build
rmdir /s /q android\app\build
rmdir /s /q node_modules\expo-modules-core\android\build
rmdir /s /q node_modules\expo\android\build
rmdir /s /q node_modules\react-native-vector-icons\android\build

echo Starting Build...
npm run android
