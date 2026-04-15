# Data Consistency Audit & Implementation Plan

## 1. Date Format Inconsistencies

### Issue
- **System Standard**: `getFormattedDate` uses `en-GB` locale (DD/MM/YYYY) for 'short' and 'long' formats
- **ISO Standard**: Uses YYYY-MM-DD for 'iso' format
- **Mixed Usage**: `new Date().toISOString()` used directly in some places (e.g., `PayrollProvider.tsx:1222`, `AppDataContext.tsx:1226`)
- **Mock Data**: Hardcoded dates like `'16/09/2023'` (DD/MM/YYYY) in `AppDataContext.tsx:199`

### Recommended Standard
- **Storage/DB**: ISO 8601 (`YYYY-MM-DD`)
- **Display**: Use `getFormattedDate(date, 'short')` -> "15 Oct 2023"
- **Display (Long)**: Use `getFormattedDate(date, 'long')` -> "15 Oct 2023, 02:30 PM"
- **Timestamps**: ISO 8601 with time (`YYYY-MM-DDTHH:mm:ss.sssZ`)

### Action Items
- [ ] Replace direct `new Date().toISOString()` calls with `getFormattedDate(date, 'iso')` or `getCurrentDateISO()`
- [ ] Normalize mock data dates in `AppDataContext.tsx` to YYYY-MM-DD
- [ ] Audit `parseGregorianDate` for robustness

---

## 2. Timezone Handling

### Issue
- `SystemCalendarContext` uses `serverOffsetMs` (currently hardcoded to 0)
- No explicit UTC vs Local handling
- `toLocaleTimeString('en-GB')` uses local browser time

### Recommended Standard
- Store all timestamps in UTC (ISO 8601)
- Display in local time using `getFormattedDate(date, 'time')`
- Explicitly handle timezone offsets if connecting to external APIs

### Action Items
- [ ] Verify `serverOffsetMs` is properly calculated from server time
- [ ] Ensure all `Date` objects used in calculations are normalized to UTC

---

## 3. Currency Formatting

### Issue
- **Base Currency**: Consistent 'MMK' in types and mock data
- **Display Variations**:
  - Straight: `1000000 MMK`
  - Lakhs: `(10).toFixed(2) + ' L'` (divides by 100,000)
  - Mixed in UI: `LoansAdvances.tsx:180` shows "10 L" sub "MMK"

### Recommended Standard
- Store as integer (Kyat) in DB
- Display using `toLocaleString()` + " MMK" (e.g., "1,000,000 MMK")
- Avoid "L" abbreviation in data tables; use only in KPI cards with clear labeling

### Action Items
- [ ] Create `formatCurrency(amount: number)` utility in `src/utils/formatters.ts`
- [ ] Replace inline `.toFixed(2) + ' L'` with standardized KPI display component
- [ ] Audit all currency display locations

---

## 4. Decimal Places

### Issue
- **Hours**: `.toFixed(2)` (e.g., "7.50 hours")
- **Policy Version**: `.toFixed(2)` (e.g., "1.02")
- **Currency**: `.toLocaleString()` (no fixed decimals, e.g., "1,000,000")
- **Percentages**: Varies (some `.toFixed(1)`, some `.toFixed(2)`)

### Recommended Standard
- **Currency**: No decimal places (Kyat are integers)
- **Hours**: 2 decimal places
- **Percentages**: 1 decimal place
- **Version Numbers**: 2 decimal places

### Action Items
- [ ] Create `formatNumber(value, type)` utility
- [ ] Standardize all display logic

---

## 5. Phone Number Formats

### Issue
- **Standard**: `09-4500-1122`, `09-7788-3344`
- **Incomplete**: `0922` (only 4 digits!)
- **Mixed**: No strict validation

### Recommended Standard
- **Format**: `09-XXXXXXXX` (11 digits with dash after prefix)
- **Regex**: `^09\d{9}$` (storage), display as `XX-XXXXXXXX`

### Action Items
- [ ] Add phone validation in Employee forms
- [ ] Normalize existing `mobile` fields in mock data
- [ ] Create `formatPhoneNumber(phone)` utility

---

## 6. Name Field Casing

### Issue
- Mock data shows mixed casing: "Nilar Lwin", "Ko Min", "Daw Aye Aye Myint"
- No standardization enforced in forms

### Recommended Standard
- **Storage**: Proper Case (Title Case)
- **Display**: Proper Case
- **Search**: Case-insensitive

### Action Items
- [ ] Add name normalization in `addEmployee` / `updateEmployee`
- [ ] Create `formatName(name)` utility

---

## 7. Email Validation

### Issue
- Relies on HTML5 `<input type="email">` (Login.tsx:84)
- No custom validation logic visible

### Recommended Standard
- Use standard regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Validate on blur and submit

### Action Items
- [ ] Add `validateEmail(email)` utility
- [ ] Implement in all forms capturing email

---

## 8. Status Strings (Critical)

### Issue
- **Inconsistent Casing**:
  - `hrms.types.ts:298`: `'draft' | 'approved' | 'disbursed'` (lowercase)
  - Most other places: `'Pending' | 'Approved' | 'Rejected'` (Title Case)
- **Different Sets**:
  - Loan: `'Pending' | 'Approved' | 'Active' | 'Completed' | 'Rejected'`
  - Disbursement: `'draft' | 'approved' | 'disbursed'`
  - Location: `'Pending' | 'Acknowledged'`

### Recommended Standard
- **Casing**: Title Case (Pending, Approved, Rejected, Active)
- **Enums**: Define strict unions in `hrms.types.ts`

### Action Items
- [ ] Standardize `DisbursementBatch.status` to Title Case in `hrms.types.ts`
- [ ] Audit all `status` field assignments for casing consistency
- [ ] Create Status Badge component enforcing consistent labels

---

## 9. Ad-Hoc Quality Checks

### Issue
- `totalHours` can be `7.9` or `7.50` (inconsistent decimals)
- `geofenceStatus`: 'Verified', 'Violation' - not in types explicitly
- `checkInMethod`: 'Biometric', 'Mobile App', 'Web Portal' - not standardized

### Action Items
- [ ] Add `checkInMethod` to `AttendanceLog` type
- [ ] Standardize `geofenceStatus` values
- [ ] Audit `totalHours` generation

---

## Implementation Priority

1. **High Impact**: Status strings, Date formats (cause runtime bugs)
2. **Medium Impact**: Currency/Number formatting, Phone numbers (UI consistency)
3. **Low Impact**: Email validation, Name casing (cosmetic/UX)

## Suggested Utility File

Create `src/utils/formatters.ts`:
```typescript
export const formatCurrency = (amount: number): string => 
  amount.toLocaleString() + ' MMK';

export const formatPhoneNumber = (phone: string): string => 
  // Normalize to 09XXXXXXXXX format
  phone.replace(/\D/g, '').replace(/^9/, '09-');

export const formatName = (name: string): string => 
  name.replace(/\b\w/g, l => l.toUpperCase());

export const formatDate = (date: string | Date, type: 'short' | 'long' | 'iso' | 'time' = 'short'): string => {
  // Use getFormattedDate from SystemCalendarContext
};
```
