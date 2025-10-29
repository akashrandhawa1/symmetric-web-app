import WebSocket from 'ws';

export function connectGeminiLive(apiKey: string, model = 'gemini-2.5-flash-live') {
  const url = `wss://generativelanguage.googleapis.com/v1beta/models/${model}:connect`;
  return new WebSocket(url, {
    headers: {
      'Sec-WebSocket-Protocol': 'v1',
      'x-goog-api-key': apiKey,
    },
  });
}
