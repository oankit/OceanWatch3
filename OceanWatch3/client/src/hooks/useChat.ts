import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService, ChatMessage, ChatResponse, ContextInfo, AllSuggestions } from '@/services/chatService';
import { ragServerService, RAGServerStatus } from '@/services/ragServerService';

export function useChat(sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextInfo, setContextInfo] = useState<ContextInfo | null>(null);
  const [suggestions, setSuggestions] = useState<AllSuggestions | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverStatus, setServerStatus] = useState<RAGServerStatus>({
    isRunning: false,
    isStarting: false,
    port: 8001
  });
  
  const sessionIdRef = useRef(sessionId || `session_${Date.now()}`);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load conversation history on mount
  useEffect(() => {
    if (sessionIdRef.current) {
      loadConversation();
    }
  }, []);

  // Start server and check connection status
  useEffect(() => {
    startServerAndCheckConnection();
    
    // Set up periodic connection checking
    connectionCheckIntervalRef.current = setInterval(checkConnection, 5000);
    
    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, []);

  const startServerAndCheckConnection = useCallback(async () => {
    try {
      setIsStartingServer(true);
      setError(null);
      
      // Try to start the RAG server
      const startResult = await ragServerService.startServer();
      
      if (startResult.success) {
        // Wait for server to be ready
        const isReady = await ragServerService.waitForServer(30000);
        if (isReady) {
          await checkConnection();
        } else {
          setError('Server started but not responding');
        }
      } else {
        setError(startResult.error || 'Failed to start server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start server');
    } finally {
      setIsStartingServer(false);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      // Check server status
      const status = await ragServerService.checkServerStatus();
      setServerStatus(status);
      
      if (status.isRunning) {
        // Try to connect to the chat service
        const health = await chatService.getHealth();
        const newIsConnected = health.status === 'healthy' && health.database_connected;
        setIsConnected(newIsConnected);
        
        if (newIsConnected && !contextInfo) {
          loadContextInfo();
          loadSuggestions();
        }
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
      console.error('Failed to check connection:', err);
    }
  }, [contextInfo]);

  const loadConversation = useCallback(async () => {
    try {
      const result = await chatService.getConversation(sessionIdRef.current);
      setMessages(result.messages);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      // Start with empty conversation if loading fails
      setMessages([]);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, context?: Record<string, any>, shipId?: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const request = {
        message: content.trim(),
        conversation_history: messages,
        context,
        ship_id: shipId
      };

      const response: ChatResponse = await chatService.sendMessage(request);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString()
      };

      // Add assistant message
      setMessages(prev => [...prev, assistantMessage]);

      // Store updated conversation
      await chatService.storeConversation(sessionIdRef.current, [...messages, userMessage, assistantMessage]);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const loadContextInfo = useCallback(async () => {
    try {
      const info = await chatService.getContextInfo();
      setContextInfo(info);
    } catch (err) {
      console.error('Failed to load context info:', err);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const allSuggestions = await chatService.getAllSuggestions();
      setSuggestions(allSuggestions);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    }
  }, []);

  const clearConversation = useCallback(async () => {
    try {
      await chatService.deleteConversation(sessionIdRef.current);
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear conversation:', err);
    }
  }, []);

  const getSuggestionsByTopic = useCallback((topic: string) => {
    if (!suggestions) return [];
    return suggestions.suggestions[topic as keyof typeof suggestions.suggestions] || [];
  }, [suggestions]);

  const getRecentMessages = useCallback((count: number = 10) => {
    return messages.slice(-count);
  }, [messages]);

  const getMessageCount = useCallback(() => {
    return messages.length;
  }, [messages]);

  const hasMessages = useCallback(() => {
    return messages.length > 0;
  }, [messages]);

  const getLastUserMessage = useCallback(() => {
    const userMessages = messages.filter(msg => msg.role === 'user');
    return userMessages[userMessages.length - 1];
  }, [messages]);

  const getLastAssistantMessage = useCallback(() => {
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    return assistantMessages[assistantMessages.length - 1];
  }, [messages]);

  return {
    // State
    messages,
    isLoading,
    error,
    contextInfo,
    suggestions,
    isConnected,
    isStartingServer,
    serverStatus,
    sessionId: sessionIdRef.current,

    // Actions
    sendMessage,
    clearConversation,
    loadContextInfo,
    loadSuggestions,
    checkConnection,
    startServerAndCheckConnection,

    // Utilities
    getSuggestionsByTopic,
    getRecentMessages,
    getMessageCount,
    hasMessages,
    getLastUserMessage,
    getLastAssistantMessage
  };
}
