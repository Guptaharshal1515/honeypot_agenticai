export type Session = {
    conversation_id: string;
    created_at: number;
    last_active: number;
    is_active: boolean;  // Phase 2.8: Session lifecycle control

    // agent-related state
    agent_state: {
        has_initiated: boolean;  // Phase 2.4: First message control
        current_goal: string | null;  // Phase 2.5: Goal tracking
        last_reply: string | null;  // Phase 2.7: Anti-repetition
        is_paused: boolean;  // FIX #1: Explicit pause/resume control
    };

    // Phase 2.6: Extraction-aware intel storage
    extracted_intel: {
        upi_ids: string[];
        bank_accounts: string[];
        phishing_links: string[];
        phone_numbers: string[];
    };
};

// In-memory session store
const sessions = new Map<string, Session>();

export function getOrCreateSession(conversation_id: string): Session {
    const now = Date.now();

    let session = sessions.get(conversation_id);

    if (!session) {
        session = {
            conversation_id,
            created_at: now,
            last_active: now,
            is_active: true,  // New sessions start active
            agent_state: {
                has_initiated: false,
                current_goal: null,
                last_reply: null,  // Phase 2.7
                is_paused: false  // FIX #1: Start unpaused
            },
            extracted_intel: {
                upi_ids: [],
                bank_accounts: [],
                phishing_links: [],
                phone_numbers: []
            }
        };

        sessions.set(conversation_id, session);
    } else {
        session.last_active = now;
    }

    return session;
}

// Optional: helper for debugging / future cleanup
export function getSessionCount(): number {
    return sessions.size;
}

// FIX #2: Get existing session without creating
export function getSession(conversation_id: string): Session | undefined {
    return sessions.get(conversation_id);
}
