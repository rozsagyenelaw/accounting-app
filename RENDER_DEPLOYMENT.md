# Deploy to Render

This guide will help you deploy the accounting app with OCR support to Render.

## Prerequisites

- Render account (free tier works)
- GitHub repository: `https://github.com/rozsagyenelaw/accounting-app`

## Deployment Steps

### 1. Create New Web Service

1. Log into your Render dashboard: https://dashboard.render.com
2. Click **"New +"** button in the top right
3. Select **"Web Service"**

### 2. Connect Repository

1. Click **"Connect account"** if you haven't connected GitHub yet
2. Or click **"Configure account"** to add this repository
3. Search for and select: `rozsagyenelaw/accounting-app`
4. Click **"Connect"**

### 3. Configure Service

Fill in the following settings:

**Basic Settings:**
- **Name**: `accounting-app` (or your preferred name)
- **Region**: Choose closest to your location
- **Branch**: `main`
- **Root Directory**: leave blank
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**:
  ```
  apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-eng poppler-utils && npm ci && npm run build
  ```
- **Start Command**:
  ```
  npm start
  ```

**Environment:**
- **Node Version**: `20`
- Add environment variable:
  - Key: `NODE_ENV`
  - Value: `production`

**Plan:**
- Select **"Free"** or **"Starter"** plan
  - Free: Good for testing (512MB RAM, sleeps after 15 min inactivity)
  - Starter ($7/mo): 512MB RAM, always on, no sleep
  - **Recommended**: Starter plan (OCR needs consistent availability)

### 4. Advanced Settings (Optional)

**Health Check Path**: `/` (default is fine)

**Auto-Deploy**: ✅ Enabled (deploys automatically on git push)

### 5. Deploy

1. Click **"Create Web Service"** button
2. Render will:
   - Clone your repository
   - Install system dependencies (Tesseract & Poppler)
   - Install Node.js dependencies
   - Build your Next.js app
   - Start the server

3. Monitor the deployment logs - you should see:
   ```
   Tesseract version: tesseract 4.x.x
   pdftoppm version: pdftoppm version x.x.x
   Building production JavaScript...
   ✓ Compiled successfully
   ```

### 6. Access Your App

Once deployed, Render provides a URL like:
```
https://accounting-app-xxxx.onrender.com
```

Your app is now live with full OCR support!

## Features Enabled

✅ **OCR Processing**: Tesseract CLI installed and configured
✅ **PDF Conversion**: Poppler utils for PDF to image conversion
✅ **No Timeout Limits**: Web Service supports long-running OCR processes
✅ **Auto-Deploy**: Pushes to main branch automatically deploy
✅ **Production Ready**: Optimized Next.js build

## Testing OCR

Upload a scanned bank statement PDF (like your BofA/Logix statements):
- Small PDFs (~5 pages): ~30 seconds
- Large PDFs (50+ pages): 2-5 minutes
- The app shows progress and warnings during OCR processing

## Troubleshooting

### Build Fails - "tesseract: command not found"
- Check that build command includes: `apt-get install -y tesseract-ocr`
- Render uses Ubuntu, so `apt-get` should work

### OCR Times Out
- Upgrade from Free to Starter plan (more RAM)
- Or consider upgrading to Standard plan for faster processing

### Service Sleeps (Free Plan)
- Free tier sleeps after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Upgrade to Starter ($7/mo) for always-on service

## Environment Variables (Optional)

Add these in Render dashboard if needed:

```
NODE_ENV=production
NODE_VERSION=20
```

## Support

- Render Docs: https://render.com/docs
- Render Status: https://status.render.com
- Your app logs available in Render dashboard

## Migration from Netlify

This app was migrated from Netlify to Render because:
- ✅ Better support for long-running processes (OCR)
- ✅ No function timeout limits on Web Services
- ✅ System package installation support
- ✅ More predictable pricing
