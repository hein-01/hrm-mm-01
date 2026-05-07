# Tax & Compliance Module — Deep Scan Technical Audit
**Date:** April 23, 2026 | **Auditor:** Cascade | **Scope:** PayrollProvider.tsx, SSBPIT.tsx, PayrollRun.tsx, Setting.tsx

---

## VERDICT SUMMARY

| Area | Status | Grade |
|------|--------|-------|
| SSB Employee Calculation | **LIVE** — correct 2% with cap | A |
| SSB Employer Calculation | **LIVE** — derived as 1.5x of employee SSB | B+ |
| SSB isSSBRelevant Integration | **LIVE** — additions respected | A |
| PIT Tiered Engine | **LIVE** — 6-bracket annualized | A |
| PIT Relief/Exemption | **STUB** — 4.8M flat exemption, no per-employee reliefs | D |
| Net Pay Ordering | **LIVE** — SSB first, then PIT | A |
| SSB Form Filing (SSBPIT.tsx) | **SIMULATED** — alert-only, no real CSV export | C |
| PIT Form Filing (SSBPIT.tsx) | **SIMULATED** — alert-only, no real CSV export | C |
| PayrollRun Step 10 Gov Forms | **DEAD BUTTONS** — no download handler wired | F |
| Electronic Filing (IRD/SSB Portal) | **NOT IMPLEMENTED** — no API integration | F |
| Tax Year-End Simulation | **NOT IMPLEMENTED** — no component exists | F |
| Certificate of Income | **NOT IMPLEMENTED** — no component exists | F |
| Tax Registry Virtual Scrolling | **NOT IMPLEMENTED** — plain `<table>` | D |
| Tax Patch Audit Trail | **PARTIAL** — compliance setting changes audited, but no per-employee tax override mechanism exists | C |

---

## Part 1: SSB (Social Security) Calculation Logic

### 1.1 The 2% Employee Rule

**Source:** `PayrollProvider.tsx:520-522`

```typescript
const ssbBase   = baseSalary + dynamicAdditions + ssbManualAdditions;
const ssbAmount = Math.min(Math.round((ssbBase * complianceSettings.ssbPercent) / 100), complianceSettings.ssbCap);
```

**Default values** (`AppDataContext.tsx:280-283`):
```
ssbCap: 6000          // Employee cap
ssbPercent: 2          // Employee rate
ssbEmployerCap: 9000   // Employer cap
ssbEmployerPercent: 3   // Employer rate
```

**Verdict: LIVE and CORRECT.**
- `ssbPercent` = 2% is applied to `ssbBase` (salary + allowances + SSB-relevant manual additions).
- Result is capped at `ssbCap` = 6,000 MMK.

### 1.2 Capping Logic Analysis

**Question:** Does it enforce the 15,000 MMK cap on the 300,000 MMK salary ceiling?

**Answer: NO — the cap is set to 6,000 MMK, not 15,000 MMK.**

The current `complianceSettings.ssbCap = 6000` means the maximum employee SSB contribution is 6,000 MMK (i.e., 2% of 300,000 MMK = 6,000 MMK). This is actually *mathematically consistent* — it implies a 300K ceiling where 2% × 300K = 6K. The total 5% on 300K would be 15K, but the cap fields are split:

| Parameter | Value | Math Check |
|-----------|-------|------------|
| `ssbPercent` (Employee) | 2% | 2% × 300K = **6,000 MMK** ✅ matches `ssbCap` |
| `ssbEmployerPercent` (Employer) | 3% | 3% × 300K = **9,000 MMK** ✅ matches `ssbEmployerCap` |
| Combined | 5% | 5% × 300K = **15,000 MMK** ✅ |

**Verdict: Correct split. The 15K cap is implicitly enforced via 6K employee + 9K employer.**

### 1.3 isSSBRelevant Integration

**Source:** `PayrollProvider.tsx:509`
```typescript
const ssbManualAdditions = empAdjs.filter(a => a.category === 'Addition' && (a.isSSBRelevant ?? true)).reduce((sum, a) => sum + a.amount, 0);
```

- Adjustments default to `isSSBRelevant: true` if not explicitly set.
- Only SSB-relevant additions are included in the SSB base calculation.
- Dynamic allowances (from `allowanceConfigs`) are **always** included in SSB base.

**Verdict: LIVE. Adjustment-level SSB relevance is respected.**

### 1.4 Employer SSB Display (SSBPIT.tsx)

**Source:** `SSBPIT.tsx:58-61`
```typescript
totalEmployerSSB: payrollRecords.reduce((sum, r) => sum + Math.min(
    Math.round(r.salary * (complianceSettings.ssbPercent / 100) * 1.5),
    complianceSettings.ssbCap * 1.5
), 0),
```

**Issue:** The employer SSB is derived by multiplying the *employee SSB calculation* by 1.5x. This is a shortcut approximation (3%/2% = 1.5x), but it's imprecise because:
- It uses `r.salary` (base only), not the full `ssbBase` (which includes allowances).
- It recalculates from scratch instead of using the stored employer-specific rate fields (`ssbEmployerPercent`, `ssbEmployerCap`).

**Per-row display** (`SSBPIT.tsx:270`):
```typescript
<td>{Math.round(record.ssb * 1.5).toLocaleString()} MMK</td>
```
This just multiplies the stored employee SSB by 1.5 — a rough approximation.

**Verdict: B+ — Functionally close but not using the dedicated employer fields from ComplianceSettings.**

---

## Part 2: PIT (Personal Income Tax) Tiered Engine

### 2.1 Annualization Logic

**Source:** `PayrollProvider.tsx:427-438`
```typescript
const calcAnnualPIT = (annual: number): number => {
    if (annual <= 4800000) return 0;    // 0% band (basic exemption)
    const bands = [
        { from: 4800000, to: 10000000, rate: 0.05 },
        { from: 10000000, to: 20000000, rate: 0.10 },
        { from: 20000000, to: 30000000, rate: 0.15 },
        { from: 30000000, to: 40000000, rate: 0.20 },
        { from: 40000000, to: Infinity,  rate: 0.25 }
    ];
    return bands.reduce((tax, b) => annual > b.from ? tax + (Math.min(annual, b.to) - b.from) * b.rate : tax, 0);
};
```

**Monthly → Annual → Monthly flow** (`PayrollProvider.tsx:525-526`):
```typescript
const taxableIncome = (baseSalary + dynamicAdditions + taxableManualAdditions) - ssbAmount - totalDeductions;
const pitAmount     = Math.round(calcAnnualPIT(taxableIncome * 12) / 12);
```

**Verification:**
1. Monthly taxable income computed: `(Base + Allowances + Taxable Additions) - SSB - Deductions`
2. Annualized: `taxableIncome × 12`
3. Annual PIT calculated via tiered brackets
4. De-annualized: `÷ 12`, rounded to nearest integer

**Verdict: LIVE and mathematically correct.**

| Annual Income (MMK) | Tax Rate | Bracket Math |
|---------------------|----------|--------------|
| 0 – 4,800,000 | 0% | Exempt |
| 4,800,001 – 10,000,000 | 5% | max 260,000 |
| 10,000,001 – 20,000,000 | 10% | max 1,000,000 |
| 20,000,001 – 30,000,000 | 15% | max 1,500,000 |
| 30,000,001 – 40,000,000 | 20% | max 2,000,000 |
| 40,000,001+ | 25% | unlimited |

### 2.2 Exemption & Reliefs

**The `Reliefs` type exists** (`hrms.types.ts:95-98`):
```typescript
export type Reliefs = {
    spouse: boolean;
    parentsCount: number;
};
```

**Every employee has a `reliefs` field** (`Employee.reliefs: Reliefs`).

**However, the PIT engine does NOT use `emp.reliefs` anywhere.**

The only exemption is the **hardcoded 4,800,000 MMK annual threshold** baked into `calcAnnualPIT`. This is a flat basic relief — it does NOT factor in:
- Spouse relief (Myanmar law: 1,000,000 MMK for married taxpayers)
- Parent relief (Myanmar law: 1,000,000 MMK per dependent parent)
- Children relief

The `complianceSettings` also has `pitExemption: 4800000` but this value is **not referenced** by `calcAnnualPIT` — the 4.8M is hardcoded in the function.

**Verdict: STUB. The `Reliefs` type and `complianceSettings.pitExemption` exist but are NOT wired into the tax engine. Marcus is seeing flat-rate exemptions, not personalized ones.**

### 2.3 The 'Net Pay' Ordering

**Source:** `PayrollProvider.tsx:520-528`
```
1. ssbBase = baseSalary + dynamicAdditions + ssbManualAdditions
2. ssbAmount = min(round(ssbBase × 2%), 6000)
3. taxableIncome = (baseSalary + dynamicAdditions + taxableManualAdditions) - ssbAmount - totalDeductions
4. pitAmount = round(calcAnnualPIT(taxableIncome × 12) / 12)
5. netPay = (baseSalary + totalAdditions) - totalDeductions - ssbAmount - pitAmount
```

**Deduction order:**
- SSB is computed FIRST on a broader base
- PIT is computed on `income MINUS SSB MINUS deductions` (correct — non-taxable deductions removed before PIT)
- Net Pay = Gross - All Deductions - SSB - PIT

**Verdict: LIVE and correct. SSB before PIT. Non-taxable deductions excluded from PIT base.**

---

## Part 3: Government Reporting & Exports

### 3.1 SSB Form (SSBPIT.tsx)

**Source:** `SSBPIT.tsx:73-93` — `handleGenerateReport()`

```typescript
const handleGenerateReport = (formName: string) => {
    if (hasAuditFailures && activeTab === 'SSB') {
        // BLOCKS filing if employees have missing SSB IDs
        return;
    }
    if (payrollRecords.length === 0) {
        addToast('No payroll records available. Run Payroll first.', 'warning');
        return;
    }
    setAlerts(prev => [{
        message: `${formName} generated and archived in Forms Library. Signed & Stamped with ${complianceSettings.companyTIN}.`,
        ...
    }]);
    addToast(`${formName} generated successfully. Filed to Government portal (simulated).`, 'success');
};
```

**What it does:**
- Pre-validates: blocks if any employee has missing SSB IDs (real compliance gate ✅)
- Pre-validates: blocks if no payroll records exist ✅
- **Creates a dashboard alert** saying the form was "generated" ✅
- **Does NOT generate an actual CSV/Excel file** ❌
- **Does NOT call any download/Blob/URL.createObjectURL** ❌
- Toast literally says "Filed to Government portal **(simulated)**"

The form names used:
- SSB tab: **"Form 15"** (Monthly SSB Contribution)
- PIT tab: **"Patakha-(W)-15"** (Monthly PIT)

**Verdict: SIMULATED. The compliance gate (SSB ID check) is real and functional, but the actual file generation is a stub. No CSV/Excel is produced.**

### 3.2 SSB Breakdown Table — NRC & Tax ID

The SSBPIT.tsx table (`line 258-262`) shows:
- **SSB tab:** `emp.ssbNumber` (SSB ID per employee)
- **PIT tab:** `emp.nrcNumber / emp.township`

**Does the PIT filing include Tax IDs?**
No — there is no `taxId` field on individual `Employee` records. The only Tax ID is `companyTIN` on `ComplianceSettings`. Individual employee TINs do not exist in the schema.

**Verdict: NRC is displayed, but individual employee Tax IDs are not modeled.**

### 3.3 PayrollRun Step 10 — Government Form Buttons

**Source:** `PayrollRun.tsx:601-631`

Two cards are rendered:
1. **ပတခ(ဝင)-၁₅(က)** — "Monthly Income Tax Form" → button says "Generate PDF"
2. **SSB Monthly Return** — "Employer & Employee 5% Contrib" → button says "Download Excel"

**Both buttons have NO `onClick` handler.** They are purely visual. No function is called, no file is generated.

**Verdict: DEAD BUTTONS. These are visual-only placeholders.**

---

## Part 4: Ghost Component Scan

### 4.1 Electronic Filing (IRD/SSB Portal Integration)

**Status: NOT IMPLEMENTED.**

There is no API integration, no fetch/axios call, no external URL, no e-filing function anywhere in the codebase. The "Simulate Government Filing" button in SSBPIT.tsx creates a local alert only.

### 4.2 Tax Year-End Simulation

**Status: NOT IMPLEMENTED.**

No component, function, or UI exists for projecting the total tax burden over the next 12 months. The PIT engine only calculates for the current payroll period.

### 4.3 Certificate of Income

**Status: NOT IMPLEMENTED.**

No PDF generation exists for employee income certificates. No function generates a signed/stamped document that employees could use for visa or loan applications.

---

## Part 5: Scaling & Transparency

### 5.1 The 500-Employee Load

**SSBPIT.tsx Table:** Uses a plain `<table>` with `.map()` over `filteredRecords` (`line 241`). **No virtual scrolling** (no `TableVirtuoso`, no `react-window`, no windowing). At 500+ rows, this will render all DOM nodes simultaneously.

**PayrollRun.tsx Table (Steps 3-7):** Also uses plain `<table>` with `.map()`. Same issue.

**Mitigating factor:** Debounced search (`useDebounce(searchQuery, 300)`) in SSBPIT.tsx reduces re-render frequency during filtering. Memoized aggregations (`useMemo`) prevent redundant recomputation.

**Verdict: NO virtual scrolling. Will work at 500 rows but with potential DOM overhead. Not optimized for 1000+.**

### 5.2 Tax Patch / Manual Override Audit Trail

**Compliance Settings changes are fully audited** in `Setting.tsx:379-466`:
- SSB Cap change → audit log
- SSB Percentage change → audit log
- PIT Rate change → audit log
- PIT Threshold change → audit log
- Working Days change → audit log

**However:** There is **no per-employee tax override mechanism**. Marcus cannot manually patch an individual employee's SSB or PIT amount. The system is formula-driven only — the tax figure is always computed, never manually editable.

This means:
- ✅ No risk of unaudited tax manipulation
- ❌ No ability to handle edge cases (e.g., employee with a government-issued tax exemption certificate)

**Verdict: PARTIAL. System-level changes are audited. Per-employee overrides don't exist (safe but inflexible).**

---

## Part 6: Critical Findings & Recommendations

### LIVE COMPLIANCE (Audit-Ready)

| # | Feature | Confidence |
|---|---------|------------|
| 1 | SSB 2% Employee calculation with cap | **Production-ready** |
| 2 | SSB base includes `isSSBRelevant` additions | **Production-ready** |
| 3 | PIT 6-tier annualized brackets | **Production-ready** |
| 4 | PIT computed after SSB deduction | **Production-ready** |
| 5 | Net Pay floor guard (clamp to 0) | **Production-ready** |
| 6 | SSB ID compliance gate blocks filing if IDs are missing | **Production-ready** |
| 7 | Compliance setting changes create audit logs | **Production-ready** |
| 8 | Payroll finalization creates immutable PayrunID + audit entry | **Production-ready** |

### STUBS / NOT READY FOR GOVERNMENT AUDIT

| # | Finding | Severity | Fix Required |
|---|---------|----------|--------------|
| 1 | **PIT does not use employee `reliefs`** (spouse/parent). Hardcoded 4.8M flat exemption. | **HIGH** | Wire `emp.reliefs` into `calcAnnualPIT` — add 1M per spouse, 1M per parent to the exemption threshold. |
| 2 | **PIT ignores `complianceSettings.pitExemption`**. The 4.8M is hardcoded in `calcAnnualPIT`. | **MEDIUM** | Replace the hardcoded `4800000` with `complianceSettings.pitExemption`. |
| 3 | **Employer SSB uses 1.5x shortcut** instead of dedicated `ssbEmployerPercent` / `ssbEmployerCap`. | **MEDIUM** | Compute employer SSB independently: `min(ssbBase × ssbEmployerPercent%, ssbEmployerCap)`. |
| 4 | **SSBPIT.tsx "Generate" buttons produce no actual file** — alert only. | **HIGH** | Implement real CSV/Excel generation using Blob + createObjectURL (same pattern as bank CSV export in PayrollRun.tsx:39-63). |
| 5 | **PayrollRun Step 10 form buttons are dead** — no onClick handler. | **HIGH** | Wire handlers to generate downloadable PIT form PDF and SSB Excel. |
| 6 | **No individual employee Tax ID (TIN)** in the Employee type. | **MEDIUM** | Add optional `taxId` field to Employee type for PIT payer list. |
| 7 | **No virtual scrolling** on tax registry tables. | **LOW** | Add `TableVirtuoso` (already used in EmployeesDirectory.tsx) for 500+ scale. |
| 8 | **No per-employee tax override** mechanism with audit trail. | **LOW** | Consider adding a "Tax Patch" adjustment type with mandatory reason + security log. |
| 9 | **Electronic Filing** — no IRD/SSB portal API. | **LOW** (future) | Placeholder acceptable for MVP; real integration requires government API access. |
| 10 | **Tax Year-End Simulation** — not implemented. | **LOW** (future) | Would require projecting 12 months of payroll with current employee data. |
| 11 | **Certificate of Income** — not implemented. | **LOW** (future) | Would require a PDF template with company stamp and authorized signatory. |

---

## BOTTOM LINE

> **The core "Legal Math" — SSB calculation, PIT tiered brackets, and Net Pay ordering — is LIVE and mathematically correct.** Marcus can trust the tax figures on individual payslips.
>
> **However, the system is NOT ready for an official government audit** because:
> 1. PIT reliefs are not personalized (every employee gets the same flat 4.8M exemption)
> 2. Government form exports are simulated (no actual CSV/PDF generated)
> 3. Individual employee TINs are missing from the data model
>
> **Priority fixes for audit-readiness:** Items #1, #4, #5 from the table above.
