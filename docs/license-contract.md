# License Token Contract Specification

This document defines the contract between `invenaro-control` (the license issuance service) and `invenaro` (the application verifying the license).

The schema implementation in code is maintained in [`packages/shared/src/license-schema.ts`](file:///c:/Users/vijay/Project_26/Invenaro/packages/shared/src/license-schema.ts).

---

## 1. Cryptographic Standard
- **Algorithm**: `EdDSA` (Curve `Ed25519`).
- **Signature verification**: Public key provided in standard Base64 SPKI PEM (`LICENSE_PUBLIC_KEY`) or JWKS with `kid` matching (`LICENSE_PUBLIC_JWKS`).
- **Key Identifier**: Present in JWT header `kid`.

---

## 2. Token Claims (JWT Payload)

| Claim | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `iss` | `string` | Yes | Must be `"invenaro-control"`. |
| `sub` | `string` | Yes | Customer ID. |
| `licenseId` | `string` | Yes | Unique license UUID. |
| `plan` | `"basic"` \| `"business"` \| `"enterprise"` | Yes | License tier. |
| `modules` | `Record<LicenseModuleKey, boolean>` | Yes | Map of 13 module entitlements. |
| `status` | `"active"` \| `"grace"` \| `"expired"` \| `"suspended"` | Yes | License health status. |
| `licenseExpiresAt` | `string` (ISO 8601) | Yes | Expiration timestamp of the license subscription. |
| `graceDays` | `number` | Yes | Duration in days for grace period after expiration. |
| `domain` | `string` | No | FQDN domain authorized to run the instance (e.g. `app.customer.com`). |
| `iat` | `number` | Yes | Issued-at epoch timestamp (seconds). |
| `exp` | `number` | Yes | JWT expiration epoch timestamp (seconds) — default 48 hours. |

---

## 3. Recognized Module Keys

The 13 gated modules are:

1. `multi_godown` - Multiple warehouse / godown locations beyond the primary warehouse.
2. `transfers` - Stock transfers between godowns/warehouses.
3. `invoices_returns` - Direct invoices, sales & purchase returns, and purchase bills.
4. `payments_dues` - Payment records, outstanding balance tracking, and customer dues.
5. `stock_control` - Inventory adjustments, opening stock entry, stock count, and reorder levels.
6. `gst` - GST calculation, tax invoicing, and GST compliance reports.
7. `ledger_ui` - Full ledger screens, party accounts, and ledger statements.
8. `reports_advanced` - Advanced analytical and financial reports.
9. `import_export` - Excel/CSV import and export pipelines.
10. `batch_expiry` - Batch tracking and expiry date monitoring.
11. `barcode` - Barcode scanning and label generation.
12. `ai_data_assistant` - AI assistant for data queries and insights.
13. `ai_knowledge_assistant` - AI assistant for product documentation and inventory knowledge.

---

## 4. Verification Endpoint

- **Endpoint**: `POST {LICENSE_API_URL}/v1/licenses/verify`
- **Request Body**:
  ```json
  {
    "licenseKey": "INV-XXXX-XXXX-XXXX-XXXX-XXXX",
    "domain": "app.customer.com",
    "appVersion": "1.0.0"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "token": "<Signed EdDSA JWT>",
      "expiresAt": "2026-09-23T12:00:00.000Z",
      "status": "active"
    }
    ```
  - `400 Bad Request`: `{ "error": "invalid_request" }`
  - `401 Unauthorized`: `{ "error": "invalid_key" }`
  - `403 Forbidden`: `{ "error": "domain_mismatch" }`
  - `429 Too Many Requests`: `{ "error": "rate_limited" }`
