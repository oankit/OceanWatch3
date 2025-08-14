import { Service } from "@/lib/serviceRoot";
import { AxiosError } from "axios";

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
  context?: Record<string, any>;
  ship_id?: string;
}

export interface ChatSource {
  collection: string;
  document_type: string;
  ship_id?: string;
  timestamp?: string;
  similarity_score: number;
  vessel_name?: string;
  vessel_type?: string;
  flag?: string;
  alert_type?: string;
  severity?: string;
  ship_name?: string;
  event_type?: string;
  location?: string;
}

export interface ChatResponse {
  response: string;
  sources: ChatSource[];
  context_summary: string;
  confidence: 'low' | 'medium' | 'high';
  follow_up_questions: string[];
  documents_retrieved: number;
  processing_time?: number;
  error?: string;
}

export interface ContextInfo {
  recent_alerts_count: number;
  vessel_types: string[];
  available_collections: string[];
  error?: string;
}

export interface QuerySuggestions {
  topic: string;
  suggestions: string[];
}

export interface AllSuggestions {
  suggestions: {
    vessels: string[];
    alerts: string[];
    behavior: string[];
    analysis: string[];
  };
}

class ChatService extends Service {
  constructor() {
    super("http://localhost:8001"); // RAG API server
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<ChatResponse>(() =>
      this.instance.post<ChatResponse>("/chat", request, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as ChatResponse;
  }

  async getContextInfo(): Promise<ContextInfo> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<ContextInfo>(() =>
      this.instance.get<ContextInfo>("/context-info", config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as ContextInfo;
  }

  async getSuggestions(topic: string = "vessels"): Promise<QuerySuggestions> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<QuerySuggestions>(() =>
      this.instance.get<QuerySuggestions>(`/suggestions/${topic}`, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as QuerySuggestions;
  }

  async getAllSuggestions(): Promise<AllSuggestions> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<AllSuggestions>(() =>
      this.instance.get<AllSuggestions>("/suggestions", config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as AllSuggestions;
  }

  async storeConversation(sessionId: string, messages: ChatMessage[]): Promise<void> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<void>(() =>
      this.instance.post<void>(`/conversation/${sessionId}`, messages, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
  }

  async getConversation(sessionId: string): Promise<{ session_id: string; messages: ChatMessage[] }> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<{ session_id: string; messages: ChatMessage[] }>(() =>
      this.instance.get<{ session_id: string; messages: ChatMessage[] }>(`/conversation/${sessionId}`, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as { session_id: string; messages: ChatMessage[] };
  }

  async deleteConversation(sessionId: string): Promise<void> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<void>(() =>
      this.instance.delete<void>(`/conversation/${sessionId}`, config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
  }

  async getHealth(): Promise<{ status: string; database_connected: boolean; available_collections: string[]; recent_alerts_count: number; timestamp: string }> {
    const config = this.applyHeaders({}, {}, true);
    const exec = this.safeAxiosApply<{ status: string; database_connected: boolean; available_collections: string[]; recent_alerts_count: number; timestamp: string }>(() =>
      this.instance.get<{ status: string; database_connected: boolean; available_collections: string[]; recent_alerts_count: number; timestamp: string }>("/health", config)
    );
    const res = await exec();
    if (res instanceof AxiosError) throw res;
    return res as { status: string; database_connected: boolean; available_collections: string[]; recent_alerts_count: number; timestamp: string };
  }
}

export const chatService = new ChatService();
