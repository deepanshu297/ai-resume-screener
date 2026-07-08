import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, Mail, Lock, User, Briefcase, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../services/api';

interface SignupFormInputs {
  email: string;
  password: string;
  full_name: string;
  role: 'candidate' | 'recruiter';
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormInputs>({
    defaultValues: {
      role: 'candidate'
    }
  });

  const onSubmit = async (data: SignupFormInputs) => {
    setLoading(true);
    setApiError(null);
    try {
      await api.post('/api/auth/signup', data);
      setSuccess(true);
      // Auto redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('Registration failed. Please check backend connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Background blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight text-white">AG Screen</span>
          </Link>
          <p className="text-slate-400 text-sm font-medium">Create your credentials to get started</p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 backdrop-blur-md shadow-2xl">
          
          {success ? (
            <div className="py-8 text-center space-y-4">
              <div className="inline-flex p-4 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-bold text-white">Account Created!</h3>
              <p className="text-slate-400 text-sm">Successfully registered. Redirecting you to the sign-in portal...</p>
            </div>
          ) : (
            <>
              {apiError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{apiError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      className={`
                        w-full pl-10 pr-4 py-3 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 outline-none transition-all
                        ${errors.full_name ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary'}
                      `}
                      {...register('full_name', { required: 'Name is required' })}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className={`
                        w-full pl-10 pr-4 py-3 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 outline-none transition-all
                        ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary'}
                      `}
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email'
                        }
                      })}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className={`
                        w-full pl-10 pr-4 py-3 bg-slate-900/60 border rounded-2xl text-white placeholder-slate-500 outline-none transition-all
                        ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary'}
                      `}
                      {...register('password', { 
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Must be at least 6 characters'
                        }
                      })}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Role Toggle Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">I want to register as a</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className={`
                      flex flex-col items-center justify-center p-4 rounded-2xl border cursor-pointer transition-all duration-200
                      ${register('role').name && errors.role ? 'border-red-500/55' : ''}
                      ${errors.role ? 'border-red-500' : 'border-slate-800'}
                      hover:bg-slate-800/30 peer-checked:border-primary
                    `}>
                      <input 
                        type="radio" 
                        value="candidate" 
                        className="sr-only peer"
                        {...register('role')} 
                        defaultChecked
                      />
                      <User className="w-6 h-6 text-slate-400 mb-2 peer-checked:text-primary" />
                      <span className="text-sm font-semibold">Candidate</span>
                      <span className="text-2xs text-slate-500 text-center mt-1">Optimize my Resume</span>
                    </label>

                    <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-800/30 transition-all">
                      <input 
                        type="radio" 
                        value="recruiter" 
                        className="sr-only" 
                        {...register('role')} 
                      />
                      <Briefcase className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-sm font-semibold">Recruiter</span>
                      <span className="text-2xs text-slate-500 text-center mt-1">Screen Resumes</span>
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Register Now'
                  )}
                </button>

              </form>

              <div className="mt-6 text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign In
                </Link>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};

export default Signup;
