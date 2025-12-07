import React, { useState } from 'react';
import { Candidate } from '../types';
import { 
  Send, 
  CheckCircle2, 
  SkipForward, 
  RefreshCw, 
  Play, 
  AlertTriangle, 
  Loader2, 
  RotateCcw,
  User,
  CheckSquare,
  Square,
  X
} from 'lucide-react';

interface ProcessingQueueProps {
  candidates: Candidate[];
  finalMessage: string;
  onUpdateStatus: (id: string, status: Candidate['status']) => void;
  onReset: () => void;
}

const ProcessingQueue: React.FC<ProcessingQueueProps> = ({ 
  candidates, 
  finalMessage, 
  onUpdateStatus, 
  onReset 
}) => {
  const [candidateToConfirm, setCandidateToConfirm] = useState<Candidate | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionType, setBulkActionType] = useState<'all' | 'selected' | null>(null);

  const pendingCount = candidates.filter(c => c.status === 'pending').length;
  const sentCount = candidates.filter(c => c.status === 'sent').length;
  
  const formatPhone = (phone: string) => {
    // Remove all non-numeric characters (including +)
    // WhatsApp API expects just the digits including country code (e.g., 15551234567 or 919876543210)
    return phone.replace(/\D/g, '');
  };

  const openWhatsApp = (candidate: Candidate) => {
    const cleanPhone = formatPhone(candidate.phone);
    if (!cleanPhone) return false;

    // Handle name replacement safely
    const namePart = (candidate.name || 'Candidate').split(' ')[0];
    const personalizedMessage = finalMessage.replace(/{{name}}/g, namePart);
    
    // Encode the message properly for URL
    const encodedMessage = encodeURIComponent(personalizedMessage);
    
    // Use api.whatsapp.com/send which is often more reliable for pre-filling text than wa.me
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    const win = window.open(url, '_blank');
    return win !== null;
  };

  const executeSend = async (candidate: Candidate) => {
    onUpdateStatus(candidate.id, 'sending');
    await new Promise(resolve => setTimeout(resolve, 800)); // UI delay
    const success = openWhatsApp(candidate);
    
    if (success) {
      onUpdateStatus(candidate.id, 'sent');
    } else {
      onUpdateStatus(candidate.id, 'failed');
      alert(`Could not open WhatsApp for ${candidate.name}. Please check popup blockers.`);
    }
  };

  const handleSingleSendClick = (candidate: Candidate) => {
    setCandidateToConfirm(candidate);
  };

  const confirmSingleSend = () => {
    if (candidateToConfirm) {
      executeSend(candidateToConfirm);
      setCandidateToConfirm(null);
    }
  };

  const handleBulkSendClick = () => {
    if (pendingCount === 0) return;
    setBulkActionType('all');
    setShowBulkConfirm(true);
  };

  const handleSelectedSendClick = () => {
    if (selectedIds.size === 0) return;
    setBulkActionType('selected');
    setShowBulkConfirm(true);
  };

  const processCandidateList = async (candidatesToProcess: Candidate[]) => {
    setShowBulkConfirm(false);
    setIsBulkSending(true);

    // Deselect currently processing items to avoid confusion
    if (bulkActionType === 'selected') {
        setSelectedIds(new Set());
    }

    for (const candidate of candidatesToProcess) {
      // Only process if status is appropriate (usually pending, or failed/skipped if forced)
      // For simplicity, we process whatever is passed, but visual status update is key
      onUpdateStatus(candidate.id, 'sending');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Throttling

      const success = openWhatsApp(candidate);
      
      if (success) {
        onUpdateStatus(candidate.id, 'sent');
      } else {
        onUpdateStatus(candidate.id, 'failed');
      }
    }

    setIsBulkSending(false);
    setBulkActionType(null);
  };

  const confirmBulkSend = () => {
      let targets: Candidate[] = [];
      if (bulkActionType === 'all') {
          targets = candidates.filter(c => c.status === 'pending');
      } else if (bulkActionType === 'selected') {
          targets = candidates.filter(c => selectedIds.has(c.id));
      }
      processCandidateList(targets);
  };

  const handleRetry = (candidate: Candidate) => {
    setCandidateToConfirm(candidate);
  };

  // Selection Logic
  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === candidates.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(candidates.map(c => c.id)));
      }
  };

  const handleBulkSkip = () => {
      candidates.forEach(c => {
          if (selectedIds.has(c.id) && c.status === 'pending') {
              onUpdateStatus(c.id, 'skipped');
          }
      });
      setSelectedIds(new Set());
  };

  const handleBulkRetry = () => {
      candidates.forEach(c => {
          if (selectedIds.has(c.id)) {
              onUpdateStatus(c.id, 'pending');
          }
      });
      setSelectedIds(new Set());
  };

  return (
    <div className="max-w-5xl mx-auto relative">
      
      {/* Confirmation Modal */}
      {(candidateToConfirm || showBulkConfirm) && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in-up">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100 border border-white/20 dark:border-slate-700">
            {candidateToConfirm ? (
                <>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to send?</h3>
                    <p className="text-gray-600 dark:text-slate-300 mb-8 leading-relaxed">
                    Opening WhatsApp chat for <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">{candidateToConfirm.name}</span>.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setCandidateToConfirm(null)} className="px-5 py-2.5 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">Cancel</button>
                        <button onClick={confirmSingleSend} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-all shadow-lg shadow-blue-200 dark:shadow-none">Confirm & Send</button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-500 mb-4 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-xl w-fit">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-bold">Bulk Action</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {bulkActionType === 'all' 
                            ? `Send to ${pendingCount} pending candidates?` 
                            : `Send to ${selectedIds.size} selected candidates?`
                        }
                    </h3>
                    <p className="text-gray-600 dark:text-slate-300 mb-6 text-sm">
                        This will open <strong>{bulkActionType === 'all' ? pendingCount : selectedIds.size}</strong> new WhatsApp tabs sequentially. Please allow popups for this site.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <button onClick={() => setShowBulkConfirm(false)} className="px-5 py-2.5 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl font-medium">Cancel</button>
                        <button onClick={confirmBulkSend} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center">
                            <Play className="w-4 h-4 mr-2" /> Start Sending
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Stats Column */}
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-24">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-gray-900 dark:text-white font-bold text-lg">Campaign Status</h3>
                    <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide">Active</span>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between text-sm mb-2 font-medium">
                            <span className="text-gray-500 dark:text-slate-400">Progress</span>
                            <span className="text-gray-900 dark:text-white">{sentCount} / {candidates.length}</span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out rounded-full relative"
                                style={{ width: `${(sentCount / candidates.length) * 100}%` }}
                            >
                                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleBulkSendClick}
                        disabled={isBulkSending || pendingCount === 0}
                        className={`w-full py-4 flex items-center justify-center space-x-2 rounded-xl transition-all font-semibold shadow-sm border group ${
                            isBulkSending || pendingCount === 0
                            ? 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-600 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-none hover:scale-[1.02] active:scale-95'
                        }`}
                    >
                        {isBulkSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Play className="w-5 h-5 fill-current" />
                        )}
                        <span>{isBulkSending ? 'Sending Sequence...' : 'Send to All Pending'}</span>
                    </button>

                    <button 
                        onClick={onReset}
                        disabled={isBulkSending}
                        className="w-full py-3 flex items-center justify-center space-x-2 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-500 rounded-xl transition-all font-medium disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Start Over</span>
                    </button>
                </div>
            </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-8">
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-white/60 dark:border-slate-700/50 shadow-lg overflow-hidden flex flex-col min-h-[600px]">
                {/* Header / Action Bar */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 min-h-[72px] flex items-center">
                    {selectedIds.size > 0 ? (
                        <div className="flex items-center justify-between w-full animate-fade-in-up">
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => setSelectedIds(new Set())}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-500 dark:text-slate-400"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-gray-900 dark:text-white">{selectedIds.size} Selected</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={handleBulkSkip}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-lg flex items-center transition-colors"
                                >
                                    <SkipForward className="w-3.5 h-3.5 mr-1.5" /> Skip
                                </button>
                                <button 
                                    onClick={handleBulkRetry}
                                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 rounded-lg flex items-center transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
                                </button>
                                <button 
                                    onClick={handleSelectedSendClick}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center transition-colors shadow-sm"
                                >
                                    <Send className="w-3.5 h-3.5 mr-1.5" /> Send
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center w-full">
                            <h3 className="font-bold text-gray-800 dark:text-slate-200 flex items-center">
                                <button 
                                    onClick={toggleSelectAll} 
                                    className="mr-3 text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Select All"
                                >
                                   {selectedIds.size > 0 && selectedIds.size === candidates.length ? (
                                       <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                   ) : (
                                       <Square className="w-5 h-5" />
                                   )}
                                </button>
                                Queue
                                <span className="ml-2 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {pendingCount} Left
                                </span>
                            </h3>
                        </div>
                    )}
                </div>

                <div className="p-4 space-y-3">
                    {candidates.map((candidate, idx) => (
                        <div 
                            key={candidate.id} 
                            className={`group p-4 rounded-xl border transition-all duration-300 flex items-center justify-between hover:shadow-md dark:hover:shadow-none animate-fade-in-up ${
                                idx < 10 ? `stagger-${Math.min(idx + 1, 6)}` : ''
                            } ${
                                selectedIds.has(candidate.id) 
                                    ? 'border-blue-300 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-900/30' 
                                    : candidate.status === 'sent' 
                                    ? 'bg-green-50/50 dark:bg-green-900/20 border-green-100 dark:border-green-900/50' 
                                    : candidate.status === 'sending'
                                    ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-blue-100 dark:shadow-none shadow'
                                    : candidate.status === 'failed'
                                    ? 'bg-red-50/50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50'
                                    : candidate.status === 'skipped'
                                    ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700 opacity-60'
                                    : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800'
                            }`}
                        >
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                                {/* Checkbox */}
                                <div className="flex-shrink-0">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.has(candidate.id)}
                                        onChange={() => toggleSelection(candidate.id)}
                                        className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer bg-white dark:bg-slate-700"
                                    />
                                </div>

                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 flex-shrink-0 ${
                                    candidate.status === 'sent' ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-200 animate-scale-in' :
                                    candidate.status === 'sending' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-200' :
                                    'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                }`}>
                                    {candidate.status === 'sent' ? <CheckCircle2 className="w-5 h-5" /> : 
                                     candidate.status === 'sending' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                     candidate.name.charAt(0)}
                                </div>
                                
                                <div className="min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <h4 className={`font-semibold text-sm truncate ${candidate.status === 'skipped' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                                            {candidate.name}
                                        </h4>
                                        {candidate.status === 'sent' && (
                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded-full animate-scale-in">SENT</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-slate-500 font-mono mt-0.5 flex items-center">
                                        {candidate.phone}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pl-4">
                                {candidate.status === 'pending' ? (
                                    <>
                                        <button 
                                            onClick={() => onUpdateStatus(candidate.id, 'skipped')}
                                            disabled={isBulkSending}
                                            className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-30"
                                            title="Skip"
                                        >
                                            <SkipForward className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleSingleSendClick(candidate)}
                                            disabled={isBulkSending}
                                            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 text-sm font-medium"
                                        >
                                            <span>Send</span>
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                     <button 
                                        onClick={() => handleRetry(candidate)}
                                        disabled={isBulkSending}
                                        className="text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent hover:bg-blue-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center disabled:opacity-30"
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1.5" /> Retry
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {candidates.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-gray-300 dark:text-slate-500" />
                            </div>
                            <h4 className="text-gray-900 dark:text-white font-medium">No candidates</h4>
                            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Upload a file to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingQueue;