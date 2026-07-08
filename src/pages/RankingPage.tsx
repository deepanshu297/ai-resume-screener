import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Search, 
  Users, 
  Briefcase, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  PieChart as PieIcon,
  HelpCircle,
  Scale,
  X,
  FileText,
  UserCheck,
  CheckCircle,
  FileAlert
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import api from '../services/api';

interface CandidateRankingItem {
  match_id: number;
  resume_id: number;
  name: string;
  email: string;
  filename: string;
  status: 'Processing' | 'Completed' | 'Failed';
  overall_score: number;
  similarity_score: number;
  skill_match: number;
  experience_match: number;
  education_match: number;
  ats_score: number;
  recommendation: string;
  recruiter_notes?: string;
  skills: string[];
}

interface JobDetails {
  id: number;
  title: string;
  description: string;
  required_skills: string;
  min_experience: number;
}

interface AnalyticsData {
  average_ats: number;
  hiring_funnel: { [key: string]: number };
  top_skills: Array<{ name: string; count: number }>;
  missing_skills: Array<{ name: string; count: number }>;
  experience_dist: { [key: string]: number };
  education_dist: { [key: string]: number };
}

interface ComparisonResult {
  comparison_summary: string;
  candidates: Array<{
    id: number;
    name: string;
    pros: string[];
    cons: string[];
    suitability_verdict: string;
  }>;
  verdict_ranking: string;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const RankingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');

  const [job, setJob] = useState<JobDetails | null>(null);
  const [candidates, setCandidates] = useState<CandidateRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRankingItem | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Custom states for SaaS tabs, check-box selectors, comparison and analytics
  const [activeTab, setActiveTab] = useState<'candidates' | 'analytics'>('candidates');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchJobDetails = async () => {
    if (!jobId) return;
    try {
      const response = await api.get(`/api/recruiter/job/${jobId}`);
      setJob(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRankings = async (showLoading = true) => {
    if (!jobId) return;
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/api/recruiter/job/${jobId}/rankings`);
      setCandidates(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!jobId) return;
    setAnalyticsLoading(true);
    try {
      const res = await api.get(`/api/recruiter/job/${jobId}/analytics`);
      setAnalytics(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      fetchRankings();
    }
  }, [jobId]);

  // Load analytics when analytics tab is clicked
  useEffect(() => {
    if (activeTab === 'analytics' && jobId) {
      fetchAnalytics();
    }
  }, [activeTab, jobId]);

  // Auto-polling for candidates in "Processing" status
  useEffect(() => {
    const hasProcessing = candidates.some(c => c.status === 'Processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchRankings(false); // background fetch without layout flicker
      if (activeTab === 'analytics') fetchAnalytics();
    }, 4000);

    return () => clearInterval(interval);
  }, [candidates, activeTab]);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      await handleUploadFiles(Array.from(e.target.files));
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'docx';
    });

    if (validFiles.length === 0) {
      setUploadError('Please select valid PDF or DOCX files.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post(`/api/recruiter/job/${jobId}/upload-resumes`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await fetchRankings();
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setUploadError(err.response.data.detail);
      } else {
        setUploadError('Failed to parse uploads. Check server connection.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = async (type: 'csv' | 'pdf') => {
    if (!jobId) return;
    try {
      const response = await api.get(`/api/recruiter/job/${jobId}/download/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rankings_job_${jobId}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Failed to download report.');
    }
  };

  // Checkbox selects
  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const triggerComparison = async () => {
    if (selectedIds.length < 2 || !jobId) return;
    setComparisonLoading(true);
    setComparisonResult(null);
    try {
      const res = await api.get(`/api/recruiter/job/${jobId}/compare-candidates`, {
        params: { resume_ids: selectedIds.join(',') }
      });
      setComparisonResult(res.data);
    } catch (e) {
      console.error(e);
      alert('Failed to execute AI candidate comparison.');
    } finally {
      setComparisonLoading(false);
    }
  };

  // Filter lists
  const filteredCandidates = candidates.filter(cand => {
    const matchesSearch = 
      cand.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      cand.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cand.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
      
    // Handle processing files as score=0
    const score = cand.status === 'Completed' ? cand.overall_score : 0;
    const matchesScore = score >= minScoreFilter || cand.status !== 'Completed';
    
    return matchesSearch && matchesScore;
  });

  // Recharts formatted datasets
  const funnelData = analytics ? Object.keys(analytics.hiring_funnel).map(key => ({
    name: key,
    value: analytics.hiring_funnel[key]
  })) : [];

  const experienceData = analytics ? Object.keys(analytics.experience_dist).map(key => ({
    name: key,
    value: analytics.experience_dist[key]
  })) : [];

  const educationData = analytics ? Object.keys(analytics.education_dist).map(key => ({
    name: key,
    value: analytics.education_dist[key]
  })) : [];

  return (
    <div className="space-y-8">
      
      {/* Target header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <Link to="/recruiter" className="text-xs font-semibold text-slate-400 hover:text-primary flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Openings
          </Link>
          <h1 className="font-display font-bold text-2xl">
            {job ? job.title : 'Screening Candidates'}
          </h1>
          {job && (
            <p className="text-xs text-slate-450">Min Exp: {job.min_experience}Y+ | Target: {job.required_skills}</p>
          )}
        </div>

        {/* Action downloads */}
        {candidates.length > 0 && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleDownloadReport('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-105 dark:bg-slate-900 hover:bg-slate-200 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Export CSV
            </button>
            <button 
              onClick={() => handleDownloadReport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </button>
          </div>
        )}
      </div>

      {/* Upload dropbox */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Bulk uploader */}
        <div className="lg:col-span-2">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-3xl h-52 flex flex-col items-center justify-center p-6 text-center transition-all duration-300
              ${dragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900'}
              ${uploading ? 'pointer-events-none opacity-85' : ''}
              shadow-sm
            `}
          >
            {uploading ? (
              <div className="space-y-3">
                <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto" />
                <div>
                  <h4 className="font-semibold text-base">Scheduling Background Workers...</h4>
                  <p className="text-xs text-slate-400">Resumes saved. Workers are executing FAISS vector mapping & Gemini evaluations.</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-3" />
                <h4 className="font-semibold text-sm mb-1">Upload Multiple Resumes</h4>
                <p className="text-2xs text-slate-405 mb-4 max-w-md">Drag and drop multiple PDF or DOCX files here. Files parse in the background so you don't experience timeout lag.</p>
                <input 
                  type="file" 
                  multiple
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden" 
                  id="bulk-resumes-input" 
                />
                <label 
                  htmlFor="bulk-resumes-input"
                  className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-slate-100 text-xs font-semibold rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  Select Resumes
                </label>
              </>
            )}

            {uploadError && (
              <p className="absolute bottom-4 text-xs font-medium text-red-500">{uploadError}</p>
            )}
          </div>
        </div>

        {/* Job details card summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              Role Description
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-5">
              {job ? job.description : 'No description loaded.'}
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-850 text-2xs text-slate-400 flex justify-between items-center">
            <span>Recruiter Match Console</span>
            {candidates.some(c => c.status === 'Processing') && (
              <span className="flex items-center gap-1 text-primary font-semibold animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Live updating...
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Screened candidates list tabs */}
      <div className="space-y-4">
        
        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
          <button
            onClick={() => setActiveTab('candidates')}
            className={`pb-3 font-semibold text-xs transition-all border-b-2 ${activeTab === 'candidates' ? 'border-primary text-slate-950 dark:text-white' : 'border-transparent text-slate-400'}`}
          >
            Candidates Rankings ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            disabled={candidates.filter(c => c.status === 'Completed').length === 0}
            className={`pb-3 font-semibold text-xs transition-all border-b-2 disabled:opacity-50 ${activeTab === 'analytics' ? 'border-primary text-slate-950 dark:text-white' : 'border-transparent text-slate-400'}`}
          >
            SaaS Analytics Dashboard
          </button>
        </div>

        {/* TAB 1: CANDIDATES LIST */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            
            {/* Table controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search by name, email, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
                {/* Score slider filter */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Min Score: {minScoreFilter}%</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="100"
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                    className="w-24 sm:w-32 accent-primary" 
                  />
                </div>

                {/* Compare action trigger */}
                {selectedIds.length >= 2 && (
                  <button 
                    onClick={triggerComparison}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:scale-[1.01] transition-all shadow-md shadow-indigo-600/10"
                  >
                    <Scale className="w-4 h-4" />
                    Compare Candidates ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            {/* Main Rankings table */}
            {loading ? (
              <div className="h-64 bg-slate-200 dark:bg-slate-900 rounded-3xl animate-pulse" />
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <Users className="w-10 h-10 text-slate-355 mx-auto mb-3" />
                <h4 className="font-semibold text-base">No Screened Candidates Found</h4>
                <p className="text-xs text-slate-400 mt-1">Select resumes to upload and verify filters.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/20 text-slate-400 uppercase text-3xs font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-4 text-center w-12">Select</th>
                        <th className="px-4 py-4 w-12 text-center">Rank</th>
                        <th className="px-6 py-4">Applicant details</th>
                        <th className="px-6 py-4 text-center">Overall Fit</th>
                        <th className="px-6 py-4 text-center">FAISS Similarity</th>
                        <th className="px-6 py-4 text-center">Skills Match</th>
                        <th className="px-6 py-4 text-center">Exp Fit</th>
                        <th className="px-6 py-4 text-center">Edu Fit</th>
                        <th className="px-6 py-4 text-center">ATS Score</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-slate-850 text-xs">
                      {filteredCandidates.map((cand, idx) => {
                        const isCompleted = cand.status === 'Completed';
                        const isProcessing = cand.status === 'Processing';
                        const isFailed = cand.status === 'Failed';
                        
                        const overall = cand.overall_score || 0;
                        const scoreColor = overall >= 80 ? 'text-emerald-500 font-bold' : (overall >= 60 ? 'text-amber-500 font-bold' : 'text-rose-500 font-bold');
                        
                        return (
                          <tr key={cand.match_id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                            {/* Checkbox select */}
                            <td className="px-4 py-4 text-center w-12">
                              {isCompleted && (
                                <input 
                                  type="checkbox"
                                  checked={selectedIds.includes(cand.resume_id)}
                                  onChange={() => toggleSelectId(cand.resume_id)}
                                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                                />
                              )}
                            </td>
                            
                            <td className="px-4 py-4 font-bold text-slate-450 text-center">{idx + 1}</td>
                            
                            <td className="px-6 py-4">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block text-sm">{cand.name}</span>
                                <span className="text-2xs text-slate-400">{cand.email}</span>
                              </div>
                            </td>

                            <td className={`px-6 py-4 text-center ${scoreColor}`}>
                              {isCompleted ? `${overall}%` : '-'}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {isCompleted ? `${cand.similarity_score}%` : '-'}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {isCompleted ? `${cand.skill_match}%` : '-'}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {isCompleted ? `${cand.experience_match}%` : '-'}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {isCompleted ? `${cand.education_match}%` : '-'}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {isCompleted ? `${cand.ats_score}%` : '-'}
                            </td>

                            {/* Status tags */}
                            <td className="px-6 py-4 text-center">
                              {isProcessing && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-violet-500/10 text-primary animate-pulse">
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  Processing
                                </span>
                              )}
                              {isCompleted && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-550/10 text-emerald-500">
                                  Completed
                                </span>
                              )}
                              {isFailed && (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-2xs font-bold bg-red-500/10 text-red-500">
                                  Failed
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-center">
                              {isCompleted ? (
                                <button 
                                  onClick={() => setSelectedCandidate(cand)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-primary font-semibold text-2xs rounded-lg hover:bg-primary hover:text-white transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Review
                                </button>
                              ) : (
                                <span className="text-slate-400 text-2xs italic">Queued...</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fadeIn">
            
            {analyticsLoading || !analytics ? (
              <div className="h-96 bg-slate-200 dark:bg-slate-900 rounded-3xl animate-pulse" />
            ) : (
              <div className="space-y-8">
                
                {/* Visual average card */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center">
                    <span className="text-2xs text-slate-400 uppercase font-bold tracking-wider">Average ATS Score</span>
                    <p className="font-display font-bold text-4xl text-primary mt-2">{analytics.average_ats} / 100</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center">
                    <span className="text-2xs text-slate-400 uppercase font-bold tracking-wider">Interview Ready</span>
                    <p className="font-display font-bold text-4xl text-emerald-500 mt-2">{analytics.hiring_funnel["Interview"] || 0}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center">
                    <span className="text-2xs text-slate-400 uppercase font-bold tracking-wider">Strong Fit Recs</span>
                    <p className="font-display font-bold text-4xl text-violet-500 mt-2">{analytics.hiring_funnel["Strong Hire"] || 0}</p>
                  </div>
                </div>

                {/* Charts Matrix */}
                <div className="grid md:grid-cols-2 gap-8">
                  
                  {/* Top skills frequency chart */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" />
                      Top 10 Present Applicant Skills
                    </h4>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.top_skills} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Missing skills frequency chart */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Top 10 Common Skill Gaps
                    </h4>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.missing_skills} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Experience bracket distribution */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      Experience Distribution
                    </h4>
                    
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={experienceData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Education Pie breakdown */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <PieIcon className="w-4 h-4" />
                      Education Demographics
                    </h4>
                    
                    <div className="h-64 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={educationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {educationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* DETAIL MODAL WITH RECRUITER NOTES */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/60 pb-4 mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{selectedCandidate.name}</h3>
                <p className="text-2xs text-slate-400">{selectedCandidate.email} | {selectedCandidate.filename}</p>
              </div>
              <button 
                onClick={() => setSelectedCandidate(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-1 text-xs">
              
              {/* Score Breakdown grid */}
              <div className="grid grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 text-center">
                <div>
                  <span className="text-2xs text-slate-400 block uppercase font-bold">Overall Fit</span>
                  <span className="font-display font-bold text-sm text-primary">{selectedCandidate.overall_score}%</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block uppercase font-bold">FAISS Sim</span>
                  <span className="font-display font-bold text-sm text-slate-850 dark:text-slate-200">{selectedCandidate.similarity_score}%</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block uppercase font-bold">Skills Match</span>
                  <span className="font-display font-bold text-sm text-slate-850 dark:text-slate-200">{selectedCandidate.skill_match}%</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block uppercase font-bold">Experience Fit</span>
                  <span className="font-display font-bold text-sm text-slate-850 dark:text-slate-200">{selectedCandidate.experience_match}%</span>
                </div>
                <div>
                  <span className="text-2xs text-slate-400 block uppercase font-bold">ATS Score</span>
                  <span className="font-display font-bold text-sm text-slate-850 dark:text-slate-200">{selectedCandidate.ats_score}%</span>
                </div>
              </div>

              {/* Recruiter hiring notes */}
              {selectedCandidate.recruiter_notes && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-2xs">AI Recruiter notes & Advice</h4>
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-slate-750 dark:text-slate-350 leading-relaxed font-sans text-xs">
                    {selectedCandidate.recruiter_notes}
                  </div>
                </div>
              )}

              {/* Fit recommendation text */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-2xs">AI hiring recommendation</h4>
                <div className="p-4 bg-violet-600/5 border border-violet-600/10 rounded-2xl text-slate-750 dark:text-slate-350 leading-relaxed font-sans text-xs">
                  {selectedCandidate.recommendation}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-3">
                <Link
                  to={`/candidate/analysis?id=${selectedCandidate.resume_id}`}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4 text-violet-500" />
                  View Parsed Profile
                </Link>
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl text-xs transition-colors"
                >
                  Dismiss Review
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* SIDE BY SIDE COMPARISON MODAL */}
      {comparisonLoading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span className="font-semibold text-xs">Executing Candidate Comparison Matrix...</span>
          </div>
        </div>
      )}

      {comparisonResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/60 pb-4 mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Scale className="w-5 h-5 text-primary" />
                  AI Candidate Fit Comparison
                </h3>
                <p className="text-2xs text-slate-405">Comparative overview for the target {job?.title} job posting.</p>
              </div>
              <button 
                onClick={() => { setComparisonResult(null); setSelectedIds([]); }} 
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-1 text-xs">
              
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 rounded-2xl leading-relaxed text-slate-700 dark:text-slate-350">
                <b>Summary Fit Analysis:</b><br/>{comparisonResult.comparison_summary}
              </div>

              {/* side-by-side candidates data */}
              <div className="grid md:grid-cols-2 gap-6 pt-2">
                {comparisonResult.candidates.map((c, i) => (
                  <div key={i} className="p-4 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-4 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-2">
                      <UserCheck className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                    </div>

                    <div className="space-y-2">
                      <span className="block font-bold text-emerald-500 uppercase text-3xs tracking-wider">Pros / Strengths</span>
                      <ul className="space-y-1 list-disc list-inside text-slate-650 dark:text-slate-400 text-3xs pl-1">
                        {c.pros.map((pro, pIdx) => <li key={pIdx}>{pro}</li>)}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="block font-bold text-red-500 uppercase text-3xs tracking-wider">Cons / Gaps</span>
                      <ul className="space-y-1 list-disc list-inside text-slate-650 dark:text-slate-400 text-3xs pl-1">
                        {c.cons.map((con, cIdx) => <li key={cIdx}>{con}</li>)}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-850 text-3xs text-slate-500 leading-relaxed">
                      <b>Verdict:</b> {c.suitability_verdict}
                    </div>
                  </div>
                ))}
              </div>

              {/* AI Ranking verdict */}
              <div className="p-4 bg-violet-600/5 border border-violet-600/10 rounded-2xl leading-relaxed text-slate-700 dark:text-slate-350">
                <b>Final AI Ranking Fit Recommendation:</b><br/>{comparisonResult.verdict_ranking}
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
              <button
                onClick={() => { setComparisonResult(null); setSelectedIds([]); }}
                className="px-6 py-2 bg-primary text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Close Comparison
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RankingPage;
