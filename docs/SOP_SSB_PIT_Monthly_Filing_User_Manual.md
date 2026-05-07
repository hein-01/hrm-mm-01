# SOP: SSB & PIT Monthly Government Filing — Operational Audit & User Manual

**Module:** Social Security & Personal Income Tax (SSB & PIT)
**System:** TechDance HR HRMS Platform v2026
**Jurisdiction:** Republic of the Union of Myanmar
**Regulatory Bodies:** Myanmar Social Security Board (SSB), Internal Revenue Department (IRD)
**Classification:** CONFIDENTIAL — Audit-Ready Documentation
**Prepared:** April 2026
**Revision:** 1.0 — Post-Implementation Verification

---

## Table of Contents

1. [Part 1: Tax Relief Configuration SOP](#part-1-tax-relief-configuration-sop)
2. [Part 2: Monthly SSB Filing Workflow](#part-2-monthly-ssb-filing-workflow)
3. [Part 3: Personal Income Tax (PIT) Filing SOP](#part-3-personal-income-tax-pit-filing-sop)
4. [Part 4: Tax Patch & Audit Integrity](#part-4-tax-patch--audit-integrity)
5. [Part 5: Scaling & Performance](#part-5-scaling--performance)
6. [Appendix A: Code-to-Regulation Mapping](#appendix-a-code-to-regulation-mapping)
7. [Appendix B: Government Auditor Quick-Reference](#appendix-b-government-auditor-quick-reference)

---

## Part 1: Tax Relief Configuration SOP

### 1.1 Objective

Ensure that every employee's Personal Income Tax (PIT) exemption is **personalized** based on their family circumstances, per Myanmar IRD guidelines. The system must never apply a flat exemption to all employees.

### 1.2 The Baseline Exemption

**Verified Configuration Path:** `Settings → Compliance & Tax → PIT Exemption`

The system reads the baseline exemption from `complianceSettings.pitExemption`. This value is centrally administered and currently set to **4,800,000 MMK** (annual).

**Code Evidence** — `PayrollProvider.tsx` line 528:
```typescript
const personalExemption = complianceSettings.pitExemption
    + (emp.reliefs?.spouse ? 1000000 : 0)
    + ((emp.reliefs?.parentsCount ?? 0) * 1000000);
```

**Audit Confirmation:** The baseline `4,800,000 MMK` is **never hardcoded** into the tax calculation function itself. It flows exclusively from `complianceSettings.pitExemption`, which is editable under `Settings` and **audit-logged** whenever changed (see `Setting.tsx` save handler).

### 1.3 Step-by-Step: How Marcus Configures Employee Tax Reliefs

**Persona:** Marcus (HR Administrator, ADM-001)

| Step | Action | System Location |
|------|--------|-----------------|
| 1 | Navigate to **Employee Directory** | Sidebar → `Employees` |
| 2 | Locate the employee record | Search bar or scroll |
| 3 | Open the employee's **Edit Profile** view | Click employee row → Edit |
| 4 | Locate the **Reliefs** section of the employee data | Employee data model: `reliefs: Reliefs` |
| 5 | Toggle **Spouse Relief** to `true` if the employee has a registered spouse | `emp.reliefs.spouse = true` |
| 6 | Set **Parents Count** to the number of dependent parents (0, 1, or 2) | `emp.reliefs.parentsCount = N` |
| 7 | Save changes | System persists to employee record |

### 1.4 How Reliefs Impact Monthly PIT — Verified Calculation

The `Reliefs` type is defined in `hrms.types.ts` (line 95–98):

```typescript
export type Reliefs = {
    spouse: boolean;
    parentsCount: number;
};
```

**Calculation Formula (Annual Exemption):**

```
Personal Exemption = pitExemption + (spouse ? 1,000,000 : 0) + (parentsCount × 1,000,000)
```

**Worked Examples:**

| Employee | Spouse | Parents | Annual Exemption | Monthly Equivalent |
|----------|--------|---------|------------------|--------------------|
| Aung Kyaw | No | 0 | 4,800,000 MMK | 400,000 MMK |
| Ma Hla | Yes | 0 | 5,800,000 MMK | 483,333 MMK |
| Ko Zaw | Yes | 2 | 7,800,000 MMK | 650,000 MMK |
| Nilar | No | 1 | 5,800,000 MMK | 483,333 MMK |

**Impact Path:** When payroll runs, the system computes PIT per employee as:

```
Monthly PIT = calcAnnualPIT(taxableIncome × 12, personalExemption) ÷ 12
```

The `calcAnnualPIT` function (`PayrollProvider.tsx` lines 428–438) applies **five progressive tiers** starting from the personalized exemption:

| Tier | Band Width | Rate |
|------|-----------|------|
| 1 | exemption → exemption + 5,200,000 | 5% |
| 2 | +5,200,000 → +15,200,000 | 10% |
| 3 | +15,200,000 → +25,200,000 | 15% |
| 4 | +25,200,000 → +35,200,000 | 20% |
| 5 | +35,200,000 → ∞ | 25% |

**Key Point for Auditors:** The band boundaries are **dynamic** — they shift based on each employee's personal exemption. An employee with spouse + 2 parents has their 5% band starting at 7,800,000, not 4,800,000. This is compliant with Myanmar IRD personalized relief policy.

### 1.5 Validation Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `pitExemption` sourced from `complianceSettings`, not hardcoded | ✅ PASS |
| 2 | Spouse relief adds exactly 1,000,000 MMK | ✅ PASS |
| 3 | Each parent adds exactly 1,000,000 MMK | ✅ PASS |
| 4 | `parentsCount` defaults to 0 via `?? 0` null-coalescing | ✅ PASS |
| 5 | PIT is annualized (×12) before tier calculation, then de-annualized (÷12) | ✅ PASS |
| 6 | Changes to `complianceSettings.pitExemption` in Settings are audit-logged | ✅ PASS |

---

## Part 2: Monthly SSB Filing Workflow

### 2.1 The Contribution Split — Full Transparency

Myanmar Social Security Board mandates a **5% total contribution** on insurable earnings, split between employee and employer.

**System Configuration** (from `ComplianceSettings` type, `hrms.types.ts` lines 100–119):

| Parameter | Field | Default Value | Purpose |
|-----------|-------|---------------|---------|
| Employee SSB Rate | `ssbPercent` | 2 | Employee's share of SSB contribution |
| Employee SSB Cap | `ssbCap` | 6,000 MMK | Maximum monthly employee SSB deduction |
| Employer SSB Rate | `ssbEmployerPercent` | 3 | Employer's share of SSB contribution |
| Employer SSB Cap | `ssbEmployerCap` | 9,000 MMK | Maximum monthly employer SSB contribution |

**Code Evidence — Independent Calculation** (`PayrollProvider.tsx` lines 521–525):

```typescript
// Employee SSB
const ssbAmount = Math.min(
    Math.round((ssbBase * complianceSettings.ssbPercent) / 100),
    complianceSettings.ssbCap
);

// Employer SSB — independent calculation using dedicated rate & cap
const employerSsbAmount = Math.min(
    Math.round((ssbBase * complianceSettings.ssbEmployerPercent) / 100),
    complianceSettings.ssbEmployerCap
);
```

**Audit Confirmation:** The employer SSB is **not** derived from the employee SSB (no `× 1.5` shortcut). Each has its own rate and cap, calculated independently from the same `ssbBase`. This matches the government requirement for independent employer liability.

### 2.2 UI Transparency — The 2% vs 3% Split

**Navigation:** Sidebar → `SSB & PIT` → **SSB (Social Security)** tab

The SSBPIT page displays **four KPI cards** at the top of the SSB view (`SSBPIT.tsx` lines 265–277):

| KPI Card | Label | Value Source |
|----------|-------|-------------|
| Card 1 | **Aggregate Gross** | `totalGrossWages` — sum of all `record.salary` |
| Card 2 | **Employee (2%)** | `totalEmployeeSSB` — sum of all `record.ssb` |
| Card 3 | **Employer (3%)** | `totalEmployerSSB` — sum of all `record.employerSsb` |
| Card 4 | **Total Filing Liability** | `totalEmployeeSSB + totalEmployerSSB` |

**Per-Employee Visibility in the Tax Registry Table:**

Each row in the Employee SSB Breakdown table shows:

| Column | Content | Code Reference |
|--------|---------|---------------|
| Employee | Name + UID avatar | `record.name`, `record.empId` |
| SSB ID | Employee's SSB Number or `MISSING ID` (red, pulsing) | `emp?.ssbNumber` |
| Total Income | Gross salary | `record.salary` |
| SSB Capped | The cap value (`complianceSettings.ssbCap`) | Static display |
| Emp (2%) | Employee's SSB deduction | `record.ssb` |
| **Empr (3%)** | Employer's SSB contribution | `record.employerSsb` |
| Audit | ✅ verified or ❌ error (pulsing) | SSB ID validation |

**Verification:** ✅ YES — The UI clearly separates the 2% Employee and 3% Employer columns for every worker.

### 2.3 The Cap Guard — High-Earner Protection

**Scenario:** Employee earning 500,000 MMK/month (above the 300,000 MMK threshold).

```
Employee SSB (uncapped) = 500,000 × 2% = 10,000 MMK
Employee SSB (capped)   = min(10,000, 6,000) = 6,000 MMK  ← Cap enforced

Employer SSB (uncapped) = 500,000 × 3% = 15,000 MMK
Employer SSB (capped)   = min(15,000, 9,000) = 9,000 MMK  ← Cap enforced

Total Filing = 6,000 + 9,000 = 15,000 MMK  ← Government maximum
```

**Cap Visibility in UI:**
- The "SSB Capped" column in the tax registry shows `complianceSettings.ssbCap` (6,000 MMK) for every row
- The footer bar reads: _"SSB capped at 6,000 MMK per Myanmar Social Security Board directive."_ (`SSBPIT.tsx` line 403)
- The KPI Card 4 "Total Filing Liability" reflects the capped totals

**Verification:** ✅ The 15,000 MMK total cap (6K + 9K) is enforced via independent `Math.min()` operations and is clearly visible in the tax registry.

### 2.4 Form 15 Generation — Step-by-Step Walkthrough

**Precondition:** Payroll must be calculated (at least `Draft` status) with records present.

| Step | Marcus Action | System Response |
|------|--------------|-----------------|
| 1 | Navigate to **SSB & PIT** → **SSB** tab | Page loads with KPI cards and employee table |
| 2 | **Review Compliance Audit Banner** | If any employees have missing SSB IDs, a red banner appears: _"Compliance Audit: Failed — N employees have missing or unverified SSB IDs. Filing is restricted."_ |
| 3 | If audit failures exist, click **"Resolve Missing IDs"** | Toast guides: _"Navigate to Employee Directory → Edit employee → Add SSB Number."_ |
| 4 | Once all SSB IDs are verified (no red banner), click **"Generate & Download CSV"** | System executes `exportSSBForm15()` |
| 5 | CSV file downloads to browser | Filename: `SSB_Form15_YYYY-MM.csv` |

**If audit failures exist and Marcus clicks the download button:**
- Button is **disabled** (`disabled={hasAuditFailures && activeTab === 'SSB'}`) — greyed out, no click possible
- Tooltip on hover: _"Locked: Complete SSB Number Audit first."_
- If somehow triggered: system alert blocks generation with error message

**Verification of CSV Contents:**

The `exportSSBForm15` function (`SSBPIT.tsx` lines 97–109) generates a CSV with these **exact government-required columns**:

| CSV Column | Source |
|------------|--------|
| Employee Name | `rec.name` |
| Employee ID | `rec.empId` |
| NRC Number | `emp?.nrcNumber` |
| SSB ID | `emp?.ssbNumber` |
| TIN | `emp?.taxId` |
| Gross Salary (MMK) | `rec.salary` |
| Employee SSB 2% (MMK) | `rec.ssb` |
| Employer SSB 3% (MMK) | `rec.employerSsb` |
| Total 5% (MMK) | `rec.ssb + rec.employerSsb` |

**Technical Details:**
- Encoding: UTF-8 with BOM prefix (`\uFEFF`) for Excel compatibility
- All fields are double-quote escaped with proper CSV escaping (`""` for embedded quotes)
- Error-status records are **excluded** (`r.status !== 'Error'`)
- After download, a system alert is created: _"Form 15 generated and downloaded. Signed & Stamped with {companyTIN}."_

**Verification:** ✅ CONFIRMED — The "Generate & Download CSV" button triggers a **real `.csv` file download** with all government-required columns including NRC, SSB ID, and TIN.

### 2.5 Alternative Export Path: PayrollRun Step 10

After completing the full payroll cycle (Steps 1–9), Marcus reaches **Step 10: Payroll Finalized Successfully**.

Two government form cards are displayed:

| Card | Title | Button | Handler |
|------|-------|--------|---------|
| 1 | **ပတခ(ဝင)-၁၅(က)** (Monthly Income Tax Form) | "Download PIT CSV" | `handleExportPITForm()` |
| 2 | **SSB Monthly Return** (Employer & Employee 5% Contrib) | "Download SSB CSV" | `handleExportSSBReturn()` |

Both buttons are **wired to real CSV export functions** (`PayrollRun.tsx` lines 55–78) producing identical column structures to the SSBPIT page exports.

**Verification:** ✅ The dead placeholder buttons from the previous version have been replaced with functional download handlers.

---

## Part 3: Personal Income Tax (PIT) Filing SOP

### 3.1 Patakha-(W)-15 Monthly Filing — Step-by-Step

**Navigation:** Sidebar → `SSB & PIT` → **PIT (Income Tax)** tab

| Step | Marcus Action | System Response |
|------|--------------|-----------------|
| 1 | Click the **PIT (Income Tax)** tab | View switches to PIT mode |
| 2 | Review KPI cards | Shows: Taxable Revenue, Exemption Reliefs, Monthly PIT, Total Filing Liability |
| 3 | Review the **Filing Action Card** | Shows: _"Patakha-(W)-15 (Monthly PIT)"_ with "Pending Filing" badge |
| 4 | Search for specific employees if needed | Type in header search bar — debounced 300ms search by Name or ID |
| 5 | Click **"Generate & Download CSV"** | System executes `exportPITReport()` |
| 6 | CSV file downloads | Filename: `PIT_Patakha_W15_YYYY-MM.csv` |

**Note:** PIT filing does **not** require SSB audit completion. The download button is always enabled on the PIT tab (the `disabled` condition only applies when `activeTab === 'SSB'`).

### 3.2 Tiered Visibility — Annualized Projection

**Current Implementation Status:**

The PIT table under the PIT tab shows the following per employee:

| Column | What Marcus Sees |
|--------|-----------------|
| Employee | Name + UID |
| NRC / Township | `emp.nrcNumber / emp.township` |
| Taxable Basis | `record.salary - record.deductions` (monthly taxable income) |
| Attendance Deduct | `-record.deductions` in red |
| Net Tax | `record.pit` (the monthly PIT amount) |
| Audit | ✅ verified status |

**How the Annualized Projection Works Internally:**

The system annualizes each employee's monthly taxable income (`taxableIncome × 12`), runs it through the five-tier bracket system (see Part 1.4), then de-annualizes to get the monthly PIT (`÷ 12`). This means the PIT amount shown in the "Net Tax" column already **reflects the annualized tier** the employee falls into.

**Explanation Path for Marcus:**

When an employee asks "Why is my tax X amount?", Marcus can explain:

> _"Your monthly taxable income of Y MMK is projected annually to Y×12 MMK. After your personal exemption of Z MMK (including spouse/parent reliefs), the remainder falls into the [N]% tax bracket. The annual tax is divided by 12 to get your monthly deduction."_

**Observation for Future Enhancement:** The UI does not currently display an explicit "Annualized Projection" column or tooltip showing the tier breakdown. The annualized calculation happens server-side in `calcAnnualPIT()`. Consider adding a hover tooltip or payslip detail showing: _"Annual Projection: X MMK → Tier: Y% → Annual Tax: Z MMK"_ for complete transparency.

### 3.3 Payer List Integrity — TIN and NRC Verification

**PIT CSV Export Columns** (`SSBPIT.tsx` lines 113–122):

| CSV Column | Source | Required for IRD |
|------------|--------|-----------------|
| Employee Name | `rec.name` | ✅ |
| Employee ID | `rec.empId` | ✅ |
| **NRC Number** | `emp?.nrcNumber` | ✅ Mandatory |
| **TIN** | `emp?.taxId` | ✅ Mandatory for taxpayer lists |
| Township | `emp?.township` | ✅ For jurisdiction routing |
| Gross Salary (MMK) | `rec.salary` | ✅ |
| Taxable Income (MMK) | `rec.salary - rec.deductions` | ✅ |
| SSB Deducted (MMK) | `rec.ssb` | ✅ |
| PIT Amount (MMK) | `rec.pit` | ✅ |

**TIN Capture Point — Add Employee Modal:**

The TIN field was added to the Employee onboarding flow (`EmployeesDirectory.tsx` lines 992–995):

```
Section: "Identity Verification"
Field Label: "Tax Identification Number (TIN)"
Input Type: text, font-mono
Placeholder: "Optional — required for PIT payer lists"
Data Field: Employee.taxId (optional string)
```

**Data Type Definition** (`hrms.types.ts` line 762):
```typescript
taxId?: string;
```

**Verification:** ✅ CONFIRMED — Both TIN and NRC are included in every PIT CSV record. If an employee is missing their TIN, the CSV cell will be empty (empty string `''`), which Marcus should review before government submission.

**Recommendation:** Marcus should run a pre-filing check by searching for employees with empty TIN fields in the Employee Directory and ensuring all active taxpayers have their TIN recorded.

---

## Part 4: Tax Patch & Audit Integrity

### 4.1 When is a Tax Patch Needed?

A Tax Patch is a **manual override** of a calculated SSB or PIT amount for a specific employee. Legitimate scenarios include:

- Government exemption certificate received mid-cycle
- IRD directive for special tax treatment
- Correction of a data entry error discovered after payroll calculation
- Court order or legal mandate affecting tax liability
- SSB waiver for foreign worker categories

### 4.2 The Manual Override Workflow — Step-by-Step

**Navigation:** Sidebar → `SSB & PIT` → Click **"Tax Patch"** button (amber, in Filing Action Card)

| Step | Marcus Action | System Response |
|------|--------------|-----------------|
| 1 | Click the **"Tax Patch"** button | Modal opens with amber header: _"Tax Patch — Manual Override"_ and subtext: _"High-Security Action · Audit Logged"_ |
| 2 | **Select Employee** (required) | Dropdown lists all payroll records with `status !== 'Error'`, showing `Name (EmpID)` |
| 3 | **Select Field** (required) | Dropdown: "SSB (Employee)" or "PIT (Income Tax)" |
| 4 | **Enter New Amount** in MMK (required) | Numeric input, monospace font, must be ≥ 0 |
| 5 | **Enter Mandatory Reason** (required) | Textarea with placeholder: _"Government exemption certificate, IRD directive, etc."_ |
| 6 | Read the **red security warning** | _"This action creates an immutable entry in the Security Audit Log. Manual tax overrides are flagged as HIGH PRIORITY and visible to all Super-Admins."_ |
| 7 | Click **"Apply Tax Patch"** | Button is **disabled** until all three required fields are filled. `disabled={!patchEmpId \|\| !patchAmount \|\| !patchReason.trim()}` |

**Validation Gates** (`SSBPIT.tsx` lines 126–136):

| Validation | Error Message |
|------------|--------------|
| Any field empty | _"All fields are required: Employee, Amount, and Reason."_ |
| Amount is NaN or negative | _"Amount must be a non-negative number."_ |
| Employee not in payroll | _"Employee not found in payroll records."_ |

### 4.3 What Happens When the Patch is Applied

The system performs **four simultaneous actions** (`SSBPIT.tsx` lines 138–165):

**Action 1 — Record Update:**
```typescript
setPayrollRecords(prev => prev.map(r =>
    r.empId === patchEmpId
        ? { ...r, [patchField]: amount, netPay: Math.max(0, r.netPay - diff) }
        : r
));
```
- The selected field (SSB or PIT) is overwritten with the new amount
- Net pay is **automatically recalculated**: `netPay = netPay - (newAmount - oldAmount)`
- Net pay is floored at 0 via `Math.max(0, ...)`

**Action 2 — Security Audit Log Entry:**
```typescript
addSecurityLog({
    deviceId: 'WEB-ADMIN',
    authMethod: 'SYSTEM',
    status: 'Success',
    empId: patchEmpId,
    detail: `[HIGH PRIORITY] Tax Patch: ${field} for ${name} (${empId})
             changed from ${oldValue} to ${newAmount} MMK.
             Reason: ${reason}`
});
```

**Action 3 — Administrative Audit Log Entry:**
```typescript
addAuditLog({
    adminId: 'ADM-001',
    actionType: 'Tax Patch Override',
    module: 'Payroll',
    detail: `[HIGH] Manual ${field} override for ${name} (${empId}):
             ${oldValue} → ${newAmount} MMK. Reason: ${reason}`
});
```

**Action 4 — System Alert:**
```
Type: warning
Message: "TAX PATCH: {FIELD} for {Name} manually overridden
          ({oldValue} → {newAmount} MMK). Audit trail created."
```

### 4.4 Audit Trail Detail Level — Verification

**Where to find the records:**

| Log Type | Location | Access Level | Detail |
|----------|----------|-------------|--------|
| **Security Audit Log** | Settings → Security Audit | Super-Admin only | `[HIGH PRIORITY]` prefix, includes: device ID, auth method, employee ID, old value, new value, reason |
| **Administrative Audit Log** | Settings → Audit Trail | Admin+ | `[HIGH]` prefix, action type `Tax Patch Override`, module `Payroll`, full delta with reason |
| **System Alert** | Header bell icon / Alerts panel | All admins | Warning-level alert with override summary |

**SecurityAuditLog Schema** (`hrms.types.ts` lines 741–749):
```typescript
export interface SecurityAuditLog {
    id: string;          // Auto: "SEC-{timestamp}"
    timestamp: string;   // Auto: ISO 8601
    deviceId: string;    // "WEB-ADMIN"
    authMethod: string;  // "SYSTEM"
    status: string;      // "Success"
    empId?: string;      // Affected employee
    detail?: string;     // Full narrative with [HIGH PRIORITY] flag
}
```

**Verification:** ✅ CONFIRMED — Every Tax Patch creates **three independent audit records** (Security Log, Admin Audit Log, System Alert). The reason is embedded in all three. The detail level includes: who was affected, what field, old value, new value, and the mandatory justification.

### 4.5 Tax Patch Safeguards Summary

| Safeguard | Implementation |
|-----------|---------------|
| Mandatory reason field | Button disabled if reason is empty or whitespace-only |
| Non-negative amount | `parseInt` validation + `< 0` check |
| Employee must exist in payroll | `payrollRecords.find()` check |
| Net pay floor | `Math.max(0, ...)` prevents negative payslips |
| Triple audit logging | Security Log + Audit Log + System Alert |
| HIGH PRIORITY flag | All log entries prefixed with `[HIGH PRIORITY]` or `[HIGH]` |
| Super-Admin visibility | Security logs visible to all Super-Admins per `UserAccessProvider` |

---

## Part 5: Scaling & Performance

### 5.1 Virtual Scrolling — Implementation Verification

**Technology:** `react-virtuoso` — `TableVirtuoso` component

**Implementation** (`SSBPIT.tsx` lines 332–394):

```typescript
<div style={{ height: Math.min(filteredRecords.length * 64 + 2, 520) }}>
    <TableVirtuoso
        data={filteredRecords}
        overscan={20}
        fixedHeaderContent={() => ( /* sticky header row */ )}
        components={{
            Table: (props) => <table {...props} className="..." />,
            TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} />),
            TableRow: (props) => <tr {...props} className="..." />,
            TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} />),
        }}
        itemContent={(_, record) => ( /* per-row render */ )}
    />
</div>
```

**Key Performance Parameters:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `overscan` | 20 | Pre-renders 20 rows above/below viewport for smooth scrolling |
| Row height | 64px (estimated) | Used for container height calculation |
| Max container height | 520px | Prevents the table from dominating the page |
| Dynamic height | `Math.min(records × 64 + 2, 520)` | Container shrinks for small datasets, maxes at 520px |

**How Virtual Scrolling Works:**
- Only the **visible rows + 20 buffer rows** are rendered in the DOM at any time
- As Marcus scrolls, rows are recycled — old rows are unmounted and new rows are mounted
- The sticky header (`fixedHeaderContent`) remains pinned at the top during scroll
- For 500 employees: instead of rendering 500 `<tr>` elements, only ~28 are in the DOM at once (520px ÷ 64px ≈ 8 visible + 20 overscan)

**Performance Verification:**

| Scenario | DOM Elements (without virtualization) | DOM Elements (with virtualization) | Improvement |
|----------|--------------------------------------|-----------------------------------|-------------|
| 50 employees | 50 rows | ~28 rows | 1.8× |
| 200 employees | 200 rows | ~28 rows | 7.1× |
| 500 employees | 500 rows | ~28 rows | **17.9×** |
| 1,000 employees | 1,000 rows | ~28 rows | **35.7×** |

**Verification:** ✅ The tax registry table uses `TableVirtuoso` with 20-row overscan. Scrolling through 500+ records maintains smooth performance because only ~28 DOM rows exist at any time, regardless of dataset size.

### 5.2 Search & Filter — Finding Department-Specific Records

**Current Search Capability:**

The search bar in the header (`SSBPIT.tsx` lines 203–212) filters records by:
- **Employee Name** (case-insensitive substring match)
- **Employee ID** (case-insensitive substring match)

The search is **debounced at 300ms** (`useDebounce(searchQuery, 300)`) to prevent excessive re-filtering during typing.

**Filtering Implementation** (`SSBPIT.tsx` lines 73–78):
```typescript
const filteredRecords = useMemo(() =>
    payrollRecords.filter(r =>
        r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        r.empId.toLowerCase().includes(debouncedSearch.toLowerCase())
    ),
[payrollRecords, debouncedSearch]);
```

**How Marcus Finds Engineering Department Records:**

Since the current search filters by Name and Employee ID (not department), Marcus has two approaches:

**Approach 1 — Search by Employee:**
1. Marcus knows the Engineering team members and searches each by name
2. The record count badge updates in real-time: _"{N} records"_

**Approach 2 — Cross-Reference with Employee Directory:**
1. Open Employee Directory → Filter by Department: "Engineering"
2. Note the employee IDs (e.g., `EMP-003`, `EMP-007`)
3. Return to SSB & PIT page and search by each ID

**Observation for Future Enhancement:** The current search scope is limited to Name and Employee ID. Consider adding a department filter dropdown to the SSBPIT page for direct department-level contribution analysis. This would allow Marcus to instantly see: _"Total Engineering SSB: X MMK, Total Engineering PIT: Y MMK"_.

**The record count is always visible** in the table header: _"{filteredRecords.length} records"_ — so Marcus can confirm how many employees matched his search.

---

## Appendix A: Code-to-Regulation Mapping

| Myanmar Regulation | Code Implementation | File | Lines |
|-------------------|---------------------|------|-------|
| SSB Law 2012, Sec 11: 2% employee contribution | `ssbBase × complianceSettings.ssbPercent / 100` | `PayrollProvider.tsx` | 522 |
| SSB Law 2012, Sec 11: 3% employer contribution | `ssbBase × complianceSettings.ssbEmployerPercent / 100` | `PayrollProvider.tsx` | 525 |
| SSB Notification 2019: Employee cap 6,000 MMK | `Math.min(..., complianceSettings.ssbCap)` | `PayrollProvider.tsx` | 522 |
| SSB Notification 2019: Employer cap 9,000 MMK | `Math.min(..., complianceSettings.ssbEmployerCap)` | `PayrollProvider.tsx` | 525 |
| IRD: PIT annual exemption 4,800,000 MMK | `complianceSettings.pitExemption` | `PayrollProvider.tsx` | 528 |
| IRD: Spouse relief 1,000,000 MMK | `emp.reliefs?.spouse ? 1000000 : 0` | `PayrollProvider.tsx` | 529 |
| IRD: Parent relief 1,000,000 MMK each | `emp.reliefs?.parentsCount × 1000000` | `PayrollProvider.tsx` | 530 |
| IRD: Progressive PIT tiers (5%–25%) | `calcAnnualPIT()` bands array | `PayrollProvider.tsx` | 430–436 |
| SSB Form 15: Monthly Return | `exportSSBForm15()` / `handleExportSSBReturn()` | `SSBPIT.tsx` / `PayrollRun.tsx` | 97–109 / 67–78 |
| IRD Patakha-(W)-15: Monthly PIT Filing | `exportPITReport()` / `handleExportPITForm()` | `SSBPIT.tsx` / `PayrollRun.tsx` | 112–122 / 55–64 |

---

## Appendix B: Government Auditor Quick-Reference

**For SSB Auditors:**

1. **Where to verify SSB calculation:** Sidebar → `SSB & PIT` → `SSB` tab → Employee Breakdown table
2. **Where to verify caps:** "SSB Capped" column shows the cap per row; footer confirms the cap value
3. **Where to download Form 15:** "Generate & Download CSV" button (or PayrollRun Step 10 → "Download SSB CSV")
4. **What if SSB IDs are missing:** Red banner blocks filing; `MISSING ID` appears per-row in red; audit column shows pulsing error icon
5. **Employer contribution proof:** "Empr (3%)" column in the table; KPI Card 3 shows aggregate

**For IRD Tax Auditors:**

1. **Where to verify PIT calculation:** Sidebar → `SSB & PIT` → `PIT` tab → Employee Breakdown table
2. **Where to verify reliefs applied:** Employee Profile → Reliefs section (spouse toggle, parents count)
3. **Where to download Patakha-(W)-15:** "Generate & Download CSV" button (or PayrollRun Step 10 → "Download PIT CSV")
4. **TIN integrity:** CSV export includes TIN column for every employee; captured during onboarding
5. **Manual override traceability:** Settings → Security Audit → search for `[HIGH PRIORITY] Tax Patch`

**For Internal Compliance Officers:**

1. **Tax Patch audit trail:** Three records per patch — Security Log, Audit Log, System Alert
2. **Settings change audit:** All `complianceSettings` changes (SSB caps, PIT exemption, etc.) are audit-logged in Settings → Audit Trail
3. **Data quality flags:** Payroll records with missing bank accounts or NRC numbers are flagged with ⚠ alerts
4. **Error exclusion:** Records with `status: 'Error'` (e.g., missing base salary) are excluded from all financial totals and CSV exports

---

**Document Classification:** This SOP has been verified against the live codebase as of April 2026. All code references include exact file paths and line numbers for traceability. Any changes to the tax calculation logic, export formats, or UI components should trigger a revision of this document.

**Approval Chain:**
- [ ] HR Administrator (Marcus)
- [ ] Finance Controller
- [ ] Compliance Officer
- [ ] External Auditor

---

*End of Document — SOP_SSB_PIT_Monthly_Filing_User_Manual v1.0*
