import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Trash2, Calendar, Award, User, Mail, ArrowRight, RefreshCw, Plus } from 'lucide-react';
import api from '../services/api';

interface ResumeHistoryItem {
  id: number;
  filename: string;
  created_at: string;
  ats_score: number;
  name: string;
  email: string;
}

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/candidate/resumes');
      setResumes(response.data);
    } catch (e) {
      console.error('Failed to load resume logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      await handleUploadFile(e.target.files[0]);
    }
  };

  const handleUploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt !== 'pdf' && fileExt !== 'docx') {
      setUploadError('Only PDF and DOCX files are allowed.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/candidate/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Redirect to detailed analysis
      navigate(`/candidate/analysis?id=${response.data.resume_id}`);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setUploadError(err.response.data.detail);
      } else {
        setUploadError('Upload failed. Please ensure the backend server is running.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid navigating
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    
    try {
      await api.delete(`/api/candidate/resume/${id}`);
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Upload Banner Section */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Drag and Drop Uploader */}
        <div className="lg:col-span-2">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`
              relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 text-center transition-all duration-300
              ${dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900'}
              ${uploading ? 'pointer-events-none opacity-80' : ''}
              shadow-md
            `}
          >
            {uploading ? (
              <div className="space-y-4">
                <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto" />
                <div>
                  <h3 className="font-display font-semibold text-lg">Analyzing Resume Contents...</h3>
                  <p className="text-sm text-slate-400">Gemini AI is parsing and scoring your profile.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-primary/10 rounded-2xl mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-1">Upload your Resume</h3>
                <p className="text-sm text-slate-400 mb-4 max-w-sm mx-auto">
                  Drag and drop your PDF or DOCX file here, or click to browse.
                </p>
                <input 
                  type="file" 
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden" 
                  id="resume-file-input" 
                />
                <label 
                  htmlFor="resume-file-input"
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  Choose File
                </label>
              </>
            )}
            
            {uploadError && (
              <p className="absolute bottom-4 text-xs font-medium text-red-500">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-md">
          <div>
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white mb-2">Resume Optimization</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload your resume to get instant feedback on ATS compatibility, skill gaps, tailored cover letters, and sample interview questions based on your experience.
            </p>
          </div>
          <div className="pt-6 border-t border-slate-150 dark:border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">Total Uploads</span>
              <p className="font-display font-bold text-3xl text-slate-900 dark:text-white mt-1">{resumes.length}</p>
            </div>
            {resumes.length > 0 && (
              <div className="text-right">
                <span className="text-2xs uppercase tracking-wider text-slate-400 font-semibold">Best ATS Score</span>
                <p className="font-display font-bold text-3xl text-emerald-500 mt-1">
                  {Math.max(...resumes.map(r => r.ats_score))}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Uploaded History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-xl">Resume Logs & History</h3>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 bg-slate-200 dark:bg-slate-900 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="font-semibold text-lg">No Resumes Uploaded Yet</h4>
            <p className="text-sm text-slate-400 mt-1">Get started by dragging your resume to the drop zone above.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes.map((resume) => {
              const score = resume.ats_score || 0;
              const colorClass = score >= 80 ? 'text-emerald-500 bg-emerald-500/10' : (score >= 60 ? 'text-amber-500 bg-amber-500/10' : 'text-rose-500 bg-rose-500/10');
              
              return (
                <div 
                  key={resume.id}
                  onClick={() => navigate(`/candidate/analysis?id=${resume.id}`)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${colorClass}`}>
                      ATS: {score}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                      {resume.filename}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(resume.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[150px]">{resume.name}</span>
                    <button 
                      onClick={(e) => handleDelete(resume.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/5 transition-colors"
                      title="Delete Resume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default CandidateDashboard;
