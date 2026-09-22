import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

export const firstLoginChangePasswordSchema = z.object({
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
});

export const setupSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(10, 'Password must be at least 10 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF']).default('STAFF'),
  assigned_godown_id: z.string().optional().nullable(),
});

export const updateCompanySettingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  legal_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  state_code: z.string().optional().nullable(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').optional().nullable().or(z.literal('')),
  enable_gst: z.boolean().default(false),
  logo_url: z.string().optional().nullable(),
});

export const productSchema = z.object({
  sku: z.string().min(1, 'SKU is required').max(50),
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().optional().nullable(),
  category_id: z.string().optional().nullable(),
  unit: z.string().min(1, 'Unit is required').default('PCS'),
  sale_price: z.number().min(0, 'Sale price must be non-negative'),
  purchase_price: z.number().min(0, 'Purchase price must be non-negative').default(0),
  hsn_code: z.string().optional().nullable(),
  tax_rate: z.number().min(0).max(100).default(0),
  min_stock_level: z.number().min(0).default(0),
  initial_stock: z.number().min(0).optional().default(0),
  godown_id: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  state_code: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
});

export const salesOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  discount: z.number().min(0).default(0),
  tax_rate: z.number().min(0).default(0),
});

export const salesOrderSchema = z.object({
  customer_id: z.string().optional().nullable(),
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional().nullable(),
  customer_address: z.string().optional().nullable(),
  customer_gstin: z.string().optional().nullable(),
  godown_id: z.string().optional(),
  order_date: z.string().default(() => new Date().toISOString()),
  notes: z.string().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

export const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit_cost: z.number().min(0, 'Unit cost must be non-negative'),
  tax_rate: z.number().min(0).default(0),
});

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().optional().nullable(),
  supplier_name: z.string().min(1, 'Supplier name is required'),
  supplier_phone: z.string().optional().nullable(),
  supplier_address: z.string().optional().nullable(),
  supplier_gstin: z.string().optional().nullable(),
  godown_id: z.string().optional(),
  order_date: z.string().default(() => new Date().toISOString()),
  expected_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const godownSchema = z.object({
  name: z.string().min(1, 'Godown name is required'),
  code: z.string().min(1, 'Godown code is required'),
  address: z.string().optional().nullable(),
  state_code: z.string().optional().nullable(),
  gstin: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
});
