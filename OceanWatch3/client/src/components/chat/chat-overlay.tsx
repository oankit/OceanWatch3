import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Minimize2, Maximize2, Bot, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChat } from '@/hooks/useChat';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ChatSuggestions } from './chat-suggestions';

interface ChatOverlayProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedShipId?: string;
}

export function ChatOverlay({ isOpen, onToggle, selectedShipId }: ChatOverlayProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    isLoading,
    error,
    contextInfo,
    suggestions,
    isConnected,
    isStartingServer,
    serverStatus,
    sendMessage,
    clearConversation,
    loadContextInfo,
    loadSuggestions
  } = useChat();

  // Load context info and suggestions when overlay opens
  useEffect(() => {
    if (isOpen) {
      loadContextInfo();
      loadSuggestions();
    }
  }, [isOpen, loadContextInfo, loadSuggestions]);

  const getConnectionStatus = () => {
    if (isStartingServer) {
      return {
        text: 'Starting...',
        variant: 'secondary' as const,
        icon: <Wifi className="w-3 h-3 mr-1 animate-pulse" />
      };
    } else if (isConnected) {
      return {
        text: 'Connected',
        variant: 'default' as const,
        icon: <Wifi className="w-3 h-3 mr-1" />
      };
    } else {
      return {
        text: 'Offline',
        variant: 'destructive' as const,
        icon: <WifiOff className="w-3 h-3 mr-1" />
      };
    }
  };

  const connectionStatus = getConnectionStatus();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(content, undefined, selectedShipId);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion, undefined, selectedShipId);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isOpen) {
    return (
      <motion.div
        className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
      >
        <Button
          onClick={onToggle}
          size="lg"
          className="rounded-full w-16 h-16 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed z-50 bg-white border border-gray-300 rounded-lg shadow-2xl 
          bottom-6 right-6 max-h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)] overflow-hidden ${
          isExpanded 
            ? 'w-[420px] h-[500px]'
            : isMinimized 
              ? 'w-80 h-12' 
              : 'w-96 h-[480px]'
        }`}
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-300 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">OceanWatch AI</span>
            <Badge 
              variant={connectionStatus.variant}
              className="text-xs"
            >
              {connectionStatus.icon}
              {connectionStatus.text}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            {!isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpand}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMinimize}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="flex flex-col h-full">
            {/* Messages (scrollable) */}
            <div className="flex-1 overflow-y-auto">
              <ChatMessages 
                messages={messages}
                isLoading={isLoading}
                error={error}
                contextInfo={contextInfo}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions (make suggestions area scrollable if needed) */}
            {messages.length === 0 && suggestions && (
              <div className="p-4 border-t border-zinc-700 overflow-y-auto max-h-40">
                <ChatSuggestions 
                  suggestions={suggestions}
                  onSuggestionClick={handleSuggestionClick}
                />
              </div>
            )}

            {/* Input (sticky footer) */}
            <div className="p-4 border-t border-gray-300 sticky bottom-0 bg-white">
              <ChatInput 
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                disabled={!isConnected}
                placeholder={selectedShipId ? "Ask about this ship..." : "Ask about maritime data..."}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
