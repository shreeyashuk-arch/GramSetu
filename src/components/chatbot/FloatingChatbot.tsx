'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Volume2, Sparkles, AlertCircle, WifiOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export default function FloatingChatbot() {
  const { t, speak, language } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);

  const chatbotUrl = process.env.NEXT_PUBLIC_CHATBOT_URL;

  // Initial welcome message in selected language
  useEffect(() => {
    let welcome = 'Namaste! I am Gram Assistant. How can I help you with village services, schemes, or grievances?';
    if (language === 'hi') {
      welcome = 'नमस्ते! मैं ग्राम सहायक हूँ। सरकारी योजनाओं, पानी, बिजली या शिकायतों की स्थिति के बारे में पूछें।';
    } else if (language === 'mr') {
      welcome = 'नमस्कार! मी ग्राम सहाय्यक आहे. शासकीय योजना, पाणी पुरवठा, दाखले किंवा तक्रारींविषयी विचारा.';
    }

    setMessages([
      {
        id: 'msg-0',
        sender: 'bot',
        text: welcome,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [language]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userText = input.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    // AI Rural Knowledge Responder
    setTimeout(() => {
      let botResponse = '';
      const lower = userText.toLowerCase();

      if (lower.includes('scheme') || lower.includes('yojana') || lower.includes('योजना')) {
        botResponse =
          language === 'mr'
            ? 'पीएम-कुसुम सौर कृषी पंप, जल जीवन मिशन आणि आयुष्यमान भारत कार्डसाठी अर्ज ग्रामपंचायत महा-ई-सेवा केंद्रात सुरू आहेत. ७/१२ उतारा आणि आधार कार्ड सोबत ठेवा.'
            : language === 'hi'
            ? 'पीएम-कुसुम सौर पंप, जल जीवन मिशन और आयुष्मान भारत योजना के लिए ग्राम पंचायत सीएससी केंद्र पर आवेदन कर सकते हैं।'
            : 'You may be eligible for PM-KUSUM (90% Solar Pump subsidy), Jal Jeevan Mission, or Ayushman Bharat health card (₹5 Lakh cover). Check the Schemes page for document requirements.';
      } else if (lower.includes('water') || lower.includes('pani') || lower.includes('पाणी') || lower.includes('पानी')) {
        botResponse =
          language === 'mr'
            ? 'पिण्याच्या पाण्याच्या वेळेत दुरुस्तीसाठी बदल करण्यात आला आहे. झोन ए मध्ये सकाळी ६-८ आणि झोन बी मध्ये संध्याकाळी ५-७ पाणी सोडले जाईल. टँकरसाठी संसाधन विभाग पहा.'
            : language === 'hi'
            ? 'पानी की मुख्य लाइन की मरम्मत जारी है। सुबह 6-8 और शाम 5-7 जलापूर्ति होगी। आपातकालीन पानी के लिए टैंकर का अनुरोध करें।'
            : 'Water line maintenance is in progress near North Tank. Zone A receives water 6-8 AM and Zone B 5-7 PM. You can also request a subsidized water tanker in the Resources section.';
      } else if (lower.includes('electricity') || lower.includes('light') || lower.includes('vij') || lower.includes('वीज') || lower.includes('बिजली')) {
        botResponse =
          language === 'mr'
            ? 'वीज तक्रारींसाठी महावितरणचे तंत्रज्ञ सुरेश वायरमन उपलब्ध आहेत. रिपोर्ट पेजवरून त्वरित तक्रार नोंदवा.'
            : 'For electricity faults or dangling wires, report directly via the Report page. Local certified wireman Suresh is on call.';
      } else if (lower.includes('status') || lower.includes('complaint') || lower.includes('तक्रार') || lower.includes('शिकायत')) {
        botResponse =
          language === 'mr'
            ? 'तुमच्या तक्रारीची सद्यस्थिती तपासण्यासाठी वरील "ट्रॅक तक्रार" पर्यायावर जा किंवा तक्रार क्रमांक सांगा.'
            : 'To track your grievance, navigate to Complaints Tracker. The average village resolution time is currently 28 hours.';
      } else {
        botResponse =
          language === 'mr'
            ? 'माहिती मिळाली. ग्रामसेवकांशी संपर्क साधण्यासाठी किंवा थेट मदत मिळवण्यासाठी कृपया तक्रार नोंदवा किंवा सरपंच कार्यालयाला भेट द्या.'
            : 'Thank you for reaching out. You can register grievances, track real-time resolution with photo proof, or request resources like tractors and tankers anytime.';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botResponse,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <>
      {/* Floating Ask Gram Assistant Trigger */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 lg:left-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 py-3 px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold shadow-xl shadow-emerald-700/30 transition-transform active:scale-95 border-2 border-white/20"
          title="Ask Gram Assistant"
        >
          <Bot className="w-5 h-5 text-emerald-300" />
          <span className="text-xs tracking-tight hidden sm:inline">Ask Gram Assistant</span>
        </button>
      </div>

      {/* Chat Window Drawer / Modal */}
      {isOpen && (
        <div className="fixed bottom-20 lg:bottom-20 left-4 sm:left-6 w-[90vw] sm:w-96 max-h-[550px] h-[500px] z-50 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-3">
          {/* Header */}
          <div className="p-3.5 bg-emerald-800 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-950 flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-xs">Gram Assistant</h4>
                <p className="text-[10px] text-emerald-200">Rural Information AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-full text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Iframe or Built-in Chat */}
          {chatbotUrl && !iframeError ? (
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={chatbotUrl}
                title="Gram Assistant"
                className="w-full h-full border-none"
                onError={() => setIframeError(true)}
              />
            </div>
          ) : (
            <>
              {/* Messages Feed */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950/40 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                        m.sender === 'user'
                          ? 'bg-emerald-700 text-white rounded-br-none'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <p className="leading-relaxed">{m.text}</p>
                      <div className="flex items-center justify-between mt-1 text-[9px] opacity-75">
                        <span>{m.time}</span>
                        {m.sender === 'bot' && (
                          <button
                            onClick={() => speak(m.text)}
                            className="p-0.5 hover:opacity-100 ml-2"
                            title="Speak message aloud"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs italic pl-2">
                    <Sparkles className="w-3 h-3 animate-spin text-emerald-500" />
                    <span>Gram Assistant is thinking...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('chatbot.placeholder')}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 dark:text-white"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
