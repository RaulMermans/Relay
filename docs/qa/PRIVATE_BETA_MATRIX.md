# Private-beta test matrix

| Scenario | Expected outcome | Evidence |
| --- | --- | --- |
| First/returning client; browser reload | Local client/snapshot restores only in same browser | E2E + manual PASS required |
| Meta-only, Google-only, Shopify-only, paid-media, complete workspace | Correct source-specific semantics; Shopify remains commerce truth | Integration suite |
| Mapping correction / wrong source / bad CSV | Actionable correction; no partial analysis | Unit/integration suite |
| Data Health warning/blocked; target breach; stale data/report | Visible state, blocked report/export when required | Integration/E2E suite |
| Storage corruption/unavailable | Reset/ephemeral warning; no crash or cross-client data | Unit/E2E suite |
| Mobile/tablet; long client names | No hidden primary actions or overflowing critical values | Manual PASS required |
| Chromium, Firefox, WebKit/Safari | Upload → analyze → dashboard → reload → report preview | Focused cross-browser smoke |
| PDF export | Explicit current-report print dialog; browser controls final PDF | Focused E2E + manual PASS |

Manual exploratory and visual status is recorded in the release gate, not inferred from automation. Current manual status: **PASS** (2026-08-25).

Recorded manual evidence: a production, protected three-source workspace restored after reload with €225 Shopify Commerce Revenue, €55 paid spend, 4.09x MER, and 2 orders. The dashboard's primary navigation/actions and critical KPI values remained visible at 390 px and 768 px. The report preview kept Meta Ads, Google Ads, and Shopify metrics source-specific, and Chrome produced `relay-relay-qa-synthetic-2026-08-01-to-2026-09-01.pdf`: a six-page tagged A4 PDF with no JavaScript, preserving the reviewed report content and methodology.
