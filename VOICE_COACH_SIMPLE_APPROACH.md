# Simple Voice Coach Implementation (Speech-to-Text + Gemini + Text-to-Speech)

## Overview
Instead of using the complex Gemini Live API with audio streaming, use:
1. **Browser Web Speech API** for speech-to-text
2. **Gemini text API** for generating responses
3. **Browser Web Speech API** for text-to-speech

## Implementation Steps

### 1. Update `.env.local`
```
VITE_GEMINI_API_KEY=AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o
VITE_ENABLE_COACH_API=0
VITE_COACH_WS_URL=ws://localhost:8787/coach
GEMINI_API_KEY=AIzaSyAXSvvAPL05vi2f7HV42TvEX8fzFmwLO_o
```

### 2. Update `src/services.ts` - Model Names
```typescript
const GEMINI_MODELS = {
    primary: "gemini-2.5-flash",
    lite: "gemini-2.5-flash",
    heavy: "gemini-2.5-flash",
    streaming: "gemini-2.5-flash",
    tts: "gemini-2.5-flash",
} as const;
```

### 3. Modify `src/coach/useVoiceCoach.ts`

Replace the WebSocket audio streaming with:

```typescript
// Add Web Speech API speech recognition
const recognitionRef = useRef<SpeechRecognition | null>(null);
const synthRef = useRef<SpeechSynthesis | null>(null);

// Initialize speech recognition
useEffect(() => {
  if (typeof window !== 'undefined') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
    }
    synthRef.current = window.speechSynthesis;
  }
}, []);

// Start listening when PTT pressed
const startPTT = useCallback(async () => {
  if (!recognitionRef.current) {
    setError('Speech recognition not supported');
    return;
  }

  setState('listening');

  recognitionRef.current.onresult = async (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;

    if (event.results[event.results.length - 1].isFinal) {
      console.log('[VoiceCoach] Final transcript:', transcript);
      setState('thinking');

      // Send to Gemini text API
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a warm, encouraging strength training coach. Keep responses concise (1-2 sentences). User said: "${transcript}"`
                }]
              }]
            })
          }
        );

        const data = await response.json();
        const coachResponse = data.candidates[0].content.parts[0].text;

        // Speak the response
        setState('speaking');
        const utterance = new SpeechSynthesisUtterance(coachResponse);
        utterance.onend = () => setState('idle');
        synthRef.current?.speak(utterance);

      } catch (err) {
        console.error('[VoiceCoach] Error:', err);
        setError('Failed to get response');
        setState('error');
      }
    }
  };

  recognitionRef.current.onerror = (event) => {
    console.error('[VoiceCoach] Recognition error:', event.error);
    setError(`Speech recognition error: ${event.error}`);
    setState('error');
  };

  recognitionRef.current.start();
}, []);

// Stop listening when PTT released
const stopPTT = useCallback(() => {
  recognitionRef.current?.stop();
}, []);
```

### 4. Remove WebSocket Server Dependency

You no longer need:
- `server/ws/live-coach.ts`
- `server/ws/index.ts`
- The WebSocket connection code

### 5. Update `src/coach/CoachDock.tsx`

Fix the inert attribute:
```typescript
inert={overlayHidden ? (true as any) : undefined}
```

## Testing

1. Kill all background processes:
```bash
pkill -9 node
```

2. Start only the dev server:
```bash
npm run dev
```

3. Open browser at http://localhost:3000

4. Test voice coach:
   - Press and hold mic button
   - Speak your question
   - Release button
   - Wait for text response to be spoken back

## Advantages

✅ **Much simpler** - No WebSocket server needed
✅ **More reliable** - Browser APIs are stable
✅ **Faster** - Direct API calls, no streaming overhead
✅ **Easier to debug** - Text-based, can see what's being sent/received
✅ **Works offline for speech** - Browser handles speech recognition locally

## Browser Support

- Chrome/Edge: ✅ Full support
- Safari: ✅ Full support (with webkit prefix)
- Firefox: ⚠️ No Web Speech API (needs polyfill)

## Current Issues Fixed

1. ✅ API key updated to working key
2. ✅ Model name corrected (gemini-2.5-flash)
3. ✅ React inert warning fixed
4. ✅ Removed complex WebSocket/Live API implementation
5. ✅ Simpler, more maintainable code
