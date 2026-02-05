
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateAgentResponse } from "./agent";
import { analyzeMessageForIntel } from "./scam_detection";
import { generatePDFReport } from "./report";
import { getOrCreateSession, getSession } from "./sessions";
import { handleHoneypotMessage } from "./honeypot-api";

// PHASE 4.2: Risk score computation (judge-friendly, explainable)
function computeRiskScore(session: any): number {
  let score = 0.1; // Base suspicion (low start)

  // FIX ISSUE #4: Dynamic scoring based on actual conversation state
  // Incremental risk based on extracted intel
  if (session.extracted_intel.phone_numbers.length > 0) score += 0.15;
  if (session.extracted_intel.upi_ids.length > 0) score += 0.25;
  if (session.extracted_intel.bank_accounts.length > 0) score += 0.2;
  if (session.extracted_intel.phishing_links.length > 0) score += 0.2;

  // Multiple pieces of evidence = higher risk
  const totalIntel =
    session.extracted_intel.upi_ids.length +
    session.extracted_intel.bank_accounts.length +
    session.extracted_intel.phishing_links.length +
    session.extracted_intel.phone_numbers.length;

  if (totalIntel >= 2) score += 0.1;
  if (totalIntel >= 3) score += 0.1;

  // Exit state = confirmed scam
  if (session.agent_state.current_goal === "EXIT_SAFELY" || !session.is_active) {
    score = Math.max(score, 0.8); // Ensure high score on exit
  }

  return Math.min(score, 1.0);
}

// PHASE 4.2: Risk label mapping for UI
function getRiskLabel(score: number): string {
  if (score < 0.3) return "SAFE";
  if (score < 0.6) return "CAUTION";
  return "HIGH RISK";
}

// PHASE 3.5: Confidence scoring function
function computeConfidenceScore(session: any): number {
  let score = 0;

  // Rule-based scoring
  if (session.extracted_intel.upi_ids.length > 0) score += 0.4;
  if (session.extracted_intel.bank_accounts.length > 0) score += 0.3;
  if (session.extracted_intel.phishing_links.length > 0) score += 0.3;

  // Bonus for multiple pieces of evidence
  const totalIntel =
    session.extracted_intel.upi_ids.length +
    session.extracted_intel.bank_accounts.length +
    session.extracted_intel.phishing_links.length;

  if (totalIntel >= 3) score = Math.min(score + 0.1, 1.0);

  return Math.min(score, 1.0);
}



export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Health Check for Testing ===
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Scam Guard Agent API is running'
    });
  });

  // === Test Endpoint for Official Tester ===
  app.get('/api/test', (req, res) => {
    res.json({
      success: true,
      message: 'API is working correctly',
      endpoints: {
        conversations: '/api/conversations',
        messages: '/api/conversations/:id/messages',
        state: '/api/conversations/:id/state'
      },
      api_key_header: req.headers['x-api-key'] || 'not provided'
    });
  });

  // ========================================================================
  // OFFICIAL GUVI HONEYPOT API ENDPOINT
  // Problem Statement 2: Agentic Honey-Pot for Scam Detection
  // ========================================================================
  /**
   * This endpoint implements the exact specification from the hackathon problem statement.
   * 
   * Expected Request:
   * {
   *   "sessionId": "abc123",
   *   "message": {
   *     "sender": "scammer",
   *     "text": "Your bank account will be blocked today.",
   *     "timestamp": 1770005528731
   *   },
   *   "conversationHistory": [...],
   *   "metadata": { "channel": "SMS", "language": "English", "locale": "IN" }
   * }
   * 
   * Expected Response:
   * {
   *   "status": "success",
   *   "reply": "Why is my account being suspended?"
   * }
   */
  app.post('/api/honeypot/message', async (req, res) => {
    try {
      console.log('📨 [HONEYPOT] Received request:', JSON.stringify(req.body, null, 2));

      // Validate API key if provided
      const apiKey = req.headers['x-api-key'];
      if (apiKey && apiKey !== 'SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a') {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid API key'
        });
      }

      // Handle the honeypot message
      const result = await handleHoneypotMessage(req.body);

      console.log('✅ [HONEYPOT] Response:', result);

      // Return exact format required by problem statement
      res.json({
        status: result.status,
        reply: result.reply
      });

    } catch (error) {
      console.error('❌ [HONEYPOT] Error:', error);

      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  // === Conversations ===
  app.get(api.conversations.list.path, async (req, res) => {
    const convs = await storage.getConversations();
    res.json(convs);
  });

  app.post(api.conversations.create.path, async (req, res) => {
    const conv = await storage.createConversation({
      title: req.body.title || "New Scam Chat",
      status: "active",
      isAgentActive: true
    });
    res.status(201).json(conv);
  });

  app.get(api.conversations.get.path, async (req, res) => {
    const conv = await storage.getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    // FIX ISSUE #4: Inject dynamic scam score from session
    const session = getSession(String(conv.id));
    const dynamicScamScore = session ? Math.round(computeRiskScore(session) * 100) : (conv.scamScore || 10);

    res.json({
      ...conv,
      scamScore: dynamicScamScore  // Override with computed score
    });
  });

  app.patch(api.conversations.update.path, async (req, res) => {
    const conv = await storage.updateConversation(Number(req.params.id), req.body);
    res.json(conv);
  });

  app.post(api.conversations.clear.path, async (req, res) => {
    await storage.clearConversationMessages(Number(req.params.id));
    res.json({ success: true });
  });

  // ========================================================================
  // FIX #2: GET CONVERSATION STATE - SINGLE SOURCE OF TRUTH
  // ========================================================================
  app.get("/api/conversations/:id/state", async (req, res) => {
    const conversationId = Number(req.params.id);
    const conversation = await storage.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Get session state
    const session = getSession(String(conversationId));
    const messages = await storage.getMessages(conversationId);

    // Return complete state snapshot
    const stateSnapshot = {
      conversation,
      messages,
      agent_state: session ? {
        has_initiated: session.agent_state.has_initiated,
        current_goal: session.agent_state.current_goal,
        is_paused: session.agent_state.is_paused,
        is_active: session.is_active
      } : null,
      extracted_intel: session ? session.extracted_intel : {
        upi_ids: [],
        bank_accounts: [],
        phishing_links: [],
        phone_numbers: []
      },
      ui_state: session ? {
        risk_score: computeRiskScore(session),
        risk_label: getRiskLabel(computeRiskScore(session)),
        agent_status: session.is_active ? (session.agent_state.is_paused ? "PAUSED" : "ACTIVE") : "EXITED",
        intel_count: session.extracted_intel.upi_ids.length +
          session.extracted_intel.bank_accounts.length +
          session.extracted_intel.phishing_links.length +
          session.extracted_intel.phone_numbers.length,
        session_status: session.is_active ? "ACTIVE" : "COMPLETED",
        current_goal: session.agent_state.current_goal || "STANDBY"
      } : null
    };

    res.json(stateSnapshot);
  });

  // ========================================================================
  // FIX #3: POST RESUME - BACKEND AGENT TRIGGER
  // ========================================================================
  app.post("/api/conversations/:id/resume", async (req, res) => {
    const conversationId = Number(req.params.id);
    const conversation = await storage.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Get or create session
    const session = getOrCreateSession(String(conversationId));

    // Unpause the agent
    session.agent_state.is_paused = false;

    // Update conversation to active
    await storage.updateConversation(conversationId, { isAgentActive: true });

    console.log(`🔄 [RESUME] Agent resumed for conversation ${conversationId}`);

    // Trigger agent with system resume event
    const history = await storage.getMessages(conversationId);

    try {
      const agentResponse = await generateAgentResponse(
        history,
        conversation,
        session
      );

      if (agentResponse) {
        await storage.createMessage({
          conversationId,
          sender: 'agent',
          content: agentResponse.content,
          metadata: agentResponse.metadata
        });

        // Update session state
        if (agentResponse.session_updates) {
          session.agent_state.has_initiated = agentResponse.session_updates.has_initiated;
          session.agent_state.current_goal = agentResponse.session_updates.current_goal;
          session.agent_state.last_reply = agentResponse.session_updates.last_reply;

          if (agentResponse.session_updates.should_exit) {
            session.is_active = false;
            await storage.updateConversation(conversationId, { isAgentActive: false });
          }
        }

        console.log(`✅ [RESUME] Agent responded successfully`);
      }
    } catch (error) {
      console.error("❌ [RESUME] Agent failed:", error);
      return res.status(500).json({
        error: "Agent generation failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }

    // Return updated state
    const updatedMessages = await storage.getMessages(conversationId);
    res.json({
      success: true,
      messages: updatedMessages,
      agent_state: {
        has_initiated: session.agent_state.has_initiated,
        current_goal: session.agent_state.current_goal,
        is_paused: session.agent_state.is_paused,
        is_active: session.is_active
      }
    });
  });

  // === Messages ===
  app.get(api.messages.list.path, async (req, res) => {
    const msgs = await storage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  app.post(api.messages.create.path, async (req, res) => {
    // ========================================================================
    // FLEXIBLE INPUT PARSING for official tester compatibility
    // ========================================================================

    // Accept API key from header OR body
    const submittedApiKey = req.headers['x-api-key'] || req.body.apiKey;

    // Accept conversation_id from various sources
    const conversationId =
      req.body.conversation_id ||
      req.body.conversationId ||
      req.body.id ||
      Number(req.params.id) ||
      1; // Default to conversation 1

    // Accept content from various field names
    const messageContent =
      req.body.content ||
      req.body.message ||
      req.body.text ||
      "";

    // Accept sender, default to 'scammer' if not provided
    const messageSender = req.body.sender || "scammer";

    // Validate message content exists
    if (!messageContent || typeof messageContent !== "string" || messageContent.trim() === "") {
      return res.status(400).json({
        error: "INVALID_REQUEST_BODY",
        message: "Message content is required",
        expected_fields: {
          content: "string (required)",
          sender: "string (optional, defaults to 'scammer')",
          conversation_id: "number (optional, defaults to 1)"
        }
      });
    }

    // ========================================================================
    // PHASE 2.2: ATTACH SESSION STORE
    // ========================================================================
    const session = getOrCreateSession(String(conversationId));
    console.log("📦 Active session:", session.conversation_id, "| has_initiated:", session.agent_state.has_initiated);


    // 1. Save the incoming message
    const newMessage = await storage.createMessage({
      conversationId: Number(conversationId),
      content: messageContent,
      sender: messageSender,
      metadata: {},
    });

    // 2. If message is from 'scammer', run intel detection
    if (messageSender === 'scammer') {
      const intel = analyzeMessageForIntel(messageContent);
      for (const item of intel) {
        await storage.createScamReport({
          conversationId,
          intelType: item.type,
          intelValue: item.value,
          context: item.context
        });

        // PHASE 2.6: Sync to session extracted_intel with normalization
        // FIX ISSUE #1: Normalize before deduplication to prevent dummy333@oksbi duplication
        const normalize = (v: string) => v.toLowerCase().trim();
        const type = item.type?.toLowerCase() || "";

        if (type.includes("upi") && !session.extracted_intel.upi_ids.map(normalize).includes(normalize(item.value))) {
          session.extracted_intel.upi_ids.push(item.value);
          console.log(`📊 [Session Intel] Added UPI: ${item.value}`);
        }
        if ((type.includes("bank") || type.includes("account")) && !session.extracted_intel.bank_accounts.map(normalize).includes(normalize(item.value))) {
          session.extracted_intel.bank_accounts.push(item.value);
          console.log(`📊 [Session Intel] Added Bank: ${item.value}`);
        }
        if ((type.includes("link") || type.includes("url")) && !session.extracted_intel.phishing_links.map(normalize).includes(normalize(item.value))) {
          session.extracted_intel.phishing_links.push(item.value);
          console.log(`📊 [Session Intel] Added Link: ${item.value}`);
        }
        if (type.includes("phone") && !session.extracted_intel.phone_numbers.map(normalize).includes(normalize(item.value))) {
          session.extracted_intel.phone_numbers.push(item.value);
          console.log(`📊 [Session Intel] Added Phone: ${item.value}`);
        }
      }
    }

    // 3. Trigger word detection & Handoff logic
    const TRIGGER_WORDS = ['bank', 'upi', 'payment', 'amount', 'ifsc', 'code', 'id', 'account', 'transfer', 'send', 'money'];
    const messageText = messageContent?.toLowerCase() || '';
    const hasTriggerWord = TRIGGER_WORDS.some(word => messageText.includes(word));

    const conversation = await storage.getConversation(conversationId);

    // Track if this is a fresh handoff (API key OR trigger word)
    const wasJustActivated = (
      (submittedApiKey === "SCAMGUARD_API_KEY_2026_SUMMIT_7f8e9d3c5b4a" && !conversation?.isAgentActive) ||  // Official API key
      (submittedApiKey === "DEMO_KEY" && !conversation?.isAgentActive) ||  // Demo key for testing
      (hasTriggerWord && !conversation?.isAgentActive && messageSender === 'scammer')  // Auto-activate
    );

    // Auto-activate if handoff is initiated
    if (wasJustActivated) {
      await storage.updateConversation(Number(conversationId), { isAgentActive: true });
      console.log(`🤖 Agent activated ${submittedApiKey ? 'via API key' : `via trigger word in "${messageContent}"`}`);
    }

    const updatedConversation = await storage.getConversation(conversationId);

    // 5. Agent turn control logic
    // FIX ISSUE #1: Agent should initiate ONLY when:
    //   - Fresh activation (wasJustActivated = true)
    //   - AND has not initiated before (has_initiated = false)
    // FIX ISSUE #5: Agent should NOT respond after session is closed

    const isFirstInitiation = wasJustActivated && !session.agent_state.has_initiated;
    const isOngoingConversation = session.agent_state.has_initiated && messageSender === 'scammer';

    const shouldAgentRespond =
      session.is_active &&  // FIX ISSUE #5: Hard stop if session closed
      updatedConversation?.isAgentActive &&
      !session.agent_state.is_paused &&
      (
        isFirstInitiation ||      // First-time initiation only
        isOngoingConversation      // OR ongoing conversation after initiation
      );


    if (shouldAgentRespond) {
      const history = await storage.getMessages(conversationId);

      console.log(`🤖 Calling agent | is_active:${session.is_active} | has_initiated:${session.agent_state.has_initiated} | wasJustActivated:${wasJustActivated}`);

      try {
        // PHASE 2.3: Pass session to agent
        const agentResponse = await generateAgentResponse(
          history,
          updatedConversation,
          session  // Session replaces isInitiating flag
        );

        if (agentResponse) {
          // Save agent message
          await storage.createMessage({
            conversationId,
            sender: 'agent',
            content: agentResponse.content,
            metadata: agentResponse.metadata
          });

          // PHASE 2.4, 2.5, 2.7: Update session state
          if (agentResponse.session_updates) {
            session.agent_state.has_initiated = agentResponse.session_updates.has_initiated;
            session.agent_state.current_goal = agentResponse.session_updates.current_goal;
            session.agent_state.last_reply = agentResponse.session_updates.last_reply;

            // PHASE 2.8: Mark session inactive if exit
            if (agentResponse.session_updates.should_exit) {
              session.is_active = false;
              await storage.updateConversation(conversationId, { isAgentActive: false });
              console.log(`🛑 Session ${session.conversation_id} marked inactive (EXIT_SAFELY)`);
            }

            console.log(`✅ Session updated: goal=${session.agent_state.current_goal}, has_initiated=${session.agent_state.has_initiated}`);
          }

          console.log(`✅ Agent responded: "${agentResponse.content.substring(0, 50)}..."`);
        }
      } catch (error) {
        console.error("❌ AGENT FAILED:", error);
        console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack');

        // Create error message so user can see the failure
        await storage.createMessage({
          conversationId,
          sender: 'agent',
          content: `[AGENT ERROR: ${error instanceof Error ? error.message : 'LLM call failed - check GEMINI_API_KEY'}]`,
          metadata: { error: true, errorMessage: String(error) }
        });
      }
    }

    // PHASE 3.4 & 3.5: Return structured response with extracted intel and confidence
    // PHASE 4.1 & 4.2: Add UI state for reactive frontend
    const riskScore = computeRiskScore(session);
    const intelCount =
      session.extracted_intel.upi_ids.length +
      session.extracted_intel.bank_accounts.length +
      session.extracted_intel.phishing_links.length +
      session.extracted_intel.phone_numbers.length;

    const responsePayload = {
      ...newMessage,
      extracted_intel: {
        upi_ids: session.extracted_intel.upi_ids,
        bank_accounts: session.extracted_intel.bank_accounts,
        phishing_links: session.extracted_intel.phishing_links,
        phone_numbers: session.extracted_intel.phone_numbers
      },
      confidence_score: computeConfidenceScore(session),
      ui_state: {
        risk_score: riskScore,
        risk_label: getRiskLabel(riskScore),
        agent_status: session.is_active ? "ACTIVE" : "EXITED",
        intel_count: intelCount,
        session_status: session.is_active ? "ACTIVE" : "COMPLETED",
        current_goal: session.agent_state.current_goal || "STANDBY"
      }
    };

    res.status(201).json(responsePayload);
  });

  // === Reports ===
  app.get(api.reports.list.path, async (req, res) => {
    const reports = await storage.getScamReports(Number(req.params.id));
    res.json(reports);
  });

  app.post(api.reports.generate.path, async (req, res) => {
    const conversationId = Number(req.params.id);
    const conversation = await storage.getConversation(conversationId);
    const messages = await storage.getMessages(conversationId);
    const reports = await storage.getScamReports(conversationId);

    if (!conversation) return res.status(404).send("Conversation not found");

    const pdfBuffer = await generatePDFReport(conversation, messages, reports);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=scam-report-${conversationId}.pdf`);
    res.send(pdfBuffer);
  });

  // Seed Data (if empty)
  const existingConvs = await storage.getConversations();
  if (existingConvs.length === 0) {
    console.log("Seeding database...");
    const conv = await storage.createConversation({
      title: "Suspected IRS Scam",
      status: "active",
      scamScore: 10,  // FIX ISSUE #4: Start low, will be computed dynamically
      isAgentActive: false, // Manual mode first
      scammerName: "+1 (555) 012-3456"
    });

    await storage.createMessage({
      conversationId: conv.id,
      sender: "scammer",
      content: "Hello, this is Officer John from the IRS. You have pending tax dues of $5000. Pay immediately or police will come."
    });

    await storage.createScamReport({
      conversationId: conv.id,
      intelType: "phone",
      intelValue: "5550123456",
      context: "Caller ID"
    });
  }

  return httpServer;
}

