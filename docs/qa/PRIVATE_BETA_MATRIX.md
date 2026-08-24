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

Manual exploratory and visual status is recorded in the release gate, not inferred from automation. Current manual status: **PENDING**; automated responsive and cross-browser smoke does not substitute for tester-facing exploratory review.
