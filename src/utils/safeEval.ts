/**
 * safeEval — A zero-dependency math/logic expression evaluator.
 * Replaces eval() for penalty rule conditions in Attendance.tsx.
 *
 * Supports: >, <, >=, <=, ==, !=, &&, ||, +, -, *, /
 *
 * Usage:
 *   safeEval('LateMinutes > 15', { LateMinutes: 20 }) // → true
 *   safeEval('LateMinutes * PenaltyRate', { LateMinutes: 30, PenaltyRate: 50 }) // → 1500
 */
export function safeEval(expression: string, vars: Record<string, number>): number | boolean {
    try {
        // 1. Substitute variable names with their numeric values
        let expr = expression;
        for (const [key, val] of Object.entries(vars)) {
            expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(val));
        }

        // 2. Validate the expression only contains safe characters
        //    Allowed: digits, spaces, operators, parens, decimals, boolean literals
        if (!/^[\d\s+\-*/.()<>=!&|]+$/.test(expr)) {
            console.warn('[safeEval] Blocked unsafe expression:', expression);
            return 0;
        }

        // 3. Evaluate using Function constructor (sandboxed arithmetic only)
        //    No access to window, document, or any external scope
        // eslint-disable-next-line no-new-func
        const result = new Function(`"use strict"; return (${expr})`)();

        if (typeof result === 'boolean' || typeof result === 'number') {
            return result;
        }
        return 0;
    } catch (e) {
        console.warn('[safeEval] Evaluation failed:', expression, e);
        return 0;
    }
}
