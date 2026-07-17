import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { login, loginWithMfa, token } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaUsername, setMfaUsername] = useState('');

  useEffect(() => {
    if (token) {
      navigate('/admin/dashboard');
    }
  }, [token, navigate]);

  const onSubmit = async (data) => {
    setError('');
    try {
      if (mfaRequired) {
        await loginWithMfa(mfaUsername, data.otpCode);
        navigate('/admin/dashboard');
      } else {
        const res = await login(data.username, data.password);
        if (res?.mfa_required) {
          setMfaRequired(true);
          setMfaUsername(res.username);
        } else {
          navigate('/admin/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center shadow-inner">
            <ShieldCheck className="w-10 h-10 text-primary-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to manage certificates
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {mfaRequired ? (
              <div>
                <label htmlFor="otpCode" className="block text-sm font-medium text-slate-700 mb-1">
                  Authentication Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="otpCode"
                    type="text"
                    className={`block w-full pl-10 pr-3 py-3 border ${errors.otpCode ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500'} rounded-xl shadow-sm text-slate-900 transition-colors bg-slate-50 focus:bg-white text-center tracking-widest font-mono text-lg`}
                    placeholder="000000"
                    {...register("otpCode", { 
                      required: "Code is required",
                      pattern: { value: /^[0-9]{6}$/, message: "Must be a 6-digit number" }
                    })}
                  />
                </div>
                {errors.otpCode && <p className="mt-1 text-sm text-red-600">{errors.otpCode.message}</p>}
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      className={`block w-full pl-10 pr-3 py-3 border ${errors.username ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500'} rounded-xl shadow-sm text-slate-900 transition-colors bg-slate-50 focus:bg-white`}
                      {...register("username", { required: "Username is required" })}
                    />
                  </div>
                  {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      className={`block w-full pl-10 pr-3 py-3 border ${errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-primary-500 focus:border-primary-500'} rounded-xl shadow-sm text-slate-900 transition-colors bg-slate-50 focus:bg-white`}
                      {...register("password", { required: "Password is required" })}
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                      Remember me
                    </label>
                  </div>
                </div>
              </>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-6 text-center">
          <a href="/" className="text-sm font-medium text-primary-600 hover:text-primary-500">
            &larr; Back to Verification Portal
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
