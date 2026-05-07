# TechDance HR — SSB & PIT Module: Business Impact Guide
**Version:** 1.0 | **Date:** April 2026

---

## Section A: 20 Real-World Usage Scenarios

### 1. Monthly SSB Filing for a 200-Person Factory
**Situation:** End of month — Marcus must file SSB Form 15.
**Feature:** Generate & Download SSB CSV.
**How:** SSB tab → verify green audit → "Generate & Download CSV" → upload to SSB portal. 2 minutes vs 2 days manual.

### 2. Explaining a Tax Hike to a Senior Engineer
**Situation:** Ko Zaw's PIT jumped after a salary increase.
**Feature:** PIT Tier Tooltip.
**How:** Hover Net Tax → "Annual: 16M | Exemption: 7.8M | Tier: 10%." Clear explanation.

### 3. Blocking a Non-Compliant SSB Filing
**Situation:** 3 new hires lack SSB numbers.
**Feature:** Compliance Audit Banner + Download Lock.
**How:** Red banner blocks filing. Download button greyed out until IDs resolved.

### 4. Departmental Cost-Center Review
**Situation:** CFO asks: "How much SSB is Engineering costing us?"
**Feature:** Department Dropdown Filter + Reactive KPIs.
**How:** Select "Engineering" → KPIs update → "Employer (3%): 54,000 MMK."

### 5. Catching Missing TINs Before IRD Submission
**Situation:** Two employees lack TINs before PIT export.
**Feature:** Missing TIN Badge (⚠ No TIN).
**How:** Amber badges flag the names. Marcus updates TINs before exporting clean CSV.

### 6. Applying a Government Tax Exemption Mid-Cycle
**Situation:** Ma Hla receives a disability PIT exemption certificate.
**Feature:** Tax Patch Manual Override.
**How:** Tax Patch → PIT → 0 MMK → Reason: "IRD cert #1234" → Apply. Triple audit log created.

### 7. Onboarding a Married Employee with Dependents
**Situation:** New hire has spouse and two parents.
**Feature:** Relief Configuration (spouse + parentsCount).
**How:** Reliefs → Spouse ✅, Parents: 2. Exemption rises 4.8M → 7.8M, saving ~25,000 MMK/month tax.

### 8. Verifying SSB Cap for High-Earning Executives
**Situation:** Auditor checks CEO's SSB.
**Feature:** SSB Capped column + Cap Guard.
**How:** Row shows Emp: 6,000, Empr: 9,000. Footer confirms cap. Auditor satisfied.

### 9. Downloading Forms After Payroll Finalization
**Situation:** Payroll finalized, need both CSVs immediately.
**Feature:** PayrollRun Step 10 Export Buttons.
**How:** "Download PIT CSV" + "Download SSB CSV" — same data as SSBPIT page.

### 10. Reconciling Exports Between Two Modules
**Situation:** Internal audit requires export parity proof.
**Feature:** Shared taxExport Utility.
**How:** Both pages call the same `exportSSBForm15CSV()` function. Files are byte-identical.

### 11. Searching for a Specific Employee's Tax Record
**Situation:** Nilar calls asking about her SSB deduction.
**Feature:** Debounced Search Bar.
**How:** Type "Nilar" → record appears → "SSB: 5,200 MMK, PIT: 12,500 MMK."

### 12. Scrolling Through 500+ Tax Records
**Situation:** Large factory review.
**Feature:** Virtual Scrolling (TableVirtuoso).
**How:** Only ~28 DOM rows at any time. No lag, no crashes.

### 13. Investigating a Suspicious Tax Override
**Situation:** Compliance officer spots a PIT override alert.
**Feature:** Security Audit Log.
**How:** Search "Tax Patch" → full detail: who, what, old/new value, reason.

### 14. Preparing for Annual Government Audit
**Situation:** IRD auditors want 12 months of PIT filings.
**Feature:** PIT CSV with NRC, TIN, Township.
**How:** Generate per-month CSVs. Every file has full identity columns. Audit-ready.

### 15. Correcting SSB After Late Data Entry
**Situation:** SSB-relevant allowance entered after payroll ran.
**Feature:** Tax Patch (SSB override).
**How:** Override SSB amount → Reason: "Late transport allowance" → net pay auto-adjusts.

### 16. Employer SSB Liability for Budget Planning
**Situation:** Finance needs total employer SSB for Q1.
**Feature:** KPI Card — Employer (3%).
**How:** "All Departments" → total employer SSB visible. Filter per dept for breakdown.

### 17. Switching Between SSB and PIT Views
**Situation:** File SSB, then immediately review PIT.
**Feature:** Tab Navigation.
**How:** Click PIT tab → KPIs, table, filing card all switch. No reload.

### 18. Updating Settings After Regulation Change
**Situation:** SSB Board raises employee cap from 6,000 to 8,000.
**Feature:** Settings → Compliance (audit-logged).
**How:** Update ssbCap → Save → audit log created. Next payroll uses new cap.

### 19. Verifying Zero-Tax Employees
**Situation:** Junior staff should pay no PIT.
**Feature:** Tier Tooltip (0% tier).
**How:** Hover → "Projection: 3.6M | Exemption: 4.8M | Tier: 0%. No PIT due."

### 20. Filing for a Single Department
**Situation:** Branch manager needs their department's SSB figures.
**Feature:** Department Filter.
**How:** Filter → "Mandalay Ops" → KPIs + table show department only.

---

## Section B: 10 Key Daily Problems

| # | Problem | Impact |
|---|---------|--------|
| 1 | Missing SSB IDs found at filing time | Government rejects form; late penalties |
| 2 | Incorrect employer vs employee SSB split | Regulatory risk; under/overpayment |
| 3 | No visibility into PIT tier applied | Employee distrust; HR cannot explain |
| 4 | Blank TINs in PIT payer lists | IRD rejects submission |
| 5 | Manual spreadsheet calculation errors | Over/under deductions; disputes |
| 6 | No department-level tax reports | Budget blind spots |
| 7 | No audit trail for manual tax changes | Fraud risk; audit failure |
| 8 | Browser crashes on large datasets | Missed deadlines |
| 9 | Data mismatch between payroll and tax exports | Double-filing risk |
| 10 | Flat PIT exemption ignores family status | Employees overtaxed |

---

## Section C: 20 Problems Solved & Business Impact

### 1. Late Filing → Proactive Compliance Audit
**Solved:** Red banner blocks filing until SSB IDs resolved.
**Well-being:** Employee benefits uninterrupted. **Operations:** Zero rejected forms. **Profit:** Avoids penalties (up to 500K MMK).

### 2. Incorrect SSB Split → Independent Calculation
**Solved:** Employer SSB uses separate rate/cap, not a multiplier shortcut.
**Well-being:** Correct payslip deductions. **Operations:** Audit-proof. **Profit:** No liability miscalculation.

### 3. Tax Confusion → PIT Tier Tooltip
**Solved:** Hover shows annual projection, exemption, tier %.
**Well-being:** Employee trust. **Operations:** 80% fewer tax queries. **Profit:** HR time saved.

### 4. Rejected PIT Filing → Missing TIN Badge
**Solved:** Amber badge flags employees without TIN before export.
**Well-being:** Proper tax attribution. **Operations:** First-time-right filing. **Profit:** No re-filing costs.

### 5. Spreadsheet Errors → Automated Engine
**Solved:** SSB/PIT calculated programmatically per Myanmar law.
**Well-being:** Correct net pay. **Operations:** Zero calculation errors. **Profit:** Eliminates correction costs.

### 6. No Dept Visibility → Department Filter
**Solved:** Dropdown instantly shows dept-level SSB/PIT totals.
**Well-being:** Fair budgeting. **Operations:** Real-time cost-center data. **Profit:** Better staffing decisions.

### 7. Untracked Overrides → Triple Audit Log
**Solved:** Tax Patch writes to Security Log + Audit Log + System Alert.
**Well-being:** Fraud protection. **Operations:** Full traceability. **Profit:** Passes government audits.

### 8. Browser Crashes → Virtual Scrolling
**Solved:** TableVirtuoso renders ~28 rows regardless of dataset size.
**Well-being:** Less frustration. **Operations:** 500+ records scroll smoothly. **Profit:** No missed deadlines.

### 9. Export Mismatch → Shared Utility
**Solved:** SSBPIT page and PayrollRun Step 10 call identical functions.
**Well-being:** Data trust. **Operations:** Byte-identical exports. **Profit:** Zero reconciliation effort.

### 10. Flat Exemption → Personalized Reliefs
**Solved:** PIT exemption includes spouse (1M) + parents (1M each).
**Well-being:** Fair taxation. **Operations:** IRD-compliant. **Profit:** No employee grievance costs.

### 11. Slow Employee Lookup → Debounced Search
**Solved:** 300ms debounced search by name or ID.
**Well-being:** Quick answers to employee queries. **Operations:** Instant lookup. **Profit:** Reduced HR call time.

### 12. Cap Miscalculation → Math.min Guard
**Solved:** SSB capped independently for employee (6K) and employer (9K).
**Well-being:** High earners not overcharged. **Operations:** Auditor-visible cap column. **Profit:** Accurate liability.

### 13. Disjointed Filing → Tab Navigation
**Solved:** SSB and PIT in one page with instant tab switch.
**Well-being:** Less context-switching stress. **Operations:** Single workflow. **Profit:** Faster filing cycle.

### 14. Post-Payroll Corrections → Tax Patch
**Solved:** Override SSB/PIT with mandatory reason + audit log.
**Well-being:** Employee gets correct amount. **Operations:** Controlled correction path. **Profit:** No full payroll re-run needed.

### 15. Regulation Changes → Audited Settings
**Solved:** Compliance settings editable with automatic audit log.
**Well-being:** Employees taxed per latest law. **Operations:** Change history preserved. **Profit:** Instant regulatory adaptation.

### 16. Audit Preparation → CSV with Identity Columns
**Solved:** Every CSV includes NRC, TIN, SSB ID, Township.
**Well-being:** Proper identity verification. **Operations:** Government-ready format. **Profit:** No audit remediation costs.

### 17. Unknown Employer Liability → KPI Card
**Solved:** Dedicated "Employer (3%)" KPI card shows aggregate.
**Well-being:** Transparent company costs. **Operations:** Budget visibility. **Profit:** Accurate financial forecasting.

### 18. Filing Without Payroll → Empty-State Guard
**Solved:** "No payroll records" warning prevents empty CSV generation.
**Well-being:** No confusion. **Operations:** Clean workflow. **Profit:** No wasted government submissions.

### 19. Negative Net Pay → Floor Guard
**Solved:** `Math.max(0, netPay)` prevents negative payslips + alert raised.
**Well-being:** Employee never owes money. **Operations:** Flagged for review. **Profit:** No payroll disputes.

### 20. Single-Dept Reporting → Filter + Clear
**Solved:** Filter to department, review, then "Clear Filter" for company-wide.
**Well-being:** Branch managers empowered. **Operations:** Self-serve reporting. **Profit:** Decentralized accountability.

---

*End of Document — SSB_PIT_Business_Impact_Guide v1.0*
