export type PlanType = 'basic' | 'business' | 'enterprise';

export interface PlanModules {
  multi_godown: boolean;
  transfers: boolean;
  invoices_returns: boolean;
  payments_dues: boolean;
  stock_control: boolean;
  gst: boolean;
  ledger_ui: boolean;
  reports_advanced: boolean;
  import_export: boolean;
  batch_expiry: boolean;
  barcode: boolean;
  ai_data_assistant: boolean;
  ai_knowledge_assistant: boolean;
}

export interface LicensePayload {
  customer_id: string;
  plan: PlanType;
  expires_at: string;
  modules: PlanModules;
  domain?: string;
}

export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assigned_godown_id?: string | null;
  created_at: string;
}

export interface CompanySettingsDTO {
  id: string;
  company_name: string;
  legal_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  state_code?: string | null;
  gstin?: string | null;
  enable_gst: boolean;
  logo_url?: string | null;
}

export interface GodownDTO {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  state_code?: string | null;
  gstin?: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface ProductDTO {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  unit: string;
  sale_price: number;
  purchase_price: number;
  hsn_code?: string | null;
  tax_rate: number;
  min_stock_level: number;
  current_stock?: number;
  is_active: boolean;
}

export type MovementType =
  | 'PURCHASE_RECEIPT'
  | 'SALES_DELIVERY'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_REDUCE'
  | 'RETURN_IN'
  | 'RETURN_OUT';

export interface StockMovementDTO {
  id: string;
  movement_type: MovementType;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  godown_id: string;
  godown_name?: string;
  quantity: number;
  unit_cost: number;
  balance_after: number;
  reference_type: string;
  reference_id: string;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

export interface SalesOrderItemDTO {
  id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  unit?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface SalesOrderDTO {
  id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_gstin?: string | null;
  godown_id: string;
  order_date: string;
  status: OrderStatus;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  notes?: string | null;
  items: SalesOrderItemDTO[];
  created_at: string;
}

export type POStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItemDTO {
  id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  unit?: string;
  quantity: number;
  unit_cost: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

export interface PurchaseOrderDTO {
  id: string;
  po_number: string;
  supplier_id?: string | null;
  supplier_name: string;
  supplier_phone?: string | null;
  supplier_address?: string | null;
  supplier_gstin?: string | null;
  godown_id: string;
  order_date: string;
  expected_date?: string | null;
  status: POStatus;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  notes?: string | null;
  items: PurchaseOrderItemDTO[];
  created_at: string;
}
