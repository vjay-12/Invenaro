import React from 'react';
import { PageMeta } from '../components/common/PageMeta';

interface PrivacyProps {
  onNavigate?: (tab: string) => void;
}

export const Privacy: React.FC<PrivacyProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <PageMeta
        title="Privacy Policy | Invenza Enterprise SaaS"
        description="Data privacy, tenant isolation, and cryptographic security policy for Invenza multi-warehouse inventory management platform."
        canonicalPath="/privacy"
      />

      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="text-xs font-mono font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400 mb-1.5">
          Data Governance & Security
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Last Revised: September 1, 2026 : Invenza Security & Compliance Office
        </p>
      </div>

      {/* Content Sections */}
      <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            1. Information Collection & Inventory Data Handling
          </h2>
          <p>
            Invenza collects business contact information (operator names, verified corporate email addresses, and assigned administrative roles) required to facilitate secure system access. In addition, our systems process operational inventory telemetry: product descriptions, stock levels, warehouse coordinates, supplier manifests, and purchase/sales orders provided by your authorized operators.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            2. Strict Tenant Segregation & Encryption Standards
          </h2>
          <p>
            All operational data is protected by encryption both in transit (TLS 1.3) and at rest (AES-256). Invenza enforces multi-tenant database partitioning using tenant isolation keys on PostgreSQL 16 schemas. Under no circumstances is inventory valuation, vendor pricing, or customer demand data cross-referenced, mined, or exposed across disparate tenant accounts.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            3. AI Copilot Data Boundary & Training Opt-Out
          </h2>
          <p>
            Invenza provides an integrated AI inventory copilot capable of synthesizing natural language SQL queries and retrieving standard operating procedures. Customer inventory quantities, cost figures, and customer sales order contents are never utilized to train public foundation models. Queries dispatched to the copilot are scoped strictly to the authenticated tenant context and cached temporarily for audit logging.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            4. Data Retention & Deletion Protocol
          </h2>
          <p>
            Operational movement ledger records are retained for the duration of the active subscription to maintain accounting compliance and historical audit continuity. Upon verified tenant termination request, all catalog items, custom JSONB schema entries, and user credentials are systematically purged from active storage within thirty calendar days.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            5. Subprocessors & Infrastructure Providers
          </h2>
          <p>
            Invenza utilizes ISO 27001 and SOC 2 Type II certified cloud infrastructure providers located in verified regional data zones. We do not sell, license, or monetize customer inventory data or supply chain analytics to third-party advertising exchanges.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            6. Contact Data Protection Officer
          </h2>
          <p>
            For compliance inquiries, data protection impact assessments, or enterprise export requests, contact the Invenza Security Team at: security@invenza.app.
          </p>
        </section>
      </div>
    </div>
  );
};
