import React, { useState } from 'react';
import { AppStep, Candidate, MessageTemplate, GeminiMappingResponse } from './types';
import { DEFAULT_SCREENING_QUESTIONS, DEFAULT_INTRO, DEFAULT_OUTRO } from './constants';
import FileUpload from './components/FileUpload';
import MessageEditor from './components/MessageEditor';
import ProcessingQueue from './components/ProcessingQueue';
import { analyzeCsvHeaders } from './services/geminiService';
import { Users, Sparkles, ChevronRight, LayoutDashboard, FileText, Send } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [mappingReason, setMappingReason] = useState<string>("");
  
  // Message Template State
  const [template, setTemplate] = useState<MessageTemplate>({
    intro: DEFAULT_INTRO,
    questions: DEFAULT_SCREENING_QUESTIONS,
    outro: DEFAULT_OUTRO
  });

  const handleDataLoaded = async (rawData: Record<string, string>[]) => {
    setAnalyzing(true);
    
    // Get headers from first row
    const headers = Object.keys(rawData[0]);
    
    // Use Gemini to guess mapping
    const mapping = await analyzeCsvHeaders(headers, rawData[0]);
    
    setMappingReason(mapping.reasoning);

    const mappedCandidates: Candidate[] = rawData.map((row, idx) => ({
      id: `c-${idx}`,
      name: row[mapping.name_column] || 'Candidate',
      phone: row[mapping.phone_column] || '',
      originalRow: row,
      status: 'pending' as const
    })).filter(c => c.phone.length > 5); // Basic filter for empty phones

    setCandidates(mappedCandidates);
    setAnalyzing(false);
    setStep(AppStep.MAPPING);
  };

  const handleUpdateStatus = (id: string, status: Candidate['status']) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
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
        <div className={`flex items-center space-x-2 transition-colors duration-300 ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isActive ? 'border-blue-600 bg-blue-50 shadow-sm' : 
                isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'
            }`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`font-semibold hidden md:block ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{label}</span>
        </div>
    );
  };

  return (
    <div className="min-h-screen text-gray-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-gray-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-default">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200 group-hover:shadow-blue-300 transition-all duration-300 group-hover:scale-105">
                <Users className="w-5 h-5 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">RecruitFlow <span className="text-blue-600">AI</span></h1>
                <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-0.5">Automated Screening</p>
            </div>
          </div>
          
          {/* Progress Stepper */}
          <nav className="hidden md:flex items-center space-x-6">
             <StepIndicator current={step} target={AppStep.UPLOAD} label="Upload" icon={LayoutDashboard} />
             <div className="w-8 h-px bg-gray-200"></div>
             <StepIndicator current={step} target={step === AppStep.MAPPING ? AppStep.MAPPING : AppStep.EDITOR} label="Prepare" icon={FileText} />
             <div className="w-8 h-px bg-gray-200"></div>
             <StepIndicator current={step} target={AppStep.QUEUE} label="Outreach" icon={Send} />
          </nav>

          <div className="text-sm font-medium bg-gray-100/80 px-4 py-2 rounded-full text-gray-600 border border-gray-200/50 backdrop-blur-sm">
             {candidates.length > 0 ? (
                 <span className="text-blue-600">{candidates.length} <span className="text-gray-500">Candidates</span></span>
             ) : (
                 <span className="text-gray-400">Ready to start</span>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {step === AppStep.UPLOAD && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Bulk WhatsApp Screening, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Reimagined.</span></h2>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    Upload your candidate list. Our AI maps the contacts and drafts personalized screening messages, letting you focus on the talent, not the busy work.
                </p>
            </div>
            {analyzing ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-fade-in-up">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-white p-4 rounded-full shadow-xl border border-gray-100">
                             <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-gray-900">Analyzing your file</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Gemini AI is identifying candidate names and phone numbers...</p>
                    </div>
                </div>
            ) : (
                <FileUpload onDataLoaded={handleDataLoaded} />
            )}
          </div>
        )}

        {step === AppStep.MAPPING && (
            <div className="max-w-3xl mx-auto animate-scale-in">
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-white shadow-xl">
                    <div className="flex items-center justify-center mb-8">
                        <div className="bg-green-100 p-3 rounded-full mr-4">
                            <Sparkles className="w-6 h-6 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Analysis Complete</h2>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-100 rounded-full opacity-50 blur-2xl"></div>
                        <p className="text-sm font-semibold text-blue-900 mb-2 uppercase tracking-wide">AI Reasoning</p>
                        <p className="text-blue-800 italic leading-relaxed relative z-10">"{mappingReason}"</p>
                    </div>

                    <div className="space-y-6 mb-10">
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                             <span>Found {candidates.length} valid contacts</span>
                             <span>Previewing first 3</span>
                        </div>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            {candidates.slice(0, 3).map((c, i) => (
                                <div key={c.id} className={`flex justify-between items-center p-4 text-sm ${i !== 2 ? 'border-b border-gray-200' : ''}`}>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            {c.name.charAt(0)}
                                        </div>
                                        <span className="font-medium text-gray-900">{c.name}</span>
                                    </div>
                                    <span className="font-mono text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">{c.phone}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <button 
                            onClick={() => setStep(AppStep.UPLOAD)}
                            className="flex-1 py-3.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold transition-all duration-200 active:scale-95"
                        >
                            Upload Different File
                        </button>
                        <button 
                            onClick={() => setStep(AppStep.EDITOR)}
                            className="flex-1 py-3.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 transition-all duration-200 active:scale-95 flex items-center justify-center group"
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
                    onReset={() => {
                        setCandidates([]);
                        setStep(AppStep.UPLOAD);
                    }}
                />
            </div>
        )}
      </main>
    </div>
  );
};

export default App;