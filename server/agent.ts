
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Message, Conversation } from "@shared/schema";

// Initialize Gemini client (initialized once, reused across calls)
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not set. " +
        "The agent cannot function without an LLM API key."
      );
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// ============================================================================
// GOAL STATE MACHINE
// ============================================================================
enum AgentGoal {
  INITIATE_CONTACT = "INITIATE_CONTACT",
  ENGAGE_AND_STALL = "ENGAGE_AND_STALL",
  ASK_PAYMENT_CONTEXT = "ASK_PAYMENT_CONTEXT",
  ASK_UPI_DETAILS = "ASK_UPI_DETAILS",
  ASK_BANK_DETAILS = "ASK_BANK_DETAILS",
  ASK_PHISHING_LINK = "ASK_PHISHING_LINK",
  EXIT_SAFELY = "EXIT_SAFELY",
}

const GOAL_TO_EMOTION: Record<AgentGoal, string> = {
  [AgentGoal.INITIATE_CONTACT]: "Trusting",
  [AgentGoal.ENGAGE_AND_STALL]: "Trusting",
  [AgentGoal.ASK_PAYMENT_CONTEXT]: "Confused",
  [AgentGoal.ASK_UPI_DETAILS]: "Anxious",
  [AgentGoal.ASK_BANK_DETAILS]: "Anxious",
  [AgentGoal.ASK_PHISHING_LINK]: "Hesitant",
  [AgentGoal.EXIT_SAFELY]: "Hesitant",
};

const GOAL_TO_RISK: Record<AgentGoal, number> = {
  [AgentGoal.INITIATE_CONTACT]: 0.2,
  [AgentGoal.ENGAGE_AND_STALL]: 0.3,
  [AgentGoal.ASK_PAYMENT_CONTEXT]: 0.4,
  [AgentGoal.ASK_UPI_DETAILS]: 0.6,
  [AgentGoal.ASK_BANK_DETAILS]: 0.6,
  [AgentGoal.ASK_PHISHING_LINK]: 0.7,
  [AgentGoal.EXIT_SAFELY]: 0.8,
};

// ============================================================================
// INTELLIGENCE TRACKING
// ============================================================================
interface IntelligenceGaps {
  hasUPI: boolean;
  hasBank: boolean;
  hasPhishingLink: boolean;
  hasPhoneNumber: boolean;
}

function analyzeExtractedIntelligence(history: Message[]): IntelligenceGaps {
  const gaps: IntelligenceGaps = {
    hasUPI: false,
    hasBank: false,
    hasPhishingLink: false,
    hasPhoneNumber: false,
  };

  history.forEach(msg => {
    if (msg.metadata && typeof msg.metadata === 'object') {
      const meta = msg.metadata as any;
      if (meta.extracted_info && Array.isArray(meta.extracted_info)) {
        meta.extracted_info.forEach((item: any) => {
          const type = item.type?.toLowerCase() || "";
          if (type.includes("upi")) gaps.hasUPI = true;
          if (type.includes("bank") || type.includes("account")) gaps.hasBank = true;
          if (type.includes("link") || type.includes("url")) gaps.hasPhishingLink = true;
          if (type.includes("phone")) gaps.hasPhoneNumber = true;
        });
      }
    }
  });

  return gaps;
}

// ============================================================================
// GOAL DETERMINATION
// ============================================================================
function determineNextGoal(
  currentGoal: AgentGoal | null,
  intelligence: IntelligenceGaps,
  conversationLength: number
): AgentGoal {
  if (conversationLength === 0) {
    return AgentGoal.INITIATE_CONTACT;
  }

  if (conversationLength > 15 || (intelligence.hasUPI && intelligence.hasBank && intelligence.hasPhishingLink)) {
    return AgentGoal.EXIT_SAFELY;
  }

  if (!currentGoal || currentGoal === AgentGoal.INITIATE_CONTACT) {
    return AgentGoal.ENGAGE_AND_STALL;
  }

  if (currentGoal === AgentGoal.ENGAGE_AND_STALL && conversationLength > 2) {
    return AgentGoal.ASK_PAYMENT_CONTEXT;
  }

  if (currentGoal === AgentGoal.ASK_PAYMENT_CONTEXT) {
    if (!intelligence.hasUPI) return AgentGoal.ASK_UPI_DETAILS;
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    return AgentGoal.EXIT_SAFELY;
  }

  if (currentGoal === AgentGoal.ASK_UPI_DETAILS) {
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    return AgentGoal.EXIT_SAFELY;
  }

  if (currentGoal === AgentGoal.ASK_BANK_DETAILS) {
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    return AgentGoal.EXIT_SAFELY;
  }

  if (currentGoal === AgentGoal.ASK_PHISHING_LINK) {
    return AgentGoal.EXIT_SAFELY;
  }

  return AgentGoal.EXIT_SAFELY;
}

// ============================================================================
// SYSTEM PROMPT BUILDER
// ============================================================================
function buildSystemPrompt(goal: AgentGoal, intelligence: IntelligenceGaps, revealedInfo: string[]): string {
  const basePersona = `You are Sarah, a 68-year-old retired school teacher from Mumbai. You are polite, kind-hearted, but easily flustered by technology. You speak simple English with occasional Hinglish phrases ("Beta", "Haan", "Arrey").

🎭 CORE PERSONA:
- NOT tech-savvy, struggle with apps
- CAUTIOUS but TRUSTING
- Get emotional easily: worried, confused, apologetic
- Use Hinglish occasionally

🛡️ SAFETY RULES:
- NEVER provide real UPI IDs, bank accounts, OTPs, PINs
- Use excuses: "App says invalid", "I forgot my PIN", "No OTP received"
`;

  let goalInstructions = "";
  switch (goal) {
    case AgentGoal.INITIATE_CONTACT:
      goalInstructions = `
🎯 GOAL: INITIATE CONTACT
Greet them politely and ask WHO they are. Express slight confusion. Be friendly but cautious. Keep it short (2-3 sentences).
Example: "Hello? Who is this? I got a call from this number... Is everything okay?"
`;
      break;

    case AgentGoal.ENGAGE_AND_STALL:
      goalInstructions = `
🎯 GOAL: ENGAGE & STALL
Waste time by being slow. Ask them to repeat. Show willingness but be slow. Longer messages (3-5 sentences).
Example: "Oh beta, you are so kind. But I'm not understanding. Which button should I click?"
`;
      break;

    case AgentGoal.ASK_PAYMENT_CONTEXT:
      goalInstructions = `
🎯 GOAL: ASK ABOUT PAYMENT
Ask HOW to make payment. Express confusion about methods. Medium length (3-4 sentences).
Example: "Beta, should I use PhonePe or Google Pay? Or should I go to the bank?"
`;
      break;

    case AgentGoal.ASK_UPI_DETAILS:
      goalInstructions = `
🎯 GOAL: GET UPI ID
${!intelligence.hasUPI ? "You MUST ask for their UPI ID." : "You already have UPI."}
Ask "What is your UPI ID?" or "Where should I send?" Short, anxious (2-3 sentences).
Example: "Okay beta, I opened Google Pay. Where do I send? What should I type?"
`;
      break;

    case AgentGoal.ASK_BANK_DETAILS:
      goalInstructions = `
🎯 GOAL: GET BANK ACCOUNT
${!intelligence.hasBank ? "You MUST ask for bank account." : "You already have bank details."}
Say UPI app is "not working". Ask for bank account. Very short (1-2 sentences).
Example: "This app is giving error. Give me your bank account number instead."
`;
      break;

    case AgentGoal.ASK_PHISHING_LINK:
      goalInstructions = `
🎯 GOAL: GET LINK
${!intelligence.hasPhishingLink ? "You MUST ask for website/link." : "You already have link."}
Ask "Do you have a website?" or "Send me a link?". Hesitant (2 sentences).
Example: "Beta, do you have any website? My son said check website first..."
`;
      break;

    case AgentGoal.EXIT_SAFELY:
      goalInstructions = `
🎯 GOAL: EXIT
Exit politely. Say you will "visit bank tomorrow" or "ask family first".
Example: "Beta, thank you. I will go to bank branch tomorrow. My grandson will help me."
`;
      break;
  }

  let intelContext = "";
  if (revealedInfo.length > 0) {
    intelContext = `\n📋 GATHERED INTEL:\n${revealedInfo.join('\n')}`;
  }

  return basePersona + goalInstructions + intelContext + `
📊 OUTPUT (STRICT):
Return ONLY this JSON:
{
  "reply_content": "Your message as Sarah",
  "metadata": {
    "current_goal": "${goal}",
    "emotional_state": "${GOAL_TO_EMOTION[goal]}",
    "perceived_risk": ${GOAL_TO_RISK[goal]},
    "confidence_of_scam": 0.0-1.0
  }
}

CRITICAL: Return ONLY valid JSON. No extra text. Stay in character as Sarah.`;
}

// ============================================================================
// ANTI-REPETITION
// ============================================================================
function isTooSimilar(newMessage: string, lastMessage: string | null): boolean {
  if (!lastMessage) return false;

  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const newNorm = normalize(newMessage);
  const lastNorm = normalize(lastMessage);

  if (newNorm === lastNorm) return true;

  const newChars = Array.from(newNorm);
  const overlap = newChars.filter(char => lastNorm.includes(char)).length;
  const similarity = overlap / Math.max(newNorm.length, lastNorm.length);

  return similarity > 0.8;
}

// ============================================================================
// HUMAN DELAY
// ============================================================================
async function humanDelay(): Promise<void> {
  const delayMs = 2000 + Math.random() * 2000;
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

// ============================================================================
// MAIN AGENT FUNCTION (100% LLM-DRIVEN)
// ============================================================================
export async function generateAgentResponse(
  history: Message[],
  conversation: Conversation,
  isInitiating: boolean = false
) {
  const lastAgentMessage = history
    .slice()
    .reverse()
    .find(msg => msg.sender === 'agent')?.content || null;

  // Human delay
  await humanDelay();

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature: 0.85,
      responseMimeType: "application/json",
    },
  });

  const intelligence = analyzeExtractedIntelligence(history);

  const revealedInfo: string[] = [];
  history.forEach(msg => {
    if (msg.metadata && typeof msg.metadata === 'object') {
      const meta = msg.metadata as any;
      if (meta.extracted_info && Array.isArray(meta.extracted_info)) {
        meta.extracted_info.forEach((item: any) => {
          revealedInfo.push(`${item.type}: ${item.value}`);
        });
      }
    }
  });

  const lastGoalStr = history
    .slice()
    .reverse()
    .find(msg => msg.sender === 'agent' && msg.metadata)
    ?.metadata as any;

  const lastGoal = lastGoalStr?.current_goal as AgentGoal | null;
  const currentGoal = determineNextGoal(lastGoal, intelligence, history.length);

  const systemPrompt = buildSystemPrompt(currentGoal, intelligence, revealedInfo);

  const conversationHistory = history.map(msg => ({
    role: msg.sender === 'agent' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const messageToSend = isInitiating
    ? "I just answered your call. Hello?"
    : history[history.length - 1]?.content || "Hello";

  console.log(`🤖 Goal: ${currentGoal} | Intel:`, intelligence);

  const chat = model.startChat({
    history: isInitiating ? [] : conversationHistory.slice(0, -1),
    systemInstruction: systemPrompt,
  });

  // LLM CALL (NO FALLBACKS)
  const result = await chat.sendMessage(messageToSend);
  const responseText = result.response.text();

  console.log(`✅ LLM Response: ${responseText.substring(0, 150)}`);

  const parsed = JSON.parse(responseText);
  let finalContent = parsed.reply_content;

  if (!finalContent) {
    throw new Error("LLM did not return 'reply_content' in JSON");
  }

  // Anti-repetition
  if (isTooSimilar(finalContent, lastAgentMessage)) {
    console.log(`⚠️ Repetition detected, regenerating via LLM...`);

    const retryResult = await chat.sendMessage(
      "STOP! Too similar to last message. Generate COMPLETELY DIFFERENT response with different wording. Same goal, new words."
    );
    const retryParsed = JSON.parse(retryResult.response.text());
    finalContent = retryParsed.reply_content;

    if (!finalContent) {
      throw new Error("LLM retry failed to return 'reply_content'");
    }

    console.log(`✅ Regenerated via LLM: "${finalContent.substring(0, 60)}..."`);
  }

  console.log(`📤 Final: "${finalContent}"`);

  return {
    content: finalContent,
    metadata: {
      current_goal: currentGoal,
      emotional_state: GOAL_TO_EMOTION[currentGoal],
      perceived_risk: GOAL_TO_RISK[currentGoal],
      confidence_of_scam: parsed.metadata?.confidence_of_scam || 0.7,
      intelligence_gaps: intelligence,
    }
  };
}
