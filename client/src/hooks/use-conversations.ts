import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Conversation } from "@shared/schema";
import { z } from "zod";

export function useConversations() {
  return useQuery({
    queryKey: [api.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(api.conversations.list.path);
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.conversations.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Refresh list occasionally
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: [api.conversations.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return api.conversations.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
    refetchInterval: 2000, // Poll for status changes
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      const res = await fetch(api.conversations.create.path, {
        method: api.conversations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return api.conversations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { isAgentActive?: boolean; status?: string } }) => {
      const url = buildUrl(api.conversations.update.path, { id });
      const res = await fetch(url, {
        method: api.conversations.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update conversation");
      return api.conversations.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, id] });
    },
  });
}

export function useClearConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.conversations.clear.path, { id });
      const res = await fetch(url, { method: api.conversations.clear.method });
      if (!res.ok) throw new Error("Failed to clear conversation");
      return api.conversations.clear.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, id] });
    },
  });
}

// ============================================================================
// FIX #2: CONVERSATION STATE - SINGLE SOURCE OF TRUTH
// ============================================================================
export function useConversationState(id: number | null) {
  return useQuery({
    queryKey: ["/api/conversations/:id/state", id],
    queryFn: async () => {
      if (!id) return null;
      const url = `/api/conversations/${id}/state`;
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation state");
      return await res.json();
    },
    enabled: !!id,
    refetchInterval: 1000, // Poll for state changes frequently
  });
}

// ============================================================================
// FIX #3: RESUME AGENT - BACKEND TRIGGER
// ============================================================================
export function useResumeAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      const url = `/api/conversations/${conversationId}/resume`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to resume agent");
      }
      return await res.json();
    },
    onSuccess: (_, conversationId) => {
      // Invalidate all related queries to refetch fresh state
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/:id/state", conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.messages.list.path, conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    },
  });
}
