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
                .reveal {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 0.8s ease-out;
                }
                .reveal.active {
                    opacity: 1;
                    transform: translateY(0);
                }
                .marquee {
                    animation: marquee 25s linear infinite;
                }
                .float {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
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
                <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold tracking-widest uppercase">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            AI-First HR Solution
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                            HR that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Thinks.</span><br />Compliance that <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Works.</span>
                        </h1>
                        <p className="text-xl text-slate-500 max-w-lg leading-relaxed">
                            Stop chasing paperwork and start leading people. The region’s first AI-driven HRMS designed for the complexities of Singapore and Myanmar.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link to="/signup" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all shadow-xl shadow-indigo-200 text-center">
                                Get Started for Free
                            </Link>
                            <button className="px-8 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all">
                                Book a Demo
                            </button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400 pt-2">
                            <div className="flex -space-x-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white"></div>
                                <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white"></div>
                                <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-white"></div>
                            </div>
                            <span>Trusted by 500+ Regional Enterprises</span>
                        </div>
                    </div>
                    {/* Right Side Visual: Dashboard Mockup */}
                    <div className="relative lg:h-[600px] flex items-center justify-center lg:justify-end hidden lg:flex">
                        {/* Floating KPI Card 1 */}
                        <div className="absolute top-0 right-10 z-10 w-64 p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 float" style={{ animationDelay: '0s' }}>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Employees</p>
                            <h3 className="text-3xl font-bold text-slate-900">1,284</h3>
                            <div className="mt-4 flex items-center gap-2 text-emerald-500 text-sm font-medium">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                                +12% this month
                            </div>
                        </div>
                        {/* Floating KPI Card 2 */}
                        <div className="absolute bottom-10 left-0 z-20 w-72 p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 float" style={{ animationDelay: '2s' }}>
                            <div className="flex justify-between items-start mb-6">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Attendance Rate</p>
                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase">Real-time</span>
                            </div>
                            <div className="flex items-end gap-2 h-28">
                                <div className="w-3 h-12 bg-indigo-100 rounded-full"></div>
                                <div className="w-3 h-16 bg-indigo-100 rounded-full"></div>
                                <div className="w-3 h-24 bg-indigo-600 rounded-full"></div>
                                <div className="w-3 h-20 bg-indigo-100 rounded-full"></div>
                                <div className="w-3 h-28 bg-indigo-100 rounded-full"></div>
                            </div>
                            <p className="mt-4 text-2xl font-bold">98.4% <span className="text-sm font-normal text-slate-400">today</span></p>
                        </div>
                        {/* Main Dashboard Ghost Mockup */}
                        <div className="w-full lg:w-[480px] h-[540px] bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden relative p-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100"></div>
                                    <div className="space-y-2">
                                        <div className="w-32 h-3 bg-slate-100 rounded"></div>
                                        <div className="w-20 h-2 bg-slate-50 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-[1px] bg-slate-100 w-full"></div>
                                <div className="space-y-4">
                                    <div className="w-full h-8 bg-slate-50 rounded-lg"></div>
                                    <div className="w-full h-8 bg-slate-50 rounded-lg"></div>
                                    <div className="w-full h-8 bg-indigo-50 rounded-lg border border-indigo-100"></div>
                                    <div className="w-full h-8 bg-slate-50 rounded-lg"></div>
                                </div>
                                <div className="mt-10">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Approvals</p>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-200"></div>
                                                <span className="text-xs font-semibold">Annual Leave (MM)</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <div className="w-5 h-5 bg-white rounded-full border border-slate-200"></div>
                                                <div className="w-5 h-5 bg-white rounded-full border border-slate-200"></div>
                                            </div>
                                        </div>
                                    </div>
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
            <section className="py-24 bg-slate-50" id="features">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-2xl mx-auto mb-20 reveal">
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Everything you need to lead.</h2>
                        <p className="text-lg text-slate-500">Powerful AI tools built for HR professionals who value precision and compliance over paperwork.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 reveal">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 11.25m-3 7.068A9.733 9.733 0 0112 21.75c-4.563-1.127-8.25-5.328-8.25-10.375V6.028c0-.68.468-1.284 1.135-1.428l7.115-1.53c.69-.15 1.402-.15 2.092 0l7.115 1.53c.667.144 1.135.748 1.135 1.428V11.375c0 5.047-3.687 9.248-8.25 10.375a9.733 9.733 0 01-.75-2.057" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">Localized Compliance</h3>
                            <p className="text-slate-500 leading-relaxed mb-4">Automated SSB, PIT, and Patakha filings updated for 2026 regulations. Zero errors, zero stress.</p>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-widest text-slate-500">MM</span>
                                <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-widest text-slate-500">SG</span>
                            </div>
                        </div>
                        {/* Feature 2 */}
                        <div className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 reveal" style={{ transitionDelay: '0.1s' }}>
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">AI Assistant</h3>
                            <p className="text-slate-500 leading-relaxed">Ask our Assistant anything. 'Who is hitting OT limits?' 'What’s our retention risk?' Get answers in seconds, not spreadsheets.</p>
                        </div>
                        {/* Feature 3 */}
                        <div className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 reveal" style={{ transitionDelay: '0.2s' }}>
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">GPS Field Force</h3>
                            <p className="text-slate-500 leading-relaxed">Secure your remote workforce with anti-fake GPS tracking and real-time movement alerts.</p>
                        </div>
                        {/* Feature 4 */}
                        <div className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 reveal">
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">Global Payroll</h3>
                            <p className="text-slate-500 leading-relaxed">Multi-currency processing with automated bank file generation for leading regional banks (KBZ, AYA, CB, and more).</p>
                        </div>
                        {/* Feature 5 */}
                        <div className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 reveal" style={{ transitionDelay: '0.1s' }}>
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">Smart Scheduling</h3>
                            <p className="text-slate-500 leading-relaxed">AI-optimized rostering that respects labor laws and employee availability automatically.</p>
                        </div>
                        {/* Feature 6 */}
                        <div className="group p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 reveal" style={{ transitionDelay: '0.2s' }}>
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-slate-900">Mobile-First ESS</h3>
                            <p className="text-slate-500 leading-relaxed">Native mobile apps for employees to apply for leave, view payslips, and update personal data.</p>
                        </div>
                    </div>
                </div>
            </section>
            {/* END: FeatureGrid */}

            {/* BEGIN: PricingMatrix */}
            <section className="py-24 bg-white" id="pricing">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20 reveal">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">Pricing that scales with you.</h2>
                        <p className="text-slate-500">Transparent billing, no hidden fees, local support.</p>
                    </div>
                    <div className="grid lg:grid-cols-3 gap-8 items-end">
                        {/* Basic */}
                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 reveal">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Basic</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold text-slate-900">$2</span>
                                <span className="text-slate-500">/employee/mo</span>
                            </div>
                            <ul className="space-y-4 mb-8 text-sm text-slate-600">
                                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> Basic Attendance</li>
                                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> Leave Management</li>
                                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> Standard Reporting</li>
                            </ul>
                            <button className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold hover:bg-slate-100 transition-colors">Choose Basic</button>
                        </div>
                        {/* Growth */}
                        <div className="p-8 bg-indigo-600 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 transform scale-105 reveal" style={{ transitionDelay: '0.1s' }}>
                            <div className="inline-block px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6">Most Popular</div>
                            <p className="text-sm font-bold opacity-80 uppercase tracking-widest mb-4">Growth</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold">$5</span>
                                <span className="opacity-80">/employee/mo</span>
                            </div>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-3"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> AI HR Assistant</li>
                                <li className="flex items-center gap-3"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> Local Payroll Engine</li>
                                <li className="flex items-center gap-3"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> GPS Location Checks</li>
                            </ul>
                            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-extrabold hover:bg-slate-50 transition-colors">Start Free Trial</button>
                        </div>
                        {/* Enterprise */}
                        <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 reveal" style={{ transitionDelay: '0.2s' }}>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Enterprise</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold text-slate-900">Custom</span>
                            </div>
                            <ul className="space-y-4 mb-8 text-sm text-slate-600">
                                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> Multi-entity Management</li>
                                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> Dedicated Account Lead</li>
                                <li className="flex items-center gap-3"><svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg> On-premise Options</li>
                            </ul>
                            <button className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-bold hover:bg-slate-100 transition-colors">Contact Sales</button>
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
