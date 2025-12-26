import React, { useState } from 'react';
import {
    Task, CallSheet, SocialPost, ProjectMilestone, LeaveRequest,
    TaskStatus, User
} from '../types';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter,
    CheckSquare, Clapperboard, Share2, Flag, User as UserIcon, X
} from 'lucide-react';

interface UnifiedCalendarProps {
    tasks: Task[];
    callSheets: CallSheet[];
    socialPosts: SocialPost[];
    milestones: ProjectMilestone[];
    leaveRequests: LeaveRequest[];
    users: User[];
    checkPermission: (permission: string) => boolean;
}

type EventSource = 'tasks' | 'production' | 'social' | 'milestones' | 'leave';

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    source: EventSource;
    color: string;
    status?: string;
    assignees?: string[]; // IDs
    metadata?: any;
}

const UnifiedCalendar: React.FC<UnifiedCalendarProps> = ({
    tasks = [],
    callSheets = [],
    socialPosts = [],
    milestones = [],
    leaveRequests = [],
    users = [],
    checkPermission
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filters, setFilters] = useState<Record<EventSource, boolean>>({
        tasks: true,
        production: true,
        social: true,
        milestones: true,
        leave: true
    });
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    // --- Data Aggregation ---
    const events: CalendarEvent[] = [];

    // 1. Tasks
    if (filters.tasks) {
        tasks.forEach(task => {
            if (task.dueDate) {
                events.push({
                    id: task.id,
                    title: task.title,
                    date: new Date(task.dueDate),
                    source: 'tasks',
                    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
                    status: task.status,
                    assignees: task.assigneeIds,
                    metadata: task
                });
            }
        });
    }

    // 2. Production (Call Sheets)
    if (filters.production) {
        callSheets.forEach(cs => {
            // CallSheet date is usually YYYY-MM-DD
            events.push({
                id: cs.id,
                title: `Shoot: ${cs.callTime}`, // Could lookup project name if available
                date: new Date(cs.date),
                source: 'production',
                color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                status: cs.status,
                metadata: cs
            });
        });
    }

    // 3. Social Posts
    if (filters.social) {
        socialPosts.forEach(post => {
            if (post.publishAt) {
                events.push({
                    id: post.id,
                    title: post.title || 'Untitled Post',
                    date: new Date(post.publishAt),
                    source: 'social',
                    color: 'bg-pink-100 text-pink-700 border-pink-200',
                    status: post.status,
                    metadata: post
                });
            }
        });
    }

    // 4. Milestones
    if (filters.milestones) {
        milestones.forEach(ms => {
            if (ms.dueDate) {
                events.push({
                    id: ms.id,
                    title: `Milestone: ${ms.name}`,
                    date: new Date(ms.dueDate),
                    source: 'milestones',
                    color: 'bg-amber-100 text-amber-700 border-amber-200',
                    status: ms.status,
                    metadata: ms
                });
            }
        });
    }

    // 5. Leave Requests
    if (filters.leave) {
        leaveRequests.forEach(req => {
            // Expand range to single day events for simple rendering, or just mark start date
            // For simplicity in this grid, let's mark the START date, or ideally separate days.
            // Let's iterate days (simple version: just start date for now to avoiding massive expansion)
            // OR better: handle multi-day in the cell renderer (complex).
            // Strategy: Just standard daily pills. If spans multiple days, add event for each day.

            if (req.status === 'approved') {
                const start = new Date(req.startDate);
                const end = new Date(req.endDate);

                // Safety cap: max 30 days recursion
                let current = new Date(start);
                let loopCount = 0;
                while (current <= end && loopCount < 30) {
                    const user = users.find(u => u.id === req.userId);
                    events.push({
                        id: `${req.id}_${current.toISOString()}`,
                        title: `${user?.name || 'Unknown'} (Leave)`,
                        date: new Date(current),
                        source: 'leave',
                        color: 'bg-rose-50 text-rose-600 border-rose-100 border-dashed',
                        status: req.type,
                        metadata: req
                    });
                    current.setDate(current.getDate() + 1);
                    loopCount++;
                }
            }
        });
    }

    // --- Calendar Logic ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const filteredEventsForDate = (day: number) => {
        return events.filter(e =>
            e.date.getDate() === day &&
            e.date.getMonth() === currentDate.getMonth() &&
            e.date.getFullYear() === currentDate.getFullYear()
        );
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-indigo-600" /> Agency Calendar
                    </h1>
                    <p className="text-slate-500 mt-1">Master schedule of tasks, shoots, posts, and team availability.</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Legend / Toggles */}
                    <div className="hidden md:flex items-center bg-white p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, tasks: !prev.tasks }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${filters.tasks ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <CheckSquare className="w-3 h-3" /> Tasks
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, production: !prev.production }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${filters.production ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Clapperboard className="w-3 h-3" /> Production
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, social: !prev.social }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${filters.social ? 'bg-pink-50 text-pink-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Share2 className="w-3 h-3" /> Social
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, milestones: !prev.milestones }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${filters.milestones ? 'bg-amber-50 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Flag className="w-3 h-3" /> Milestones
                        </button>
                        <button
                            onClick={() => setFilters(prev => ({ ...prev, leave: !prev.leave }))}
                            className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${filters.leave ? 'bg-rose-50 text-rose-700' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <UserIcon className="w-3 h-3" /> Team
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="px-4 font-bold text-slate-800 w-32 text-center">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {/* Mobile Filter Toggle (Simple version) */}
            <div className="md:hidden overflow-x-auto pb-2">
                <div className="flex space-x-2 min-w-max">
                    {/* Repeat buttons for mobile scroll */}
                    {/* (Omitted for brevity, assuming desktop first approach given user context) */}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-slate-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase bg-slate-50">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-5 lg:grid-rows-5 gap-px bg-slate-200 overflow-y-auto">
                    {/* Empty Previous Month Cells */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px]" />
                    ))}

                    {/* Days */}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1;
                        const dayEvents = filteredEventsForDate(day);
                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div key={day} className={`bg-white p-2 min-h-[100px] hover:bg-slate-50 transition-colors group relative ${isToday ? 'bg-indigo-50/10' : ''}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                                        {day}
                                    </span>
                                    {dayEvents.length > 0 && <span className="text-[10px] text-slate-400 font-medium md:hidden">{dayEvents.length}</span>}
                                </div>

                                <div className="space-y-1">
                                    {dayEvents.slice(0, 4).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => setSelectedEvent(event)}
                                            className={`
                                                text-[10px] px-1.5 py-0.5 rounded border truncate cursor-pointer font-medium
                                                ${event.color} transition-transform hover:scale-[1.02] active:scale-95
                                            `}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 4 && (
                                        <div className="text-[10px] text-slate-400 pl-1">
                                            +{dayEvents.length - 4} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Event Detail Modal (Simple Overlay) */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                {selectedEvent.source === 'tasks' && <CheckSquare className="w-4 h-4 text-indigo-500" />}
                                {selectedEvent.source === 'production' && <Clapperboard className="w-4 h-4 text-emerald-500" />}
                                {selectedEvent.source === 'social' && <Share2 className="w-4 h-4 text-pink-500" />}
                                {selectedEvent.source === 'milestones' && <Flag className="w-4 h-4 text-amber-500" />}
                                {selectedEvent.source === 'leave' && <UserIcon className="w-4 h-4 text-rose-500" />}
                                <span className="font-bold text-slate-900 capitalize">{selectedEvent.source} Event</span>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedEvent.title}</h3>
                            <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                {selectedEvent.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>

                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-sm space-y-2">
                                {selectedEvent.status && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Status</span>
                                        <span className="font-medium capitalize">{selectedEvent.status.replace('_', ' ')}</span>
                                    </div>
                                )}
                                {/* Specific metadata rendering could go here */}
                                {selectedEvent.source === 'production' && (
                                    <div className="pt-2 border-t border-slate-200 mt-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase">Call Time</p>
                                        <p>{selectedEvent.metadata.callTime}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UnifiedCalendar;
