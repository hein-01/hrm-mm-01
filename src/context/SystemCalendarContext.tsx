import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';

type SystemCalendarContextType = {
    serverOffsetMs: number;
    setServerOffsetMs: (offset: number) => void;
    
    // Returns current date adjusted via Server Offset, forced to Gregorian "YYYY-MM-DD"
    getCurrentDateISO: () => string;
    
    // Returns current Date object adjusted
    getAdjustedDateObj: () => Date;
    
    // Formats a date or string into 'en-GB' format, resolving legacy formats dynamically
    getFormattedDate: (dateInput?: string | Date | number, format?: 'short' | 'long' | 'iso' | 'time') => string;
    
    // Parses any legacy string format into a clean Gregorian UNIX Date Obj
    parseGregorianDate: (dateInput: string) => Date;

    // Normalizes any date string to "YYYY-MM-DD"
    normalizeToISO: (dateInput: string) => string;

    // Events Management
    events: Types.CalendarEvent[];
    addCalendarEvent: (event: Omit<Types.CalendarEvent, 'id'>) => void;
    setEvents: React.Dispatch<React.SetStateAction<Types.CalendarEvent[]>>;
};

import * as Types from '../types/hrms.types';


const SystemCalendarContext = createContext<SystemCalendarContextType | undefined>(undefined);

export const SystemCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Zero-Connectivity Buffer: Server drift offset
    const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
    const [events, setEvents] = useState<Types.CalendarEvent[]>([]);

    const addCalendarEvent = (event: Omit<Types.CalendarEvent, 'id'>) => {
        const newEvent = { ...event, id: `EVT-${Date.now()}` };
        setEvents(prev => [...prev, newEvent]);
    };


    const getAdjustedDateObj = () => {
        return new Date(Date.now() + serverOffsetMs);
    };

    const getCurrentDateISO = () => {
        const adjusted = getAdjustedDateObj();
        // Fallback robust ISO extraction avoiding locale shift bugs
        return new Date(adjusted.getTime() - (adjusted.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0];
    };

    const parseGregorianDate = (dateInput: string): Date => {
        if (!dateInput) return getAdjustedDateObj();

        // Regex for DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
            const [day, month, year] = dateInput.split('/');
            return new Date(`${year}-${month}-${day}T00:00:00`);
        }
        
        // Let standard parser attempt handling ISO/Standard types
        const attempt = new Date(dateInput);
        if (!isNaN(attempt.getTime())) {
            return attempt;
        }

        return getAdjustedDateObj();
    };

    const normalizeToISO = (dateInput: string) => {
        if (!dateInput) return getCurrentDateISO();
        const dateObj = parseGregorianDate(dateInput);
        return dateObj.toISOString().split('T')[0];
    };

    const getFormattedDate = (dateInput?: string | Date | number, format: 'short' | 'long' | 'iso' | 'time' = 'short') => {
        let dateObj: Date;
        
        if (dateInput === undefined) {
            dateObj = getAdjustedDateObj();
        } else if (typeof dateInput === 'string') {
            dateObj = parseGregorianDate(dateInput);
        } else if (typeof dateInput === 'number') {
            dateObj = new Date(dateInput);
        } else {
            dateObj = dateInput;
        }

        if (format === 'iso') {
            return dateObj.toISOString().split('T')[0];
        } else if (format === 'time') {
            return dateObj.toLocaleTimeString('en-GB');
        }

        // Enforce en-GB for 'Gregorian' specific requirements
        const formatOptions: Intl.DateTimeFormatOptions = format === 'long' 
            ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short', year: 'numeric' };

        return dateObj.toLocaleDateString('en-GB', formatOptions);
    };

    // Auto-sync simulation on Mount
    useEffect(() => {
        // "Zero Connectivity Sandbox": In production, call a secure /api/time endpoint
        // For now, simulate minimal offset resolution for local dev.
        setServerOffsetMs(0); 
    }, []);

    const value = useMemo(() => ({
        serverOffsetMs,
        setServerOffsetMs,
        getCurrentDateISO,
        getAdjustedDateObj,
        getFormattedDate,
        parseGregorianDate,
        normalizeToISO,
        events,
        addCalendarEvent,
        setEvents
    }), [serverOffsetMs, events]);

    return (
        <SystemCalendarContext.Provider value={value}>
            {children}
        </SystemCalendarContext.Provider>
    );
};

export const useSystemCalendar = () => {
    const context = useContext(SystemCalendarContext);
    if (!context) {
        throw new Error('useSystemCalendar must be used within a SystemCalendarProvider');
    }
    return context;
};
