# SkillBridge AI — Direct Android APK Build & Distribution Guide

This guide describes how to configure, sign, build, and distribute the SkillBridge AI Android client application directly to learners via trusted download links without requiring publication to the Google Play Store.

---

## 1. Security Rules for Mobile Distribution

> [!CAUTION]
> - **NEVER** package backend API secrets, database passwords, or administrative credentials inside the mobile application.
> - Mobile clients only consume public endpoints using student JWT bearer tokens.
> - Always point production builds to an **HTTPS** API endpoint.

---

## 2. Step 1: Create a Production Release Keystore

Generate an RSA 2048-bit release keystore using the Java `keytool` command.

In Windows PowerShell:
```powershell
keytool -genkey -v -keystore C:\Users\darsh\skillbridge-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias skillbridge
```

You will be prompted for:
1. Keystore password (choose a strong password and save it in a password manager).
2. Developer information (Name, Organization, City, Country).
3. Key password.

---

## 3. Step 2: Configure Android Signing Properties

1. Create a file named `key.properties` inside `mobile_app/android/`:
   ```properties
   storePassword=YOUR_KEYSTORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=skillbridge
   storeFile=C:\\Users\\darsh\\skillbridge-release.jks
   ```

2. **Verify Git Isolation:**
   Check that `mobile_app/.gitignore` contains:
   ```gitignore
   key.properties
   *.jks
   *.keystore
   ```

3. Ensure `mobile_app/android/app/build.gradle` references `key.properties`:
   ```groovy
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       signingConfigs {
           release {
               if (keystorePropertiesFile.exists()) {
                   keyAlias keystoreProperties['keyAlias']
                   keyPassword keystoreProperties['keyPassword']
                   storeFile file(keystoreProperties['storeFile'])
                   storePassword keystoreProperties['storePassword']
               }
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               shrinkResources true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

---

## 4. Step 3: Configure Target API Base URL

The SkillBridge AI app uses `--dart-define` to inject the backend API URL at build time without modifying source code.

For your deployed backend:
```bash
--dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1
```

---

## 5. Step 4: Build the Release APK

Open PowerShell, navigate to the mobile app directory, and run:

```powershell
cd c:\nagmamobileApp\mobile_app
flutter clean
flutter pub get
flutter build apk --release --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1
```

To build split per-ABI APKs (reduces download file size for learners):
```powershell
flutter build apk --release --split-per-abi --dart-define=API_BASE_URL=https://api.yourdomain.com/api/v1
```

---

## 6. Step 5: Locate the Generated APK

After compilation completes, the release file is located at:
```
mobile_app/build/app/outputs/flutter-apk/app-release.apk
```
(Or `app-arm64-v8a-release.apk` if built with `--split-per-abi`).

---

## 7. Step 6: Install on a Test Phone

### Method A: Via USB / ADB (Fastest for testing)
1. Enable **Developer Options** and **USB Debugging** on your Android device.
2. Connect phone via USB.
3. Verify connection:
   ```powershell
   adb devices
   ```
4. Install APK directly:
   ```powershell
   adb install -r build\app\outputs\flutter-apk\app-release.apk
   ```

### Method B: Direct Sideloading via Browser / Messaging
1. Upload `app-release.apk` to a cloud drive (Google Drive, Dropbox, S3) or send via WhatsApp/Telegram.
2. Download the APK file on the phone.
3. Tap the downloaded file.
4. If Android displays **"Blocked by Play Protect"** or **"Install Unknown Apps"**:
   - Tap **Settings** -> Enable **"Allow from this source"**.
   - Tap **Install**.

---

## 8. Step 7: Distribute to Students via Trusted Link

Host the APK on a trusted, reliable HTTPS endpoint:

1. **Option 1: Static Hosting on Your Domain (Recommended)**
   - Upload `skillbridge-v1.0.apk` to `https://download.yourdomain.com/skillbridge.apk`
   - Provide a download button on the student landing page.
2. **Option 2: AWS S3 + CloudFront CDN**
   - Store APK in an S3 bucket with CloudFront distribution for fast global downloads.
3. **Option 3: GitHub Releases**
   - Attach `app-release.apk` as a binary asset to a tagged GitHub release.

---

## 9. Step 8: Updating the Application in the Future

When releasing updates:
1. Increment `version` in `mobile_app/pubspec.yaml`:
   ```yaml
   version: 1.0.1+2   # (major.minor.patch + build_number)
   ```
2. Build new release APK signed with the **same** keystore.
   > [!IMPORTANT]
   > Android will only allow seamless updates if the new APK is signed with the identical keystore and alias as the original version.
3. Distribute the new APK link.
4. When learners tap and install the updated APK, Android retains all existing user data, logins, and cached mastery without requiring uninstall.
