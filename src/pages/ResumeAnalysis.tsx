import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  Award, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  BookOpen, 
  Briefcase, 
  Copy,
  ChevronDown,
  ChevronUp,
  Brain,
  Mail,
  Phone,
  ListRestart,
  Wand2,
  TrendingUp,
  Send,
  MessageSquare,
  DollarSign,
  Gauge,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

interface AnalysisData {
  name: string;
  email: string;
  phone: string;
  summary: string;
  ats_score: number;
  ats_explanation: string;
  skills: string[];
  missing_skills: string[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  education: Array<{ degree: string; school: string; year: string }>;
  experience: Array<{ role: string; company: string; duration: string; description: string }>;
  projects: Array<{ title: string; description: string }>;
  certifications?: string[];
  interview_questions: Array<{ question: string; suggested_answer: string }>;
  cover_letter: string;
  
  // Upgraded SaaS features
  rewrite_suggestions?: Array<{ section: string; original: string; suggestion: string; reason: string }>;
  skill_gap_analysis?: Array<{ skill: string; status: "Missing" | "Present"; demand_level: "High" | "Medium" | "Low" }>;
  learning_roadmap?: Array<{ step: number; topic: string; actions: string[]; timeline: string }>;
  career_suggestions?: Array<{ title: string; reason: string; fit_percentage: number }>;
  salary_estimation?: { low: number; median: number; high: number; currency: string };
  interview_difficulty?: { level: "Easy" | "Medium" | "Hard"; reason: string };
}

interface VersionItem {
  id: number;
  version_number: number;
  filename: string;
  created_at: string;
  ats_score: number;
  is_active: boolean;
}

interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const ResumeAnalysis: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawId = searchParams.get('id');
  const [activeResumeId, setActiveResumeId] = useState<number | null>(rawId ? parseInt(rawId) : null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'ats' | 'profile' | 'rewrite' | 'gap' | 'career' | 'letter' | 'interview' | 'chat'>('ats');
  
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Chat chatbot assistant state
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchDetails = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const detailRes = await api.get(`/api/candidate/resume/${id}`);
      setAnalysis(detailRes.data.analysis);
      
      // Fetch version logs
      const versionsRes = await api.get(`/api/candidate/resume/${id}/versions`);
      setVersions(versionsRes.data);

      // Reset chatbot if switching tabs or resumes
      setChatMessages([]);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch resume analysis details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeResumeId) {
      fetchDetails(activeResumeId);
    } else {
      // Find latest resume
      const fetchLatest = async () => {
        setLoading(true);
        try {
          const listRes = await api.get('/api/candidate/resumes');
          if (listRes.data && listRes.data.length > 0) {
            setActiveResumeId(listRes.data[0].id);
          } else {
            setAnalysis(null);
            setLoading(false);
          }
        } catch (e) {
          console.error(e);
          setError('Failed to load history lists.');
          setLoading(false);
        }
      };
      fetchLatest();
    }
  }, [activeResumeId]);

  // Load chat history when entering chat tab
  useEffect(() => {
    if (activeTab === 'chat' && activeResumeId) {
      const fetchChat = async () => {
        try {
          const res = await api.get(`/api/candidate/resume/${activeResumeId}/chat-history`);
          setChatMessages(res.data);
        } catch (e) {
          console.error(e);
        }
      };
      fetchChat();
    }
  }, [activeTab, activeResumeId]);

  // Scroll to bottom of chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCopyLetter = () => {
    if (!analysis?.cover_letter) return;
    navigator.clipboard.writeText(analysis.cover_letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectDownload = async (type: 'ats' | 'summary' | 'cover-letter') => {
    if (!activeResumeId) return;
    try {
      const response = await api.get(`/api/candidate/resume/${activeResumeId}/download/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Failed to download PDF.');
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat || !activeResumeId) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSendingChat(true);

    try {
      const response = await api.post(`/api/candidate/resume/${activeResumeId}/chat`, {
        message: userMessage
      });
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Unable to get AI Career reply.' }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = parseInt(e.target.value);
    setActiveResumeId(selectedId);
    setSearchParams({ id: selectedId.toString() });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl lg:col-span-1" />
          <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <p className="text-red-500 font-semibold">{error}</p>
        <Link to="/candidate" className="mt-4 inline-block px-6 py-2 bg-primary text-white rounded-xl">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <h4 className="font-semibold text-lg">No Resume Analysis Data Available</h4>
        <p className="text-sm text-slate-400 mt-1">Please upload a resume on the candidate dashboard first.</p>
        <Link to="/candidate" className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-md">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const score = analysis.ats_score || 0;
  const scoreColor = score >= 80 ? 'text-emerald-500' : (score >= 60 ? 'text-amber-500' : 'text-rose-500');
  const strokeDashoffset = 251.2 - (251.2 * score) / 100;

  return (
    <div className="space-y-8">
      
      {/* Header with Versions and Exports */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display font-bold text-2xl bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Resume Analysis & AI Optimizer
          </h1>
          
          {/* Version history select picker */}
          {versions.length > 1 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <ListRestart className="w-4 h-4 text-primary" />
              <span>Version History:</span>
              <select 
                value={activeResumeId || ''} 
                onChange={handleVersionChange}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-slate-350 cursor-pointer focus:border-primary"
              >
                {versions.map((ver) => (
                  <option key={ver.id} value={ver.id}>
                    v{ver.version_number} - {new Date(ver.created_at).toLocaleDateString()} {ver.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => handleDirectDownload('summary')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
            Summary PDF
          </button>
          <button 
            onClick={() => handleDirectDownload('ats')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10"
          >
            <Download className="w-4 h-4" />
            ATS Report PDF
          </button>
        </div>
      </div>

      {/* Main layout split */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Core Side stats */}
        <div className="space-y-8 lg:col-span-1">
          
          {/* ATS score card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-sm relative overflow-hidden">
            <h3 className="font-display font-semibold text-lg text-slate-800 dark:text-slate-200">ATS Rating</h3>
            
            {/* SVG circle progress */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-850" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  className={scoreColor}
                  fill="transparent" 
                  strokeDasharray="251.2"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="font-display font-bold text-3xl text-slate-900 dark:text-white">{score}</span>
                <span className="text-xs text-slate-400 block font-medium">/ 100</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {analysis.ats_explanation}
            </p>
          </div>

          {/* Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="font-display font-semibold text-base text-slate-800 dark:text-slate-200">Candidate Contact</h3>
            <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-400">
              {analysis.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{analysis.email}</span>
                </div>
              )}
              {analysis.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{analysis.phone}</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Tab pages selector */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab selectors bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-850 overflow-x-auto whitespace-nowrap scrollbar-hide space-x-6 pb-1">
            {([
              { id: 'ats', label: 'ATS Analysis' },
              { id: 'profile', label: 'Resume Profile' },
              { id: 'rewrite', label: 'Rewrite Assistant' },
              { id: 'gap', label: 'Skills & Roadmap' },
              { id: 'career', label: 'Career & Salary' },
              { id: 'letter', label: 'Cover Letter' },
              { id: 'interview', label: 'Interview Prep' },
              { id: 'chat', label: 'AI Chat Coach' }
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  pb-3 font-semibold text-xs transition-all border-b-2 relative whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'border-primary text-slate-950 dark:text-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Panel renderer */}
          <div className="min-h-[450px]">
            
            {/* ATS REPORT */}
            {activeTab === 'ats' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
                    <h4 className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                      <CheckCircle className="w-5 h-5" />
                      Candidate Strengths
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-350">
                      {analysis.strengths.map((strg, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-500">•</span>
                          <span>{strg}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-3">
                    <h4 className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5" />
                      Candidate Weaknesses
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-350">
                      {analysis.weaknesses.map((weak, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-rose-500">•</span>
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Improvements Action list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    ATS Alignment Suggestions
                  </h4>
                  <ul className="space-y-3">
                    {analysis.improvements.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-700 dark:text-slate-350">
                        <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-2xs">
                          {idx + 1}
                        </span>
                        <p className="flex-1">{imp}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* PROFILE PARSED */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-2.5">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Summary</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed">{analysis.summary}</p>
                </div>

                {/* Skills */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white">Extracted Technologies</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.skills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-violet-600/10 border border-violet-600/20 text-primary font-bold text-2xs rounded-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Work history */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
                    <Briefcase className="w-4.5 h-4.5 text-slate-400" />
                    Parsed Work Experience
                  </h4>
                  <div className="space-y-6">
                    {analysis.experience.map((exp, idx) => (
                      <div key={idx} className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="absolute -left-[6px] top-1.5 w-[10px] h-[10px] rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <h5 className="font-bold text-slate-950 dark:text-white">{exp.role}</h5>
                          <span className="text-slate-450">{exp.duration}</span>
                        </div>
                        <p className="text-2xs font-semibold text-slate-450">{exp.company}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* REWRITE ASSISTANT */}
            {activeTab === 'rewrite' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <Wand2 className="w-5 h-5 text-violet-500" />
                  <h4 className="font-semibold text-slate-900 dark:text-white">AI Resume Rewrite Assistant</h4>
                </div>
                <p className="text-xs text-slate-400">Review AI-optimized bullet points. Replace wordy phrases with outcome-based achievements.</p>
                
                <div className="space-y-4 pt-2">
                  {analysis.rewrite_suggestions && analysis.rewrite_suggestions.length > 0 ? (
                    analysis.rewrite_suggestions.map((item, idx) => (
                      <div key={idx} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-950/20 text-xs">
                        <div className="font-bold text-primary uppercase text-2xs tracking-wider">{item.section}</div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <span className="block font-semibold text-red-500 mb-1">Original Text</span>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic">"{item.original}"</p>
                          </div>
                          
                          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl relative group">
                            <span className="block font-semibold text-emerald-500 mb-1">AI Recommendation</span>
                            <p className="text-slate-950 dark:text-white leading-relaxed font-medium">"{item.suggestion}"</p>
                          </div>
                        </div>

                        <div className="text-slate-450 pl-1 leading-relaxed">
                          <b>Feedback:</b> {item.reason}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400">Excellent phrasing. No rewrite suggestions generated.</div>
                  )}
                </div>
              </div>
            )}

            {/* SKILLS & ROADMAP */}
            {activeTab === 'gap' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Skill Gap Matrix */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">Role Skill Gap Matrix</h4>
                  </div>
                  
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950/50 text-slate-450 uppercase font-bold text-3xs border-b border-slate-100 dark:border-slate-800">
                          <th className="px-4 py-3">Skill Keyword</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Market Demand</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {analysis.skill_gap_analysis && analysis.skill_gap_analysis.length > 0 ? (
                          analysis.skill_gap_analysis.map((gap, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{gap.skill}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-3xs ${gap.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                  {gap.status}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`font-semibold ${gap.demand_level === 'High' ? 'text-red-500' : (gap.demand_level === 'Medium' ? 'text-amber-500' : 'text-slate-400')}`}>
                                  {gap.demand_level}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-slate-400">No skill gap matrices computed.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Step Roadmap */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">AI Learning Roadmap</h4>
                  </div>
                  <p className="text-xs text-slate-400">An automated step-by-step curriculum to close skill gaps and optimize career transitions.</p>
                  
                  <div className="space-y-4">
                    {analysis.learning_roadmap && analysis.learning_roadmap.length > 0 ? (
                      analysis.learning_roadmap.map((step, idx) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-primary space-y-2">
                          <div className="absolute -left-1.5 top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                          <div className="flex items-center justify-between text-xs">
                            <h5 className="font-bold text-slate-900 dark:text-white">Step {step.step}: {step.topic}</h5>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-850 rounded text-3xs font-semibold text-slate-450">{step.timeline}</span>
                          </div>
                          
                          <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-600 dark:text-slate-400 pl-1.5">
                            {step.actions.map((act, aIdx) => (
                              <li key={aIdx} className="leading-relaxed">{act}</li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-slate-400">No roadmap loaded. Your profile matches target requirements.</div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* CAREER & SALARY */}
            {activeTab === 'career' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Career paths list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    <h4 className="font-semibold text-slate-900 dark:text-white">AI Career Direction Suggestions</h4>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {analysis.career_suggestions && analysis.career_suggestions.length > 0 ? (
                      analysis.career_suggestions.map((car, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-slate-900 dark:text-white">{car.title}</h5>
                            <span className="font-bold text-primary">{car.fit_percentage}% Fit</span>
                          </div>
                          <p className="text-slate-500 leading-relaxed text-2xs">{car.reason}</p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-4 text-slate-400">No suggestions compiled.</div>
                    )}
                  </div>
                </div>

                {/* Salary estimations */}
                <div className="grid sm:grid-cols-3 gap-6">
                  
                  {/* Salary block */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-2 shadow-sm sm:col-span-2">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-500 font-bold text-xs uppercase tracking-wider">
                      <DollarSign className="w-4 h-4" />
                      Estimated Salary Range
                    </div>
                    
                    {analysis.salary_estimation ? (
                      <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                        <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <span className="text-slate-400 block text-2xs">Low</span>
                          <span className="font-display font-bold text-slate-800 dark:text-white">
                            {analysis.salary_estimation.low.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 bg-primary/5 border border-primary/10 rounded-xl">
                          <span className="text-primary block text-2xs font-semibold">Median</span>
                          <span className="font-display font-bold text-primary text-base">
                            {analysis.salary_estimation.median.toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <span className="text-slate-400 block text-2xs">High</span>
                          <span className="font-display font-bold text-slate-800 dark:text-white">
                            {analysis.salary_estimation.high.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs py-2">Not calculated.</div>
                    )}
                  </div>

                  {/* Interview Difficulty */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center space-y-2 shadow-sm">
                    <div className="flex items-center justify-center gap-1 text-indigo-500 font-bold text-2xs uppercase tracking-wider">
                      <Gauge className="w-4 h-4" />
                      Difficulty Level
                    </div>
                    
                    {analysis.interview_difficulty ? (
                      <div className="pt-1.5 space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-xl font-bold text-sm ${analysis.interview_difficulty.level === 'Hard' ? 'bg-red-500/10 text-red-500' : (analysis.interview_difficulty.level === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500')}`}>
                          {analysis.interview_difficulty.level}
                        </span>
                        <p className="text-slate-450 leading-relaxed text-3xs pt-1 px-1 text-center">
                          {analysis.interview_difficulty.reason}
                        </p>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-xs py-2">Not calculated.</div>
                    )}
                  </div>

                </div>

              </div>
            )}

            {/* COVER LETTER */}
            {activeTab === 'letter' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white">AI Cover Letter</h4>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleCopyLetter}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-855 text-slate-500 rounded-xl transition-colors"
                      title="Copy Letter"
                    >
                      {copied ? <span className="text-2xs font-semibold text-emerald-500">Copied!</span> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDirectDownload('cover-letter')}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-855 text-slate-500 rounded-xl transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-150 dark:border-slate-900 font-mono text-xs text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap select-all">
                  {analysis.cover_letter}
                </div>
              </div>
            )}

            {/* INTERVIEW PREP */}
            {activeTab === 'interview' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-500" />
                    AI Interview Preparation Cards
                  </h4>
                  <p className="text-xs text-slate-400">Technical questions derived from your work experience achievements.</p>
                </div>

                <div className="space-y-4">
                  {analysis.interview_questions.map((item, idx) => {
                    const isOpen = expandedQuestion === idx;
                    return (
                      <div 
                        key={idx}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <button
                          onClick={() => setExpandedQuestion(isOpen ? null : idx)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-850/40 transition-colors"
                        >
                          <span className="pr-4">{item.question}</span>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>
                        
                        {isOpen && (
                          <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950/20">
                            <h5 className="text-3xs uppercase tracking-wider text-primary font-bold mb-2">Suggested Points to Highlight</h5>
                            <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">{item.suggested_answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI CHATBOT COACH */}
            {activeTab === 'chat' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[500px] animate-fadeIn">
                
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white">AI Coach Conversation</h4>
                    <p className="text-3xs text-slate-450">Ask specific optimization or career fit questions about this resume.</p>
                  </div>
                </div>

                {/* Messages panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-950/10">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <Brain className="w-8 h-8 text-slate-300 dark:text-slate-700 animate-pulse-slow" />
                      <p className="text-xs font-semibold">Talk to your AI Career Assistant</p>
                      <p className="text-3xs max-w-xs leading-relaxed">Ask questions like: "How can I better phrase my Python experience?" or "What parts should I highlight for a DevOps role?"</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div 
                          key={index}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`
                            max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm
                            ${isUser 
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-150 dark:border-slate-850 rounded-bl-none'}
                          `}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {sendingChat && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-850 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs text-slate-400 italic flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        AI Coach is thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input form */}
                <form onSubmit={handleSendChat} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your question about your resume..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={sendingChat}
                    className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default ResumeAnalysis;
