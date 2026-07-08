import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Clock, 
  Layers,
  ArrowRight,
  BookOpen,
  Users,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../services/api';

interface JobDescriptionItem {
  id: number;
  title: string;
  description: string;
  required_skills: string;
  min_experience: number;
  created_at: string;
}

interface NewJobForm {
  title: string;
  description: string;
  required_skills: string;
  min_experience: number;
}

const RecruiterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobDescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewJobForm>();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/recruiter/jobs');
      setJobs(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const onSubmit = async (data: NewJobForm) => {
    setApiError(null);
    try {
      const response = await api.post('/api/recruiter/job', data);
      setJobs(prev => [response.data, ...prev]);
      setIsModalOpen(false);
      reset();
      // Redirect directly to the ranking uploads for this job
      navigate(`/recruiter/ranking?job_id=${response.data.id}`);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('Failed to create job description. Connection error.');
      }
    }
  };

  const handleDeleteJob = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid navigating
    if (!window.confirm('Deleting this job will clear all uploaded candidates and index mappings. Proceed?')) return;
    
    try {
      await api.delete(`/api/recruiter/job/${id}`);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Banner Intro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl">Job Openings Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Manage target roles, parse multi-resumes, and perform semantic ranking.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/10"
        >
          <Plus className="w-5 h-5" />
          Create Job Posting
        </button>
      </div>

      {/* Main Jobs Listing */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-900 rounded-3xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="font-semibold text-lg">No Job Descriptions Created</h4>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">Initialize a target role profile first, then batch upload resumes to match.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-md"
          >
            Create Your First Job
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div 
              key={job.id}
              onClick={() => navigate(`/recruiter/ranking?job_id=${job.id}`)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-violet-500/10 rounded-2xl">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-2xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    {job.min_experience}Y+ Exp
                  </span>
                </div>
                
                <div>
                  <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>

                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                  {job.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-primary flex items-center gap-1 group-hover:underline">
                  Rank Candidates
                  <ChevronRight className="w-3 h-3" />
                </span>
                <button 
                  onClick={(e) => handleDeleteJob(job.id, e)}
                  className="p-1.5 hover:text-red-500 rounded-lg hover:bg-red-500/5 transition-colors"
                  title="Delete Job Description"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE JOB MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/60 pb-4 mb-4">
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Create Target Job Details</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 pr-1">
              
              {apiError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                  {apiError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Job Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className={`
                    w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm outline-none transition-all
                    ${errors.title ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}
                  `}
                  {...register('title', { required: 'Job title is required' })}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              {/* Min Experience */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Minimum Experience (Years)</label>
                <input 
                  type="number" 
                  min="0"
                  defaultValue="0"
                  placeholder="e.g. 3"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none transition-all focus:border-primary"
                  {...register('min_experience', { valueAsNumber: true })}
                />
              </div>

              {/* Required Skills */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Required Skills (Comma Separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Python, React, Docker, FastAPI"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none transition-all focus:border-primary"
                  {...register('required_skills')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Job Description</label>
                <textarea 
                  rows={6}
                  placeholder="Paste details of the role description, responsibilities, qualifications, and requirements."
                  className={`
                    w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-sm outline-none transition-all
                    ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}
                  `}
                  {...register('description', { required: 'Job Description is required' })}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-150 dark:border-slate-800/60 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-150 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-md"
                >
                  Create & Continue
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default RecruiterDashboard;
