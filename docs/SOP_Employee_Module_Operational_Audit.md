# TechDance HR — Employee Module Operational Audit
## Standard Operating Procedure (SOP) & User Manual
**Version:** 2.0 — Post-Hardening | **Date:** April 2026 | **Audience:** HR Administrators, Auditors

---

## Part 1: The 'Golden Record' Onboarding SOP

### 1.1 — Step-by-Step: Registering a New Employee

| Step | UI Location | Action |
|------|-----------|--------|
| 1 | Sidebar → **Employees** | Navigate to the Employees Directory page. |
| 2 | Top-right → **Add Employee** | Opens the **Register Personnel** modal. |
| 3 | **Basic Info** section | Enter **Legal Name** (mandatory). |
| 4 | **Organizational Placement** | Select **Department** (master dropdown). Select **Job Role** (auto-filtered by dept). Optionally select **Office Location** (geofence-linked). |
| 5 | **Identity Verification** | Enter **NRC Number** (mandatory — see §1.2). |
| 6 | **Financial Onboarding** | Select **Bank Name** from payment providers. Enter **Account Number** + **Branch Code** (all mandatory). |
| 7 | Footer → **Commit Record** | Validation gates run → record created. |

**Post-Commit Automations:**
- Collision-safe **Employee ID** (`EMP-XXXX`) generated via `while` loop — no duplicate ID possible at any scale.
- If **Office Location** is selected, a **Field Agent** entry is auto-created in the GPS module (`status: 'Offline'`, coords from office), making the employee **immediately visible on the Field Force map**.
- Default leave balances provisioned: Casual 6, Medical 15, Earned 10.
- Shift defaulted to `SH-GEN-96` (General). SSB set to `Pending Verification`.
- All form fields reset on modal close.

**Code Ref:** `handleAddEmployeeSubmit()` → `EmployeesDirectory.tsx:122-215`

---

### 1.2 — NRC Number Validation

**Regex:** `^([0-9]{1,2})\/[a-zA-Z]+\([NEP]\)[0-9]{6}$`

**Enforces:** 1-2 digit state code → `/` → Township name → `(N/E/P)` citizenship class → 6-digit serial.

**Example:** `12/BaHan(N)123456`, `7/MaYaTa(E)654321`

**Live UX Feedback:**
- **Invalid format while typing:** Red border + hint: *"Format: [1-2 digits]/[Township]([N/E/P])[6 digits]"*
- **Valid format:** Green checkmark: *"✓ Valid NRC format"*
- **Empty on submit:** *"NRC Number is mandatory for all new hires."*
- **Bad format on submit:** *"Invalid NRC format. Expected: 12/TownshipName(N)123456"*

**Code Ref:** `NRC_REGEX` at line 70, inline UI at lines 979-985, submit guard at lines 128-136.

---

### 1.3 — Deduplication Guards

| Check | Logic | Error Message |
|-------|-------|---------------|
| **Employee ID** | `while` loop increments until unique `EMP-XXXX` found | *(Silent — auto-resolved. No duplicate possible.)* |
| **NRC Number** | `employees.some(e => e.nrcNumber === newEmpNrc.trim())` | *"Duplicate NRC detected: 12/BaHan(N)123456 already exists in the system."* |

The NRC message is **clear and non-technical** — it names the exact conflicting NRC so Marcus can search the directory to find the existing record.

**Code Ref:** ID generation at lines 150-156, NRC guard at lines 138-142.

---

### 1.4 — The 'Validation' Column (Missing Info ⚠️ Indicator)

The directory table's **Validation** column performs a real-time check on every row:

| Field Checked | Condition for "Missing" |
|--------------|------------------------|
| **Bank Account** | `bankName` empty OR `accountNumber` empty |
| **NRC** | `nrcNumber` empty, `"TBD"`, or `"Pending Verification"` |
| **Phone** | `mobile` is null or empty |

**Visual Behavior:**
- **Missing fields:** Red badge `⚠️ [count]`. Hover tooltip: *"Missing payroll-critical data: Bank Account, NRC, Phone"*
- **All complete:** Green badge `✓ OK`

**Scenario — Hired Without Bank Account:**
The Validation column shows `⚠️ 1` with tooltip *"Missing payroll-critical data: Bank Account"*. The record is **immediately discoverable** for follow-up — no separate report needed.

**Code Ref:** `EmployeesDirectory.tsx:557-581`

---

## Part 2: The 'Transfer & Promotion' Approval Path

### 2.1 — Initiating a Transfer

| Step | Action |
|------|--------|
| 1 | Directory → **⋮ (More)** menu on target row → **Transfer** |
| 2 | **Transfer Request** modal opens, pre-filled with current dept/shift/salary. |
| 3 | Fill in: New Department, Location, GPS Coords (optional lat/lng), Manager (live ID validation), Shift, Salary, Effective Date (mandatory), Reason. |
| 4 | **Submit for Approval** → creates `JobActivityChange` with `status: 'Pending'`, `priority: 'High'`. |

The request appears in the **Centralized Inbox** for admin review.

**Code Ref:** `handleTransferSubmit()` at lines 329-351.

### 2.2 — Promotion Workflow

Same Inbox pattern. Modal sections:
- **Current Status** (read-only): Role, Department, Salary, Shift
- **New Details**: Position (filtered by dept), Department, Salary, Effective Date, Manager, Shift
- **Announcement & JD** (optional): If Announcement Title is set, a Pending Announcement auto-creates on approval.

Submit disabled until **Position** + **Effective Date** are set.

**Code Ref:** `handlePromoteSubmit()` at lines 257-283.

### 2.3 — Approval Gate & GPS Auto-Sync

When Admin approves a Transfer in the Centralized Inbox:

**Execution chain (`handleInboxAction → Transfer`):**
1. Employee record atomically updated: `dept`, `shiftId`, `reportingManagerId`, `officeLocation`, `officeCoords`, `baseSalary`
2. `Transfer` entry appended to `employmentHistory`; `SalaryHistoryEntry` appended if salary changed
3. Auto-generated `Transfer_Record_*.pdf` added to employee's document vault
4. Audit log: *"Transfer for [Name] → [Dept] at [Location]. Geofence synced."*

**GPS Live Sync (`useEffect` on `employees`):**
Whenever `officeLocation` or `officeCoords` change on any employee, the `fieldAgents` array auto-updates:
- Agent's `locationName` → new location
- Agent's `gps` → new coordinates
- Old position pushed to `history` with timestamp
- `lastUpdate` → `'Just now'`

**Result:** The GPS marker moves on the Field Force map **automatically** — zero manual intervention.

**Code Ref:** Transfer approval at `AppDataContext.tsx:2040-2114`, GPS sync at lines 866-884.

---

## Part 3: The 'Secure Offboarding' Protocol (processSeparation Engine)

### 3.1 — Separation Reasons & Re-hire Flag

The offboarding modal now requires a **Separation Reason** dropdown:

| Reason | Re-hire Eligible | Asset/Financial Gates | Special Behavior |
|--------|:---:|:---:|----------------|
| **Resignation** | ✅ Yes | Enforced | Standard offboarding |
| **Termination** | ❌ No | Enforced | Standard offboarding |
| **Left/Absconded** | ❌ No | **Bypassed** | High-Priority asset recovery alert dispatched |
| **Retirement** | ✅ Yes | Enforced | Standard offboarding |

The re-hire preview updates **live** in the modal as the user changes the dropdown. If `Left/Absconded` is selected, an amber warning banner appears explaining that gates will be bypassed and an alert will fire.

**Code Ref:** Separation modal in `EmployeesDirectory.tsx:1061-1105` and `Employee.tsx:1220-1272`.

### 3.2 — Multi-Gate Separation Pipeline

`terminateEmployee(empId, actorId, reason?)` runs an **8-step pipeline:**

**Gate 1 — Admin Authorization:**
Non-admin attempts blocked: *"Security Violation: Only Administrators can deactivate users."* Failed attempt logged.

**Gate 2 — Physical Asset Recovery (bypassed for Absconded):**
Checks `assets.filter(assigneeId === empId && status === 'In Use')`.
If assets remain and reason ≠ `Left/Absconded`: *"OFFBOARDING BLOCKED: Physical assets still in use: [list]. Recover all equipment."*

**Gate 3 — Financial Settlement (bypassed for Absconded):**
Checks `getAdjustments().filter(empId && status === 'Pending')`.
If pending and reason ≠ `Left/Absconded`: *"OFFBOARDING BLOCKED: N pending financial adjustments require finalization."*

**Step 4 — Compute Metadata:**
- `eligibleForRehire` = `true` if Resignation or Retirement, `false` otherwise
- `separationDate` = current ISO date (used by payroll filter)

**Step 5 — Atomic Status Update:**
Employee record updated: `status → 'Terminated'`, `colorClass → grey`, `separationReason`, `separationDate`, `eligibleForRehire`

**Step 6 — Admin Revocation:**
Employee ID removed from `systemSettings.adminIds`. `lastAuditDate` updated.

**Step 7 — Audit & Dashboard Alert:**
- Audit log: *"Separated [Name] — Reason: [X]. Re-hire eligible: Yes/No. Admin privileges revoked."*
- Dashboard alert: *"SECURE OFFBOARDING: [Name] — [Reason]. Re-hire: Eligible/Not Eligible. Employee excluded from next payroll run; final payout retained in current cycle history."*

**Step 8 — Absconded Asset Recovery Alert:**
If reason = `Left/Absconded` AND employee has assigned assets:
- **High-Priority `error` alert** dispatched: *"HIGH PRIORITY — ASSET RECOVERY REQUIRED: [Name] has been marked as Left/Absconded with N company asset(s) still in possession: [list]. Immediate recovery action needed."*
- Additional audit log entry under module `Assets`.

**Code Ref:** `terminateEmployee()` at `AppDataContext.tsx:1418-1514`.

### 3.3 — Automatic Payroll Stop & Final Payout

The `calculatePayroll()` function in `PayrollProvider.tsx` now filters employees **before** calculation:

```
eligibleEmployees = employees.filter(emp => {
    if (emp.status !== 'Terminated') return true;
    if (emp.separationDate?.startsWith(targetMonthKey)) return true; // final payout
    return false;
});
```

**Behavior:**
- **Current month separation:** Employee remains in the payroll run for their **final payout** (pro-rated settlement).
- **Future cycles:** Employee is automatically excluded — `separationDate` won't match the new month key.
- **Payroll History:** Previous payroll records are immutable — terminated employees remain visible in all historical reports.
- **Zero manual intervention** required from the Payroll team.

**Code Ref:** `PayrollProvider.tsx:415-425`.

---

## Part 4: Document & Debt Visibility

### 4.1 — Document Preview (The Employee Vault)

| Step | Action |
|------|--------|
| 1 | Employee profile → **Documents** tab. |
| 2 | Each document shows as a card: icon (color-coded by category), name, date, uploader, privacy badge. |
| 3 | Click **Preview** button on the card footer. |
| 4 | A **Document Preview modal** opens with an embedded `<iframe>`. |

**Behavior:**
- For **uploaded files** (real blob URLs from `URL.createObjectURL`): The iframe renders the document inline — **no download required**.
- For **system-generated records** (URL is `#`): A graceful fallback shows: *"System-generated document — Preview not available for auto-generated records."*
- Privacy-locked documents (`Admin Only`) display a red lock icon on the card.
- Modal has a close button that clears `docPreviewUrl` state.

**Code Ref:** Preview button at `Employee.tsx:496`, modal at lines 1747-1775.

### 4.2 — Loans Sub-Tab (Financial Snapshot)

| Step | Action |
|------|--------|
| 1 | Employee profile → **Loans** tab (between Assets and History). |
| 2 | A table displays all loans filtered by `empId`. |

**Table Columns:**
| Column | Source Field | Notes |
|--------|------------|-------|
| Loan ID | `loan.id` | Mono-spaced font |
| Type | `loan.type` | e.g., Standard, Emergency |
| Principal | `loan.principal \|\| loan.amount` | Right-aligned, formatted with commas |
| Outstanding | `loan.outstanding \|\| loan.remainingBalance` | **Red** if > 0, **green** if 0 (fully repaid) |
| Status | `loan.status` | Color-coded badge: Blue (Active/Disbursed), Green (Completed/Repaid), Amber (Paused) |
| Start Date | `loan.startDate \|\| loan.requestDate` | Fallback to dash |

**Live Balance:** Yes — the `loans` array comes from `PayrollProvider` via `useAppData()`, which holds the **live reactive state**. Any repayment (`recordCashRepayment`) or status change (`pauseLoan`, `resumeLoan`) immediately reflects in this table.

**Empty State:** If no loans exist: savings icon + *"No active loans or advances for this employee."*

**Code Ref:** Loans tab at `Employee.tsx:1116-1182`.

---

## Part 5: Bulk Actions & Reporting

### 5.1 — Directory Search at 500-Employee Scale

**Architecture for Performance:**
- The data table uses **`react-virtuoso` (`TableVirtuoso`)** — only visible rows are rendered in the DOM. Height is dynamically calculated: `Math.min(filteredEmployees.length * 80 + 56, 700)`.
- Search uses **`useDebounce(searchQuery, 300)`** — prevents CPU spikes on every keystroke by batching filter recalculations to 300ms intervals.
- The `filteredEmployees` array is computed via **`useMemo`** keyed on `[employees, deptFilter, debouncedSearch]`.

**Search targets:** Employee `name`, `id`, and `role` (case-insensitive).

### 5.2 — Real-Time Count Updates

The **KPI cards** at the top compute from the **raw `employees` array** (not filtered):
- **Total Headcount:** `employees.length`
- **Active Duty:** count where status is `Active` or `On Leave`
- **Terminated (YTD):** count where status is `Terminated`
- **Primary Dept:** count for the first department in settings

The **table** renders `filteredEmployees` which updates reactively when either the search query or department filter changes. A brief skeleton loader (50ms) provides visual feedback during filter transitions.

**Verification:** Yes — typing in the search box and changing the department dropdown simultaneously updates the filtered row count in real-time. The debounce ensures smooth UX even with 500+ rows.

### 5.3 — CSV Export for External Reporting

| Step | Action |
|------|--------|
| 1 | Click **Export CSV** button (top-right, next to Upload Document). |
| 2 | A CSV file downloads immediately: `employees_export_YYYY-MM-DD.csv` |

**CSV Columns:** ID, Name, Role, Department, Status, Join Date, NRC, Bank, Account, Branch Code, Phone

**Technical Details:**
- Exports the **currently filtered** employee list (respects active search + department filter).
- Values are double-quote escaped with internal quotes doubled (`""`) for RFC 4180 compliance.
- File is generated client-side via `Blob` + hidden anchor click — no server roundtrip.
- The object URL is revoked immediately after download to prevent memory leaks.

**Code Ref:** `handleExportCSV()` at `EmployeesDirectory.tsx:354-369`.

---

## Appendix: Print Profile

The **Download PDF Profile** button in the employee profile's Actions menu has been replaced with **Print Profile**, which calls `window.print()`. This opens the browser's native print dialog, allowing Marcus to:
- Print to a physical printer
- Save as PDF via the browser's "Save as PDF" print destination
- No third-party PDF library dependency required

**Code Ref:** `Employee.tsx:171`

---

## Audit Conclusion

| Area | Status | Evidence |
|------|--------|----------|
| NRC Validation | ✅ Enforced | Regex gate + inline UX feedback |
| Duplicate Guard | ✅ Enforced | NRC uniqueness check + collision-safe ID |
| Bank Details | ✅ Mandatory | 3-field gate on submit |
| Missing Info Flag | ✅ Live | Validation column with tooltip |
| Transfer → GPS Sync | ✅ Automatic | `useEffect` on employees → fieldAgents |
| Separation Reasons | ✅ 4 types | Resignation, Termination, Absconded, Retirement |
| Re-hire Flag | ✅ Automatic | Computed from reason, stored on employee record |
| Absconded Alert | ✅ High Priority | Error-type alert with asset list for Asset Manager |
| Termination Gates | ✅ 8-step | Admin → Assets → Financials → Metadata → Status → Revoke → Audit → Absconded |
| Payroll Auto-Stop | ✅ Automatic | `separationDate` filter in `calculatePayroll()` |
| Final Payout | ✅ Retained | Current-month separated employees kept in payroll run |
| Document Preview | ✅ Functional | iframe modal, graceful fallback |
| Loans Visibility | ✅ Live | Reactive from PayrollProvider |
| Search at Scale | ✅ Optimized | Virtuoso + debounce + useMemo |
| CSV Export | ✅ Functional | Client-side, filtered, RFC 4180 |
| Print Profile | ✅ Functional | window.print() native dialog |

**The Employee module's Source of Truth is operationally verified and user-friendly for the HR team at 500-employee scale.**
