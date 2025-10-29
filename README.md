<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

**Note:** Gemini API key configured in Netlify environment variables.

View your app in AI Studio: https://ai.studio/apps/drive/19b7wJZwKVb9Pfg4S8X6p-4uHryt26fqK

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Netlify

This repo ships with a [`netlify.toml`](netlify.toml) so you can drop the `dist/` folder straight onto Netlify.

1. Build the app locally:
   ```bash
   npm run build
   ```
2. Deploy the contents of `dist/`:
   - either drag-and-drop `dist/` in the Netlify UI, or
   - push the repo and let Netlify run `npm run build`.
3. Netlify will serve the bundle as an SPA (all routes fall back to `index.html`).
4. **When updating Gemini dependencies**: open Netlify → *Build & deploy* → **Clear cache and deploy site** so function bundles pick up the latest server code. Confirm `GEMINI_API_KEY` is set under Site settings → *Environment variables*. After deploy, check the function logs for a line similar to  
   ```
   [GenAI] surface: { hasGenerateContent: true, hasGetGenerativeModel: false, ... }
   ```
   to verify the @google/genai surface is active.

> **Gemini usage**  
> By default the production bundle runs in offline/fallback mode (`VITE_ENABLE_GEMINI` is treated as `false`).  
> If you want live Gemini features, add the following environment variables in Netlify:
> - `VITE_ENABLE_GEMINI=1`
> - `VITE_GEMINI_API_KEY=<your key>` (and any endpoint overrides you use locally)
# symmetriccoachvoice
