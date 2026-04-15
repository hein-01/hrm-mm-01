import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
    const [authMode, setAuthMode] = useState('login');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Redirect to dashboard (Insights Dashboard)
        navigate('/insights-dashboard');
    };

    return (
        <div className="bg-[#f6f6f8] dark:bg-[#101622] min-h-screen flex justify-center w-full font-display">
            {/* Mobile Container */}
            <div className="w-full max-w-md h-full min-h-screen relative flex flex-col bg-[#f6f6f8] dark:bg-[#101622] text-gray-900 dark:text-white transition-colors duration-200">
                {/* Top Navigation */}
                <header className="flex items-center justify-between p-4 pt-6">
                    <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                        <span className="material-symbols-outlined text-gray-900 dark:text-white">arrow_back</span>
                    </Link>
                    <button onClick={() => navigate('/insights-dashboard')} className="text-sm font-medium text-[#135bec]">Skip</button>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 px-6 pt-2 pb-8 flex flex-col">
                    {/* Headline */}
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900 dark:text-white">Find your next<br />career move</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Create an account or log in to start applying.</p>
                    </div>

                    {/* Segmented Control (Tabs) */}
                    <div className="bg-gray-200 dark:bg-[#1b2431] p-1 rounded-xl mb-8 flex relative">
                        <label className="flex-1 relative cursor-pointer group">
                            <input
                                className="peer sr-only"
                                name="auth_mode"
                                type="radio"
                                value="login"
                                checked={authMode === 'login'}
                                onChange={() => setAuthMode('login')}
                            />
                            <div className="w-full py-2.5 rounded-lg text-center text-sm font-semibold transition-all duration-200 text-gray-600 dark:text-gray-400 peer-checked:bg-white dark:peer-checked:bg-[#2c3646] peer-checked:text-[#135bec] peer-checked:shadow-sm">
                                Log In
                            </div>
                        </label>
                        <label className="flex-1 relative cursor-pointer group">
                            <input
                                className="peer sr-only"
                                name="auth_mode"
                                type="radio"
                                value="signup"
                                checked={authMode === 'signup'}
                                onChange={() => setAuthMode('signup')}
                            />
                            <div className="w-full py-2.5 rounded-lg text-center text-sm font-semibold transition-all duration-200 text-gray-600 dark:text-gray-400 peer-checked:bg-white dark:peer-checked:bg-[#2c3646] peer-checked:text-[#135bec] peer-checked:shadow-sm">
                                Sign Up
                            </div>
                        </label>
                    </div>

                    {/* Form Fields */}
                    <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                        {authMode === 'signup' && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Full Name</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">person</span>
                                    </div>
                                    <input className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1b2431] border-transparent focus:border-[#135bec] focus:ring-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base shadow-sm focus:shadow-md transition-all outline-none" placeholder="John Doe" type="text" />
                                </div>
                            </div>
                        )}
                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
                                </div>
                                <input className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-[#1b2431] border-transparent focus:border-[#135bec] focus:ring-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base shadow-sm focus:shadow-md transition-all outline-none" placeholder="name@example.com" type="email" />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                                </div>
                                <input className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-[#1b2431] border-transparent focus:border-[#135bec] focus:ring-0 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base shadow-sm focus:shadow-md transition-all outline-none" placeholder="Enter your password" type="password" />
                                <button className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" type="button">
                                    <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                                </button>
                            </div>
                        </div>

                        {/* Helper Links */}
                        {authMode === 'login' && (
                            <div className="flex justify-end pt-1">
                                <a className="text-sm font-medium text-[#135bec] hover:text-blue-400 transition-colors" href="#">Forgot Password?</a>
                            </div>
                        )}

                        {/* Primary Action Button */}
                        <button className="mt-4 w-full bg-[#135bec] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex justify-center items-center gap-2" type="submit">
                            <span>{authMode === 'login' ? 'Log In' : 'Sign Up'}</span>
                            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Or continue with</span>
                        <div className="h-px bg-gray-300 dark:bg-gray-700 flex-1"></div>
                    </div>


                    {/* QR Login Option (Zero-Email) */}
                    <div className="mt-4 px-2">
                        <button 
                            onClick={() => navigate('/mobile-cockpit')}
                            className="w-full py-4 bg-white dark:bg-[#1b2431] border-2 border-dashed border-indigo-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 group hover:border-[#4F46E5] transition-all"
                        >
                            <span className="material-symbols-outlined text-3xl text-indigo-400 group-hover:text-[#4F46E5] group-hover:scale-110 transition-all">qr_code_scanner</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">Scan Company QR</span>
                        </button>
                        <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-3 italic">📌 Rapid Entry: FaceID / Biometric Session Restore</p>
                    </div>

                    <div className="mt-auto pt-8 pb-4 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            By continuing, you agree to our <a className="text-[#135bec] hover:underline" href="#">Terms of Service</a> and <a className="text-[#135bec] hover:underline" href="#">Privacy Policy</a>.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
