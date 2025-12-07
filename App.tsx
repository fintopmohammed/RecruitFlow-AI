import React, { useState, useEffect } from 'react';
import { AppStep, Candidate, MessageTemplate, GeminiMappingResponse } from './types';
import { DEFAULT_SCREENING_QUESTIONS, DEFAULT_INTRO, DEFAULT_OUTRO } from './constants';
import FileUpload from './components/FileUpload';
import MessageEditor from './components/MessageEditor';
import ProcessingQueue from './components/ProcessingQueue';
import { analyzeCsvHeaders } from './services/geminiService';
import { dbService } from './services/dbService';
import { Users, Sparkles, ChevronRight, LayoutDashboard, FileText, Send, Database, WifiOff, Copy, Check, Moon, Sun, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [mappingReason, setMappingReason] = useState<string>("");
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'offline'>('connected');
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Message Template State
  const [template, setTemplate] = useState<MessageTemplate>({
    intro: DEFAULT_INTRO,
    questions: DEFAULT_SCREENING_QUESTIONS,
    outro: DEFAULT_OUTRO
  });

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    } else if (systemPrefersDark) {
        setTheme('dark');
        document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      
      if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  // Load candidates from DB on mount
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const { data, error } = await dbService.getAllCandidates();
        
        if (error === 'missing_table') {
          setDbStatus('offline');
        } else if (data && data.length > 0) {
          setCandidates(data);
          setStep(AppStep.QUEUE); // Jump straight to queue if we have data
        }
      } catch (err) {
        console.error("Failed to load candidates", err);
      } finally {
        setIsLoadingDB(false);
      }
    };
    loadCandidates();
  }, []);

  const handleDataLoaded = async (rawData: Record<string, string>[]) => {
    setAnalyzing(true);
    
    // Get headers from first row
    const headers = Object.keys(rawData[0]);
    
    // Use Gemini to guess mapping
    const mapping = await analyzeCsvHeaders(headers, rawData[0]);
    
    setMappingReason(mapping.reasoning);

    const mappedCandidates: Candidate[] = rawData.map((row, idx) => ({
      id: `c-${Date.now()}-${idx}`, // Unique ID for DB
      name: row[mapping.name_column] || 'Candidate',
      phone: row[mapping.phone_column] || '',
      originalRow: row,
      status: 'pending' as const
    })).filter(c => c.phone.length > 5); // Basic filter for empty phones

    // Save to DB immediately if connected
    await dbService.clearCandidates(); // Clear old session data if we are uploading new
    await dbService.addCandidates(mappedCandidates);

    setCandidates(mappedCandidates);
    setAnalyzing(false);
    setStep(AppStep.MAPPING);
  };

  const handleUpdateStatus = (id: string, status: Candidate['status']) => {
    // Update local state
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    // Update DB
    dbService.updateStatus(id, status);
  };

  const handleReset = async () => {
      setCandidates([]);
      setStep(AppStep.UPLOAD);
      await dbService.clearCandidates();
  };

  const copySqlToClipboard = () => {
      const sql = `create table if not exists candidates (
  id text primary key,
  name text,
  phone text,
  status text,
  original_row jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table candidates enable row level security;

create policy "Allow public access"
  on candidates
  for all
  using (true)
  with check (true);`;
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    const isConnected = await dbService.retryConnection();
    if (isConnected) {
        setDbStatus('connected');
        setShowSqlModal(false);
    } else {
        alert("Still cannot find the 'candidates' table. Please ensure the SQL ran successfully in Supabase.");
    }
    setIsVerifying(false);
  };

  const fullMessage = `
${template.intro}

${template.questions.join('\n')}

${template.outro}
`.trim();

  // Helper for step progress
  const StepIndicator = ({ current, target, label, icon: Icon }: any) => {
    const isActive = current === target;
    const isCompleted = 
        (target === AppStep.UPLOAD && current !== AppStep.UPLOAD) ||
        (target === AppStep.MAPPING && (current === AppStep.EDITOR || current === AppStep.QUEUE)) ||
        (target === AppStep.EDITOR && current === AppStep.QUEUE);

    return (
        <div className={`flex items-center space-x-2 transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isActive ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500 shadow-sm' : 
                isCompleted ? 'border-green-600 bg-green-50 dark:bg-green-900/30 dark:border-green-500' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`font-semibold hidden md:block ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-500'}`}>{label}</span>
        </div>
    );
  };

  if (isLoadingDB) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
      );
  }

  return (
    <div className="min-h-screen text-gray-800 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors duration-300">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-gray-200/50 dark:border-slate-700/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20 group-hover:shadow-blue-300 transition-all duration-300 group-hover:scale-105">
                <Users className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">RecruitFlow <span className="text-blue-600 dark:text-blue-400">AI</span></h1>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium tracking-wider uppercase mt-0.5">Automated Screening</p>
            </div>
          </div>
          
          {/* Progress Stepper */}
          <nav className="hidden md:flex items-center space-x-6">
             <StepIndicator current={step} target={AppStep.UPLOAD} label="Upload" icon={LayoutDashboard} />
             <div className="w-8 h-px bg-gray-200 dark:bg-slate-700"></div>
             <StepIndicator current={step} target={step === AppStep.MAPPING ? AppStep.MAPPING : AppStep.EDITOR} label="Prepare" icon={FileText} />
             <div className="w-8 h-px bg-gray-200 dark:bg-slate-700"></div>
             <StepIndicator current={step} target={AppStep.QUEUE} label="Outreach" icon={Send} />
          </nav>

          <div className="flex items-center space-x-3">
             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                title="Toggle Dark Mode"
             >
                 {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
             </button>

             {/* Connection Status Badge */}
             <div 
                onClick={() => dbStatus === 'offline' && setShowSqlModal(true)}
                className={`hidden sm:flex items-center text-xs px-3 py-1.5 rounded-full border transition-all ${
                  dbStatus === 'connected' 
                    ? 'text-green-600 bg-green-50 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 cursor-default' 
                    : 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:shadow-sm'
                }`}
                title={dbStatus === 'offline' ? "Click to see setup instructions" : "Connected to Supabase"}
             >
                {dbStatus === 'connected' ? <Database className="w-3 h-3 mr-1.5" /> : <WifiOff className="w-3 h-3 mr-1.5" />}
                <span>{dbStatus === 'connected' ? 'Connected' : 'Local Mode (Click to Fix)'}</span>
             </div>
             
             <div className="text-sm font-medium bg-gray-100/80 dark:bg-slate-800/80 px-4 py-2 rounded-full text-gray-600 dark:text-slate-300 border border-gray-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                {candidates.length > 0 ? (
                    <span className="text-blue-600 dark:text-blue-400">{candidates.length} <span className="text-gray-500 dark:text-slate-500">Candidates</span></span>
                ) : (
                    <span className="text-gray-400 dark:text-slate-500">Ready to start</span>
                )}
             </div>
          </div>
        </div>
      </header>

      {/* SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-white/20 dark:border-slate-700">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                            <Database className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                            Setup Database
                        </h3>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Run this SQL in your Supabase SQL Editor to enable data saving.</p>
                    </div>
                    <button onClick={() => setShowSqlModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="relative group mb-6">
                    <div className="absolute top-3 right-3">
                        <button 
                            onClick={copySqlToClipboard}
                            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors border border-white/10"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                    <pre className="bg-gray-900 text-blue-100 p-5 rounded-xl font-mono text-xs overflow-auto max-h-80 leading-relaxed border border-gray-700 shadow-inner">
{`create table if not exists candidates (
  id text primary key,
  name text,
  phone text,
  status text,
  original_row jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table candidates enable row level security;

-- Create Policy to allow public access
create policy "Allow public access"
  on candidates
  for all
  using (true)
  with check (true);`}
                    </pre>
                </div>

                <div className="flex justify-between items-center pt-2">
                    <button
                        onClick={handleVerifyConnection}
                        disabled={isVerifying}
                        className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isVerifying ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Verify Connection</span>
                            </>
                        )}
                    </button>

                    <button 
                        onClick={() => setShowSqlModal(false)} 
                        className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {step === AppStep.UPLOAD && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Bulk WhatsApp Screening, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Reimagined.</span></h2>
                <p className="text-lg text-gray-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Upload your candidate list. Our AI maps the contacts and drafts personalized screening messages, letting you focus on the talent, not the busy work.
                </p>
                {dbStatus === 'offline' && (
                  <div className="mt-6 inline-flex items-center bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 text-sm px-4 py-3 rounded-xl border border-orange-100 dark:border-orange-800 shadow-sm cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors" onClick={() => setShowSqlModal(true)}>
                     <WifiOff className="w-4 h-4 mr-2" />
                     <span>Database table is missing. <strong>Click here to fix.</strong></span>
                  </div>
                )}
            </div>
            {analyzing ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-white dark:bg-slate-800 p-4 rounded-full shadow-xl border border-gray-100 dark:border-slate-700">
                             <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Analyzing your file</h3>
                        <p className="text-gray-500 dark:text-slate-400 max-w-xs mx-auto">Gemini AI is identifying candidate names and phone numbers...</p>
                    </div>
                </div>
            ) : (
                <FileUpload onDataLoaded={handleDataLoaded} />
            )}
          </div>
        )}

        {step === AppStep.MAPPING && (
            <div className="max-w-3xl mx-auto animate-scale-in">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl border border-white dark:border-slate-700 shadow-xl">
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mr-4">
                            <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analysis Complete</h2>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 border border-blue-100 dark:border-slate-600 rounded-xl p-6 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-100 dark:bg-slate-600 rounded-full opacity-50 blur-2xl"></div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 uppercase tracking-wide">AI Reasoning</p>
                        <p className="text-blue-800 dark:text-slate-300 italic leading-relaxed relative z-10">"{mappingReason}"</p>
                    </div>

                    <div className="space-y-6 mb-10">
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400 mb-2">
                             <span>Found {candidates.length} valid contacts</span>
                             <span>Previewing first 3</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl border border-gray-200 dark:border-slate-600 overflow-hidden">
                            {candidates.slice(0, 3).map((c, i) => (
                                <div key={c.id} className={`flex justify-between items-center p-4 text-sm ${i !== 2 ? 'border-b border-gray-200 dark:border-slate-600' : ''}`}>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-slate-300">
                                            {c.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                                    </div>
                                    <span className="font-mono text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-slate-600">{c.phone}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button 
                            onClick={() => setStep(AppStep.UPLOAD)}
                            className="flex-1 py-3.5 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500 font-semibold transition-all duration-200 active:scale-95"
                        >
                            Upload Different File
                        </button>
                        <button 
                            onClick={() => setStep(AppStep.EDITOR)}
                            className="flex-1 py-3.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 dark:shadow-none transition-all duration-200 active:scale-95 flex items-center justify-center group"
                        >
                            Draft Message <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {step === AppStep.EDITOR && (
          <div className="animate-fade-in-up">
            <MessageEditor 
                template={template} 
                setTemplate={setTemplate}
                onNext={() => setStep(AppStep.QUEUE)}
                onBack={() => setStep(AppStep.MAPPING)}
            />
          </div>
        )}

        {step === AppStep.QUEUE && (
            <div className="animate-fade-in-up">
                <ProcessingQueue 
                    candidates={candidates}
                    finalMessage={fullMessage}
                    onUpdateStatus={handleUpdateStatus}
                    onReset={handleReset}
                />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;