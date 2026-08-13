import { IntakeForm } from "./intake-form";

export default function Home() {
  return (
    <main className="intake-page">
      <header className="page-introduction">
        <p className="product-mark">Relay / CSV intake</p>
        <h1>Relay</h1>
        <p className="page-thesis">Inspect one CSV before it enters your reporting workflow.</p>
        <p className="page-context">
          Relay validates the file on the server, identifies fixture-backed export signatures, and lets you review
          canonical field mappings before transient normalization. It does not save the upload.
        </p>
      </header>
      <div className="connector-status-list" aria-label="API source status">
        <section className="connector-status" aria-labelledby="shopify-api-heading">
          <div>
            <p className="section-label">Connected source</p>
            <h2 id="shopify-api-heading">Shopify API</h2>
          </div>
          <p><strong>Not connected.</strong> API adapter implemented. Live connection is not available yet.</p>
        </section>
        <section className="connector-status" aria-labelledby="meta-api-heading">
          <div>
            <p className="section-label">Connected source</p>
            <h2 id="meta-api-heading">Meta Ads API</h2>
          </div>
          <p><strong>Not connected.</strong> API adapter implemented. Live connection is not available yet.</p>
        </section>
        <section className="connector-status" aria-labelledby="google-api-heading">
          <div>
            <p className="section-label">Connected source</p>
            <h2 id="google-api-heading">Google Ads API</h2>
          </div>
          <p><strong>Not connected.</strong> API adapter implemented. Live connection is not available yet.</p>
        </section>
      </div>
      <IntakeForm />
    </main>
  );
}
