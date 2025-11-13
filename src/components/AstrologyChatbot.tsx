import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AstrologyChatbotProps {
  doshaContext?: any;
}

const AstrologyChatbot = ({ doshaContext }: AstrologyChatbotProps) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isHindi = i18n.language?.toLowerCase().startsWith('hi');

  // Get or create device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  };

  // Check message limit
  const checkMessageLimit = () => {
    const deviceId = getDeviceId();
    const key = `chatCount_${deviceId}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    return count >= 15;
  };

  // Increment message count
  const incrementMessageCount = () => {
    const deviceId = getDeviceId();
    const key = `chatCount_${deviceId}`;
    const count = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, (count + 1).toString());
  };

  // Check limit on mount
  useEffect(() => {
    setIsLimitReached(checkMessageLimit());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    // Check if limit reached
    if (checkMessageLimit()) {
      setIsLimitReached(true);
      toast.error(isHindi ? 'मुफ्त चैट सीमा समाप्त हो गई है।' : 'Free chat limit exhausted.');
      return;
    }

    // Increment count
    incrementMessageCount();
    
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/astrology-chat`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          doshaContext,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error(isHindi ? 'बहुत अधिक अनुरोध। कृपया बाद में पुनः प्रयास करें।' : 'Too many requests. Please try again later.');
          return;
        }
        if (response.status === 402) {
          toast.error(isHindi ? 'AI क्रेडिट समाप्त हो गए। कृपया सहायता से संपर्क करें।' : 'AI credits exhausted. Please contact support.');
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (let line of lines) {
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                assistantMessage += content;
                setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(isHindi ? 'त्रुटि हुई। कृपया पुनः प्रयास करें।' : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (input.trim() && !isLoading && !isLimitReached) {
      streamChat(input.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="spiritual-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl gradient-spiritual bg-clip-text text-transparent">
          <Sparkles className="w-5 h-5 text-primary" />
          {isHindi ? 'कोई प्रश्न?' : 'Any Questions?'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-primary/50" />
                <p className="text-sm">
                  {isHindi 
                    ? 'हमारे AI सहायक के माध्यम से अपने दोष का विस्तार से विश्लेषण करें'
                    : 'Analyse your dosha in detail through our AI powered assistant'}
                </p>
              </div>
            )}
            
            {messages.map((msg, idx) => {
              // Safe message formatting - split on bold markers and render with React
              const formatMessage = (content: string) => {
                const parts = content.split(/\*\*(.*?)\*\*/g);
                return parts.map((part, i) => {
                  if (i % 2 === 1) {
                    return <strong key={i}>{part}</strong>;
                  }
                  // Handle line breaks safely without dangerouslySetInnerHTML
                  return part.split('\n').map((line, j, arr) => (
                    <span key={`${i}-${j}`}>
                      {line}
                      {j < arr.length - 1 && <br />}
                    </span>
                  ));
                });
              };

              return (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {formatMessage(msg.content)}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isLimitReached ? (isHindi ? "चैट सीमा समाप्त" : "Chat limit reached") : (isHindi ? "अपना प्रश्न पूछें..." : "Ask your question...")}
            disabled={isLoading || isLimitReached}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading || isLimitReached}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {isHindi 
            ? 'AI द्वारा संचालित। गंभीर मामलों के लिए कृपया पेशेवर ज्योतिषी से परामर्श लें।'
            : 'AI-powered. Please consult a professional astrologer for serious matters.'}
        </p>
      </CardContent>
    </Card>
  );
};

export default AstrologyChatbot;