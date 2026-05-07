# Labor Contracts Module — Deep-Scan Audit Report
**Module:** Labor Contracts (EC) | **Date:** April 2026 | **Rev:** 1.0

---

## Executive Summary

The module is a **Phase 1 Registry** (create, view, download) — not yet a **Phase 2 Compliance Engine** (auto-expiry, renewal workflows, e-signatures). Of 17 features audited: **5 Live, 4 Partial, 8 Missing**. Risk for labor audit: **MEDIUM-HIGH**.

---

## Functionality Status Table

| # | Feature | Status | File | Severity |
|---|---------|--------|------|----------|
| 1 | Contract Types (Probation/Fixed/Open/Casual) | ✅ LIVE | `hrms.types.ts:486` | — |
| 2 | Add Contract Modal (UI renders) | ⚠️ PARTIAL | `LaborContracts.tsx:265-328` | HIGH |
| 3 | Status Display (Active/Expiring/Expired/Draft) | ✅ LIVE | `hrms.types.ts:489` | — |
| 4 | Tab Filtering (All/Active/Expiring/Expired) | ✅ LIVE | `LaborContracts.tsx:145-157` | — |
| 5 | Search by Name/Department | ✅ LIVE | `LaborContracts.tsx:20-25` | — |
| 6 | Contract Download + Verification Hash | ✅ LIVE | `LaborContracts.tsx:36-79` | — |
| 7 | Audit Log on Contract Creation | ✅ LIVE | `AppDataContext.tsx:1882` | — |
| 8 | Auto-Update Employee `contractId` | ❌ MISSING | No field on Employee type | HIGH |
| 9 | Expired → Employee Status Bridge | ❌ MISSING | No cross-module sync | CRITICAL |
| 10 | Probation End-Date Auto-Alert | ❌ MISSING | No timer/useEffect | CRITICAL |
| 11 | 30/60/90-Day Expiry Monitoring | ❌ MISSING | Status is static seed data | HIGH |
| 12 | Bulk Renewal / Sign / Export | ❌ MISSING | No bulk UI or logic | MEDIUM |
| 13 | Digital Signature Integration | ❌ MISSING | `signedDate` is manual text | MEDIUM |
| 14 | Contract → Document Vault Link | ⚠️ PARTIAL | Category exists, not auto-linked | MEDIUM |
| 15 | Salary Field in Contract | ⚠️ PARTIAL | Type has it, modal doesn't collect it | HIGH |
| 16 | Virtual Scrolling (500+) | ❌ MISSING | Standard `<table>` | LOW |
| 17 | Role-Based Salary Access | ⚠️ PARTIAL | `isAdmin` gate on create; salary visible in download | MEDIUM |

---

## Part 1: Contract Lifecycle Logic

### 1.1 Types — LIVE
4 types in union: `'Probation' | 'Fixed Term' | 'Open Ended' | 'Casual'`. Status union: `'Active' | 'Expiring Soon' | 'Expired' | 'Draft'`. **Missing:** `'Terminated'` and `'Renewed'` statuses.

### 1.2 Add Modal — PARTIAL (Critical Bug)
The form's `onSubmit` only closes the modal — **it does NOT persist data**:
```typescript
// LaborContracts.tsx:279
onSubmit={(e) => { e.preventDefault(); setShowAddModal(false); }}
```
No `useState` bindings on any input. `addLaborContract()` is imported but **never called**. The `Casual` type is in the union but not in the dropdown. No salary input field exists despite `LaborContract.salary` being required.

### 1.3 Employee ↔ Contract Bridge — MISSING
`Employee` type has **no `currentContractId`** field. The only link is `LaborContract.empId` matching `Employee.id`, but no code reads this to trigger status changes when a contract expires.

### 1.4 Expiring Soon — Static Seed, Not Computed — MISSING
`'Expiring Soon'` is hardcoded in seed data (`AppDataContext.tsx:436`). No `useEffect`/timer computes days-to-expiry. Contracts approaching their end date stay `'Active'` forever unless manually changed.

### 1.5 Probation Handover — MISSING
No logic detects when a Probation contract reaches `endDate`. No alert, no successor contract creation, no role update.

---

## Part 2: Document & Signature Bridge

### 2.1 File Association — PARTIAL
- `LaborContract.documentUrl` stores a URL string (placeholder `https://example.com/c1.pdf`)
- `Employee.documents` supports `category: 'Contract'` with green icon styling in `Employee.tsx:473`
- **Gap:** `addLaborContract()` does NOT push a document entry to the employee's vault. The two systems are disconnected.

### 2.2 Template/Generate Logic — LIVE (Text-Only)
`handleDownloadContract()` generates a `.txt` file with dynamic placeholders:
- EmployeeName, Department, Role, Contract Type, Start/End Date, Salary, Status, Signed Date
- Includes a deterministic verification hash (`SECURE-{hash}`) for tamper detection
- **Not a PDF/DOCX template** — plain text only. No letterhead, no signature block.

### 2.3 Upload Signed Contract — MISSING
No file upload component exists in the modal. `documentUrl` must be manually edited in the data layer.

---

## Part 3: Ghost Component Scan

| Component | Verdict | Evidence |
|-----------|---------|----------|
| **"Save Contract" button** | 🔴 DEAD | `onSubmit` closes modal without saving. `addLaborContract()` never called. |
| **"Open in New" button** (open_in_new icon) | 🔴 DEAD | No `onClick` handler — `LaborContracts.tsx:240-242`. Visual only. |
| **"More Actions" button** (more_vert icon) | 🔴 DEAD | No `onClick` handler — `LaborContracts.tsx:243-245`. No dropdown menu. |
| **Digital Signature** | 🔴 STUB | No e-sign API (DocuSign/HelloSign). `signedDate` is a plain string in seed data. |
| **Bulk Renewal** | 🔴 ABSENT | No bulk action button, no checkbox column, no multi-select. |
| **Legal Clauses Library** | 🔴 ABSENT | No clause library, no template system. Contract terms not editable. |
| **Ministry Archive Dispatch** | 🔴 LABEL ONLY | Info banner says "dispatch a copy to Ministry Archive" — no actual API call. |
| **Download button** | ✅ LIVE | `handleDownloadContract()` generates real `.txt` file with hash. |

---

## Part 4: Scaling & Expiry Monitoring

### 4.1 The 500-Employee Load
**Virtual Scrolling:** ❌ NOT implemented. Uses standard `<table>` with `.map()` rendering all rows. At 500+ contracts, all 500 `<tr>` elements render in the DOM simultaneously. No `TableVirtuoso`.

### 4.2 Expiry Dashboard
**30/60/90-Day Filter:** ❌ NOT computed. The "Expiring Soon" tab filters by `contract.status === 'Expiring Soon'`, which is a **static string** set manually — not computed from `endDate`. No date arithmetic exists anywhere in the module.

**KPI Cards:** Live but reflect static statuses only. The counts are correct for whatever status values exist in the data, but they don't auto-update based on real calendar dates.

---

## Part 5: Audit & Security

### 5.1 Immutable History — PARTIAL
- ✅ `addLaborContract()` writes an audit log entry: `"Contract Added"` with type and employee name
- ❌ No audit log for contract edits (no edit function exists)
- ❌ No audit log for status changes (no status-change function exists)
- ❌ Old contracts are NOT explicitly archived — they remain in the array with `'Expired'` status. No soft-delete or archive flag.

### 5.2 Security Guard — PARTIAL
- ✅ `addLaborContract()` checks `isAdmin(adminId)` before allowing creation
- ❌ The contract table is **visible to all authenticated users** — no role check on the page
- ❌ `handleDownloadContract()` includes salary in the download with **no access check**
- ✅ Employee.tsx `Job & Pay` tab requires PIN unlock via `verifyLocalAuth()` + `isVaultUnlocked` state
- ❌ But the LaborContracts page has no equivalent vault — salary is in the download for anyone

---

## Phase 2: Operational How-To Guide

### The Happy Path (Current — With Known Gaps)

| Step | Action | System Response | Gap? |
|------|--------|-----------------|------|
| 1 | Sidebar → "Labor Contracts (EC)" | Page loads with KPI cards + table | — |
| 2 | Review KPI cards | Total, Active, Expiring Soon, Expired counts shown | Counts are static |
| 3 | Click "New Contract" | Modal opens | — |
| 4 | Select employee, type, dates | Form fields render | — |
| 5 | Click "Save Contract" | **Modal closes** | ⚠️ DATA NOT SAVED |
| 6 | Hover row → Click download icon | `.txt` file downloads with hash | — |
| 7 | Use tabs to filter by status | Table filters correctly | — |
| 8 | Use search bar | Filters by name or department | — |

### Edge Cases

**Contract Renewal:** No renewal workflow exists. Marcus must manually create a new contract and change the old one's status by editing the data directly.

**Contract Amendment:** No amendment feature. No version history. No diff view.

**Error Handling:** The modal has **no validation whatsoever**. No red highlights, no disabled save button, no required field checks. All inputs are uncontrolled.

---

## Phase 3: UX/UI Critical Review

### Visual Cues — Status Badges
| Status | Style | Visibility |
|--------|-------|-----------|
| Active | `bg-emerald-50 text-emerald-600` | ✅ Clear green |
| Expiring Soon | Falls to `default` case | ⚠️ **BUG** — shows grey |
| Expired | Falls to `default` case | ⚠️ **BUG** — shows grey |
| Draft | Falls to `default` case | Grey (acceptable) |

**Bug in `getStatusStyles()`** (`LaborContracts.tsx:27-34`):
```typescript
case 'Expiring': return 'bg-amber-50 text-amber-600 border-amber-100';
```
The case checks for `'Expiring'` but the actual status is `'Expiring Soon'`. This means the amber style **never applies**. Both "Expiring Soon" and "Expired" fall to the grey default.

### Friction Points
1. **Save does nothing** — highest friction. User expects persistence.
2. **No salary field in modal** — contract salary must be set elsewhere.
3. **3 dead action buttons per row** — "Open" and "More" do nothing on click.
4. **No confirmation on download** — file downloads silently with no toast.
5. **Uncontrolled form inputs** — React anti-pattern; values not tracked in state.

---

## Summary: Broken Legal Logic vs Live Compliance

### ✅ What Marcus CAN Trust Today
- The contract **registry** (viewing, filtering, searching existing records)
- The **download** with verification hash (valid for showing "we have a record")
- The **audit log** on creation (proves admin accountability)
- The **KPI cards** (accurate counts for current static data)

### ❌ What Will Fail a Labor Audit
- Contract dates do NOT trigger alerts — Marcus must track deadlines manually
- No proof of automated expiry monitoring (auditor will ask "how do you know?")
- "Save Contract" button is broken — no new contracts can be created via the UI
- No employee-status bridging — an expired contract doesn't flag the employee
- No e-signature — `signedDate` is a text field with no verification chain
- Salary visible in downloads without access control

### Priority Fix Roadmap

| Priority | Fix | Impact |
|----------|-----|--------|
| P0 | Wire "Save Contract" modal to `addLaborContract()` with controlled form state | Enables contract creation |
| P0 | Add computed expiry monitoring (`useEffect` + date arithmetic) | Auto-flags expiring contracts |
| P0 | Fix `getStatusStyles()` — change `'Expiring'` to `'Expiring Soon'` | Restores amber badge |
| P1 | Bridge contract status → employee status | Auto-flags employees in directory |
| P1 | Add salary input to modal + validation rules | Complete contract data |
| P1 | Add `Casual` to modal dropdown | Match type union |
| P2 | Auto-link contract document to employee vault | Single source of truth |
| P2 | Add virtual scrolling (TableVirtuoso) | Scale to 500+ contracts |
| P3 | Bulk renewal/export functionality | Operational efficiency |
| P3 | Role-based salary visibility in downloads | Security compliance |

---

*End of Report — LaborContracts_Deep_Scan v1.0*
