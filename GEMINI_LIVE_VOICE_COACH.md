# Gemini Live Voice Coach Setup

## What's New?

You now have a **real-time voice coach** using Google's Gemini 2.0 Live API! This provides:

- ✅ **Native voice-to-voice** conversation (no browser TTS)
- ✅ **Real-time streaming** audio
- ✅ **Lower latency** than text-based approach
- ✅ **Natural conversation** flow
- ✅ **Professional voice quality**

## How to Use

### 1. Start the WebSocket Server

In a terminal, run:

```bash
npm run server
```

You should see:
```
✅ WebSocket server ready at ws://localhost:8889
Waiting for client connections...
```

**Keep this running in the background!**

### 2. Start Your App

In another terminal:

```bash
npm run dev
```

Then open http://localhost:3000

### 3. Use the Voice Coach

1. Click the coach button to open the voice coach
2. Wait for "Connected" status (green dot)
3. Tap the big green microphone button
4. Start talking! Try: "How should I train today?"
5. The coach will respond with **real voice audio**
6. Tap the red button to stop listening

## Architecture

```
Browser (CoachDock)
   ↕ WebSocket
WebSocket Server (port 8889)
   ↕ WebSocket
Gemini Live API
```

### Files Created/Modified:

- **`server/index.ts`** - WebSocket server entry point
- **`server/ws/live-coach.ts`** - WebSocket gateway (already existed)
- **`src/hooks/useGeminiLive.ts`** - React hook for WebSocket client
- **`src/components/coach/GeminiLiveCoach.tsx`** - New voice coach UI
- **`src/App.tsx`** - Integrated GeminiLiveCoach component
- **`package.json`** - Added `npm run server` script

## Switching Between Old and New Coach

The old text-based coach is commented out in `App.tsx` (line 2863-2867).

To switch back:
1. Comment out `<GeminiLiveCoach ... />`
2. Uncomment `<CoachDock ... />`

## Troubleshooting

### "Connection Error"

Make sure the WebSocket server is running:
```bash
npm run server
```

### "WebSocket error"

Check that:
- Port 8889 is not being used by another process
- Your `.env` has `GEMINI_API_KEY` set
- You have internet connection (needs to reach Google's API)

### No audio playing

- Check your browser's audio permissions
- Make sure your speakers/headphones are working
- Check browser console for errors

### Microphone not working

- Grant microphone permission when prompted
- Check System Settings → Privacy & Security → Microphone
- Ensure your microphone is selected as the default input

## Technical Details

### Audio Format

- **Input**: PCM16, 16kHz, mono (from browser)
- **Output**: PCM16, 24kHz, mono (from Gemini)

### WebSocket Messages

**Client → Server:**
- `{ type: 'ptt_start' }` - Start recording
- `{ type: 'audio_end' }` - Stop recording
- `Buffer` - Audio data chunks

**Server → Client:**
- `{ type: 'ready' }` - Ready to receive audio
- `{ type: 'final_stt', text: '...' }` - Transcription
- `{ type: 'assistant_audio_end' }` - Coach finished speaking
- `Blob` - Audio response from coach

## Next Steps

You can enhance the coach by:
1. Adding context from workout data (readiness, session history)
2. Customizing the voice/persona
3. Adding visual transcripts of the conversation
4. Implementing conversation memory

The system prompt is in `server/ws/live-coach.ts:20-34` - customize it for your needs!
