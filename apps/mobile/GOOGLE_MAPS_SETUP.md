# Google Maps API Setup Guide for Echo App

## 🚨 Current Issue
The app is using placeholder Google Maps API keys which are causing `InvalidKeyMapError`. You need to obtain and configure your own API keys.

## 📋 Prerequisites
- Google Cloud Platform account (free tier available)
- Credit card for Google Cloud billing (required but won't be charged for free tier usage)

## 🔧 Step-by-Step Setup

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Echo App" or similar
4. Note your Project ID

### 2. Enable Required APIs
Enable the following APIs for your project:
1. Go to "APIs & Services" → "Library"
2. Search and enable:
   - **Maps JavaScript API** (for web)
   - **Maps SDK for Android** (for Android)
   - **Maps SDK for iOS** (for iOS)
   - **Geocoding API** (for address lookup)
   - **Places API** (optional, for place search)

### 3. Create API Keys

#### For Development:
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Name it "Echo App Development"
4. Click "Restrict Key"
5. Under "Application restrictions":
   - Select "None" for development (temporary)
6. Under "API restrictions":
   - Select "Restrict key"
   - Choose the APIs you enabled above
7. Save the key

#### For Production (later):
You'll need separate keys with proper restrictions:
- **Web**: HTTP referrer restrictions
- **Android**: Android app restrictions (package name + SHA-1)
- **iOS**: iOS app restrictions (bundle identifier)

### 4. Update Your Environment Files

1. Open `.env` in the Echo mobile app directory
2. Replace the placeholder values:

```env
# Replace with your actual API key
GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
```

### 5. Restart the Development Server

After updating the .env file:
```bash
# Stop the current server (Ctrl+C)
# Clear cache and restart
npx expo start --clear
```

## 💰 Billing & Free Tier

Google Maps Platform offers:
- **$200 free credit** monthly for Maps, Routes, and Places
- This typically covers:
  - ~28,000 map loads/month (Mobile Native Static Maps)
  - ~40,000 geocoding requests/month
  - Perfect for development and small-scale testing

### To avoid unexpected charges:
1. Set up billing alerts
2. Set quotas on API usage
3. Monitor usage in the Google Cloud Console

## 🔒 Security Best Practices

### For Development:
- Use unrestricted keys only locally
- Never commit actual API keys to Git
- Use `.env` files (already in .gitignore)

### For Production:
1. **Use API Key Restrictions:**
   - Web: Restrict to your domain(s)
   - Mobile: Restrict to app package/bundle ID
   
2. **Separate Keys by Platform:**
   - Web key for web app
   - Android key for Android app
   - iOS key for iOS app

3. **Monitor Usage:**
   - Set up quotas
   - Enable billing alerts
   - Review API usage regularly

## 🧪 Testing Your Setup

1. After updating the API key, run:
```bash
npx expo start --clear
```

2. Open the app in your browser or Expo Go

3. Navigate to the "Ask" tab

4. The map should load without errors

## 🐛 Troubleshooting

### "InvalidKeyMapError"
- Verify the API key is correct
- Check that required APIs are enabled
- Wait 5-10 minutes for new keys to propagate

### "RefererNotAllowedMapError" (Web)
- Add `http://localhost:*` to allowed HTTP referrers for development
- Add your production domain for production

### "ApiNotActivatedMapError"
- Enable the required APIs in Google Cloud Console
- Verify you're using the correct project

### Maps not loading on mobile
- Ensure you've added the API key to both:
  - `GOOGLE_MAPS_API_KEY` (for native)
  - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (for Expo)

## 📚 Resources
- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Get an API Key](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)
- [Pricing & Usage](https://mapsplatform.google.com/pricing/)

## ⚠️ Important Notes

1. **Never share your API keys publicly**
2. **Use different keys for development and production**
3. **Monitor your usage to avoid unexpected charges**
4. **The free tier is usually sufficient for development**

---

Once you've obtained your API key and updated the `.env` file, the Google Maps functionality in the Echo app will work properly!
