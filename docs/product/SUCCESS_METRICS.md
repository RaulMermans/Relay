# Success metrics

Each metric is either a hypothesis, a target, or an observed result. Sprint 01 contains no observed results; a target is not evidence.

## Primary metric

| Name | Definition | Formula | Numerator | Denominator | Unit | Measurement moment | Evidence required | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reporting Time Reduction | Reduction in time to complete a comparable reporting cycle with Relay-style workflow | `(manual reporting time - Relay reporting time) / manual reporting time` | Manual reporting minutes minus Relay reporting minutes | Manual reporting minutes | Percentage | After each completed reporting cycle; report the median | Timed manual and Relay-style cycles for the same participant and comparable scope | Target: >=60%; not observed |

## Secondary metrics

| Name | Definition | Formula | Numerator | Denominator | Unit | Measurement moment | Evidence required | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| First Report Setup Time | Time from starting Relay setup to first reviewable report | `first reviewable report time - setup start time` | N/A | N/A | Minutes | First completed setup per client | Timestamped setup and first reviewable report | Hypothesis; not observed |
| Repeat Report Setup Time | Time required for a subsequent cycle for the same client | `repeat setup finish - repeat setup start` | N/A | N/A | Minutes | Each subsequent completed reporting cycle | Timestamped repeat-cycle setup | Hypothesis; not observed |
| Insight Acceptance Rate | Reviewed generated observations accepted without major factual or analytical correction | `accepted observations / total reviewed observations` | Accepted observations | Reviewed generated observations | Percentage | After human review of a report | Observation-level review decisions and correction notes | Target: >=70%; not observed |
| Major Edit Rate | Reviewed generated observations needing material factual or analytical correction | `majorly edited observations / total reviewed observations` | Majorly edited observations | Reviewed generated observations | Percentage | After human review of a report | Observation-level edit classifications | Hypothesis; not observed |
| Report Completion Rate | Started reports completed | `completed reports / started reports` | Completed reports | Started reports | Percentage | Per reporting period and cohort | Started/completed report records or manual log | Hypothesis; not observed |
| Report Send Rate | Completed reports actually sent to a real client | `sent reports / completed reports` | Reports confirmed sent | Completed reports | Percentage | After report completion | Marketer confirmation or sending record | Hypothesis; not observed |
| Consecutive Reporting Cycles | Successive reporting periods completed by the same user/client workflow | Count of uninterrupted completed cycles | Completed successive cycles | N/A | Whole-number cycles | After each reporting period | Per-client reporting-cycle log | Hypothesis; not observed |
| Mapping Reuse Rate | Eligible recurring source mappings automatically reused | `automatically reused mappings / eligible recurring mappings` | Automatically reused mappings | Eligible recurring mappings | Percentage | On recurring source setup | Mapping decision log | Hypothesis; not observed |
| Connector Fetch Success Rate | Connector fetch attempts that complete successfully | `successful fetches / fetch attempts` | Successful connector fetches | Connector fetch attempts | Percentage | Per fetch and reporting period | Structured connector attempt log | Hypothesis; not observed |
| Report Generation Failure Rate | Report-generation attempts that fail | `failed generation attempts / total generation attempts` | Failed report-generation attempts | Total report-generation attempts | Percentage | Per generation attempt and reporting period | Structured report-generation attempt log | Hypothesis; not observed |

The initial AI target applies to accepted observations without major factual or analytical correction. It does not establish that an LLM is accurate until observations and reviews are recorded.
