"use strict";
/**
 * Voice Coach Gateway using Gemini Live API
 *
 * This server bridges WebSocket connections between:
 * Browser (client) <-> This Server <-> Gemini Live API
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLiveCoachGateway = createLiveCoachGateway;
require("dotenv/config");
var http_1 = require("http");
var ws_1 = require("ws");
var GEMINI_LIVE_API_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';
var formatNumber = function (value, suffix) {
    if (suffix === void 0) { suffix = ''; }
    if (typeof value !== 'number' || Number.isNaN(value))
        return null;
    return "".concat(Math.round(value)).concat(suffix);
};
var summariseContext = function (ctx, events) {
    var _a, _b, _c, _d, _e, _f;
    if (events === void 0) { events = []; }
    if (!ctx)
        return null;
    var lines = [];
    // Current state
    lines.push("Context: phase=".concat(ctx.sessionPhase, "; readiness=").concat(Math.round(ctx.readiness), "; goal=").concat((_a = ctx.goal) !== null && _a !== void 0 ? _a : 'build_strength'));
    var symmetry = formatNumber((_b = ctx.metrics) === null || _b === void 0 ? void 0 : _b.symmetryPct, '%');
    var fatigue = formatNumber((_c = ctx.metrics) === null || _c === void 0 ? void 0 : _c.rmsDropPct, '%');
    var ror = (_d = ctx.metrics) === null || _d === void 0 ? void 0 : _d.ror;
    if (symmetry)
        lines.push("Symmetry ".concat(symmetry));
    if (fatigue)
        lines.push("Fatigue ".concat(fatigue));
    if (ror)
        lines.push("Rate of recovery trend ".concat(ror));
    if ((_e = ctx.userFlags) === null || _e === void 0 ? void 0 : _e.tired)
        lines.push('Athlete reported feeling tired');
    if ((_f = ctx.userFlags) === null || _f === void 0 ? void 0 : _f.pain)
        lines.push('Athlete reported pain or discomfort');
    if (ctx.lastSet) {
        var _g = ctx.lastSet, exercise = _g.exercise, reps = _g.reps, rpe = _g.rpe;
        var parts = ["Last set: ".concat(exercise), "reps=".concat(reps)];
        if (typeof rpe === 'number')
            parts.push("RPE ".concat(rpe));
        lines.push(parts.join(', '));
    }
    var describePlanSet = function (set) {
        var _a;
        if (!set)
            return null;
        var parts = [];
        var setLabel = set.setNumber && set.totalSets
            ? "set ".concat(set.setNumber, "/").concat(set.totalSets)
            : set.setNumber
                ? "set ".concat(set.setNumber)
                : null;
        var baseName = (_a = set.exercise) !== null && _a !== void 0 ? _a : 'set';
        var name = set.blockLabel ? "".concat(baseName, " (").concat(set.blockLabel, ")") : baseName;
        parts.push(name);
        if (setLabel)
            parts.push(setLabel);
        if (set.reps)
            parts.push("".concat(set.reps, " reps"));
        if (set.tempo)
            parts.push("tempo ".concat(set.tempo));
        if (typeof set.restSeconds === 'number' && Number.isFinite(set.restSeconds)) {
            parts.push("rest ".concat(Math.round(set.restSeconds), "s"));
        }
        if (set.loadAdjustment && set.loadAdjustment !== 'n/a') {
            parts.push("load ".concat(set.loadAdjustment));
        }
        return parts.join(', ');
    };
    // Session history (last 2 workouts for speed)
    if (ctx.sessionHistory && ctx.sessionHistory.length > 0) {
        lines.push('');
        lines.push('Recent workouts:');
        ctx.sessionHistory.slice(-2).reverse().forEach(function (session) {
            // Parse date
            var timestampMs = Date.now();
            if (typeof session.date === 'number') {
                timestampMs = session.date > 10000000000 ? session.date : session.date * 1000;
            }
            else if (typeof session.date === 'string') {
                timestampMs = new Date(session.date).getTime();
            }
            var daysAgo = Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
            var timeLabel = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : "".concat(daysAgo, "d ago");
            var parts = [timeLabel];
            parts.push("readiness ".concat(session.readinessPre, "\u2192").concat(session.readinessPost));
            if (session.effectiveReps > 0)
                parts.push("".concat(session.effectiveReps, " effective reps"));
            if (session.balanceScore > 0)
                parts.push("balance ".concat(Math.round(session.balanceScore), "%"));
            lines.push("\u2022 ".concat(parts.join(', ')));
        });
    }
    var plan = ctx.plan;
    if (plan) {
        var planLines = [];
        if (plan.intent) {
            var intentLabel = plan.intent.replace(/_/g, ' ');
            planLines.push("Intent ".concat(intentLabel));
        }
        if (typeof plan.totalSets === 'number' && plan.totalSets > 0) {
            var completed = typeof plan.completedSets === 'number' ? plan.completedSets : 0;
            var remaining = typeof plan.remainingSets === 'number'
                ? plan.remainingSets
                : Math.max(0, plan.totalSets - completed);
            planLines.push("Sets ".concat(completed, "/").concat(plan.totalSets, " done (").concat(remaining, " remaining)"));
        }
        var lastPlanSet = describePlanSet(plan.last);
        var nextPlanSet = describePlanSet(plan.next);
        if (lastPlanSet) {
            planLines.push("Last planned set: ".concat(lastPlanSet));
        }
        if (nextPlanSet) {
            planLines.push("Next planned set: ".concat(nextPlanSet));
        }
        if (planLines.length > 0) {
            lines.push('');
            lines.push('Session plan:');
            planLines.forEach(function (line) { return lines.push("\u2022 ".concat(line)); });
        }
    }
    // Recent events (less important now that we have session history)
    if (events.length) {
        var eventLines = events
            .slice(-2)
            .map(function (event) { return "\u2022 ".concat(event.type); });
        if (eventLines.length > 0) {
            lines.push('');
            lines.push('Recent events:');
            lines.push.apply(lines, eventLines);
        }
    }
    var summary = lines.join('\n');
    return summary.length > 800 ? "".concat(summary.slice(0, 800), "\u2026") : summary;
};
var primeGeminiWithContext = function (session) {
    if (!session.geminiWs || session.geminiWs.readyState !== ws_1.WebSocket.OPEN)
        return;
    var summary = summariseContext(session.context, session.events);
    if (!summary || summary === session.lastContextSummary)
        return;
    session.lastContextSummary = summary;
    session.contextPrimedToken += 1;
    session.geminiWs.send(JSON.stringify({
        clientContent: {
            turns: [
                {
                    role: 'user',
                    parts: [{ text: "".concat(summary, "\nUse this context when coaching.") }],
                },
            ],
            turnComplete: false,
        },
    }));
};
var updateSessionContext = function (session, context, events) {
    if (context) {
        session.context = context;
    }
    if (Array.isArray(events)) {
        session.events = events;
    }
};
var SYSTEM_INSTRUCTION = {
    parts: [{
            text: "You are Symmetric's AI coach for leg training. Be specific and decisive using the data provided.\n\nDecision guide:\n\u2022 Readiness \u226580 + fatigue <15% \u2192 3 sets at 75-80%, 8-10 reps, rest 2min\n\u2022 Readiness 60-79 \u2192 1-2 quality sets at 70%\n\u2022 Readiness <60 or fatigue >25% \u2192 active recovery (light cardio + mobility 20-30min)\n\nRules:\n- Use specific numbers from context (readiness, reps, balance)\n- Don't ask questions - make recommendations\n- Reference past sessions when available\n- Format: [exercise] x [sets] sets of [reps] reps at [load%], rest [time]\n\nKeep responses under 60 words. No medical advice or singing/voice training."
        }]
};
function createLiveCoachGateway(port) {
    var _this = this;
    var httpServer = (0, http_1.createServer)(function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Coach Milo gateway online\n');
    });
    var wss = new ws_1.WebSocketServer({ server: httpServer });
    wss.on('connection', function (clientWs, request) { return __awaiter(_this, void 0, void 0, function () {
        var apiKey, session, geminiUrl, geminiWs_1;
        var _this = this;
        return __generator(this, function (_a) {
            console.log('[LiveCoach] Client connected');
            apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.error('[LiveCoach] GEMINI_API_KEY not set');
                clientWs.send(JSON.stringify({
                    type: 'error',
                    code: 'missing_api_key',
                    message: 'Server configuration error: GEMINI_API_KEY not set'
                }));
                clientWs.close();
                return [2 /*return*/];
            }
            session = {
                clientWs: clientWs,
                geminiWs: null,
                apiKey: apiKey,
                events: [],
                contextPrimedToken: 0,
            };
            // Connect to Gemini Live API
            try {
                geminiUrl = "".concat(GEMINI_LIVE_API_URL, "?key=").concat(apiKey);
                geminiWs_1 = new ws_1.WebSocket(geminiUrl);
                session.geminiWs = geminiWs_1;
                geminiWs_1.on('open', function () {
                    console.log('[LiveCoach] Connected to Gemini Live API');
                    // Send setup message to Gemini
                    var setupMessage = {
                        setup: {
                            model: 'models/gemini-2.0-flash-exp',
                            generation_config: {
                                response_modalities: ['AUDIO'],
                                speech_config: {
                                    voice_config: {
                                        prebuilt_voice_config: {
                                            voice_name: 'Kore'
                                        }
                                    }
                                }
                            },
                            system_instruction: SYSTEM_INSTRUCTION
                        }
                    };
                    geminiWs_1.send(JSON.stringify(setupMessage));
                    console.log('[LiveCoach] Sent setup to Gemini');
                });
                geminiWs_1.on('message', function (data) {
                    var _a, _b, _c, _d;
                    // Forward Gemini responses to client
                    try {
                        var message = JSON.parse(data.toString());
                        console.log('[LiveCoach] Gemini -> Client:', JSON.stringify(message).substring(0, 200));
                        // Transform Gemini Live API format to our client format
                        if (message.setupComplete) {
                            clientWs.send(JSON.stringify({ type: 'ready' }));
                        }
                        if ((_a = message.serverContent) === null || _a === void 0 ? void 0 : _a.modelTurn) {
                            var turn = message.serverContent.modelTurn;
                            if (turn.parts) {
                                for (var _i = 0, _e = turn.parts; _i < _e.length; _i++) {
                                    var part = _e[_i];
                                    if (part.text) {
                                        clientWs.send(JSON.stringify({
                                            type: 'final_stt',
                                            text: part.text,
                                        }));
                                        clientWs.send(JSON.stringify({
                                            type: 'assistant_text',
                                            text: part.text,
                                        }));
                                    }
                                    if ((_c = (_b = part.inlineData) === null || _b === void 0 ? void 0 : _b.mimeType) === null || _c === void 0 ? void 0 : _c.startsWith('audio/pcm')) {
                                        console.log('[LiveCoach] Sending audio to client, size:', part.inlineData.data.length);
                                        var audioData = Buffer.from(part.inlineData.data, 'base64');
                                        clientWs.send(audioData);
                                    }
                                }
                            }
                        }
                        if ((_d = message.serverContent) === null || _d === void 0 ? void 0 : _d.turnComplete) {
                            clientWs.send(JSON.stringify({ type: 'assistant_audio_end' }));
                        }
                    }
                    catch (err) {
                        console.error('[LiveCoach] Error processing Gemini message:', err);
                    }
                });
                geminiWs_1.on('error', function (error) {
                    console.error('[LiveCoach] Gemini WebSocket error:', error);
                    clientWs.send(JSON.stringify({
                        type: 'error',
                        code: 'gemini_error',
                        message: 'Connection to AI service failed'
                    }));
                });
                geminiWs_1.on('close', function (code, reason) {
                    console.log('[LiveCoach] Gemini connection closed, code:', code, 'reason:', reason.toString());
                    clientWs.close();
                });
            }
            catch (error) {
                console.error('[LiveCoach] Failed to connect to Gemini:', error);
                clientWs.send(JSON.stringify({
                    type: 'error',
                    code: 'connection_failed',
                    message: 'Failed to connect to AI service'
                }));
                clientWs.close();
                return [2 /*return*/];
            }
            // Handle client messages
            clientWs.on('message', function (data) { return __awaiter(_this, void 0, void 0, function () {
                var text, firstNonWhitespace, i, byte, firstChar, message, summary, promptText, base64Audio;
                return __generator(this, function (_a) {
                    console.log('[LiveCoach] Received from client:', typeof data, data instanceof Buffer ? "Buffer(".concat(data.length, ")") : 'string');
                    if (!session.geminiWs || session.geminiWs.readyState !== ws_1.WebSocket.OPEN) {
                        console.error('[LiveCoach] Gemini not connected');
                        return [2 /*return*/];
                    }
                    // Handle JSON messages from client
                    if (typeof data === 'string' || data instanceof Buffer) {
                        text = null;
                        if (typeof data === 'string') {
                            text = data;
                        }
                        else {
                            firstNonWhitespace = void 0;
                            for (i = 0; i < data.length; i += 1) {
                                byte = data[i];
                                if (byte === 9 || byte === 10 || byte === 13 || byte === 32)
                                    continue; // tab, lf, cr, space
                                firstNonWhitespace = byte;
                                break;
                            }
                            if (firstNonWhitespace === 123 || firstNonWhitespace === 91) {
                                text = data.toString('utf8');
                            }
                        }
                        if (text == null) {
                            // Not JSON-like, skip to audio handling
                        }
                        else {
                            firstChar = text.trimStart().charAt(0);
                            if (firstChar === '{' || firstChar === '[') {
                                try {
                                    message = JSON.parse(text);
                                    console.log('[LiveCoach] Client message:', message.type);
                                    switch (message.type) {
                                        case 'context_update':
                                            updateSessionContext(session, message.context, message.events);
                                            primeGeminiWithContext(session);
                                            break;
                                        case 'ptt_start':
                                            updateSessionContext(session, message.context, message.events);
                                            primeGeminiWithContext(session);
                                            console.log('[LiveCoach] PTT started, ready for audio');
                                            break;
                                        case 'audio_end':
                                            // End of audio stream - Don't send anything to Gemini
                                            // Gemini will automatically detect the end of speech and respond
                                            console.log('[LiveCoach] Audio stream ended, waiting for Gemini response');
                                            break;
                                        case 'barge_in':
                                            // Interrupt Gemini
                                            session.geminiWs.send(JSON.stringify({
                                                clientContent: {
                                                    turnComplete: true
                                                }
                                            }));
                                            break;
                                        case 'user_turn':
                                            // Text-based turn
                                            if (message.text) {
                                                updateSessionContext(session, message.context, message.events);
                                                primeGeminiWithContext(session);
                                                summary = summariseContext(session.context, session.events);
                                                promptText = summary
                                                    ? "".concat(summary, "\n\nAthlete said: ").concat(message.text)
                                                    : message.text;
                                                session.geminiWs.send(JSON.stringify({
                                                    clientContent: {
                                                        turns: [{
                                                                role: 'user',
                                                                parts: [{ text: promptText }]
                                                            }],
                                                        turnComplete: true
                                                    }
                                                }));
                                            }
                                            break;
                                    }
                                    return [2 /*return*/];
                                }
                                catch (err) {
                                    // Not JSON, might be audio buffer
                                }
                            }
                        }
                        // Handle audio data from client
                        if (data instanceof Buffer && data.length >= 500) {
                            console.log('[LiveCoach] Sending audio chunk to Gemini, size:', data.length);
                            base64Audio = data.toString('base64');
                            session.geminiWs.send(JSON.stringify({
                                realtimeInput: {
                                    audio: {
                                        mimeType: 'audio/pcm;rate=16000',
                                        data: base64Audio
                                    }
                                }
                            }));
                        }
                    }
                    return [2 /*return*/];
                });
            }); });
            clientWs.on('close', function () {
                console.log('[LiveCoach] Client disconnected');
                if (session.geminiWs) {
                    session.geminiWs.close();
                }
            });
            clientWs.on('error', function (error) {
                console.error('[LiveCoach] Client WebSocket error:', error);
            });
            return [2 /*return*/];
        });
    }); });
    httpServer.listen(port, '0.0.0.0', function () {
        console.log("[LiveCoach] Server listening on :".concat(port));
    });
    return { server: httpServer, wss: wss };
}
// Start server if run directly
var port = Number((_b = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : process.env.COACH_WS_PORT) !== null && _b !== void 0 ? _b : 8787);
createLiveCoachGateway(port);
