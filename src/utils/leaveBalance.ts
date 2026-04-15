import { Employee } from '../types/hrms.types';

/**
 * Validates and decrements leave balance for an employee.
 * Uses local state (Employee.leaveBalances) as the source of truth.
 * In production, this would be backed by Supabase.
 */
export const decrementLeaveBalance = (
  employees: Employee[],
  empId: string,
  type: string,
  days: number
): { success: boolean; message: string; newBalance?: number } => {
  const emp = employees.find(e => e.id === empId);
  if (!emp) {
    return { success: false, message: `Employee ${empId} not found.` };
  }

  const currentBalance = emp.leaveBalances?.[type] ?? 0;

  if (currentBalance <= 0) {
    return {
      success: false,
      message: `Insufficient Balance: ${emp.name} has 0 ${type} days remaining. Override required.`
    };
  }

  if (currentBalance < days) {
    return {
      success: false,
      message: `Insufficient Balance: ${emp.name} has only ${currentBalance} ${type} day(s) remaining. Requested: ${days}. Override required.`
    };
  }

  const newBalance = currentBalance - days;
  return { success: true, message: `Balance updated: ${type} ${currentBalance} → ${newBalance}`, newBalance };
};

/**
 * Counts working days between two ISO date strings (inclusive).
 * Excludes Saturdays, Sundays, and any dates listed in the holidays array.
 * Returns a minimum of 1 to prevent zero-day requests slipping through.
 */
export const countWorkingDays = (
  startDate: string,
  endDate: string,
  holidays: { date: string }[]
): number => {
  const holidaySet = new Set(holidays.map(h => h.date));
  let count = 0;
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    const day = current.getDay();
    const iso = current.toISOString().split('T')[0];
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
};

/**
 * Syncs an approved leave request with the system calendar.
 * Accepts the addCalendarEvent function from SystemCalendarContext.
 */
export const syncLeaveWithCalendar = (
  addCalendarEvent: (event: { title: string; start: string; end: string; type: string }) => void,
  empName: string,
  leaveRequest: { type: string; startDate: string; endDate: string }
): { success: boolean; message: string } => {
  try {
    addCalendarEvent({
      title: `Leave: ${empName} – ${leaveRequest.type}`,
      start: leaveRequest.startDate,
      end: leaveRequest.endDate,
      type: 'leave'
    });
    return { success: true, message: 'Calendar event created successfully.' };
  } catch (error) {
    console.error('Failed to sync leave with calendar:', error);
    return { success: false, message: 'Failed to create calendar event.' };
  }
};
