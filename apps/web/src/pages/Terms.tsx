import React from 'react';
import { PageMeta } from '../components/common/PageMeta';

interface TermsProps {
  onNavigate?: (tab: string) => void;
}

export const Terms: React.FC<TermsProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <PageMeta
        title="Terms of Service | Invenza Enterprise SaaS"
        description="Comprehensive enterprise terms of service for the Invenza multi-tenant inventory management platform, covering ledger immutability, tenant isolation, and API usage."
        canonicalPath="/terms"
      />

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="text-xs font-mono font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400 mb-1.5">
          Master Subscription Agreement
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Terms of Service
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Effective Date: September 1, 2026 : Version 2.4 : Invenza Cloud Systems Inc.
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            1. Acceptance of Terms & Scope of Platform
          </h2>
          <p>
            By creating a tenant account, accessing the Invenza web application, or utilizing our RESTful inventory APIs, you agree to be bound by this Master Subscription Agreement. Invenza provides an enterprise inventory platform featuring double-entry stock movement ledgers, automated purchase order receipts (GRN), customer fulfillment dispatches, and multi-warehouse routing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            2. Multi-Tenant Cryptographic Isolation
          </h2>
          <p>
            Invenza operates on a strict multi-tenant architecture. Every catalog item, stock movement record, purchase order, and warehouse configuration is assigned a tenant identifier validated through signed JSON Web Tokens (JWT). Customer data is segregated at the query engine level, preventing any cross-tenant data leakage or unauthorized visibility across company partitions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            3. Movement Ledger Immutability & Audit Trail Integrity
          </h2>
          <p>
            You acknowledge and agree that Invenza utilizes an append-only stock movement ledger. Physical inventory reconciliations, scrap losses, order receipts, and transfers generate permanent transaction blocks. Under standard enterprise operating parameters, historical ledger entries cannot be overwritten or retroactively altered. Resetting catalog records via the administrative Danger Zone constitutes a permanent operation initiated solely by authorized account administrators.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            4. Service Level Commitment & API Usage Limits
          </h2>
          <p>
            Invenza commits to a 99.9% monthly uptime target for its cloud inventory endpoints. Standard API rate limiting is enforced at 120 requests per minute per tenant key to safeguard system availability. Systematic denial-of-service attempts or unapproved automated scraping of platform resources will result in immediate API credential suspension.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            5. Customer Data Ownership & Exportability
          </h2>
          <p>
            You retain exclusive ownership of all proprietary catalog data, pricing structures, warehouse layout definitions, and customer order records uploaded to Invenza. Customers may export complete inventory audit trails and product SKU definitions in standardized comma-separated values (CSV) format at any time without punitive termination fees.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            6. Limitation of Liability
          </h2>
          <p>
            In no event shall Invenza Systems, its directors, or suppliers be liable for indirect, incidental, or consequential damages arising from warehouse stockouts, third-party logistics courier delays, or physical inventory discrepancies resulting from operator data entry errors. Total liability is limited to subscription fees paid during the preceding six calendar months.
          </p>
        </section>
      </div>
    </div>
  );
};
