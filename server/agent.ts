
import type { Message, Conversation } from "@shared/schema";
import type { Session } from "./sessions";

// ============================================================================
// MOCK AGENT - NO API CALLS
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

// Mock response templates for each goal
// PERSONA: Sarah, 68, retired teacher, nervous, not tech-savvy
// RULES: Max 1-2 short sentences, broken English, 1 emoji max (😟 😰), light Hinglish
const RESPONSE_TEMPLATES: Record<AgentGoal, string[]> = {
  [AgentGoal.INITIATE_CONTACT]: [
    "Hello? Who is this?",
    "Ji... you called? What happened?",
    "Namaste beta. Is everything okay?",
    "Hello... I got missed call...",
    "Beta who is speaking? I am Sarah."
  ],
  [AgentGoal.ENGAGE_AND_STALL]: [
    "Haan haan... I'm listening beta.",
    "Wait... my phone is slow. Say again?",
    "Arre... I didn't understand 😟",
    "Beta speak slowly please...",
    "Okay okay... but which button?",
    "My grandson usually helps me beta...",
    "I get confused easily... sorry beta."
  ],
  [AgentGoal.ASK_PAYMENT_CONTEXT]: [
    "Which app to use beta?",
    "Should I go to bank?",
    "PhonePe or Google Pay?",
    "I have Paytm also... which one?",
    "How to send beta?",
    "Cash or online?"
  ],
  [AgentGoal.ASK_UPI_DETAILS]: [
    "UPI id kya hai beta?",
    "Where to send? Tell UPI.",
    "What is your UPI?",
    "Beta... which UPI id?",
    "Spell the UPI slowly...",
    "Phone number ka UPI?",
    "UPI id batao beta..."
  ],
  [AgentGoal.ASK_BANK_DETAILS]: [
    "UPI not working 😟\nAccount number?",
    "App crashed beta.\nBank details please?",
    "This is showing error...\nAccount number batao?",
    "I'll do bank transfer.\nAccount and IFSC?",
    "Which bank beta?",
    "Account number kya hai?",
    "IFSC code also?",
    "My phone is hanging...\nJust tell account number?",
    "App is stuck.\nI'll use net banking... details?",
    "This app... not working.\nBank account?"
  ],
  [AgentGoal.ASK_PHISHING_LINK]: [
    "Any website beta?",
    "Link hai kya?",
    "My son said check website first 😟",
    "Can you send link?",
    "Whatsapp me link send karo?",
    "Any portal or app?",
    "Website link please beta..."
  ],
  [AgentGoal.EXIT_SAFELY]: [
    "Okay beta... I will do tomorrow.",
    "Let me ask my son first...",
    "I'll go to bank branch beta.",
    "Thank you... I'll call you back.",
    "Noted beta. Will do from bank.",
    "My grandson will help me... bye beta."
  ]
};

interface IntelligenceGaps {
  hasUPI: boolean;
  hasBank: boolean;
  hasPhishingLink: boolean;
  hasPhoneNumber: boolean;
}

function analyzeSessionIntelligence(session: Session): IntelligenceGaps {
  return {
    hasUPI: session.extracted_intel.upi_ids.length > 0,
    hasBank: session.extracted_intel.bank_accounts.length > 0,
    hasPhishingLink: session.extracted_intel.phishing_links.length > 0,
    hasPhoneNumber: session.extracted_intel.phone_numbers.length > 0,
  };
}

function determineNextGoal(
  session: Session,
  intelligence: IntelligenceGaps,
  conversationLength: number
): AgentGoal {
  const currentGoal = session.agent_state.current_goal as AgentGoal | null;

  // First message - initiate contact
  if (!session.agent_state.has_initiated) {
    return AgentGoal.INITIATE_CONTACT;
  }

  // Only exit if BOTH conditions met: long conversation AND lots of intel
  // This makes agent more persistent
  if (conversationLength > 20 && (intelligence.hasUPI && intelligence.hasBank && intelligence.hasPhishingLink)) {
    return AgentGoal.EXIT_SAFELY;
  }

  // After initiating, engage and build trust
  if (!currentGoal || currentGoal === AgentGoal.INITIATE_CONTACT) {
    return AgentGoal.ENGAGE_AND_STALL;
  }

  // After engaging for a bit, start asking about payment
  if (currentGoal === AgentGoal.ENGAGE_AND_STALL && conversationLength > 2) {
    return AgentGoal.ASK_PAYMENT_CONTEXT;
  }

  // CORE PERSISTENCE LOGIC: Keep cycling through information requests
  // Don't give up just because one attempt failed

  if (currentGoal === AgentGoal.ASK_PAYMENT_CONTEXT) {
    // Try UPI first
    if (!intelligence.hasUPI) return AgentGoal.ASK_UPI_DETAILS;
    // If UPI failed, try bank account
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    // If both failed, ask for website/link
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    // Got everything from payment context, go back to engaging
    return AgentGoal.ENGAGE_AND_STALL;
  }

  // If asking for UPI didn't work, try other approaches
  if (currentGoal === AgentGoal.ASK_UPI_DETAILS) {
    // If we didn't get UPI but conversation is short, try bank account instead
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    // Try phishing link
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    // Cycle back to UPI with different approach
    return AgentGoal.ASK_PAYMENT_CONTEXT;
  }

  // If bank account request didn't work, keep trying other methods
  if (currentGoal === AgentGoal.ASK_BANK_DETAILS) {
    // Try getting website/link
    if (!intelligence.hasPhishingLink) return AgentGoal.ASK_PHISHING_LINK;
    // Cycle back to UPI
    if (!intelligence.hasUPI) return AgentGoal.ASK_UPI_DETAILS;
    // Keep asking about payment in general
    return AgentGoal.ASK_PAYMENT_CONTEXT;
  }

  // If phishing link request was denied, keep trying other information
  if (currentGoal === AgentGoal.ASK_PHISHING_LINK) {
    // DON'T EXIT! Try other approaches instead
    // If we still don't have bank details, ask for that
    if (!intelligence.hasBank) return AgentGoal.ASK_BANK_DETAILS;
    // If we still don't have UPI, ask for that
    if (!intelligence.hasUPI) return AgentGoal.ASK_UPI_DETAILS;
    // Otherwise, engage more and build trust before asking again
    return AgentGoal.ENGAGE_AND_STALL;
  }

  // Default: keep engaging
  return AgentGoal.ENGAGE_AND_STALL;
}

async function humanDelay(): Promise<void> {
  // Simulate elderly person typing slowly (4-8 seconds)
  const delayMs = 4000 + Math.random() * 4000;
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

export async function generateAgentResponse(
  history: Message[],
  conversation: Conversation,
  session: Session
) {
  console.log("🤖 [MOCK MODE] Generating response without API...");

  // Human delay
  await humanDelay();

  // Analyze session intelligence
  const intelligence = analyzeSessionIntelligence(session);

  // Determine next goal
  const currentGoal = determineNextGoal(session, intelligence, history.length);

  // FIX ISSUE #2: Hard guard against re-initiation mid-conversation
  // If agent has already initiated, NEVER allow INITIATE_CONTACT again
  if (session.agent_state.has_initiated && currentGoal === AgentGoal.INITIATE_CONTACT) {
    console.log("⚠️ [GUARD] Prevented re-initiation - forcing ENGAGE_AND_STALL instead");
    const templates = RESPONSE_TEMPLATES[AgentGoal.ENGAGE_AND_STALL];
    const finalContent = templates[Math.floor(Math.random() * templates.length)];

    return {
      content: finalContent,
      metadata: {
        current_goal: AgentGoal.ENGAGE_AND_STALL,
        emotional_state: GOAL_TO_EMOTION[AgentGoal.ENGAGE_AND_STALL],
        perceived_risk: GOAL_TO_RISK[AgentGoal.ENGAGE_AND_STALL],
        confidence_of_scam: 0.7,
        intelligence_gaps: intelligence,
      },
      session_updates: {
        has_initiated: true,
        current_goal: AgentGoal.ENGAGE_AND_STALL,
        last_reply: finalContent,
        should_exit: false
      }
    };
  }

  // Pick a random response from templates for this goal
  const templates = RESPONSE_TEMPLATES[currentGoal];
  let finalContent = templates[Math.floor(Math.random() * templates.length)];

  // FIX ISSUE #1 (Repetition): Anti-repetition guard - check against recent history
  // Get last 3 agent messages to avoid repeating same phrase across goals
  const recentAgentMessages = history
    .filter(m => m.sender === 'agent')
    .slice(-3)
    .map(m => m.content);

  let attempts = 0;
  while (
    (recentAgentMessages.includes(finalContent) || finalContent === session.agent_state.last_reply) &&
    templates.length > 1 &&
    attempts < 10  // Increased from 5 to 10 for better coverage
  ) {
    finalContent = templates[Math.floor(Math.random() * templates.length)];
    attempts++;
  }

  console.log(`🤖 [MOCK] Goal: ${currentGoal} | Response: "${finalContent}"`);

  const shouldExit = currentGoal === AgentGoal.EXIT_SAFELY;

  return {
    content: finalContent,
    metadata: {
      current_goal: currentGoal,
      emotional_state: GOAL_TO_EMOTION[currentGoal],
      perceived_risk: GOAL_TO_RISK[currentGoal],
      confidence_of_scam: 0.7,
      intelligence_gaps: intelligence,
    },
    session_updates: {
      has_initiated: true,
      current_goal: currentGoal,
      last_reply: finalContent,
      should_exit: shouldExit
    }
  };
}
