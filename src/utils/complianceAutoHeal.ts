/**
 * Compliance Auto-Healing Utility
 *
 * Automatically resolves an employee's Critical Risk Flag when they complete
 * a mandatory course whose category matches the risk category.
 *
 * Category Sensitivity:
 *   - A "Safety" mandatory course clears a "Safety" risk flag.
 *   - A "General" mandatory course does NOT clear a "Safety" risk flag
 *     if other safety modules are still pending.
 */

import { Employee, Course } from '../types/hrms.types';

export interface AutoHealResult {
  healed: boolean;
  updatedEmployee: Employee;
  category?: string;
  message: string;
}

/**
 * Determines whether completing a course should auto-heal an employee's risk flag.
 *
 * @param employee       - The employee who completed the course.
 * @param completedCourse - The course that was just completed.
 * @param allCourses     - Full course catalog (to look up mandatory status & category).
 * @param employeeEnrolledCourses - The employee's enrolled courses *after* marking this one complete.
 * @returns AutoHealResult indicating whether the flag was cleared.
 */
export const autoHealCompliance = (
  employee: Employee,
  completedCourse: Course,
  allCourses: Course[],
  employeeEnrolledCourses: Employee['enrolledCourses']
): AutoHealResult => {
  // Guard: nothing to heal if no flag is set
  if (!employee.hasCriticalRiskFlag) {
    return { healed: false, updatedEmployee: employee, message: 'No risk flag present.' };
  }

  // Guard: only mandatory courses can trigger auto-heal
  if (!completedCourse.isMandatory) {
    return { healed: false, updatedEmployee: employee, message: 'Course is not mandatory — no auto-heal triggered.' };
  }

  // Category Sensitivity: the completed course's category must match the employee's risk category
  const riskCategory = employee.criticalRiskCategory || '';
  const courseCategory = completedCourse.category || '';

  if (riskCategory && courseCategory.toLowerCase() !== riskCategory.toLowerCase()) {
    return {
      healed: false,
      updatedEmployee: employee,
      message: `Category mismatch: course is "${courseCategory}" but risk is "${riskCategory}". No auto-heal.`
    };
  }

  // Check if ALL mandatory courses in the matching category are now completed
  const pendingMandatoryInCategory = employeeEnrolledCourses.filter(ec => {
    if (ec.status === 'Completed') return false;
    const courseDef = allCourses.find(c => c.id === ec.courseId);
    if (!courseDef || !courseDef.isMandatory) return false;
    // If risk has a specific category, only count courses in that category
    if (riskCategory) {
      return (courseDef.category || '').toLowerCase() === riskCategory.toLowerCase();
    }
    // If no specific risk category, all mandatory courses must be done
    return true;
  });

  if (pendingMandatoryInCategory.length > 0) {
    return {
      healed: false,
      updatedEmployee: employee,
      message: `${pendingMandatoryInCategory.length} mandatory "${riskCategory || 'General'}" course(s) still pending.`
    };
  }

  // All mandatory courses in the category are complete — heal the flag
  const healedEmployee: Employee = {
    ...employee,
    hasCriticalRiskFlag: false,
    criticalRiskCategory: undefined
  };

  return {
    healed: true,
    updatedEmployee: healedEmployee,
    category: courseCategory,
    message: `Critical Risk "${courseCategory}" cleared for ${employee.name} via course completion: ${completedCourse.name}.`
  };
};
