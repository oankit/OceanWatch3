import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Loader2, AlertCircle, Database, Ship, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChatMessage, ContextInfo } from '@/services/chatService';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  contextInfo: ContextInfo | null;
}

export function ChatMessages({ messages, isLoading, error, contextInfo }: ChatMessagesProps) {
  if (messages.length === 0 && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Bot className="w-12 h-12 text-blue-400 mb-4" />
        <h3 className="text-lg font-semibold text-black mb-2">Welcome to OceanWatch AI</h3>
        <p className="text-black text-sm mb-4">
          I can help you analyze maritime data, track vessels, and investigate suspicious activities.
        </p>
        
        {contextInfo && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              {contextInfo.available_collections.length} Collections
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Ship className="w-3 h-3 mr-1" />
              {contextInfo.vessel_types.length} Vessel Types
            </Badge>
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {contextInfo.recent_alerts_count} Recent Alerts
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {message.role === 'assistant' && (
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
          )}
          
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            
            {message.role === 'assistant' && (
              <div className="mt-2 text-xs text-zinc-400">
                {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
          
          {message.role === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          )}
        </motion.div>
      ))}
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 justify-start"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-sm text-zinc-300">Analyzing maritime data...</span>
            </div>
          </div>
        </motion.div>
      )}
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 justify-start"
        >
          <div className="flex-shrink-0 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div className="bg-red-900/20 border border-red-700 rounded-lg px-4 py-2">
            <div className="text-sm text-red-300">{error}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
