import React, { useState } from 'react';
import { MessageTemplate } from '../types';
import { Wand2, ChevronLeft, Send as SendIcon, Smile, Plus, Camera, Mic } from 'lucide-react';
import { refineMessageTone } from '../services/geminiService';

interface MessageEditorProps {
  template: MessageTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<MessageTemplate>>;
  onNext: () => void;
  onBack: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({ template, setTemplate, onNext, onBack }) => {
  const [isRefining, setIsRefining] = useState(false);
  const [previewName, setPreviewName] = useState("John Candidate");

  // Construct full message for preview
  const fullMessage = `
${template.intro}

${template.questions.join('\n')}

${template.outro}
`.trim();

  const handleRefine = async (tone: 'professional' | 'friendly' | 'urgent') => {
    setIsRefining(true);
    const newIntro = await refineMessageTone(template.intro, tone);
    setTemplate(prev => ({ ...prev, intro: newIntro.replace(/"/g, '') }));
    setIsRefining(false);
  };

  const updateQuestion = (index: number, val: string) => {
    const newQuestions = [...template.questions];
    newQuestions[index] = val;
    setTemplate(prev => ({ ...prev, questions: newQuestions }));
  };

  const removeQuestion = (index: number) => {
    setTemplate(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const addQuestion = () => {
    setTemplate(prev => ({
        ...prev,
        questions: [...prev.questions, "New Question?"]
    }));
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      {/* Editor Side */}
      <div className="space-y-6 order-2 lg:order-1 animate-fade-in-up">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 flex items-center">
                    <span className="w-1 h-6 bg-blue-600 rounded-full mr-2"></span>
                    Intro Message
                </h3>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => handleRefine('professional')}
                        disabled={isRefining}
                        className="text-xs font-medium bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full border border-purple-100 hover:bg-purple-100 transition-colors flex items-center disabled:opacity-50"
                    >
                        <Wand2 className="w-3 h-3 mr-1.5" /> Professional
                    </button>
                    <button 
                        onClick={() => handleRefine('friendly')}
                        disabled={isRefining}
                        className="text-xs font-medium bg-pink-50 text-pink-700 px-3 py-1.5 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors flex items-center disabled:opacity-50"
                    >
                        <Wand2 className="w-3 h-3 mr-1.5" /> Friendly
                    </button>
                </div>
            </div>
            <div className="relative">
                <textarea
                    value={template.intro}
                    onChange={(e) => setTemplate(prev => ({ ...prev, intro: e.target.value }))}
                    className={`w-full p-4 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-y min-h-[100px] ${isRefining ? 'bg-gray-50 text-gray-400' : 'bg-white border-gray-200'}`}
                    disabled={isRefining}
                />
                {isRefining && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
            <p className="text-xs text-gray-400 mt-2 font-medium">Tip: Use <code>{'{{name}}'}</code> variable for personalization.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                 <span className="w-1 h-6 bg-green-500 rounded-full mr-2"></span>
                 Screening Questions
            </h3>
            <div className="space-y-3">
                {template.questions.map((q, idx) => (
                    <div key={idx} className="flex items-center space-x-2 group">
                        <span className="text-gray-300 font-bold text-xs w-4">{idx + 1}</span>
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => updateQuestion(idx, e.target.value)}
                            className="flex-1 p-2.5 bg-gray-50 border border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        />
                        <button 
                            onClick={() => removeQuestion(idx)}
                            className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
            <button 
                onClick={addQuestion}
                className="mt-5 w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all font-medium flex items-center justify-center"
            >
                <Plus className="w-4 h-4 mr-1" /> Add Question
            </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                <span className="w-1 h-6 bg-orange-500 rounded-full mr-2"></span>
                Closing
             </h3>
             <textarea
                value={template.outro}
                onChange={(e) => setTemplate(prev => ({ ...prev, outro: e.target.value }))}
                className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                rows={2}
            />
        </div>

        <div className="flex justify-between pt-6">
            <button 
                onClick={onBack}
                className="px-8 py-3 text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 font-semibold transition-all active:scale-95"
            >
                Back
            </button>
            <button 
                onClick={onNext}
                className="px-8 py-3 text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-semibold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center"
            >
                Start Sending <SendIcon className="w-4 h-4 ml-2" />
            </button>
        </div>
      </div>

      {/* Preview Side */}
      <div className="order-1 lg:order-2 sticky top-24 perspective-1000">
         <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[650px] w-[320px] shadow-2xl flex flex-col overflow-hidden animate-slide-in-right transform rotate-1 hover:rotate-0 transition-transform duration-500">
            {/* Phone Notch/Status Bar */}
            <div className="h-8 bg-gray-800 w-full absolute top-0 left-0 z-20 rounded-t-[2rem]"></div>
            <div className="absolute top-0 w-full h-8 z-30 flex justify-between px-6 items-center text-[10px] text-white font-medium">
                <span>9:41</span>
                <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                    <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                    <div className="w-4 h-2.5 border border-white rounded-[2px] flex items-center justify-center">
                        <div className="w-3 h-1.5 bg-white"></div>
                    </div>
                </div>
            </div>

            {/* WhatsApp Header */}
            <div className="bg-[#075E54] pt-8 pb-3 px-4 flex items-center space-x-3 text-white z-10 shadow-md">
                <ChevronLeft className="w-5 h-5 cursor-pointer" />
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm border border-white/20">
                   {previewName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate leading-tight">{previewName}</p>
                    <p className="text-[10px] text-white/80">online</p>
                </div>
                <div className="flex space-x-4 text-white/80">
                    <Camera className="w-5 h-5" />
                    <div className="w-1 h-1 bg-white rounded-full"></div>
                </div>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 bg-[#efe7dd] relative overflow-hidden flex flex-col">
                 {/* Chat Background Pattern */}
                 <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px' }}></div>
                 
                 <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide">
                    <div className="flex justify-center mb-4">
                        <span className="bg-[#e1f3fb] text-gray-500 text-[10px] py-1 px-3 rounded-lg shadow-sm uppercase font-medium tracking-wide">Today</span>
                    </div>

                    <div className="bg-white p-3 rounded-tr-lg rounded-bl-lg rounded-br-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] max-w-[90%] self-start animate-fade-in-up">
                        <p className="text-[13.5px] text-[#111b21] leading-[19px] whitespace-pre-wrap">
                            {fullMessage.replace(/{{name}}/g, previewName.split(' ')[0])}
                        </p>
                        <div className="text-[10px] text-gray-400 text-right mt-1 flex justify-end items-center space-x-1">
                            <span>10:30 AM</span>
                            <span className="text-gray-300">✓✓</span>
                        </div>
                    </div>
                 </div>

                 {/* Fake Input */}
                 <div className="bg-[#f0f2f5] p-2 px-3 flex items-center space-x-2 relative z-20">
                    <Plus className="w-6 h-6 text-[#8696a0]" />
                    <div className="flex-1 bg-white rounded-lg h-9 flex items-center px-3 border border-white shadow-sm">
                        <span className="text-gray-400 text-sm">Message</span>
                    </div>
                    <Camera className="w-6 h-6 text-[#8696a0]" />
                    <Mic className="w-6 h-6 text-[#8696a0]" />
                </div>
            </div>

            {/* Reflection/Glass Effect overlay */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-tr from-white/5 to-transparent pointer-events-none rounded-[2.5rem] z-50"></div>
         </div>
         
         <div className="text-center mt-8">
             <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Previewing:</span>
                 <input 
                    type="text" 
                    value={previewName} 
                    onChange={(e) => setPreviewName(e.target.value)}
                    className="border-none bg-transparent text-sm font-medium text-gray-900 focus:ring-0 p-0 w-32 text-center"
                 />
             </div>
         </div>
      </div>
    </div>
  );
};

export default MessageEditor;