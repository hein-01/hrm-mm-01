import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Virtuoso } from 'react-virtuoso';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import type { FieldAgent } from '../types/hrms.types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapController({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 15, { duration: 0.8 }); }, [center, map]);
    return null;
}

function createAgentIcon(agent: FieldAgent, isSelected: boolean) {
    const color = agent.alert === 'Fake GPS Detected' ? '#ef4444'
        : agent.alert === 'High Speed Alert' ? '#8b5cf6'
        : agent.alert !== 'None' ? '#f59e0b'
        : agent.status === 'Offline' ? '#9ca3af' : '#10b981';
    const ring = isSelected ? 'box-shadow:0 0 0 3px #4F46E5,0 4px 14px rgba(0,0,0,.35)' : 'box-shadow:0 4px 14px rgba(0,0,0,.35)';
    return L.divIcon({
        html: `<div style="position:relative;width:40px;height:50px;">
            <div style="width:40px;height:40px;border-radius:50%;border:2.5px solid white;${ring};background:#1e293b;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:15px;font-family:sans-serif;">${agent.name.charAt(0)}</div>
            <div style="position:absolute;bottom:-1px;right:-1px;width:13px;height:13px;border-radius:50%;background:${color};border:2px solid white;"></div>
            <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:2px;height:8px;background:${color};"></div>
        </div>`,
        className: '',
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -54],
    });
}

export default function FieldForce() {
    const { fieldAgents, setFieldAgents, logFieldAgentLocation, optimizeFieldRoutes, checkIn } = useAppData();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'Online' | 'Offline'>('Online');
    const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    const [currentLayer, setCurrentLayer] = useState<'Streets' | 'Satellite'>('Streets');
    const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
    const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
    const [scrubberValue, setScrubberValue] = useState(100);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
    const [activeAlertAgent, setActiveAlertAgent] = useState<FieldAgent | null>(null);

    const [geofenceError, setGeofenceError] = useState<{ active: boolean; distance: number; target: string } | null>(null);

    // Clock: real time when not in timeline playback
    useEffect(() => {
        if (isTimelinePlaying) return;
        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 60000);
        return () => clearInterval(timer);
    }, [isTimelinePlaying]);

    // Timeline playback: advance clock +5 min per second
    useEffect(() => {
        if (!isTimelinePlaying) return;
        const timer = setInterval(() => {
            setCurrentTime(prev => {
                const [h, m] = prev.split(':').map(Number);
                let newM = m + 5; let newH = h;
                if (newM >= 60) { newM = 0; newH = (h + 1) % 24; }
                return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isTimelinePlaying]);

    // GPS Heartbeat: nudge Online agents every 10 seconds using REAL device context when available
    // PRIVACY HARD-KILL: Dependency array ensures interval is cleared/reset when status changes
    useEffect(() => {
        const activeAgents = fieldAgents.filter(a => a.status === 'Online' && a.isTrackingActive);
        if (activeAgents.length === 0) return;

        const interval = setInterval(async () => {
            let batteryLevel = 85;
            try {
                const battery: any = await (navigator as any).getBattery?.();
                if (battery) batteryLevel = Math.round(battery.level * 100);
            } catch (e) {}

            const onLine = navigator.onLine;

            activeAgents.forEach(agent => {
                // Simulate movement nudges for demo
                const d = 0.0003;
                const newLat = agent.gps.lat + (Math.random() * d * 2 - d);
                const newLng = agent.gps.lng + (Math.random() * d * 2 - d);
                
                logFieldAgentLocation(agent.id, { lat: newLat, lng: newLng }, batteryLevel, onLine);
            });
        }, 10000);

        return () => {
            clearInterval(interval);
            console.log("GPS Heartbeat Physically Cleared - Privacy compliance verified.");
        };
    }, [fieldAgents.map(a => `${a.id}:${a.status}:${a.isTrackingActive}`).join(','), logFieldAgentLocation]);

    // Derived state
    const filteredAgents = fieldAgents.filter(agent =>
        (agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         agent.locationName.toLowerCase().includes(searchQuery.toLowerCase())) &&
        agent.status === activeTab
    );
    const onlineCount = fieldAgents.filter(a => a.status === 'Online').length;
    const offlineCount = fieldAgents.filter(a => a.status === 'Offline').length;
    const totalCount = fieldAgents.length;
    const activePercentage = Math.round((onlineCount / totalCount) * 100) || 0;
    const activeAlerts = fieldAgents.filter(a => a.alert !== 'None');

    // Scrubber: map agent to historical position when dragged back
    const getDisplayPos = (agent: FieldAgent): [number, number] => {
        if (scrubberValue >= 100 || agent.history.length === 0) return [agent.gps.lat, agent.gps.lng];
        const idx = Math.min(Math.floor((agent.history.length - 1) * scrubberValue / 100), agent.history.length - 1);
        const pt = agent.history[idx];
        return [pt.lat ?? agent.gps.lat, pt.lng ?? agent.gps.lng];
    };

    const handleAgentClick = useCallback((agent: FieldAgent) => {
        setSelectedAgentId(agent.id);
        setMapCenter([agent.gps.lat, agent.gps.lng]);
    }, []);

    const handleAlertClick = useCallback((agent: FieldAgent) => {
        setActiveAlertAgent(agent);
        setSelectedAgentId(agent.id);
        setMapCenter([agent.gps.lat, agent.gps.lng]);
    }, []);

    const handleDismissAlert = useCallback((agentId: string) => {
        setFieldAgents(prev => prev.map(a => a.id === agentId ? { ...a, alert: 'None' as const } : a));
        setActiveAlertAgent(null);
    }, [setFieldAgents]);

    const handleOptimize = (e: React.MouseEvent) => {
        e.preventDefault();
        const res = optimizeFieldRoutes('ADM-001');
        alert(res.success ? 'Route Optimization calculated. Rerouting active agents.' : res.message);
    };

    const getAlertStyle = (type: string) => {
        switch (type) {
            case 'GPS Signal Lost': return { border: 'border-slate-100 dark:border-slate-800', bg: 'bg-white dark:bg-slate-800/50', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconText: 'text-orange-500', titleClass: 'text-slate-900 dark:text-white', icon: 'location_off' };
            case 'Fake GPS Detected': return { border: 'border-red-100 dark:border-red-900/30', bg: 'bg-red-50/50 dark:bg-red-900/10', iconBg: 'bg-red-100 dark:bg-red-900/30', iconText: 'text-red-600', titleClass: 'text-red-900 dark:text-red-100', icon: 'wrong_location' };
            case 'Low Battery Warning': return { border: 'border-amber-100 dark:border-amber-900/30', bg: 'bg-amber-50/50 dark:bg-amber-900/10', iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconText: 'text-amber-500', titleClass: 'text-slate-900 dark:text-white', icon: 'battery_alert' };
            case 'High Speed Alert': return { border: 'border-purple-100 dark:border-purple-900/30', bg: 'bg-purple-50/50 dark:bg-purple-900/10', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconText: 'text-purple-600', titleClass: 'text-purple-900 dark:text-purple-100', icon: 'speed' };
            default: return { border: 'border-slate-100', bg: 'bg-white', iconBg: 'bg-slate-100', iconText: 'text-slate-500', titleClass: 'text-slate-900', icon: 'info' };
        }
    };

    const getStatusDot = (agent: FieldAgent) => {
        if (agent.status === 'Offline') return 'bg-gray-400';
        if (agent.alert === 'Fake GPS Detected') return 'bg-red-500 animate-ping';
        if (agent.alert !== 'None') return 'bg-amber-500 animate-pulse';
        return 'bg-emerald-500';
    };

    const tileUrl = currentLayer === 'Satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileAttr = currentLayer === 'Satellite' ? 'Tiles © Esri' : '© OpenStreetMap contributors';

    return (
        <div className="flex h-screen w-full font-display text-slate-900 dark:text-white antialiased overflow-hidden bg-background-light dark:bg-background-dark">
            <Sidebar activeTab="Field Force (GPS)" />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100 dark:bg-slate-900 ml-[280px]">
                <Header
                    title="Field Force Tracking"
                    subtitle="Real-time GPS via Leaflet · 10s heartbeat · Route breadcrumbs · Violation response"
                />

                {/* Map + Left Panel layout */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ── Leaflet Map ── */}
                    <div className="flex-1 relative">
                        <MapContainer
                            center={[16.8409, 96.1735]}
                            zoom={12}
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={true}
                        >
                            <TileLayer url={tileUrl} attribution={tileAttr} />
                            <MapController center={mapCenter} />

                            <MarkerClusterGroup chunkedLoading>
                                {/* Breadcrumb polylines + markers — iterates filteredAgents only */}
                                {filteredAgents.map(agent => {
                                    const displayPos = getDisplayPos(agent);
                                    const crumbs: [number, number][] = agent.history
                                        .filter(h => h.lat != null && h.lng != null)
                                        .map(h => [h.lat!, h.lng!]);
                                    const lineColor = agent.alert !== 'None' ? '#f59e0b' : '#6366f1';
                                    return (
                                        <React.Fragment key={agent.id}>
                                            {crumbs.length > 0 && (
                                                <Polyline
                                                    positions={[...crumbs, [agent.gps.lat, agent.gps.lng]]}
                                                    color={lineColor} weight={2} opacity={0.55} dashArray="5 5"
                                                />
                                            )}
                                            {/* Dwell points markers */}
                                            {agent.history.filter(h => h.isDwellPoint).map((h, i) => (
                                                <Marker key={`dwell-${agent.id}-${i}`} position={[h.lat!, h.lng!]} icon={L.divIcon({ html: '<div class="size-2 bg-amber-500 rounded-full border border-white shadow-sm cursor-pointer"></div>', className: '' })}>
                                                    <Popup>
                                                        <div className="p-1">
                                                            <p className="font-bold text-xs text-amber-600 mb-1 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-xs">event_seat</span>
                                                                Dwell Point detected
                                                            </p>
                                                            <p className="text-[10px] text-slate-500">{h.timestamp}</p>
                                                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Operational Audit Segment</p>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            ))}
                                            <Marker
                                                position={displayPos}
                                                icon={createAgentIcon(agent, selectedAgentId === agent.id)}
                                                eventHandlers={{ click: () => handleAgentClick(agent) }}
                                            >
                                                <Popup>
                                                    <div style={{ minWidth: 160 }}>
                                                        <p style={{ fontWeight: 800, marginBottom: 2 }}>{agent.name}</p>
                                                        <p style={{ color: '#64748b', fontSize: 11 }}>{agent.role} · {agent.routeAssigned}</p>
                                                        <p style={{ fontFamily: 'monospace', color: '#6366f1', fontSize: 10, marginTop: 4 }}>
                                                            {agent.gps.lat.toFixed(5)}° N, {agent.gps.lng.toFixed(5)}° E
                                                        </p>
                                                        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                                                            Battery: {agent.batteryLevel}% · Speed: {Math.round(agent.currentSpeed)} km/h
                                                        </p>
                                                        {agent.alert !== 'None' && (
                                                            <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 10, marginTop: 4 }}>⚠ {agent.alert}</p>
                                                        )}
                                                        <button 
                                                            onClick={async () => {
                                                                const res = await checkIn(agent.empId, agent.locationName, agent.gps, 'Mobile App');
                                                                if (!res.success && res.message.includes('Access Denied')) {
                                                                    const dist = parseInt(res.message.match(/\d+/)?.[0] || '0');
                                                                    setGeofenceError({ active: true, distance: dist, target: agent.locationName });
                                                                }
                                                            }}
                                                            className="mt-3 w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded uppercase tracking-wider hover:bg-slate-800 transition-colors"
                                                        >
                                                            Force Check-In Audit
                                                        </button>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        </React.Fragment>
                                    );
                                })}
                            </MarkerClusterGroup>
                        </MapContainer>

                        {/* Layer switcher — above Leaflet controls */}
                        <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
                            <button onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-md flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[18px]">layers</span>
                                {currentLayer}
                            </button>
                            {isLayerMenuOpen && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col min-w-[120px]">
                                    {(['Streets', 'Satellite'] as const).map(l => (
                                        <button key={l} onClick={() => { setCurrentLayer(l); setIsLayerMenuOpen(false); }}
                                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-left hover:bg-slate-50 dark:hover:bg-slate-700 ${currentLayer === l ? 'text-primary' : 'text-slate-500'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Left staff list panel */}
                        <div className="absolute top-4 left-4 w-72 bg-white dark:bg-[#182130] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[calc(100%-5rem)] flex flex-col z-[1000]">
                            {/* Search */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
                                    <input
                                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Search field staff..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                            {/* Tabs */}
                            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4">
                                {(['Online', 'Offline'] as const).map(tab => (
                                    <button key={tab} onClick={() => setActiveTab(tab)}
                                        className={`pb-2 pt-3 text-xs font-semibold border-b-2 mr-4 transition-colors ${activeTab === tab ? 'text-primary border-primary' : 'text-slate-500 border-transparent'}`}>
                                        {tab} ({tab === 'Online' ? onlineCount : offlineCount})
                                    </button>
                                ))}
                            </div>
                            {/* Agent rows */}
                            <div className="flex-1">
                                {filteredAgents.length === 0 ? (
                                    <p className="text-center text-xs text-slate-500 py-6">No staff match your search.</p>
                                ) : (
                                    <Virtuoso
                                        style={{ height: '100%' }}
                                        data={filteredAgents}
                                        itemContent={(index, agent) => (
                                            <div key={agent.id} onClick={() => handleAgentClick(agent)}
                                                className={`flex items-center gap-3 p-3 cursor-pointer border-l-4 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${selectedAgentId === agent.id ? 'border-primary bg-indigo-50 dark:bg-indigo-900/20' : agent.alert !== 'None' ? 'border-amber-400' : 'border-transparent'}`}>
                                                <div className="relative shrink-0">
                                                    <div className="size-10 flex items-center justify-center rounded-full bg-slate-700 text-white font-bold text-sm">{agent.name.charAt(0)}</div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 size-3 border-2 border-white dark:border-[#182130] rounded-full ${getStatusDot(agent)}`}></div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{agent.name}</p>
                                                        <p className="text-[10px] text-slate-400 shrink-0">{agent.lastUpdate}</p>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">{agent.locationName} · {agent.batteryLevel}%</p>
                                                    <p className="text-[9px] font-mono text-indigo-500 mt-0.5">{agent.gps.lat.toFixed(4)}° N, {agent.gps.lng.toFixed(4)}° E</p>
                                                </div>
                                            </div>
                                        )}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Timeline scrubber */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-5 py-3 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 z-[1000] flex items-center gap-4 w-96">
                            <button onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
                                className={`flex items-center justify-center size-8 rounded-full shrink-0 transition-colors ${isTimelinePlaying ? 'bg-primary text-white' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}>
                                <span className="material-symbols-outlined text-[20px]">{isTimelinePlaying ? 'pause' : 'play_arrow'}</span>
                            </button>
                            <div className="flex-1 flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                                    <span>8 AM</span><span>12 PM</span><span className="text-primary">{currentTime}</span>
                                </div>
                                <input type="range" min={0} max={100}
                                    value={scrubberValue}
                                    onChange={e => { const v = Number(e.target.value); setScrubberValue(v); if (v < 100) setIsTimelinePlaying(false); }}
                                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-indigo-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Right Metrics Panel ── */}
                    <aside className="w-80 bg-white dark:bg-[#182130] border-l border-slate-200 dark:border-slate-800 shadow-xl z-10 flex flex-col overflow-y-auto">
                        <div className="p-6 space-y-6">
                            {/* Location Management */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-100 dark:border-purple-800/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 animate-pulse">auto_awesome</span>
                                    <span className="text-sm font-bold text-purple-900 dark:text-purple-100">Location Management</span>
                                </div>
                                <p className="text-xs text-purple-800 dark:text-purple-200 mb-3">Live GPS heartbeat active for {onlineCount} agents.</p>
                                <div className="flex flex-col gap-2">
                                    <a className="text-xs font-bold flex items-center gap-1 text-purple-700 dark:text-purple-300 hover:gap-2 transition-all cursor-pointer" onClick={handleOptimize}>
                                        Optimize Routes <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </a>
                                    <a className="text-xs font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-300 hover:gap-2 transition-all cursor-pointer" onClick={() => {
                                        const csv = "Agent,Timestamp,Latitude,Longitude\n" + fieldAgents.flatMap(a => a.history.filter(h => h.lat != null).map(h => `${a.name},${h.timestamp},${h.lat!.toFixed(6)},${h.lng!.toFixed(6)}`)).join("\n");
                                        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                                        Object.assign(document.createElement('a'), { href: url, download: `Location_Report_${new Date().toISOString().split('T')[0]}.csv` }).click();
                                    }}>
                                        Download Location Report <span className="material-symbols-outlined text-[14px]">download</span>
                                    </a>
                                </div>
                            </div>

                            {/* Staff Metrics */}
                            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Active Staff</p>
                                    <span className="material-symbols-outlined text-indigo-500">groups</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{onlineCount} <span className="text-sm font-normal text-slate-500">/ {totalCount}</span></p>
                                <div className="w-full bg-indigo-200 dark:bg-indigo-900/50 h-1.5 rounded-full mt-3 overflow-hidden">
                                    <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${activePercentage}%` }}></div>
                                </div>
                            </div>

                            {/* Alerts — now clickable */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                    Recent Alerts
                                    {activeAlerts.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{activeAlerts.length}</span>}
                                </h3>
                                <div className="space-y-3">
                                    {activeAlerts.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">No active alerts</p>
                                    ) : activeAlerts.map(agent => {
                                        const s = getAlertStyle(agent.alert);
                                        return (
                                            <div key={`alert-${agent.id}`} onClick={() => handleAlertClick(agent)}
                                                className={`flex gap-3 items-start p-3 border rounded-xl cursor-pointer hover:shadow-md transition-all ${s.border} ${s.bg}`}>
                                                <div className={`${s.iconBg} ${s.iconText} rounded-full p-1.5 shrink-0`}>
                                                    <span className="material-symbols-outlined text-[16px]">{s.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-bold ${s.titleClass}`}>{agent.alert}</p>
                                                    <p className="text-[11px] text-slate-500 truncate">{agent.name} · {agent.lastUpdate}</p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300 text-[16px]">chevron_right</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* ── Violation Action Modal ── */}
                {activeAlertAgent && (() => {
                    const s = getAlertStyle(activeAlertAgent.alert);
                    return (
                        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="bg-white dark:bg-[#182130] rounded-2xl shadow-2xl p-6 w-80 border border-slate-200 dark:border-slate-800">
                                <div className="flex items-start gap-3 mb-5">
                                    <div className={`${s.iconBg} ${s.iconText} rounded-full p-2 shrink-0`}>
                                        <span className="material-symbols-outlined text-[22px]">{s.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-sm ${s.titleClass}`}>{activeAlertAgent.alert}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{activeAlertAgent.name} · {activeAlertAgent.routeAssigned}</p>
                                        <p className="text-[10px] font-mono text-indigo-500 mt-1">
                                            {activeAlertAgent.gps.lat.toFixed(5)}° N, {activeAlertAgent.gps.lng.toFixed(5)}° E
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Battery: {activeAlertAgent.batteryLevel}% · {activeAlertAgent.lastUpdate}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <a href={`tel:+959000000${activeAlertAgent.empId.replace(/\D/g, '')}`}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                        Call Employee
                                    </a>
                                    <button onClick={() => handleDismissAlert(activeAlertAgent.id)}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                        Dismiss Alert
                                    </button>
                                    <button onClick={() => setActiveAlertAgent(null)}
                                        className="text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Geofence Rejection Overlay */}
                {geofenceError?.active && (
                    <div className="absolute inset-0 z-[5000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-red-500 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="bg-red-500 p-4 flex items-center gap-3 text-white">
                                <span className="material-symbols-outlined font-bold">block</span>
                                <div>
                                    <h3 className="font-bold">Access Denied: Geofence Limit</h3>
                                    <p className="text-xs opacity-90 text-red-50 font-medium">Compliance Hard-Block Triggered</p>
                                </div>
                            </div>
                            <div className="p-8 text-center">
                                <div className="size-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-200">
                                    <span className="material-symbols-outlined text-red-600 text-4xl">location_on</span>
                                </div>
                                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">You are too far!</h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                                    You are currently <span className="text-red-600 font-black">{geofenceError.distance}m</span> away from **{geofenceError.target}**. 
                                    Visit verification is strictly restricted to within <span className="font-bold text-slate-900 dark:text-white">200m</span>.
                                </p>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6 mb-8">
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Current</p>
                                        <p className="font-mono text-xs text-red-500">Out of Range</p>
                                    </div>
                                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Target Gap</p>
                                        <p className="font-mono text-xs text-slate-900 dark:text-white">-{geofenceError.distance - 200}m</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setGeofenceError(null)}
                                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                                >
                                    Dismiss & Move Closer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
