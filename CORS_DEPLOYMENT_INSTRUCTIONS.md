# Firebase Storage CORS Configuration - Deployment Instructions

## Problem

PDFs generate with error:
```
Access to image at 'https://firebasestorage.googleapis.com/...logo.jpg'
from origin 'https://marcelgaertner1234.github.io' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Symptom:** Werkstatt logo does not appear in generated PDFs (text is centered instead).

**Root Cause:** Firebase Storage doesn't allow cross-origin requests from GitHub Pages by default.

---

## Solution: Configure Firebase Storage CORS

This allows GitHub Pages (`https://marcelgaertner1234.github.io`) to access logo images from Firebase Storage.

### Prerequisites

1. **Google Cloud SDK** must be installed
2. **gsutil** command-line tool (part of Cloud SDK)
3. **Firebase project owner** permissions

---

## Step 1: Install Google Cloud SDK

### macOS (via Homebrew):
```bash
brew install --cask google-cloud-sdk
```

### macOS (Manual):
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Windows:
Download installer: https://cloud.google.com/sdk/docs/install

### Linux:
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

---

## Step 2: Authenticate with Google Cloud

```bash
gcloud auth login
```

This opens a browser window. Login with your Firebase account:
- **Email:** `werkstatt-mosbach@auto-lackierzentrum.de` (or your admin account)

---

## Step 3: Set Firebase Project

```bash
gcloud config set project auto-lackierzentrum-mosbach
```

Verify:
```bash
gcloud config list
```

Expected output:
```
[core]
account = werkstatt-mosbach@auto-lackierzentrum.de
project = auto-lackierzentrum-mosbach
```

---

## Step 4: Deploy CORS Configuration

Navigate to app directory:
```bash
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App"
```

Deploy CORS configuration:
```bash
gsutil cors set cors.json gs://auto-lackierzentrum-mosbach.firebasestorage.app
```

**Expected output:**
```
Setting CORS on gs://auto-lackierzentrum-mosbach.firebasestorage.app/...
```

---

## Step 5: Verify CORS Configuration

Check current CORS settings:
```bash
gsutil cors get gs://auto-lackierzentrum-mosbach.firebasestorage.app
```

**Expected output:**
```json
[
  {
    "origin": ["https://marcelgaertner1234.github.io"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

---

## Step 6: Test Logo Loading

1. Clear browser cache (Cmd+Shift+R on macOS)
2. Open: `https://marcelgaertner1234.github.io/Lackiererei1/annahme.html`
3. Create a new vehicle intake
4. Generate PDF

**Expected console output:**
```
✅ Logo successfully loaded for PDF
✅ PDF erstellt
```

**PDF should now include the werkstatt logo in the header!**

---

## Troubleshooting

### Error: "gsutil: command not found"
**Solution:** Install Google Cloud SDK (Step 1)

### Error: "AccessDeniedException: 403"
**Solution:** Ensure you're logged in with project owner account:
```bash
gcloud auth login
gcloud config set project auto-lackierzentrum-mosbach
```

### Error: "The specified bucket does not exist"
**Solution:** Verify bucket name:
```bash
gsutil ls
```

Expected: `gs://auto-lackierzentrum-mosbach.firebasestorage.app/`

### Logo still not loading after CORS deployment
**Solution:**
1. Wait 5 minutes for CORS propagation
2. Hard refresh browser (Cmd+Shift+R)
3. Verify CORS with: `gsutil cors get gs://...`
4. Check console for new errors

---

## Alternative: Test Locally First

If you want to test without deploying CORS:

1. Open Chrome with disabled web security (TESTING ONLY!):
   ```bash
   # macOS
   open -na "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome-cors

   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir=C:\tmp\chrome-cors
   ```

2. Navigate to: `https://marcelgaertner1234.github.io/Lackiererei1/annahme.html`

3. Logo should load (because CORS is bypassed)

**⚠️ WARNING:** Never use `--disable-web-security` for regular browsing! Only for testing.

---

## Additional Notes

- **CORS Cache:** Changes may take up to 5 minutes to propagate
- **Multiple Origins:** To allow multiple domains, add to `origin` array in `cors.json`
- **Security:** Only allows `GET` and `HEAD` methods (read-only)
- **Headers:** `Access-Control-Allow-Origin` is sent with every response
- **Cache:** Browsers cache CORS preflight for 1 hour (3600 seconds)

---

## Reverting CORS Configuration

To remove CORS configuration:
```bash
gsutil cors set /dev/null gs://auto-lackierzentrum-mosbach.firebasestorage.app
```

To restore default (no CORS):
```bash
echo '[]' > empty-cors.json
gsutil cors set empty-cors.json gs://auto-lackierzentrum-mosbach.firebasestorage.app
```

---

## Contact & Support

- **Firebase Console:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach
- **Cloud Storage Browser:** https://console.cloud.google.com/storage/browser?project=auto-lackierzentrum-mosbach
- **Documentation:** https://cloud.google.com/storage/docs/configuring-cors

---

**Last Updated:** 2025-11-13
**Status:** Pending CORS deployment (manual step required)
