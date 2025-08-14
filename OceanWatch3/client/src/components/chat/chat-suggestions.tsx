import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ship, AlertTriangle, Activity, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AllSuggestions } from '@/services/chatService';

interface ChatSuggestionsProps {
  suggestions: AllSuggestions;
  onSuggestionClick: (suggestion: string) => void;
}

export function ChatSuggestions({ suggestions, onSuggestionClick }: ChatSuggestionsProps) {
  const [expandedTopics, setExpandedTopics] = useState<string[]>(['vessels']);

  const toggleTopic = (topic: string) => {
    setExpandedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const topicIcons = {
    vessels: Ship,
    alerts: AlertTriangle,
    behavior: Activity,
    analysis: BarChart3
  };

  const topicLabels = {
    vessels: 'Vessel Queries',
    alerts: 'Alert Analysis',
    behavior: 'Behavior Patterns',
    analysis: 'Data Analysis'
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-black mb-3">Try asking about:</h4>
      
      {Object.entries(suggestions.suggestions).map(([topic, topicSuggestions]) => {
        const Icon = topicIcons[topic as keyof typeof topicIcons];
        const isExpanded = expandedTopics.includes(topic);
        
        return (
          <div key={topic} className="border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleTopic(topic)}
              className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-black">
                  {topicLabels[topic as keyof typeof topicLabels]}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
            
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-3 bg-white space-y-2"
              >
                {topicSuggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSuggestionClick(suggestion)}
                      className="w-full justify-start text-left text-xs text-black hover:text-black hover:bg-gray-100 h-auto p-2"
                    >
                      {suggestion}
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
