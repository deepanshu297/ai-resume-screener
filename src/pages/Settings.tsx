import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Sun, Moon, Cpu, FolderOpen } from 'lucide-react';

const Settings: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  );
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Platform Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Configure interface and LLM matching model versions.</p>
        </div>
      </div>

      <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-800/80">
        
        {/* Color Mode */}
        <div className="pt-4 flex items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-sm">Theme Mode</h4>
            <p className="text-2xs text-slate-400 mt-1">Toggle between a crisp light mode and a premium dark aesthetic.</p>
          </div>
          <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-905 rounded-xl p-1">
            <button 
              onClick={() => setTheme('light')}
              className={`p-2 rounded-lg flex items-center gap-1 text-xs font-semibold ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              <Sun className="w-4 h-4" />
              Light
            </button>
            <button 
              onClick={() => setTheme('dark')}
              className={`p-2 rounded-lg flex items-center gap-1 text-xs font-semibold ${theme === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}
            >
              <Moon className="w-4 h-4" />
              Dark
            </button>
          </div>
        </div>

        {/* Model info */}
        <div className="pt-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm">AI Engine Core</h4>
            <p className="text-2xs text-slate-400">LLM configuration and semantic embeddings encoder.</p>
          </div>
          <div className="text-right text-xs space-y-1 text-slate-550">
            <div className="flex items-center gap-1.5 justify-end">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">Google Gemini 2.5 Flash</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-2xs">Sentence Transformers (MiniLM-L6)</span>
            </div>
          </div>
        </div>

        {/* Workspace directory mapping */}
        <div className="pt-6 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm">File Storage System</h4>
            <p className="text-2xs text-slate-400">Dynamic storage allocations on local folders.</p>
          </div>
          <div className="text-right text-2xs space-y-1 text-slate-500">
            <div className="flex items-center gap-1.5 justify-end">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="font-mono">./uploads/ (Resumes)</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="font-mono">./database/ (SQLite & FAISS)</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Settings;
