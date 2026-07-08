import React from 'react';
import { User, Mail, Shield, CheckCircle } from 'lucide-react';

const Profile: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || 'candidate';

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6 shadow-sm">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Account Profile</h1>
        <p className="text-sm text-slate-400 mt-1">Manage credentials and authorization metadata.</p>
      </div>

      <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-900">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 flex items-center justify-center font-display font-bold text-2xl text-white uppercase shadow-md">
          {user.full_name?.charAt(0) || 'U'}
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{user.full_name || 'Guest User'}</h3>
          <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 bg-primary/10 text-primary rounded-lg text-xs font-bold capitalize">
            <Shield className="w-3.5 h-3.5" />
            {role} Account
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Registered Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-450">
              <User className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              readOnly 
              value={user.full_name || ''}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Primary Email Address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-450">
              <Mail className="w-4 h-4" />
            </div>
            <input 
              type="email" 
              readOnly 
              value={user.email || ''}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none text-slate-500"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center gap-2 text-2xs text-slate-450">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        Your authentication credentials are encrypted using SHA-256 and verified through JWT handshake protocols.
      </div>
    </div>
  );
};

export default Profile;
