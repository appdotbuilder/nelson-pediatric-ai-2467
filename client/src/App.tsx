
import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  MessageCircle, 
  History, 
  Settings, 
  Info, 
  Send, 
  Mic,
  Menu,
  Plus,
  Brain,
  Stethoscope,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  ChatSession, 
  ChatMessage, 
  CreateChatSessionInput,
  ChatQueryInput,
  ChatResponse
} from '../../server/src/schema';

interface AppState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  showCitations: boolean;
  selectedModel: string;
  activeTab: 'chat' | 'history' | 'settings' | 'about';
}

function App() {
  const [state, setState] = useState<AppState>({
    currentSession: null,
    sessions: [],
    messages: [],
    isLoading: false,
    isTyping: false,
    showCitations: true,
    selectedModel: 'nelson-pediatric-v1',
    activeTab: 'chat'
  });

  const [inputMessage, setInputMessage] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // User ID - in a production app this would come from authentication system
  const userId = 'user_123';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadChatSessions = useCallback(async () => {
    try {
      const sessions = await trpc.getChatSessions.query({ userId });
      setState(prev => ({ ...prev, sessions }));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, [userId]);

  const loadChatMessages = useCallback(async (sessionId: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const messages = await trpc.getChatMessages.query({ sessionId });
      setState(prev => ({ ...prev, messages, isLoading: false }));
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [scrollToBottom]);

  const createNewSession = useCallback(async (title?: string) => {
    try {
      const sessionData: CreateChatSessionInput = {
        user_id: userId,
        title: title || 'New Chat'
      };
      const newSession = await trpc.createChatSession.mutate(sessionData);
      setState(prev => ({ 
        ...prev, 
        currentSession: newSession,
        sessions: [newSession, ...prev.sessions],
        messages: [],
        activeTab: 'chat'
      }));
      setHistoryOpen(false);
      return newSession;
    } catch (error) {
      console.error('Failed to create new session:', error);
      return null;
    }
  }, [userId]);

  const selectSession = useCallback(async (session: ChatSession) => {
    setState(prev => ({ ...prev, currentSession: session, activeTab: 'chat' }));
    await loadChatMessages(session.id);
    setHistoryOpen(false);
  }, [loadChatMessages]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;
    if (!state.currentSession) {
      const newSession = await createNewSession();
      if (!newSession) return;
    }

    const sessionId = state.currentSession!.id;
    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message immediately to UI
    const tempUserMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      citations: null,
      created_at: new Date()
    };

    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, tempUserMessage],
      isTyping: true 
    }));

    setTimeout(scrollToBottom, 100);

    try {
      const queryData: ChatQueryInput = {
        session_id: sessionId,
        message: userMessage
      };

      const response: ChatResponse = await trpc.processChatQuery.mutate(queryData);
      
      // Replace temp message and add assistant response
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages.filter(m => m.id !== tempUserMessage.id),
          {
            ...tempUserMessage,
            id: `user_${Date.now()}`
          },
          response.message
        ],
        isTyping: false
      }));

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setState(prev => ({ 
        ...prev, 
        isTyping: false,
        messages: prev.messages.map(m => 
          m.id === tempUserMessage.id 
            ? { ...m, content: `${m.content} [Failed to send]` }
            : m
        )
      }));
    }
  }, [inputMessage, state.currentSession, createNewSession, scrollToBottom]);

  const retryLastMessage = useCallback(async () => {
    const lastUserMessage = [...state.messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage && state.currentSession) {
      setInputMessage(lastUserMessage.content);
      await sendMessage();
    }
  }, [state.messages, state.currentSession, sendMessage]);

  useEffect(() => {
    loadChatSessions();
  }, [loadChatSessions]);

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, scrollToBottom]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}>
          <div className="prose prose-invert prose-sm max-w-none">
            {message.content}
          </div>
          {!isUser && message.citations && state.showCitations && (
            <div className="mt-3 pt-2 border-t border-gray-600">
              <div className="flex flex-wrap gap-1">
                {message.citations.map((citation, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-gray-700 border-gray-600">
                    📚 {citation.source}
                    {citation.page_number && `, p.${citation.page_number}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs opacity-60 mt-2">
            {message.created_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  const renderChatTab = () => (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4" ref={chatScrollRef}>
        {state.messages.length === 0 && !state.isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Stethoscope className="w-16 h-16 text-blue-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-200 mb-2">Welcome to NelsonGPT</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Your AI-powered pediatric medical assistant. Ask me about symptoms, treatments, 
              drug dosages, or emergency protocols.
            </p>
            <div className="grid grid-cols-1 gap-2 text-sm text-gray-300 max-w-sm">
              <div className="p-3 bg-gray-800 rounded-lg">
                💊 "What's the amoxicillin dose for a 5-year-old?"
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                🔍 "Differential diagnosis for fever in toddlers"
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                🚨 "Neonatal resuscitation protocol steps"
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {state.messages.map(renderMessage)}
            {state.isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-gray-300">NelsonGPT is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about pediatric medicine..."
              className="bg-gray-800 border-gray-600 text-gray-100 rounded-2xl pr-20 py-3"
              disabled={state.isLoading || state.isTyping}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 text-gray-400 hover:text-gray-200"
                disabled
              >
                <Mic className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-8 h-8 p-0 text-blue-400 hover:text-blue-300"
                onClick={sendMessage}
                disabled={!inputMessage.trim() || state.isLoading || state.isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        {state.messages.length > 0 && (
          <div className="flex justify-between items-center mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={retryLastMessage}
              className="text-gray-400 hover:text-gray-200"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setState(prev => ({ ...prev, showCitations: !prev.showCitations }))}
              className="text-gray-400 hover:text-gray-200"
            >
              {state.showCitations ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              Citations
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-200">Chat History</h2>
          <Button
            size="sm"
            onClick={() => createNewSession()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 px-4">
        {state.sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <History className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-400">No chat history yet</p>
            <p className="text-gray-500 text-sm">Start a conversation to see it here</p>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {state.sessions.map((session: ChatSession) => (
              <Card
                key={session.id}
                className="p-3 bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => selectSession(session)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-200 truncate">{session.title}</h3>
                    <p className="text-sm text-gray-400">
                      {session.updated_at.toLocaleDateString()}
                    </p>
                  </div>
                  {state.currentSession?.id === session.id && (
                    <Badge variant="secondary" className="ml-2">Active</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200">Settings</h2>
      </div>
      <div className="p-4 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">AI Model</label>
          <Select 
            value={state.selectedModel || 'nelson-pediatric-v1'} 
            onValueChange={(value) => 
              setState(prev => ({ ...prev, selectedModel: value }))
            }
          >
            <SelectTrigger className="bg-gray-800 border-gray-600">
              <SelectValue placeholder="Select AI Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nelson-pediatric-v1">Nelson Pediatric v1</SelectItem>
              <SelectItem value="nelson-pediatric-v2" disabled>Nelson Pediatric v2 (Coming Soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Display Options</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={state.showCitations}
                onChange={(e) => setState(prev => ({ ...prev, showCitations: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-300">Show inline citations</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-200">About NelsonGPT</h2>
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">NelsonGPT</h3>
            <p className="text-gray-400">AI-Powered Pediatric Medical Assistant</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-200 mb-2">What I can help with:</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Symptom-to-diagnosis reasoning</li>
                <li>• Weight-based pediatric drug dosages</li>
                <li>• Emergency protocol retrieval</li>
                <li>• Developmental milestone tracking</li>
                <li>• Growth chart interpretation</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-200 mb-2">Evidence Base:</h4>
              <p className="text-sm text-gray-300">
                Powered by the Nelson Textbook of Pediatrics and curated pediatric medical resources.
              </p>
            </div>
            
            <div className="text-xs text-gray-400 pt-4 border-t border-gray-700">
              <p>⚠️ For educational and reference purposes only.</p>
              <p>Always consult current clinical guidelines and supervising physicians.</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Top Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="md:hidden">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-gray-900 border-gray-700 p-0">
              {renderHistoryTab()}
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">NelsonGPT</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select 
            value={state.selectedModel || 'nelson-pediatric-v1'} 
            onValueChange={(value) => 
              setState(prev => ({ ...prev, selectedModel: value }))
            }
          >
            <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-xs">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nelson-pediatric-v1">Nelson v1</SelectItem>
              <SelectItem value="nelson-pediatric-v2" disabled>Nelson v2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-80 bg-gray-800 border-r border-gray-700 flex-col">
          {renderHistoryTab()}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {state.activeTab === 'chat' && renderChatTab()}
          {state.activeTab === 'history' && <div className="md:hidden">{renderHistoryTab()}</div>}
          {state.activeTab === 'settings' && renderSettingsTab()}
          {state.activeTab === 'about' && renderAboutTab()}
        </div>
      </div>

      {/* Bottom Tab Bar (Mobile) */}
      <div className="md:hidden bg-gray-800 border-t border-gray-700 px-4 py-2">
        <div className="flex justify-around">
          {[
            { key: 'chat', icon: MessageCircle, label: 'Chat' },
            { key: 'history', icon: History, label: 'History' },
            { key: 'settings', icon: Settings, label: 'Settings' },
            { key: 'about', icon: Info, label: 'About' }
          ].map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              size="sm"
              variant="ghost"
              onClick={() => setState(prev => ({ ...prev, activeTab: key as AppState['activeTab'] }))}
              className={`flex flex-col items-center space-y-1 py-2 h-auto ${
                state.activeTab === key ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
