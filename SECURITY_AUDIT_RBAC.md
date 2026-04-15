# Security Audit: Role-Based Access Control (RBAC)

## 1. Route Gating (URL Manipulation) - CRITICAL FAILURE

**Finding**: No ProtectedRoute wrapper exists in `App.jsx`.

**Evidence**: `src/App.jsx` lines 43-73 - All routes are directly accessible without authentication checks.

```javascript
<Routes>
  <Route path="/insights-dashboard" element={<InsightsDashboard />} />
  <Route path="/payroll-run" element={<PayrollRun />} />
  <Route path="/settings" element={<Setting />} />
  // ... all routes accessible to anyone
</Routes>
```

**Impact**: Any user can manually navigate to `/payroll-run`, `/settings`, `/ot-approvals` by typing the URL.

**Repro**: 
1. Login as Employee
2. Type `http://localhost:5173/payroll-run` in address bar
3. Page loads without redirect

**Fix**: Create `ProtectedRoute` component that checks `user.role` and redirects non-HR users.

---

## 2. Data Leaks in Shared Components - CRITICAL FAILURE

### Sidebar.tsx
**Finding**: No role-based conditional rendering.

**Evidence**: `src/components/Sidebar.tsx` line 151 - All NavLinks render unconditionally.

**Impact**: Employees see HR-only links (Payroll, Settings, OT Approvals) in navigation.

**Fix**: Wrap HR-only links with `{isAdmin(userId) && <NavLink ... />}`.

### EmployeesDirectory.tsx
**Finding**: Salary and Relief columns visible to all users.

**Evidence**: 
- Line 552: `activeRecord.baseSalary?.toLocaleString()` rendered without role check
- Line 953: Salary displayed in employee card

**Impact**: Any employee can view salary data of all other employees via DOM inspection.

**Fix**: Add `{isAdmin(currentUserId) && <td>{salary}</td>}` - physically remove from DOM, don't just hide with CSS.

---

## 3. Manager Scoping (The 'Line Manager' Gap) - MEDIUM RISK

**Finding**: No manager scoping implemented.

**Evidence**: 
- Employee type has no `supervisorId` field
- No filtering of employees array by `supervisor === currentUserId`
- All pages consume full `employees` array from context

**Impact**: Managers can see all employees, not just their direct reports.

**Fix**: Add `supervisorId` to Employee type and create filtered getters:
```typescript
const getDirectReports = (managerId: string) => 
  employees.filter(e => e.supervisorId === managerId);
```

---

## 4. Bridge Function Security - CRITICAL FAILURE

**Finding**: Multiple admin functions lack role checks.

### updateEmployee (Line 2153)
```typescript
const updateEmployee = (empId: string, updates: Partial<Types.Employee>) => {
  // NO isAdmin check!
  setEmployees(prev => prev.map(e => e.id === empId ? { ...e, ...updates } : e));
  return { success: true, message: 'Employee updated.' };
};
```

### adjustLeaveBalance (Line 2170)
```typescript
const adjustLeaveBalance = (empId, type, amount, reason, adminId) => {
  // NO isAdmin check!
  setEmployees(prev => ...);
  return { success: true, message: 'Leave balance adjusted.' };
};
```

### resolveOTConflict (Line 2183)
```typescript
const resolveOTConflict = (keepId, voidId, adminId) => {
  // NO isAdmin check!
  setOTRequests(prev => ...);
};
```

**Impact**: Any user can call these functions via browser console to modify data.

**Fix**: Add `isAdmin` checks to all three functions:
```typescript
if (!isAdmin(adminId)) {
  return { success: false, message: 'Unauthorized' };
}
```

---

## 5. Subscription Gating vs. Role Gating - LOW RISK (Correct)

**Finding**: No confusion detected.

**Evidence**: `subscriptionTier` and `user.role` are separate fields. Premium Employee still blocked from HR screens (once route gating is fixed).

---

## Summary Table

| Issue | Severity | File | Line |
|-------|----------|------|------|
| No ProtectedRoute | Critical | App.jsx | 43-73 |
| Sidebar shows HR links | Critical | Sidebar.tsx | 151 |
| Salary visible to all | Critical | EmployeesDirectory.tsx | 552, 953 |
| updateEmployee no auth | Critical | AppDataContext.tsx | 2153 |
| adjustLeaveBalance no auth | Critical | AppDataContext.tsx | 2170 |
| resolveOTConflict no auth | Critical | AppDataContext.tsx | 2183 |
| No manager scoping | Medium | AppDataContext.tsx | - |

## Recommended Priority

1. **Immediate**: Add role checks to bridge functions (4 functions)
2. **High**: Create ProtectedRoute wrapper in App.jsx
3. **High**: Add role checks to Sidebar navigation
4. **Medium**: Add role checks to EmployeesDirectory columns
5. **Medium**: Implement manager scoping for direct reports
