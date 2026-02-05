// FIX NOTE: Add this check to line 322 in routes.ts
//
// Replace:
//     const shouldAgentRespond = updatedConversation?.isAgentActive && (
//       wasJustActivated ||
//       sender === 'scammer'
//     );
//
// With:
//     const shouldAgentRespond = updatedConversation?.isAgentActive && 
//       !session.agent_state.is_paused &&  // ← ADD THIS LINE
//       (
//       wasJustActivated ||
//       sender === 'scammer'
//     );
//
// This prevents the agent from responding when paused.
