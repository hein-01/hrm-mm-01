import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    useEffect(() => {
        // Simple intersection observer for scroll animations
        const observerOptions = {
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        return () => {
            document.querySelectorAll('.reveal').forEach(el => observer.unobserve(el));
        };
    }, []);

    return (
        <div className="bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-700 min-h-screen">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
                
                :root {
                    --brand-primary: #4F46E5;
                    --brand-secondary: #818CF8;
                    --glass: rgba(255, 255, 255, 0.7);
                }

                body {
                    font-family: 'Outfit', sans-serif;
                }

                .mesh-bg {
                    background-color: #f8fafc;
                    background-image: 
                        radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
                        radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), 
                        radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
                    background-attachment: fixed;
                }

                .reveal {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: all 1s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .reveal.active {
                    opacity: 1;
                    transform: translateY(0);
                }
                .marquee {
                    animation: marquee 40s linear infinite;
                }
                .float {
                    animation: float 8s ease-in-out infinite;
                }
                .glass {
                    background: var(--glass);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
                .text-gradient {
                    background: linear-gradient(135deg, #4F46E5 0%, #EC4899 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(2deg); }
                }
                .glow-shadow {
                    box-shadow: 0 0 20px rgba(79, 70, 229, 0.2);
                }
            `}</style>
            {/* BEGIN: Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-slate-50/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
                        </div>
                        <span className="font-bold text-xl tracking-tight">HR<span className="text-indigo-600">Truth</span></span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a className="hover:text-indigo-600 transition-colors" href="#features">Features</a>
                        <a className="hover:text-indigo-600 transition-colors" href="#pricing">Pricing</a>
                        <a className="hover:text-indigo-600 transition-colors" href="#">Compliance</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors">Login</Link>
                        <Link to="/signup" className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">Get Started</Link>
                    </div>
                </div>
            </nav>
            {/* END: Navigation */}

            {/* BEGIN: HeroSection */}
            <section className="relative pt-32 pb-20 overflow-hidden lg:min-h-screen flex items-center">
                {/* Dynamic Background Elements */}
                <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-pink-100/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4"></div>

                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border border-indigo-100 text-indigo-600 text-[10px] font-bold tracking-[0.2em] uppercase shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                            </span>
                            AI-First Governance Hub
                        </div>
                        <h1 className="text-6xl lg:text-8xl font-extrabold tracking-[-0.03em] text-slate-900 leading-[0.95]">
                            Manage <span className="text-gradient">Truth.</span><br />Empower <span className="text-gradient">People.</span>
                        </h1>
                        <p className="text-xl text-slate-500 max-w-lg leading-relaxed font-light">
                            The region’s first **Governance-Anchored** HRMS. Bridging high-performance operations with automated Singapore & Myanmar compliance.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/signup" className="px-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-indigo-200 text-center flex items-center justify-center gap-2">
                                Get Started Free
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                            </Link>
                            <button className="px-10 py-5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                                View Demo
                            </button>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-400 pt-4">
                            <div className="flex -space-x-3">
                                {[1,2,3].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-4 border-white glass overflow-hidden shadow-sm">
                                        <div className={`w-full h-full bg-indigo-${i}00`}></div>
                                    </div>
                                ))}
                            </div>
                            <span className="font-medium">Trusted by <span className="text-slate-900 font-bold">1,200+</span> teams across SE-Asia</span>
                        </div>
                    </div>
                    {/* Right Side Visual: Dashboard Mockup */}
                    <div className="relative lg:h-[650px] flex items-center justify-center lg:justify-end hidden lg:flex">
                        {/* Floating KPI Card 1 */}
                        <div className="absolute top-4 right-12 z-20 w-64 p-6 glass rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] float" style={{ animationDelay: '0s' }}>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Regional Staff</p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">1,284</h3>
                            <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs font-bold bg-emerald-50/50 w-fit px-2 py-1 rounded-full">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                12% GROWTH
                            </div>
                        </div>
                        
                        {/* Main Dashboard Ghost Mockup */}
                        <div className="w-full lg:w-[540px] h-[600px] glass rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(79,70,229,0.15)] border border-white/50 overflow-hidden relative p-10 transform scale-110 lg:-mr-12">
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center">
                                            <div className="w-6 h-6 bg-indigo-600 rounded-lg"></div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="w-32 h-3 bg-slate-900 rounded-full"></div>
                                            <div className="w-20 h-2 bg-slate-400/20 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200"></div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 bg-white/40 border border-white rounded-2xl"></div>
                                    ))}
                                </div>

                                <div className="space-y-5">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Payroll Bridge</h4>
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-full h-12 bg-white/60 border border-white rounded-2xl px-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 h-6 rounded-lg bg-slate-200"></div>
                                                    <div className="w-24 h-2 bg-slate-300/40 rounded-full"></div>
                                                </div>
                                                <div className="w-12 h-2 bg-indigo-200 rounded-full"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating KPI Card 2 */}
                        <div className="absolute -bottom-6 left-0 z-30 w-80 p-8 glass rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-white/60 float" style={{ animationDelay: '3s' }}>
                            <div className="flex justify-between items-start mb-8">
                                <div className="space-y-1">
                                    <h4 className="text-xl font-bold text-slate-900">Attendance</h4>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Across 5 Locations</p>
                                </div>
                                <span className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black rounded-full shadow-lg shadow-indigo-100">LIVE</span>
                            </div>
                            <div className="flex items-end justify-between gap-2 h-24 mb-6">
                                {[40, 60, 100, 70, 90, 80, 95].map((h, i) => (
                                    <div key={i} className="flex-1 rounded-full bg-slate-100 relative group overflow-hidden">
                                        <div 
                                            className={`absolute bottom-0 w-full rounded-full transition-all duration-1000 ${i === 6 ? 'bg-indigo-600' : 'bg-indigo-100'}`} 
                                            style={{ height: `${h}%` }}
                                        ></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <p className="text-3xl font-black tracking-tight text-slate-900">98.4%</p>
                                <div className="flex -space-x-2">
                                    {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* END: HeroSection */}

            {/* BEGIN: TrustSection */}
            <section className="py-12 bg-white border-y border-slate-100 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 overflow-hidden">
                    <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Trusted By Forward-Thinking Teams in the Region</p>
                    <div className="relative overflow-hidden flex w-full">
                        <div className="flex w-[200%] marquee gap-24 items-center">
                            {/* Logo Placeholders */}
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Enterprise Co</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Mya Logistics</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">SingCorp</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">TechFlow Asia</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Global Partners</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Innovate SG</span>
                            {/* Duplicate for seamless loop */}
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Enterprise Co</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Mya Logistics</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">SingCorp</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">TechFlow Asia</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Global Partners</span>
                            <span className="text-3xl font-black text-slate-300 lowercase tracking-tighter">Innovate SG</span>
                        </div>
                    </div>
                </div>
            </section>
            {/* END: TrustSection */}

            {/* BEGIN: FeatureGrid */}
            <section className="py-32 bg-slate-50 relative overflow-hidden" id="features">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-24 reveal">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-8 tracking-tight">Everything you need to <span className="text-gradient">lead.</span></h2>
                        <p className="text-xl text-slate-500 font-light leading-relaxed">Powerful governance tools built for HR professionals who value precision and compliance over paperwork. Built for the modern SE-Asian enterprise.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {/* Feature 1 */}
                        <div className="group p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] hover:-translate-y-3 transition-all duration-500 reveal">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-600 transition-all group-hover:rotate-6">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 11.25m-3 7.068A9.733 9.733 0 0112 21.75c-4.563-1.127-8.25-5.328-8.25-10.375V6.028c0-.68.468-1.284 1.135-1.428l7.115-1.53c.69-.15 1.402-.15 2.092 0l7.115 1.53c.667.144 1.135.748 1.135 1.428V11.375c0 5.047-3.687 9.248-8.25 10.375a9.733 9.733 0 01-.75-2.057" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900">Localized Compliance</h3>
                            <p className="text-slate-500 leading-relaxed mb-6 font-light">Automated SSB, PIT, and Patakha filings updated for 2026 regional tax codes. Zero errors, zero stress.</p>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">MM-SUPPORTED</span>
                                <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400">SG-READY</span>
                            </div>
                        </div>
                        {/* Feature 2 */}
                        <div className="group p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] hover:-translate-y-3 transition-all duration-500 reveal" style={{ transitionDelay: '0.1s' }}>
                            <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-pink-600 transition-all group-hover:rotate-6">
                                <svg className="w-8 h-8 text-pink-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900">Truth Assistant</h3>
                            <p className="text-slate-500 leading-relaxed font-light">Ask anything. 'Who is hitting OT limits?' 'What’s our payroll burn this month?' Get answers in seconds, not spreadsheets.</p>
                        </div>
                        {/* Feature 3 */}
                        <div className="group p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(79,70,229,0.15)] hover:-translate-y-3 transition-all duration-500 reveal" style={{ transitionDelay: '0.2s' }}>
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-emerald-600 transition-all group-hover:rotate-6">
                                <svg className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-slate-900">Geofence Pro</h3>
                            <p className="text-slate-500 leading-relaxed font-light">Secure your remote workforce with military-grade anti-fake GPS tracking and real-time movement telemetry.</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* END: FeatureGrid */}

            {/* BEGIN: PricingMatrix */}
            <section className="py-32 bg-white" id="pricing">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24 reveal">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 font-display tracking-tight">Pricing that <span className="text-gradient">scales</span> with you.</h2>
                        <p className="text-xl text-slate-500 font-light">Transparent regional billing, localized support, zero hidden costs.</p>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-10 items-stretch">
                        {/* Standard */}
                        <div className="lg:col-span-1 p-12 bg-white rounded-[3rem] border border-slate-100 shadow-xl reveal relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-100 transition-colors"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Standard</p>
                            <div className="flex items-baseline gap-2 mb-10">
                                <span className="text-5xl font-black text-slate-900">$2</span>
                                <span className="text-slate-400 font-medium">/employee/mo</span>
                            </div>
                            <ul className="space-y-5 mb-12 text-slate-600">
                                <li className="flex items-center gap-4 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center"><svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Core Attendance & Leave</li>
                                <li className="flex items-center gap-4 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center"><svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Basic Reporting</li>
                                <li className="flex items-center gap-4 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center"><svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Employee Directory</li>
                            </ul>
                            <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95">Select Standard</button>
                        </div>

                        {/* Growth Pro */}
                        <div className="lg:col-span-1 p-12 bg-indigo-600 rounded-[3rem] text-white shadow-[0_40px_80px_-15px_rgba(79,70,229,0.4)] transform scale-105 active:scale-100 transition-all duration-500 reveal z-10" style={{ transitionDelay: '0.1s' }}>
                            <div className="inline-block px-4 py-2 bg-indigo-500/50 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest uppercase mb-10 border border-white/20">Recommended</div>
                            <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-6">Growth Pro</p>
                            <div className="flex items-baseline gap-2 mb-10">
                                <span className="text-6xl font-black text-white leading-none">$5</span>
                                <span className="text-indigo-200 font-medium font-display">/employee/mo</span>
                            </div>
                            <ul className="space-y-5 mb-12">
                                <li className="flex items-center gap-4 text-sm font-bold"><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Truth-Anchored Audit</li>
                                <li className="flex items-center gap-4 text-sm font-bold"><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Regional Payroll Engine</li>
                                <li className="flex items-center gap-4 text-sm font-bold"><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> GPS Telemetry & Shifts</li>
                            </ul>
                            <button className="w-full py-6 bg-white text-indigo-600 rounded-[2rem] font-black hover:bg-slate-50 transition-all shadow-xl hover:shadow-[0_20px_40px_rgba(255,255,255,0.2)] active:scale-95">Get Started Free</button>
                        </div>

                        {/* Enterprise */}
                        <div className="lg:col-span-1 p-12 bg-slate-900 rounded-[3rem] text-white reveal border border-slate-800" style={{ transitionDelay: '0.2s' }}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Enterprise</p>
                            <div className="flex items-baseline gap-2 mb-10">
                                <span className="text-5xl font-black text-white">Custom</span>
                            </div>
                            <ul className="space-y-5 mb-12 text-slate-400">
                                <li className="flex items-center gap-4 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Multi-entity Consolidation</li>
                                <li className="flex items-center gap-4 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> Dedicated Compliance Lead</li>
                                <li className="flex items-center gap-4 text-sm font-medium"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg></div> SIEM Integration</li>
                            </ul>
                            <button className="w-full py-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all active:scale-95">Contact Sales</button>
                        </div>
                    </div>
                </div>
            </section>
            {/* END: PricingMatrix */}

            {/* BEGIN: Footer */}
            <footer className="bg-slate-50 py-20 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <div className="w-4 h-4 bg-white rounded-sm rotate-45"></div>
                            </div>
                            <span className="font-bold text-xl tracking-tight">HR<span className="text-indigo-600">Truth</span></span>
                        </div>
                        <p className="text-slate-500 max-w-sm">The first truth-anchored, AI-driven HRMS for Southeast Asian enterprises. Making compliance effortless.</p>
                        <div className="flex gap-4">
                            <a className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors" href="#">
                                <span className="sr-only">LinkedIn</span>
                                <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path></svg>
                            </a>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold mb-6 text-slate-900">Product</h4>
                        <ul className="space-y-4 text-slate-500 text-sm">
                            <li><a className="hover:text-indigo-600" href="#">Features</a></li>
                            <li><a className="hover:text-indigo-600" href="#">Compliance Guide</a></li>
                            <li><a className="hover:text-indigo-600" href="#">Pricing</a></li>
                            <li><a className="hover:text-indigo-600" href="#">Security</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold mb-6 text-slate-900">Support</h4>
                        <ul className="space-y-4 text-slate-500 text-sm">
                            <li><a className="hover:text-indigo-600" href="#">Help Center</a></li>
                            <li><a className="hover:text-indigo-600" href="#">API Documentation</a></li>
                            <li><a className="hover:text-indigo-600" href="#">Privacy Policy</a></li>
                            <li><a className="hover:text-indigo-600" href="#">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-400">© 2024 HRTruth. All rights reserved.</p>
                    <p className="text-sm text-slate-400">Localized Support in Singapore &amp; Yangon.</p>
                </div>
            </footer>
            {/* END: Footer */}
        </div>
    );
}
