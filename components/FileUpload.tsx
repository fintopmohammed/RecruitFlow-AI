import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { parseCSV, parseExcel } from '../services/csvService';

interface FileUploadProps {
  onDataLoaded: (data: Record<string, string>[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    setError(null);
    const isCsv = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setError('Please upload a valid CSV or Excel file.');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        let parsed: Record<string, string>[] = [];
        
        if (isCsv) {
          parsed = parseCSV(e.target?.result as string);
        } else {
          parsed = parseExcel(e.target?.result as ArrayBuffer);
        }

        if (parsed.length === 0) {
          setError('The file appears to be empty.');
          return;
        }
        onDataLoaded(parsed);
      } catch (err) {
        console.error(err);
        setError('Failed to parse file. Please check the format.');
      }
    };

    if (isCsv) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-6">
      <div 
        className={`relative group border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-out cursor-pointer overflow-hidden ${
          isDragging 
            ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' 
            : 'border-gray-200 hover:border-blue-300 bg-white hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <div className={`absolute inset-0 bg-blue-500/5 transition-opacity duration-500 ${isDragging ? 'opacity-100' : 'opacity-0'}`}></div>
        
        <div className="relative z-10 flex flex-col items-center justify-center space-y-5">
          <div className={`p-5 rounded-full transition-all duration-300 ${isDragging ? 'bg-blue-200 text-blue-700 scale-110' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100 group-hover:scale-110'}`}>
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Upload Candidate List</h3>
            <p className="text-gray-500 mt-2 text-sm font-medium">Drag & drop CSV or Excel file here</p>
          </div>
          
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            onChange={handleChange} 
            className="hidden" 
            id="file-upload" 
          />
          
          <div className="pt-2">
            <span className="px-5 py-2.5 bg-gray-900 text-white rounded-lg group-hover:bg-blue-600 transition-colors font-medium text-sm shadow-lg shadow-gray-200 group-hover:shadow-blue-200">
                Browse Files
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start space-x-3 border border-red-100 animate-fade-in-up">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      <div className="mt-8 bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-gray-200/50 shadow-sm flex items-start space-x-4">
        <div className="bg-gray-100 p-2 rounded-lg">
             <FileSpreadsheet className="w-6 h-6 text-gray-500" />
        </div>
        <div className="text-sm text-gray-600 flex-1">
          <p className="font-bold text-gray-900 mb-1">Format Requirements</p>
          <p className="mb-3 leading-relaxed">Your file must have headers. Our AI will automatically detect the <strong>Name</strong> and <strong>Phone</strong> columns.</p>
          <div className="p-3 bg-white border border-gray-200 rounded-lg text-xs font-mono text-gray-500 shadow-sm overflow-x-auto whitespace-nowrap">
            <div className="flex space-x-8">
                <div>
                    <span className="text-gray-300"># Row 1</span><br/>
                    <span className="text-gray-900 font-bold">Candidate Name</span>, <span className="text-gray-900 font-bold">Phone</span>, Role
                </div>
                <div className="opacity-50">
                    <span className="text-gray-300"># Row 2</span><br/>
                    John Doe, +15550123, Sales
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;