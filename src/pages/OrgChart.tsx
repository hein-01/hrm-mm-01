import React, {
    useState, useMemo, useRef, useEffect, useCallback, WheelEvent,
} from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAppData } from '../context/AppDataContext';
import { Employee } from '../types/hrms.types';

// ─────────────────────────────────────────────────────────────────────────────
// Department → colour mapping
// ─────────────────────────────────────────────────────────────────────────────
const DEPT_COLORS: Record<string, { bg: string; ring: string; text: string; dot: string }> = {
    'Product Dept':  { bg: 'bg-indigo-600',  ring: 'ring-indigo-400',  text: 'text-indigo-700',  dot: '#6366f1' },
    'Engineering':   { bg: 'bg-teal-600',    ring: 'ring-teal-400',    text: 'text-teal-700',    dot: '#0d9488' },
    'Design':        { bg: 'bg-violet-600',  ring: 'ring-violet-400',  text: 'text-violet-700',  dot: '#7c3aed' },
    'Sales':         { bg: 'bg-orange-500',  ring: 'ring-orange-400',  text: 'text-orange-700',  dot: '#f97316' },
    'HR & Admin':    { bg: 'bg-pink-600',    ring: 'ring-pink-400',    text: 'text-pink-700',    dot: '#db2777' },
    'Marketing':     { bg: 'bg-emerald-600', ring: 'ring-emerald-400', text: 'text-emerald-700', dot: '#059669' },
    'Logistics':     { bg: 'bg-amber-600',   ring: 'ring-amber-400',   text: 'text-amber-700',   dot: '#d97706' },
    'Finance':       { bg: 'bg-blue-600',    ring: 'ring-blue-400',    text: 'text-blue-700',    dot: '#2563eb' },
    'R&D':           { bg: 'bg-cyan-600',    ring: 'ring-cyan-400',    text: 'text-cyan-700',    dot: '#0891b2' },
    '_default':      { bg: 'bg-slate-600',   ring: 'ring-slate-400',   text: 'text-slate-700',   dot: '#64748b' },
};
function deptColor(dept: string) { return DEPT_COLORS[dept] ?? DEPT_COLORS._default; }

// ─────────────────────────────────────────────────────────────────────────────
// Tree data structure
// ─────────────────────────────────────────────────────────────────────────────
interface OrgNode {
    emp: Employee;
    children: OrgNode[];
    depth: number;
    x: number;
    y: number;
    subtreeWidth: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────────────────────
const NODE_W      = 180;
const NODE_H      = 76;
const H_GAP       = 32;   // horizontal gap between siblings
const V_GAP       = 80;   // vertical gap between levels

// ─────────────────────────────────────────────────────────────────────────────
// Build the tree from employees array
// ─────────────────────────────────────────────────────────────────────────────
function buildTree(employees: Employee[]): { roots: OrgNode[]; allNodes: OrgNode[]; svgW: number; svgH: number } {
    const active = employees.filter(e => e.status !== 'Terminated');
    const byId   = new Map(active.map(e => [e.id, e]));

    // Build node map
    const nodeMap = new Map<string, OrgNode>();
    active.forEach(e => nodeMap.set(e.id, { emp: e, children: [], depth: 0, x: 0, y: 0, subtreeWidth: 0 }));

    // Wire children
    const childIds = new Set<string>();
    active.forEach(e => {
        const mgr = e.reportingManagerId ?? e.supervisorId;
        if (mgr && nodeMap.has(mgr)) {
            nodeMap.get(mgr)!.children.push(nodeMap.get(e.id)!);
            childIds.add(e.id);
        }
    });

    // Find true roots (no manager, or manager not in active list)
    let roots = active.filter(e => !childIds.has(e.id)).map(e => nodeMap.get(e.id)!);

    // If too many disconnected roots (everyone is a root → no hierarchy set),
    // create a synthetic grouping by dept with senior-most role as dept head
    if (roots.length === active.length || roots.length > active.length * 0.6) {
        return buildDeptGroupedTree(active);
    }

    // Assign depths
    function setDepth(node: OrgNode, d: number) {
        node.depth = d;
        node.children.forEach(c => setDepth(c, d + 1));
    }
    roots.forEach(r => setDepth(r, 0));

    // Recursive subtree-width calculation then x,y layout
    function calcWidth(node: OrgNode): number {
        if (node.children.length === 0) {
            node.subtreeWidth = NODE_W + H_GAP;
        } else {
            node.subtreeWidth = node.children.reduce((s, c) => s + calcWidth(c), 0);
        }
        return node.subtreeWidth;
    }
    roots.forEach(calcWidth);

    let xCursor = H_GAP / 2;
    function assignPos(node: OrgNode, parentX?: number) {
        const myWidth = node.subtreeWidth;
        if (node.children.length === 0) {
            node.x = xCursor + NODE_W / 2;
            xCursor += myWidth;
        } else {
            node.children.forEach(c => assignPos(c, undefined));
            const firstChild = node.children[0];
            const lastChild  = node.children[node.children.length - 1];
            node.x = (firstChild.x + lastChild.x) / 2;
        }
        node.y = node.depth * (NODE_H + V_GAP) + V_GAP;
    }
    roots.forEach(r => assignPos(r));

    const allNodes: OrgNode[] = [];
    function collect(n: OrgNode) { allNodes.push(n); n.children.forEach(collect); }
    roots.forEach(collect);

    const maxX = Math.max(...allNodes.map(n => n.x + NODE_W / 2)) + H_GAP;
    const maxY = Math.max(...allNodes.map(n => n.y + NODE_H)) + V_GAP;

    return { roots, allNodes, svgW: maxX, svgH: maxY };
}

// When there's no reportingManagerId data, group by dept
function buildDeptGroupedTree(employees: Employee[]): { roots: OrgNode[]; allNodes: OrgNode[]; svgW: number; svgH: number } {
    const depts = [...new Set(employees.map(e => e.dept))].sort();

    // Create a synthetic CEO/MD node (highest salaried or first emp)
    const sorted = [...employees].sort((a, b) => b.baseSalary - a.baseSalary);
    const ceo = sorted[0];

    const ceoNode: OrgNode = {
        emp: ceo,
        children: [],
        depth: 0,
        x: 0,
        y: V_GAP,
        subtreeWidth: 0,
    };

    // Dept heads = highest salaried per dept (excluding CEO)
    const others = employees.filter(e => e.id !== ceo.id);
    const deptMap = new Map<string, Employee[]>();
    others.forEach(e => {
        if (!deptMap.has(e.dept)) deptMap.set(e.dept, []);
        deptMap.get(e.dept)!.push(e);
    });

    deptMap.forEach((emps, dept) => {
        emps.sort((a, b) => b.baseSalary - a.baseSalary);
        const head = emps[0];
        const headNode: OrgNode = { emp: head, children: [], depth: 1, x: 0, y: 0, subtreeWidth: 0 };

        // Rest of dept reports to head
        emps.slice(1).forEach(e => {
            headNode.children.push({ emp: e, children: [], depth: 2, x: 0, y: 0, subtreeWidth: 0 });
        });

        ceoNode.children.push(headNode);
    });

    // Layout
    function calcWidth(node: OrgNode): number {
        if (node.children.length === 0) {
            node.subtreeWidth = NODE_W + H_GAP;
        } else {
            node.subtreeWidth = node.children.reduce((s, c) => s + calcWidth(c), 0);
            node.subtreeWidth = Math.max(node.subtreeWidth, NODE_W + H_GAP);
        }
        return node.subtreeWidth;
    }
    calcWidth(ceoNode);

    let xCursor = H_GAP / 2;
    function assignPos(node: OrgNode) {
        if (node.children.length === 0) {
            node.x = xCursor + NODE_W / 2;
            xCursor += node.subtreeWidth;
        } else {
            node.children.forEach(c => assignPos(c));
            const firstChild = node.children[0];
            const lastChild  = node.children[node.children.length - 1];
            node.x = (firstChild.x + lastChild.x) / 2;
        }
        node.y = node.depth * (NODE_H + V_GAP) + V_GAP;
    }
    assignPos(ceoNode);

    const allNodes: OrgNode[] = [];
    function collect(n: OrgNode) { allNodes.push(n); n.children.forEach(collect); }
    collect(ceoNode);

    const maxX = Math.max(...allNodes.map(n => n.x + NODE_W / 2)) + H_GAP;
    const maxY = Math.max(...allNodes.map(n => n.y + NODE_H)) + V_GAP;

    return { roots: [ceoNode], allNodes, svgW: maxX, svgH: maxY };
}

// ─────────────────────────────────────────────────────────────────────────────
// Employee profile drawer
// ─────────────────────────────────────────────────────────────────────────────
function EmpDrawer({ emp, employees, onClose, onNodeClick }: {
    emp: Employee;
    employees: Employee[];
    onClose: () => void;
    onNodeClick: (id: string) => void;
}) {
    const c    = deptColor(emp.dept);
    const mgr  = employees.find(e => e.id === emp.reportingManagerId || e.id === emp.supervisorId);
    const directs = employees.filter(e => e.reportingManagerId === emp.id || e.supervisorId === emp.id);
    const initials = (emp.initials ?? emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase();

    const statusColors: Record<string, string> = {
        Active:    'bg-emerald-50 border-emerald-200 text-emerald-700',
        'On Leave':'bg-amber-50 border-amber-200 text-amber-700',
        Terminated:'bg-rose-50 border-rose-200 text-rose-700',
    };

    return (
        <>
            <div className="fixed inset-0 z-[200] bg-black/15 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-[400px] z-[201] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
                {/* Hero */}
                <div className={`${c.bg} px-6 pt-10 pb-6 relative shrink-0`}>
                    <button onClick={onClose}
                        className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all border-none cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                    <div className="flex items-end gap-4">
                        <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-black overflow-hidden border-2 border-white/30 shrink-0">
                            {emp.avatar
                                ? <img src={emp.avatar} alt={emp.name} className="size-full object-cover" />
                                : initials}
                        </div>
                        <div className="text-white">
                            <h2 className="text-lg font-black leading-tight">{emp.name}</h2>
                            <p className="text-sm text-white/80 mt-0.5">{emp.role}</p>
                            <span className={`mt-2 inline-block text-[9px] font-black px-2 py-0.5 rounded-full border ${statusColors[emp.status]} bg-white`}>
                                {emp.status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Stats */}
                    <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800">
                        {[
                            { label: 'Department', val: emp.dept },
                            { label: 'Joined', val: new Date(emp.joinDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' }) },
                            { label: 'Direct Reports', val: directs.length.toString() },
                        ].map(s => (
                            <div key={s.label} className="p-4 text-center">
                                <p className="text-sm font-black text-slate-900 dark:text-white">{s.val}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Details */}
                    <div className="px-5 py-4 space-y-2.5">
                        {[
                            { icon: 'badge', label: 'Employee ID', val: emp.id },
                            { icon: 'phone', label: 'Mobile', val: emp.mobile ?? '—' },
                            { icon: 'location_on', label: 'Township', val: emp.township },
                            { icon: 'fingerprint', label: 'NRC', val: emp.nrcNumber ?? '—' },
                            { icon: 'account_balance', label: 'Bank', val: emp.bankName ? `${emp.bankName} · ${emp.accountNumber ?? ''}` : '—' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
                                <span className="material-symbols-outlined text-[18px] text-slate-400 shrink-0">{row.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{row.label}</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{row.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reporting manager */}
                    {mgr && (
                        <div className="px-5 pb-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Reports to</p>
                            <button onClick={() => { onClose(); setTimeout(() => onNodeClick(mgr.id), 50); }}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer text-left">
                                <div className={`size-9 rounded-full flex items-center justify-center text-white text-[11px] font-black overflow-hidden ${deptColor(mgr.dept).bg}`}>
                                    {mgr.avatar ? <img src={mgr.avatar} alt={mgr.name} className="size-full object-cover" /> : mgr.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{mgr.name}</p>
                                    <p className="text-[10px] text-slate-400">{mgr.role}</p>
                                </div>
                                <span className="material-symbols-outlined text-[16px] text-slate-300">chevron_right</span>
                            </button>
                        </div>
                    )}

                    {/* Direct reports */}
                    {directs.length > 0 && (
                        <div className="px-5 pb-5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Direct Reports ({directs.length})</p>
                            <div className="space-y-1.5">
                                {directs.map(d => (
                                    <button key={d.id} onClick={() => { onClose(); setTimeout(() => onNodeClick(d.id), 50); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left">
                                        <div className={`size-7 rounded-full flex items-center justify-center text-white text-[9px] font-black overflow-hidden shrink-0 ${deptColor(d.dept).bg}`}>
                                            {d.avatar ? <img src={d.avatar} alt={d.name} className="size-full object-cover" /> : d.name.split(' ').map(w=>w[0]).join('').slice(0,2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{d.name}</p>
                                            <p className="text-[9px] text-slate-400">{d.role}</p>
                                        </div>
                                        <span className="material-symbols-outlined text-[14px] text-slate-300 shrink-0">chevron_right</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer CTA */}
                <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <a href={`/employees/${emp.id}`}
                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-black text-white ${c.bg} hover:opacity-90 transition-all`}>
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        View Full Profile
                    </a>
                </div>
            </div>
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Org Node SVG foreignObject card
// ─────────────────────────────────────────────────────────────────────────────
function OrgNodeCard({ node, isSelected, isHighlighted, isDimmed, onClick }: {
    node: OrgNode;
    isSelected: boolean;
    isHighlighted: boolean;
    isDimmed: boolean;
    onClick: () => void;
}) {
    const { emp } = node;
    const c = deptColor(emp.dept);
    const initials = (emp.initials ?? emp.name.split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase();

    return (
        <foreignObject
            x={node.x - NODE_W / 2}
            y={node.y}
            width={NODE_W}
            height={NODE_H}
            style={{ overflow: 'visible' }}
        >
            <div
                onClick={onClick}
                title={`${emp.name} · ${emp.role}`}
                style={{ opacity: isDimmed ? 0.28 : 1, transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.15s' }}
                className={`w-full h-full rounded-2xl border cursor-pointer select-none
                    flex items-center gap-2.5 px-2.5
                    hover:scale-105 hover:shadow-xl
                    ${isSelected
                        ? 'shadow-xl scale-105 bg-white dark:bg-slate-900 border-2 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900'
                        : isHighlighted
                            ? 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-md'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'}`}
            >
                {/* Avatar */}
                <div className={`size-9 rounded-xl flex items-center justify-center text-white text-[10px] font-black overflow-hidden shrink-0 ${c.bg}`}>
                    {emp.avatar
                        ? <img src={emp.avatar} alt={emp.name} className="size-full object-cover" />
                        : initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white truncate leading-tight">{emp.name}</p>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5 leading-tight">{emp.role}</p>
                    <div className="flex items-center gap-1 mt-1">
                        <div className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: deptColor(emp.dept).dot }} />
                        <span className="text-[8px] font-bold text-slate-400 truncate">{emp.dept}</span>
                    </div>
                </div>

                {/* Status dot */}
                <div className={`size-2 rounded-full shrink-0 ${emp.status === 'Active' ? 'bg-emerald-400' : emp.status === 'On Leave' ? 'bg-amber-400' : 'bg-slate-300'}`} />
            </div>
        </foreignObject>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect lines between parent and children
// ─────────────────────────────────────────────────────────────────────────────
function OrgEdges({ allNodes }: { allNodes: OrgNode[] }) {
    const lines: React.ReactNode[] = [];

    function drawEdges(node: OrgNode) {
        node.children.forEach(child => {
            const x1 = node.x;
            const y1 = node.y + NODE_H;
            const x2 = child.x;
            const y2 = child.y;
            const midY = (y1 + y2) / 2;

            lines.push(
                <path key={`${node.emp.id}-${child.emp.id}`}
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="none"
                />
            );
            drawEdges(child);
        });
    }

    allNodes.filter(n => n.depth === 0).forEach(drawEdges);
    return <>{lines}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function OrgChart() {
    const { employees } = useAppData();

    const [selectedId, setSelectedId]     = useState<string | null>(null);
    const [search, setSearch]             = useState('');
    const [deptFilter, setDeptFilter]     = useState('All');
    const [showTerminated, setShowTerminated] = useState(false);

    // Pan + zoom state
    const [zoom, setZoom]       = useState(0.85);
    const [pan, setPan]         = useState({ x: 0, y: 0 });
    const isPanning             = useRef(false);
    const panStart              = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const containerRef          = useRef<HTMLDivElement>(null);

    const filteredEmployees = useMemo(() => {
        let list = showTerminated ? employees : employees.filter(e => e.status !== 'Terminated');
        if (deptFilter !== 'All') list = list.filter(e => e.dept === deptFilter);
        return list;
    }, [employees, showTerminated, deptFilter]);

    const { roots, allNodes, svgW, svgH } = useMemo(
        () => buildTree(filteredEmployees),
        [filteredEmployees]
    );

    const depts = useMemo(() => ['All', ...new Set(employees.map(e => e.dept))].sort(), [employees]);

    // Search highlighting
    const matchIds = useMemo(() => {
        if (!search.trim()) return null;
        const q = search.toLowerCase();
        return new Set(allNodes.filter(n =>
            n.emp.name.toLowerCase().includes(q) ||
            n.emp.role.toLowerCase().includes(q) ||
            n.emp.dept.toLowerCase().includes(q)
        ).map(n => n.emp.id));
    }, [allNodes, search]);

    const selectedEmp = useMemo(() => {
        if (!selectedId) return null;
        return employees.find(e => e.id === selectedId) ?? null;
    }, [selectedId, employees]);

    // ── Zoom controls ────────────────────────────────────────────────────────
    const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        setZoom(z => Math.min(2, Math.max(0.2, z - e.deltaY * 0.001)));
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('foreignObject')) return;
        isPanning.current = true;
        panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning.current) return;
        setPan({
            x: panStart.current.panX + (e.clientX - panStart.current.x),
            y: panStart.current.panY + (e.clientY - panStart.current.y),
        });
    };
    const handleMouseUp = () => { isPanning.current = false; };

    // Centre chart on first load
    useEffect(() => {
        if (!containerRef.current || allNodes.length === 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPan({ x: rect.width / 2 - (svgW * zoom) / 2, y: 40 });
    }, [svgW, svgH]); // only on tree change

    const fitToScreen = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = (rect.width - 80) / svgW;
        const scaleY = (rect.height - 120) / svgH;
        const s = Math.min(scaleX, scaleY, 1);
        setZoom(s);
        setPan({ x: (rect.width - svgW * s) / 2, y: 40 });
    };

    const zoomIn  = () => setZoom(z => Math.min(2, z + 0.1));
    const zoomOut = () => setZoom(z => Math.max(0.2, z - 0.1));

    const handleNodeClick = useCallback((empId: string) => {
        setSelectedId(prev => prev === empId ? null : empId);
    }, []);

    // Click on canvas (not node) → deselect
    const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if ((e.target as HTMLElement).closest('foreignObject')) return;
        setSelectedId(null);
    };

    // ── Stats ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const active     = employees.filter(e => e.status === 'Active').length;
        const onLeave    = employees.filter(e => e.status === 'On Leave').length;
        const terminated = employees.filter(e => e.status === 'Terminated').length;
        const deptCount  = new Set(employees.map(e => e.dept)).size;
        return { total: employees.length, active, onLeave, terminated, deptCount };
    }, [employees]);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100">
            <Sidebar activeTab="Org Chart" />
            <main className="flex flex-col h-full overflow-hidden ml-[280px] flex-1">
                <Header title="Org Chart" subtitle="Interactive reporting structure · click any node to explore" />

                {/* ── Toolbar ─────────────────────────────────────────────── */}
                <div className="flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-wrap shrink-0">
                    {/* Stats strip */}
                    <div className="flex items-center gap-4 mr-2">
                        {[
                            { label: 'Total', val: stats.total,    dot: 'bg-slate-400' },
                            { label: 'Active', val: stats.active,  dot: 'bg-emerald-400' },
                            { label: 'On Leave', val: stats.onLeave, dot: 'bg-amber-400' },
                            { label: 'Depts', val: stats.deptCount, dot: 'bg-indigo-400' },
                        ].map(s => (
                            <div key={s.label} className="flex items-center gap-1.5">
                                <div className={`size-2 rounded-full ${s.dot}`} />
                                <span className="text-[10px] font-black text-slate-500">{s.val} {s.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Search by name, role, dept..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 cursor-pointer border-none bg-transparent">
                                <span className="material-symbols-outlined text-[15px]">close</span>
                            </button>
                        )}
                    </div>

                    {/* Dept filter */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-[420px]">
                        {depts.slice(0, 8).map(d => (
                            <button key={d} onClick={() => setDeptFilter(d)}
                                className={`px-3 py-1.5 text-[9px] font-black rounded-lg whitespace-nowrap transition-all cursor-pointer
                                    ${deptFilter === d
                                        ? `${d !== 'All' ? deptColor(d).bg : 'bg-indigo-600'} text-white shadow-sm`
                                        : 'text-slate-500 dark:text-slate-400 bg-transparent hover:bg-white dark:hover:bg-slate-700'}`}>
                                {d}
                            </button>
                        ))}
                    </div>

                    {/* Terminated toggle */}
                    <button onClick={() => setShowTerminated(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer border
                            ${showTerminated ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}>
                        <span className="material-symbols-outlined text-[14px]">person_off</span>
                        Terminated
                    </button>

                    <div className="flex-1" />

                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                        <button onClick={zoomOut}
                            className="size-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none bg-transparent cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={zoomIn}
                            className="size-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none bg-transparent cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">add</span>
                        </button>
                    </div>
                    <button onClick={fitToScreen}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all cursor-pointer border-none">
                        <span className="material-symbols-outlined text-[14px]">fit_screen</span>
                        Fit
                    </button>
                </div>

                {/* ── Canvas ──────────────────────────────────────────────── */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden relative"
                    style={{ cursor: isPanning.current ? 'grabbing' : 'grab', background: 'radial-gradient(circle at 50% 50%, #f1f5f9 0%, #e2e8f0 100%)' }}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Dot grid background */}
                    <svg
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                                <circle cx="1" cy="1" r="1" fill="#cbd5e1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#dot-grid)" />
                    </svg>

                    {allNodes.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="material-symbols-outlined text-5xl text-slate-300">account_tree</span>
                            <p className="text-slate-400 font-bold mt-3">No employees to display</p>
                            <p className="text-slate-300 text-sm mt-1">Clear the search or department filter</p>
                        </div>
                    ) : (
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            style={{
                                position: 'absolute',
                                left: pan.x,
                                top: pan.y,
                                width: svgW,
                                height: svgH,
                                transform: `scale(${zoom})`,
                                transformOrigin: '0 0',
                                transition: 'width 0.1s, height 0.1s',
                                overflow: 'visible',
                            }}
                            onClick={handleCanvasClick}
                        >
                            {/* Connector lines (drawn first, behind nodes) */}
                            <OrgEdges allNodes={allNodes} />

                            {/* Nodes */}
                            {allNodes.map(node => {
                                const isSelected    = selectedId === node.emp.id;
                                const isHighlighted = matchIds ? matchIds.has(node.emp.id) : false;
                                const isDimmed      = (matchIds !== null && matchIds.size > 0 && !matchIds.has(node.emp.id))
                                    || (selectedId !== null && !isSelected);
                                return (
                                    <OrgNodeCard
                                        key={node.emp.id}
                                        node={node}
                                        isSelected={isSelected}
                                        isHighlighted={isHighlighted}
                                        isDimmed={isDimmed}
                                        onClick={() => handleNodeClick(node.emp.id)}
                                    />
                                );
                            })}
                        </svg>
                    )}

                    {/* Zoom quick-hint */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none">
                        <span className="material-symbols-outlined text-[13px] text-slate-400">scroll</span>
                        <span className="text-[9px] font-bold text-slate-400">Scroll to zoom · Drag to pan · Click node to inspect</span>
                    </div>

                    {/* Dept legend */}
                    <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 pointer-events-none">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Departments</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {[...new Set(filteredEmployees.map(e => e.dept))].sort().map(d => (
                                <div key={d} className="flex items-center gap-1.5">
                                    <div className="size-2 rounded-full shrink-0" style={{ backgroundColor: deptColor(d).dot }} />
                                    <span className="text-[8px] font-bold text-slate-500 truncate max-w-[80px]">{d}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Employee profile drawer */}
            {selectedEmp && (
                <EmpDrawer
                    emp={selectedEmp}
                    employees={employees}
                    onClose={() => setSelectedId(null)}
                    onNodeClick={handleNodeClick}
                />
            )}
        </div>
    );
}
