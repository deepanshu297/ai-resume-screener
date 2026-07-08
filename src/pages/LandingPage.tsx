import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Upload, Award, FileSpreadsheet, ShieldAlert, Cpu, Sparkles, ChevronRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-violet-500 selection:text-white relative overflow-hidden">
      
      {/* Background gradient flares */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      {/* Navbar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            AG Screen
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white font-medium transition-colors">
            Sign In
          </Link>
          <Link to="/signup" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium transition-all duration-200 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:scale-[1.02]">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-800/60 border border-slate-700/50 backdrop-blur-md mb-8">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-slate-300">Intelligent Recruitment Powered by Gemini 2.5</span>
        </div>

        <h1 className="max-w-4xl font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.1] mb-8 bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
          Screen Resumes with <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Semantic Precision</span>
        </h1>

        <p className="max-w-2xl text-slate-400 text-lg sm:text-xl leading-relaxed mb-12">
          Rank candidates, extract structured insights, generate ATS-optimized letters, and search through thousands of resumes instantly using advanced Vector Embeddings.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-lg transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:scale-[1.02]">
            Launch Free Sandbox
            <ChevronRight className="w-5 h-5" />
          </Link>
          <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-800 text-slate-200 font-semibold text-lg transition-colors">
            See Features
          </a>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/80 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-white mb-4">Dual-Core AI Screening Architecture</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Custom workflows engineered specifically for both candidates optimizing their profiles and recruiters screening at scale.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Candidate Card */}
          <div className="p-8 rounded-3xl bg-slate-850/40 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-violet-600/5 blur-2xl group-hover:bg-violet-600/10 transition-colors" />
            <div className="p-4 bg-violet-600/10 rounded-2xl w-fit mb-6">
              <Award className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="font-display font-bold text-2xl text-white mb-3">For Candidates</h3>
            <p className="text-slate-400 mb-6 leading-relaxed">Optimize your resume for modern applicant tracking networks. Extract details, analyze improvements, identify skill gaps, and auto-build cover letters.</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Real-time ATS Score Generation
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Missing Keyphrase & Skill Detection
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Tailored Cover Letters & Interview prep Q&A
              </li>
            </ul>
          </div>

          {/* Recruiter Card */}
          <div className="p-8 rounded-3xl bg-slate-850/40 border border-slate-800 backdrop-blur-sm relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-600/5 blur-2xl group-hover:bg-indigo-600/10 transition-colors" />
            <div className="p-4 bg-indigo-600/10 rounded-2xl w-fit mb-6">
              <Cpu className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="font-display font-bold text-2xl text-white mb-3">For Recruiters</h3>
            <p className="text-slate-400 mb-6 leading-relaxed">Screen bulk files, build local FAISS semantic indexes, query similarities against custom job descriptions, and export CSV/PDF reports.</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Sentence Transformer Embedding Indexing
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                FAISS Flat Cosine Similarity Rankings
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Multi-aspect matching & qualitative AI reviews
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* Tech Stack Banner */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-800 text-center relative z-10 text-slate-500">
        <span className="text-sm uppercase tracking-widest font-semibold mb-6 block text-slate-400">Core Technologies</span>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-75">
          <span className="font-display font-semibold text-lg text-slate-300">FastAPI</span>
          <span className="font-display font-semibold text-lg text-slate-300">React + TS</span>
          <span className="font-display font-semibold text-lg text-slate-300">Gemini 2.5 Flash</span>
          <span className="font-display font-semibold text-lg text-slate-300">FAISS Vectors</span>
          <span className="font-display font-semibold text-lg text-slate-300">Docker</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-8 text-center text-sm text-slate-500 relative z-10">
        <p>© 2026 AG Screen Platform. Developed for High-Velocity Talent Screening.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
