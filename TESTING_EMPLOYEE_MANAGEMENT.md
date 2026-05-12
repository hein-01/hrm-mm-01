# Employee Management Module — Testing Walkthrough

## Overview

This document provides a step-by-step testing guide for the Employee Management module, covering employee directory, profile management, and all HR actions.

---

## Prerequisites

1. **Supabase Setup**: Ensure `create-employees-leaves.sql` has been executed against your Supabase instance
2. **Test User**: Login as Admin (EMP-001) to access all features
3. **Sample Data**: At least 3-5 employees should exist in the system

---

## Test Cases

### 1. Employee Directory (`/employees`)

#### 1.1 List Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to **Employees** from sidebar | Employee directory loads with table of all employees |
| 2 | Verify KPI cards at top | Shows **Active Count**, **Terminated Count**, and main department count |
| 3 | Check table columns | Columns: ID, Name, Role, Department, Status, Location, Actions |
| 4 | Scroll through list | Virtual scrolling works smoothly (uses react-virtuoso) |

#### 1.2 Search & Filter
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type in search box | Results filter by name, ID, or role after 300ms debounce |
| 2 | Select department filter | List filters to show only employees in selected department |
| 3 | Combine search + filter | Both filters work together |
| 4 | Clear search | Full list restores |

#### 1.3 Row Actions
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **View** button | Navigates to Employee Profile page |
| 2 | Click **Actions** dropdown (⋮) | Shows menu: Edit, Promote, Transfer, Terminate, Add Adjustment |

---

### 2. Add New Employee

#### 2.1 Open Add Modal
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **+ Add Employee** button | Modal opens with form fields |

#### 2.2 Form Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with empty fields | Error: "Name, Department, and Role are all required." |
| 2 | Enter invalid NRC format (e.g., "12345") | Error: "Invalid NRC format. Expected: 12/TownshipName(N)123456" |
| 3 | Enter duplicate NRC (existing employee's NRC) | Error: "Duplicate NRC detected" |
| 4 | Leave bank details empty | Error: "Bank/Wallet Name and Account Number are mandatory" |

#### 2.3 Successful Creation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Fill all required fields: Name, Department, Role, NRC, Bank details | Form accepts valid data |
| 2 | Click **Add Employee** | Success notification appears |
| 3 | Check Supabase | New employee row appears in `employees` table |
| 4 | Check directory | New employee appears in list (real-time sync) |

---

### 3. Employee Profile (`/employee/:id`)

#### 3.1 Profile Header
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to employee profile | Header shows: Avatar, Name, Role, Department, Status badge |
| 2 | Check status badge color | Active = green, On Leave = amber, Terminated = red |

#### 3.2 Tab Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Overview** tab | Shows personal info, employment details, leave balance |
| 2 | Click **Attendance** tab | Shows attendance history calendar and logs |
| 3 | Click **Payroll** tab | Shows salary info, adjustments, loans |
| 4 | Click **Documents** tab | Shows uploaded documents list |
| 5 | Click **Activity** tab | Shows job activity history (promotions, transfers, etc.) |

#### 3.3 Actions Menu
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Actions** button | Dropdown shows: Edit Profile, Salary Update, Leave Adjustment, Terminate |

---

### 4. Edit Employee Profile

#### 4.1 Basic Info Edit
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Edit Profile** from Actions | Modal opens with editable fields |
| 2 | Modify Name, Role, Department, Location | Fields update |
| 3 | Click **Save** | Success notification, profile updates |
| 4 | Check Supabase | `employees` table row updated |

---

### 5. Salary Update

#### 5.1 Salary Change Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Salary Update** from Actions | Modal opens with current salary pre-filled |
| 2 | Enter new salary amount | Field accepts numeric value |
| 3 | Enter effective date | Date picker shows |
| 4 | Enter reason | Text area for justification |
| 5 | Click **Confirm** | Success notification |
| 6 | Check Activity tab | New "Salary Change" entry appears |
| 7 | Check Supabase | `job_activity_changes` table has new row |

---

### 6. Leave Balance Adjustment

#### 6.1 Adjustment Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Leave Adjustment** from Actions | Modal opens |
| 2 | Select adjustment type: Earned, Sick, Casual | Dropdown selection |
| 3 | Enter amount (positive or negative) | Field accepts value |
| 4 | Enter reason | Required text field |
| 5 | Click **Confirm** | Success notification |
| 6 | Check Overview tab | Leave balance updated |
| 7 | Check Supabase | `employees.leaveBalance` updated |

---

### 7. Promote Employee

#### 7.1 Promotion Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Promote** from Actions dropdown | Modal opens |
| 2 | Enter new title/role | Text field |
| 3 | Select new department | Dropdown |
| 4 | Enter new salary | Numeric field |
| 5 | Select new manager | Dropdown of employees |
| 6 | Select new shift | Dropdown of shifts |
| 7 | Enter effective date | Date picker |
| 8 | Click **Confirm Promotion** | Success notification |
| 9 | Check Activity tab | "Promotion" entry appears |
| 10 | Check Supabase | `employees` row + `job_activity_changes` updated |

---

### 8. Transfer Employee

#### 8.1 Transfer Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Transfer** from Actions dropdown | Modal opens |
| 2 | Select new department | Dropdown |
| 3 | Select new location | Dropdown |
| 4 | (Optional) Enter new GPS coordinates | Lat/Lng fields |
| 5 | (Optional) Select new manager | Dropdown |
| 6 | (Optional) Select new shift | Dropdown |
| 7 | (Optional) Enter salary adjustment | Numeric field |
| 8 | Enter effective date | Date picker |
| 9 | Enter reason | Required text field |
| 10 | Click **Confirm Transfer** | Success notification |
| 11 | Check Activity tab | "Transfer" entry appears |

---

### 9. Terminate Employee

#### 9.1 Termination Flow
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **Terminate** from Actions | Confirmation modal opens |
| 2 | Select separation type | Options: Resignation, Termination, Left/Absconded, Retirement |
| 3 | Click **Confirm** | Warning modal appears |
| 4 | Confirm termination | Success notification |
| 5 | Check employee status | Status changes to "Terminated" |
| 6 | Check directory | Employee no longer in active count |
| 7 | Check Supabase | `employees.status = 'Terminated'` |

#### 9.2 Validation Checks
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to terminate employee with active loan | Error prevents termination |
| 2 | Try to terminate with pending tasks | Warning shown |

---

### 10. Secure Vault

#### 10.1 Vault Access
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to employee profile | Vault section shows locked state |
| 2 | Click **Unlock Vault** | PIN input modal appears |
| 3 | Enter incorrect PIN | Error: "Invalid Authorization Code" |
| 4 | Enter correct admin PIN | Vault unlocks, shows sensitive data |
| 5 | Check Supabase | Security audit log entry created |

---

### 11. Attendance Editing (Employee Profile)

#### 11.1 Manual Punch Addition
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to **Attendance** tab | Calendar view shows |
| 2 | Click **Add Manual Punch** | Modal opens |
| 3 | Select date | Date picker |
| 4 | Enter check-in time | Time input |
| 5 | Enter check-out time | Time input |
| 6 | Enter reason | Required text field |
| 7 | Click **Save** | Success notification |
| 8 | Check Supabase | `attendance_logs` row inserted |

#### 11.2 Shift Reassignment
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a date in calendar | Shift assignment modal opens |
| 2 | Select different shift | Dropdown selection |
| 3 | Enter reason | Required text field |
| 4 | Click **Save** | Success notification |
| 5 | Check Supabase | `shift_assignments` row updated |

---

### 12. Real-Time Sync Testing

#### 12.1 Multi-Device Sync
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app in two browser tabs | Both show same employee list |
| 2 | In Tab A: Edit an employee's name | Change saves |
| 3 | Check Tab B (within 2 seconds) | Name updates automatically |
| 4 | In Tab A: Add new employee | New row appears |
| 5 | Check Tab B | New employee appears without refresh |

#### 12.2 Supabase Realtime Verification
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Supabase Dashboard → Database → employees | Table view shows |
| 2 | In app: Modify an employee | Change visible in Supabase immediately |
| 3 | In Supabase: Manually edit a row | App updates within 2 seconds |

---

### 13. Edge Cases & Error Handling

#### 13.1 Network Failure
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disconnect internet | App shows offline indicator |
| 2 | Try to add employee | Action queues locally |
| 3 | Reconnect internet | Queued action syncs to Supabase |

#### 13.2 Duplicate Data Prevention
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to add employee with existing NRC | Error: "Duplicate NRC detected" |
| 2 | Try to add employee with existing ID | Auto-generated ID prevents collision |

#### 13.3 Permission Checks
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as non-Admin user | Limited actions visible |
| 2 | Try to access termination feature | Action hidden or disabled |
| 3 | Try to edit own profile | Allowed for basic fields |

---

## Test Data Checklist

Use these test scenarios with sample data:

| Scenario | Test Data | Expected Outcome |
|----------|-----------|------------------|
| Add Employee | Name: "John Doe", Dept: "Engineering", NRC: "12/Yangon(N)123456" | Employee created with ID auto-generated |
| Promote | Employee: "Jane Smith", New Role: "Senior Engineer", Salary: 800000 | Promotion recorded, salary updated |
| Transfer | Employee: "Bob Wilson", New Dept: "Marketing", New Location: "Mandalay" | Transfer recorded, dept/location updated |
| Terminate | Employee: "Test User", Reason: "Resignation" | Status → Terminated, removed from active count |

---

## Supabase Verification Queries

Run these queries in Supabase SQL Editor to verify data integrity:

```sql
-- Check all employees
SELECT id, name, role, dept, status, "createdAt" FROM employees ORDER BY "createdAt" DESC;

-- Check job activity changes
SELECT id, "empId", type, detail, status, "createdAt" FROM job_activity_changes ORDER BY "createdAt" DESC LIMIT 10;

-- Check leave balance for specific employee
SELECT id, name, "leaveBalance" FROM employees WHERE id = 'EMP-001';

-- Check security audit logs for vault access
SELECT * FROM security_audit_logs WHERE "empId" = 'EMP-001' ORDER BY timestamp DESC;
```

---

## Common Issues & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| Employee not appearing in list | Realtime subscription failed | Refresh page, check Supabase connection |
| NRC validation failing | Wrong format | Use format: `12/TownshipName(N)123456` |
| Termination blocked | Active loans pending | Clear loans first or use force terminate |
| Vault unlock failing | Wrong PIN | Use admin PIN from system settings |

---

## Sign-off Checklist

- [ ] Employee directory loads and displays all employees
- [ ] Search and filter work correctly
- [ ] Add Employee form validates all fields
- [ ] Profile page shows all tabs correctly
- [ ] Edit Profile saves changes to Supabase
- [ ] Salary Update creates job activity entry
- [ ] Leave Balance Adjustment updates employee record
- [ ] Promotion updates role, dept, salary, and creates activity log
- [ ] Transfer updates location, dept, and creates activity log
- [ ] Termination changes status and removes from active count
- [ ] Secure Vault requires PIN and logs access
- [ ] Manual punch adds attendance log
- [ ] Real-time sync works across tabs/devices
- [ ] All changes persist to Supabase
