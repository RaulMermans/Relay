# Relay validation experiment

## Purpose

Evaluate one real reporting cycle using a manual or semi-manual Relay-style workflow. This is a product-validation experiment, not application implementation.

## Inputs

Collect anonymized current-period exports, equivalent previous-period exports, the marketer's completed report, and available client targets or context.

## Procedure

1. Record the marketer's original reporting time and artifact set.
2. Align periods and identify the available advertising and commerce inputs.
3. Compute and document Revenue, Spend, MER, Orders, and relevant channel KPIs from the supplied inputs.
4. Identify the largest positive driver and largest negative driver with source -> campaign -> metric contribution provenance where available.
5. Record efficiency risks, such as spend growing faster than revenue, without inferring causality beyond the facts.
6. Flag target breaches only when explicit targets are supplied.
7. Preserve reconciliation notes, including distinctions between advertising-attributed revenue and Shopify/store revenue.
8. Draft an executive summary from computed facts only.
9. Separate data-supported recommendations from marketer-provided context.
10. Obtain marketer review and record acceptance, edits, rejection, and send intent.

## Relay-style output

The resulting review artifact contains performance change, largest positive/negative drivers, efficiency risk, target breaches, reconciliation notes, grounded executive summary, and clearly labeled recommendations. It must distinguish computed facts from marketer context.

## Measurements

Capture original reporting time, Relay-style reporting time, observations generated, accepted, edited, and rejected; missing contextual information; output usability; whether the marketer would send it; and whether they would use Relay next cycle.

## Decision rules

### PASS

Evidence shows substantial reporting-time reduction, output trusted enough to use, and marketer intent to use Relay again.

### WEAK PASS

Meaningful time reduction exists but significant manual correction remains; output is useful internally but not client-ready; or repeat interest exists with a major unresolved workflow bottleneck.

### FAIL

Reporting time is not materially improved; findings are frequently incorrect or useless; the workflow requires too much per-client custom work; users prefer their existing process; or there is no repeat-use intent.

UI enthusiasm alone is not validation evidence.
