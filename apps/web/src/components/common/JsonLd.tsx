import React, { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface JsonLdProps {
  type?: 'software' | 'organization' | 'breadcrumbs';
  breadcrumbs?: BreadcrumbItem[];
}

export const JsonLd: React.FC<JsonLdProps> = ({ type = 'software', breadcrumbs = [] }) => {
  useEffect(() => {
    const existingScript = document.getElementById(`jsonld-${type}`);
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = `jsonld-${type}`;
    script.type = 'application/ld+json';

    let schemaData: object = {};

    if (type === 'organization') {
      schemaData = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Invenza Enterprise Systems',
        url: 'https://invenza.app',
        logo: 'https://invenza.app/apple-touch-icon.png',
        description: 'Next-generation cloud-native multi-tenant inventory management system with immutable movement ledgers.',
        sameAs: [
          'https://github.com/invenza',
          'https://twitter.com/invenza_app',
        ],
      };
    } else if (type === 'software') {
      schemaData = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Invenza Inventory Management Platform',
        operatingSystem: 'All Modern Web Browsers (Chrome, Firefox, Safari, Edge)',
        applicationCategory: 'BusinessApplication',
        description: 'Enterprise multi-warehouse SaaS with immutable double-entry movement ledger, automated GRN, and real-time valuation.',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
        },
        featureList: [
          'Append-only immutable movement ledger audit stream',
          'Inter-warehouse bilateral transfer protocol',
          'Real-time FIFO and Weighted Average financial costing models',
          'Dynamic JSONB custom schema engine for SKUs',
          'Dual-engine AI Copilot with text-to-SQL and pgvector SOP retrieval',
        ],
      };
    } else if (type === 'breadcrumbs' && breadcrumbs.length > 0) {
      schemaData = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url.startsWith('http') ? item.url : `https://invenza.app${item.url.startsWith('/') ? item.url : `/${item.url}`}`,
        })),
      };
    }

    script.textContent = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(`jsonld-${type}`);
      if (el) el.remove();
    };
  }, [type, breadcrumbs]);

  return null;
};
