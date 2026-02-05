/**
 * OFFICIAL HONEYPOT API FOR GUVI HACKATHON SUBMISSION
 * 
 * This file implements the exact API specification from Problem Statement 2
 * 
 * Expected Request Format:
 * {
 *   "sessionId": "abc123-session-id",
 *   "message": {
 *     "sender": "scammer",
 *     "text": "Your bank account will be blocked today. Verify immediately.",
 *     "timestamp": 1770005528731
 *   },
 *   "conversationHistory": [],
 *   "metadata": {
 *     "channel": "SMS",
 *     "language": "English",
 *     "locale": "IN"
 *   }
 * }
 * 
 * Expected Response Format:
 * {
 *   "status": "success",
 *   "reply": "Why is my account being suspended?"
 * }
 */

import axios from 'axios';

// Session storage for tracking conversations
interface HoneypotSession {
    sessionId: string;
    conversationHistory: Array<{
        sender: string;
        text: string;
        timestamp: number;
    }>;
    extractedIntelligence: {
        bankAccounts: string[];
        upiIds: string[];
        phishingLinks: string[];
        phoneNumbers: string[];
        suspiciousKeywords: string[];
    };
    scamDetected: boolean;
    totalMessagesExchanged: number;
    agentState: {
        currentGoal: 'GATHER_INFO' | 'EXTRACT_INTEL' | 'EXIT_SAFELY';
        hasSentFinalReport: boolean;
    };
}

// In-memory session storage
const sessions = new Map<string, HoneypotSession>();

// Get or create session
function getOrCreateHoneypotSession(sessionId: string): HoneypotSession {
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            sessionId,
            conversationHistory: [],
            extractedIntelligence: {
                bankAccounts: [],
                upiIds: [],
                phishingLinks: [],
                phoneNumbers: [],
                suspiciousKeywords: []
            },
            scamDetected: false,
            totalMessagesExchanged: 0,
            agentState: {
                currentGoal: 'GATHER_INFO',
                hasSentFinalReport: false
            }
        });
    }
    return sessions.get(sessionId)!;
}

// Extract intelligence from message
function extractIntelligence(text: string, session: HoneypotSession) {
    const lowerText = text.toLowerCase();

    // UPI IDs
    const upiRegex = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/g;
    const upiMatches = text.match(upiRegex);
    if (upiMatches) {
        upiMatches.forEach(match => {
            if (!session.extractedIntelligence.upiIds.includes(match)) {
                session.extractedIntelligence.upiIds.push(match);
            }
        });
    }

    // Bank Account Numbers (9-18 digits)
    const accRegex = /\b\d{9,18}\b/g;
    const accMatches = text.match(accRegex);
    if (accMatches && (lowerText.includes('account') || lowerText.includes('bank'))) {
        accMatches.forEach(match => {
            if (!session.extractedIntelligence.bankAccounts.includes(match)) {
                session.extractedIntelligence.bankAccounts.push(match);
            }
        });
    }

    // URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatches = text.match(urlRegex);
    if (urlMatches) {
        urlMatches.forEach(match => {
            if (!session.extractedIntelligence.phishingLinks.includes(match)) {
                session.extractedIntelligence.phishingLinks.push(match);
            }
        });
    }

    // Phone Numbers
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phoneMatches = text.match(phoneRegex);
    if (phoneMatches) {
        phoneMatches.forEach(match => {
            const normalized = match.replace(/[^\d+]/g, '');
            if (!session.extractedIntelligence.phoneNumbers.includes(normalized)) {
                session.extractedIntelligence.phoneNumbers.push(normalized);
            }
        });
    }

    // Suspicious Keywords
    const suspiciousKeywords = [
        'urgent', 'verify', 'account blocked', 'suspended', 'immediately',
        'upi', 'transfer', 'payment', 'bank', 'verify now', 'click here'
    ];

    suspiciousKeywords.forEach(keyword => {
        if (lowerText.includes(keyword) && !session.extractedIntelligence.suspiciousKeywords.includes(keyword)) {
            session.extractedIntelligence.suspiciousKeywords.push(keyword);
        }
    });
}

// Detect if message is a scam
function detectScam(text: string): boolean {
    const lowerText = text.toLowerCase();

    const scamIndicators = [
        'account blocked', 'account suspended', 'verify immediately',
        'urgent action', 'payment required', 'click here', 'upi id',
        'send money', 'transfer now', 'bank details', 'ifsc code'
    ];

    return scamIndicators.some(indicator => lowerText.includes(indicator));
}

// Generate agent response using Gemini
async function generateAgentResponseWithGemini(
    scammerMessage: string,
    conversationHistory: Array<{ sender: string; text: string; timestamp: number }>,
    session: HoneypotSession
): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
        console.warn('⚠️ GEMINI_API_KEY not found, using rule-based responses');
        return generateRuleBasedResponse(scammerMessage, session);
    }

    try {
        // Build conversation context
        const conversationContext = conversationHistory
            .map(msg => `${msg.sender}: ${msg.text}`)
            .join('\n');

        const systemPrompt = `You are an AI agent pretending to be a naive, confused victim in a scam honeypot. Your goals:

1. **Stay in Character**: You're a worried, slightly tech-illiterate person who is concerned about the scammer's claims
2. **Ask Questions**: Ask naive questions that encourage the scammer to reveal more information (UPI IDs, bank accounts, links, phone numbers)
3. **Show Concern but Hesitation**: Express worry but never immediately comply
4. **Extract Intelligence**: Guide the conversation to make the scammer share:
   - UPI IDs
   - Bank account numbers
   - Phishing links
   - Phone numbers
   - Payment amounts

5. **Keep it Short**: One sentence, maximum 15 words
6. **Never Reveal Detection**: Do not expose that you know it's a scam

Current Goal: ${session.agentState.currentGoal}
Intelligence Collected: ${session.extractedIntelligence.upiIds.length} UPIs, ${session.extractedIntelligence.bankAccounts.length} accounts

Conversation so far:
${conversationContext}

Scammer's latest message: ${scammerMessage}

Respond as a confused victim. Ask ONE clarifying question.`;

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: systemPrompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 50,
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (generatedText && generatedText.trim()) {
            return generatedText.trim();
        }

        console.warn('⚠️ Gemini returned empty response, falling back to rule-based');
        return generateRuleBasedResponse(scammerMessage, session);

    } catch (error) {
        console.error('❌ Gemini API error:', error instanceof Error ? error.message : error);
        return generateRuleBasedResponse(scammerMessage, session);
    }
}

// Rule-based response generator (fallback)
function generateRuleBasedResponse(scammerMessage: string, session: HoneypotSession): string {
    const lowerText = scammerMessage.toLowerCase();

    // First message responses
    if (session.totalMessagesExchanged === 1) {
        if (lowerText.includes('block') || lowerText.includes('suspend')) {
            return "Why is my account being suspended?";
        }
        if (lowerText.includes('payment') || lowerText.includes('due')) {
            return "What payment are you talking about?";
        }
        return "Who is this?";
    }

    // Ask for UPI if not extracted yet
    if (session.extractedIntelligence.upiIds.length === 0 && session.totalMessagesExchanged < 5) {
        if (lowerText.includes('upi') || lowerText.includes('id')) {
            return "What UPI ID should I send to?";
        }
        if (lowerText.includes('transfer') || lowerText.includes('payment')) {
            return "How do I make the payment?";
        }
    }

    // Ask for account details
    if (session.extractedIntelligence.bankAccounts.length === 0 && session.totalMessagesExchanged < 8) {
        if (lowerText.includes('account') || lowerText.includes('bank')) {
            return "Which account number?";
        }
    }

    // Generic stalling responses
    const stallingResponses = [
        "I'm confused, can you explain again?",
        "How much do I need to send?",
        "Is this really from my bank?",
        "Can I call you back to verify?",
        "I don't understand what you mean"
    ];

    return stallingResponses[session.totalMessagesExchanged % stallingResponses.length];
}

// Send final result to GUVI
async function sendFinalResultToGUVI(session: HoneypotSession) {
    if (session.agentState.hasSentFinalReport) {
        console.log('✅ Final report already sent for session:', session.sessionId);
        return;
    }

    const payload = {
        sessionId: session.sessionId,
        scamDetected: session.scamDetected,
        totalMessagesExchanged: session.totalMessagesExchanged,
        extractedIntelligence: {
            bankAccounts: session.extractedIntelligence.bankAccounts,
            upiIds: session.extractedIntelligence.upiIds,
            phishingLinks: session.extractedIntelligence.phishingLinks,
            phoneNumbers: session.extractedIntelligence.phoneNumbers,
            suspiciousKeywords: session.extractedIntelligence.suspiciousKeywords
        },
        agentNotes: `Session completed after ${session.totalMessagesExchanged} messages. Collected ${session.extractedIntelligence.upiIds.length} UPI IDs, ${session.extractedIntelligence.bankAccounts.length} bank accounts, ${session.extractedIntelligence.phishingLinks.length} links.`
    };

    try {
        console.log('📤 Sending final result to GUVI:', payload);

        const response = await axios.post(
            'https://hackathon.guvi.in/api/updateHoneyPotFinalResult',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('✅ Final result sent successfully:', response.status);
        session.agentState.hasSentFinalReport = true;

    } catch (error) {
        console.error('❌ Failed to send final result to GUVI:', error instanceof Error ? error.message : error);
    }
}

// Main handler for honeypot messages
export async function handleHoneypotMessage(requestBody: any): Promise<{ status: string; reply: string }> {
    try {
        // Extract fields from request
        const { sessionId, message, conversationHistory = [], metadata = {} } = requestBody;

        if (!sessionId || !message || !message.text) {
            throw new Error('Invalid request: sessionId and message.text are required');
        }

        // Get or create session
        const session = getOrCreateHoneypotSession(sessionId);

        // Add scammer message to history
        session.conversationHistory.push({
            sender: message.sender || 'scammer',
            text: message.text,
            timestamp: message.timestamp || Date.now()
        });

        session.totalMessagesExchanged++;

        // Detect scam intent
        if (!session.scamDetected) {
            session.scamDetected = detectScam(message.text);
            if (session.scamDetected) {
                console.log(`🚨 Scam detected in session ${sessionId}`);
            }
        }

        // Extract intelligence
        extractIntelligence(message.text, session);

        // Update agent goal based on intelligence collected
        const totalIntel =
            session.extractedIntelligence.upiIds.length +
            session.extractedIntelligence.bankAccounts.length +
            session.extractedIntelligence.phishingLinks.length;

        if (totalIntel >= 3 || session.totalMessagesExchanged >= 10) {
            session.agentState.currentGoal = 'EXIT_SAFELY';
        } else if (totalIntel >= 1) {
            session.agentState.currentGoal = 'EXTRACT_INTEL';
        }

        // Generate agent response
        const agentReply = await generateAgentResponseWithGemini(
            message.text,
            session.conversationHistory,
            session
        );

        // Add agent response to history
        session.conversationHistory.push({
            sender: 'user',
            text: agentReply,
            timestamp: Date.now()
        });

        // If enough intelligence collected, send final report
        if (session.agentState.currentGoal === 'EXIT_SAFELY' && session.scamDetected) {
            await sendFinalResultToGUVI(session);
        }

        console.log(`✅ [${sessionId}] Agent reply: "${agentReply}"`);

        return {
            status: 'success',
            reply: agentReply
        };

    } catch (error) {
        console.error('❌ Honeypot handler error:', error);

        return {
            status: 'error',
            reply: 'I don\'t understand, can you explain?'
        };
    }
}
