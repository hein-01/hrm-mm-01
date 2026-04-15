import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateGeminiResponse } from '../utils/gemini';
import { useUserAccess } from '../context/UserAccessProvider';
import { useAppData } from '../context/AppDataContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSIGHT_PROMPTS = [
  { label: 'Attendance Trends', prompt: 'Analyze the current attendance trends and flag any anomalies.' },
  { label: 'Payroll Risks', prompt: 'Identify any payroll risks or compliance gaps in the current cycle.' },
  { label: 'Retention Analysis', prompt: 'Analyze employee retention risk based on current workforce data.' },
  { label: 'SSB & PIT Check', prompt: 'Review the SSB and PIT compliance status for the current payroll period.' },
];

export default function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const { subscriptionTier } = useUserAccess();
  const { employees, adjustments, loans, leaveRequests, lastPayrollTotal, lastPayrollStatus } = useAppData();
  const isPremium = subscriptionTier === 'premium';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const buildLiveContext = () => {
    const activeEmp = employees.filter(e => e.status === 'Active').length;
    const pendingAdj = adjustments.filter(a => a.status === 'Pending').length;
    const pendingLeave = leaveRequests.filter(l => l.status === 'Pending').length;
    const activeLoans = loans.filter(l => l.status === 'Active').length;
    return `[LIVE HRMS DATA — Active Staff: ${activeEmp}, Pending Adjustments: ${pendingAdj}, Pending Leave Requests: ${pendingLeave}, Active Loans: ${activeLoans}, Last Payroll: ${(lastPayrollTotal ?? 0).toFixed(1)}L MMK · Status: ${lastPayrollStatus ?? 'N/A'}]`;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      const enrichedPrompt = isPremium ? `${buildLiveContext()}\n\nUser: ${text}` : text;
      const response = await generateGeminiResponse(enrichedPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error: any) {
      const msg = error.message?.includes('User location is not supported') ||
                  error.message?.includes('not supported for generateContent')
        ? 'The AI service is unavailable in your region. Please check your network or contact your system administrator.'
        : 'AI service is temporarily unreachable. Core HRMS operations are unaffected.';
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[480px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300 ease-out">

        {/* Header */}
        <div className="px-6 h-[73px] flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">AI HR Assistant</h2>
              <div className="flex items-center gap-2 mt-1">
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[11px]">workspace_premium</span>
                    Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-wider">
                    Free Plan
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-medium">Powered by Gemini</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Free-tier upsell banner */}
        {!isPremium && (
          <div className="mx-4 mt-4 flex items-start gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
            <span className="material-symbols-outlined text-indigo-500 text-[20px] shrink-0 mt-0.5">workspace_premium</span>
            <div>
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">HR Insights require Premium</p>
              <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-0.5 leading-relaxed">
                General Q&amp;A is free. Upgrade to unlock live data analysis — attendance trends, payroll risks, and retention insights.
              </p>
            </div>
          </div>
        )}

        {/* Premium insight prompt chips */}
        {isPremium && (
          <div className="px-5 pt-4 pb-2 flex flex-wrap gap-2">
            {INSIGHT_PROMPTS.map(p => (
              <button
                key={p.label}
                onClick={() => sendMessage(p.prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] dark:bg-slate-900/50"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="size-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl flex items-center justify-center text-indigo-500 mb-6">
                <span className="material-symbols-outlined text-[40px]">chat_bubble</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {isPremium ? 'Ask me anything about your workforce' : 'How can I help you today?'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-[260px]">
                {isPremium
                  ? 'I have access to your live HR data. Ask about attendance, payroll compliance, retention risks, or how to use any feature.'
                  : 'Ask me how to use any feature — approvals, adjustments, payroll, leave, and more. Upgrade to Premium for live data insights.'}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex gap-1.5 p-1">
                  <div className="size-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="size-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="size-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isPremium ? 'Ask about your data or how to use a feature…' : 'Ask how to use the software…'}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all pr-14"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-0 disabled:scale-95 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
          </form>
          <p className="text-center text-[10px] text-slate-400 mt-3">
            AI responses are advisory — always verify critical HR decisions.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
