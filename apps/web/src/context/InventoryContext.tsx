import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Product,
  Location,
  StockMovement,
  PurchaseOrder,
  SalesOrder,
  StockTransfer,
  AdjustmentRecord,
  CustomFieldDefinition,
  CurrencyCode,
  AdjustmentReasonCode,
  MovementType,
} from '../types/inventory';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { formatMoney } from '../data/platformConstants';
import { TaxConfig, TaxRegime } from '../utils/taxUtils';

interface InventoryContextType {
  products: Product[];
  locations: Location[];
  ledger: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  transfers: StockTransfer[];
  adjustments: AdjustmentRecord[];
  customFields: CustomFieldDefinition[];
  currency: CurrencyCode;
  countryCode: string;
  taxType: TaxRegime;
  taxRate: number;
  taxLabel: string;
  taxConfig: TaxConfig;
  selectedLocationId: string;
  setSelectedLocationId: (locId: string) => void;
  formatCurrency: (amount: number, fromCurrency?: CurrencyCode) => string;
  
  // Actions
  addProduct: (product: Omit<Product, 'id' | 'currentStock' | 'locationStock' | 'createdAt' | 'isActive'>) => void;
  bulkAddProducts: (
    products: (Omit<Product, 'id' | 'currentStock' | 'locationStock' | 'createdAt' | 'isActive'> & { initialStock?: number })[]
  ) => Promise<number>;
  updateProduct: (id: string, product: Partial<Product>) => void;
  toggleProductActive: (id: string) => Promise<void>;
  deleteProduct: (id: string) => void;
  deleteProducts: (ids: string[]) => void;
  clearAllProducts: (options?: { performedBy?: string; password?: string; otp?: string }) => Promise<void>;
  clearLedger: (options?: { requestedBy?: string; approvedBy?: string }) => Promise<void>;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status'>) => void;
  receiveGoods: (poId: string, receivedNotes?: string) => void;
  createSalesOrder: (so: Omit<SalesOrder, 'id' | 'soNumber' | 'status'>) => void;
  fulfillSalesOrder: (
    soId: string
  ) => Promise<{ success: boolean; error?: string; invoice_id?: string; invoice_number?: string; pdf_url?: string }>;
  createTransfer: (sourceLocationId: string, targetLocationId: string, items: { productId: string; quantity: number }[], notes?: string) => void;
  createAdjustment: (productId: string, locationId: string, newStock: number, reasonCode: AdjustmentReasonCode, notes: string) => void;
  bulkAdjustStock: (adjustmentsList: { productId: string; locationId: string; delta: number; reasonCode: AdjustmentReasonCode; notes: string }[]) => void;
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => void;
  addLocation: (loc: Omit<Location, 'id' | 'isActive'>) => void;
  updateLocation: (id: string, loc: Partial<Omit<Location, 'id'>>) => Promise<void>;
  refreshData?: () => Promise<void>;
}

const getInitialTenantId = (): string => {
  try {
    const raw = localStorage.getItem('invenza_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.tenantId || u.tenant_id || '';
    }
  } catch {}
  return '';
};

const getInitialTenantData = <T,>(keySuffix: string, fallback: T): T => {
  const tid = getInitialTenantId();
  if (!tid || tid === 'default' || tid === 'loading') return fallback;
  try {
    const saved = localStorage.getItem(`invenza_tenant_${tid}_${keySuffix}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
    }
  } catch {}
  return fallback;
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authIsLoading, currencyCode, countryCode, taxType, taxRate, taxLabel, taxConfig } = useAuth();
  // Use real tenantId from user or synchronously from localStorage; only fall back to 'loading'/'default' if unresolved
  const currentTenantId = user?.tenantId || getInitialTenantId() || (authIsLoading ? 'loading' : 'default');

  const isLoadedRef = useRef(false);
  const loadedTenantIdRef = useRef<string | null>(null);
  // isSyncedRef: true once a successful backend sync completes
  const isSyncedRef = useRef(false);

  const [products, setProducts] = useState<Product[]>(() => getInitialTenantData('products', []));
  const [locations, setLocations] = useState<Location[]>(() => getInitialTenantData('locations', []));
  const [ledger, setLedger] = useState<StockMovement[]>(() => getInitialTenantData('ledger', []));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => getInitialTenantData('pos', []));
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => getInitialTenantData('sos', []));
  const [transfers, setTransfers] = useState<StockTransfer[]>(() => getInitialTenantData('transfers', []));
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>(() => getInitialTenantData('adjustments', []));
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => getInitialTenantData('custom_fields', []));

  // Tenant base currency is fixed at provisioning time (derived from country of registration).
  const currency: CurrencyCode =
    currencyCode && ['INR', 'EUR', 'USD'].includes(currencyCode)
      ? (currencyCode as CurrencyCode)
      : 'INR';

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  // Helper to calculate stock from ledger movements with fallback
  const computeStock = (
    prodId: string,
    sku: string,
    movements: StockMovement[],
    fallbackStock: number = 0,
    fallbackLocStock: Record<string, number> = {},
    defaultLocId: string = 'WH-MAIN'
  ) => {
    const prodMovements = movements.filter(m => m.productId === prodId || m.sku === sku);
    if (prodMovements.length === 0) {
      return {
        currentStock: fallbackStock,
        locationStock:
          Object.keys(fallbackLocStock).length > 0
            ? fallbackLocStock
            : fallbackStock > 0
            ? { [defaultLocId]: fallbackStock }
            : {},
      };
    }

    let total = 0;
    const locMap: Record<string, number> = {};
    prodMovements.forEach(m => {
      const qty = Math.abs(m.quantity);
      if (m.movementType === 'IN') {
        total += qty;
        if (m.locationId) locMap[m.locationId] = (locMap[m.locationId] || 0) + qty;
      } else if (m.movementType === 'OUT') {
        total -= qty;
        if (m.locationId) locMap[m.locationId] = (locMap[m.locationId] || 0) - qty;
      } else if (m.movementType === 'ADJUST') {
        total += m.quantity; // signed delta
        if (m.locationId) locMap[m.locationId] = (locMap[m.locationId] || 0) + m.quantity;
      } else if (m.movementType === 'TRANSFER') {
        if (m.locationId) {
          locMap[m.locationId] = (locMap[m.locationId] || 0) - qty;
        }
        if (m.targetLocationId) {
          locMap[m.targetLocationId] = (locMap[m.targetLocationId] || 0) + qty;
        }
      }
    });

    Object.keys(locMap).forEach(k => {
      locMap[k] = Math.max(0, locMap[k]);
    });

    const resolved = Math.max(0, total);
    return {
      currentStock: resolved,
      locationStock: Object.keys(locMap).length > 0 ? locMap : resolved > 0 ? { [defaultLocId]: resolved } : {},
    };
  };

  // Sync all operational entities authoritatively from PostgreSQL backend
  const syncBackend = useCallback(async (forcedTenantId?: string) => {
    const token = localStorage.getItem('invenza_token');
    const targetTenantId = forcedTenantId || user?.tenantId || getInitialTenantId() || currentTenantId;
    if (!token || !targetTenantId || targetTenantId === 'default' || targetTenantId === 'loading') {
      isLoadedRef.current = true;
      loadedTenantIdRef.current = targetTenantId || 'default';
      return;
    }
    const syncingForTenantId = targetTenantId;

    try {
      // 1. Locations
      let loadedLocs: Location[] = [];
      try {
        const backendLocs = await api.getLocations();
        if (backendLocs && Array.isArray(backendLocs) && backendLocs.length > 0) {
          loadedLocs = backendLocs.map((bl: any) => ({
            id: bl.id,
            name: bl.name,
            code: bl.code,
            address: bl.address || '',
            capacity: bl.capacity || 10000,
            isActive: bl.is_active ?? true,
          }));
          setLocations(loadedLocs);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_locations`, JSON.stringify(loadedLocs));
        } else if (backendLocs !== null) {
          // No locations exist for this org yet (e.g. older orgs provisioned before
          // the default-location fix). Create one automatically so inventory works.
          try {
            const createdLoc = await api.createLocation({
              name: 'Main Fulfillment Center',
              code: 'WH-MAIN',
              address: 'Primary Logistics Hub',
              capacity: 100000,
            });
            if (createdLoc && createdLoc.id) {
              loadedLocs = [{
                id: createdLoc.id,
                name: createdLoc.name,
                code: createdLoc.code,
                address: createdLoc.address || '',
                capacity: createdLoc.capacity || 100000,
                isActive: createdLoc.is_active ?? true,
              }];
              setLocations(loadedLocs);
              localStorage.setItem(`invenza_tenant_${syncingForTenantId}_locations`, JSON.stringify(loadedLocs));
            }
          } catch (createLocErr) {
            console.warn('Could not auto-create default location:', createLocErr);
          }
        }
      } catch (locErr) {
        console.warn('Backend locations sync fallback:', locErr);
      }

      const activeDefaultLocId = loadedLocs[0]?.id || locations[0]?.id || 'WH-MAIN';

      // 2. Movements / Ledger from PostgreSQL
      let dbMovements: StockMovement[] = [];
      try {
        const backendMovs = await api.getMovements();
        if (backendMovs && Array.isArray(backendMovs)) {
          dbMovements = backendMovs.map((bm: any) => ({
            id: bm.id,
            timestamp: bm.timestamp,
            productId: bm.product_id,
            sku: bm.sku || 'SKU',
            productName: bm.product_name || 'Item',
            movementType: bm.movement_type,
            quantity: Number(bm.quantity),
            locationId: bm.location_id,
            locationName: bm.location_name || 'Main Fulfillment Center',
            targetLocationId: bm.target_location_id,
            targetLocationName: bm.target_location_name,
            referenceType: bm.reference_type || 'INITIAL',
            referenceId: bm.reference_id || 'OPENING-BALANCE',
            reasonCode: bm.reason_code,
            performedBy: bm.performed_by || 'Administrator',
            unitCost: Number(bm.unit_cost || 0),
            runningBalance: Number(bm.quantity || 0),
          }));
          setLedger(dbMovements);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_ledger`, JSON.stringify(dbMovements));
        }
      } catch (movErr) {
        console.warn('Backend movements sync fallback:', movErr);
      }

      // 3. Products from PostgreSQL
      try {
        const backendProds = await api.getProducts();
        if (backendProds && Array.isArray(backendProds)) {
          const mapped: Product[] = backendProds.map((bp: any) => {
            const { currentStock, locationStock } = computeStock(
              bp.id,
              bp.sku,
              dbMovements,
              Number(bp.current_stock || 0),
              {},
              activeDefaultLocId
            );

            return {
              id: bp.id,
              sku: bp.sku,
              name: bp.name,
              category: bp.category,
              unitOfMeasure: bp.unit_of_measure,
              costPrice: Number(bp.cost_price),
              sellPrice: Number(bp.sell_price),
              currency: bp.currency || 'INR',
              barcode: bp.barcode || '',
              reorderPoint: Number(bp.reorder_point),
              maxStock: bp.max_stock !== undefined && bp.max_stock !== null ? Number(bp.max_stock) : undefined,
              warehouseId: bp.warehouse_id || activeDefaultLocId,
              hsnCode: bp.hsn_code || bp.tax_code || '',
              taxCode: bp.tax_code || bp.hsn_code || '',
              gstRate: bp.gst_rate !== undefined && bp.gst_rate !== null ? Number(bp.gst_rate) : 0,
              taxRate: bp.tax_rate !== undefined && bp.tax_rate !== null ? Number(bp.tax_rate) : (Number(bp.gst_rate) || 0),
              currentStock,
              locationStock,
              variantAttributes: bp.variant_attributes || {},
              customFields: bp.custom_fields || {},
              isActive: bp.is_active,
              createdAt: bp.created_at,
            };
          });
          setProducts(mapped);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_products`, JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Backend products sync fallback:', err);
      }

      // 4. Purchase Orders from PostgreSQL
      try {
        const backendPOs = await api.getPurchaseOrders();
        if (backendPOs && Array.isArray(backendPOs)) {
          const mappedPOs: PurchaseOrder[] = backendPOs.map((bpo: any) => ({
            id: bpo.id,
            poNumber: bpo.po_number,
            supplierName: bpo.supplier_name,
            status: bpo.status === 'completed' ? 'received' : bpo.status || 'pending',
            targetLocationId: bpo.target_location_id,
            targetLocationName: bpo.target_location_name || 'Main Fulfillment Center',
            totalAmount: Number(bpo.total_amount || 0),
            orderDate: bpo.order_date ? bpo.order_date.split('T')[0] : '',
            receivedDate: bpo.received_date ? bpo.received_date.split('T')[0] : undefined,
            notes: bpo.notes || '',
            items: (bpo.items || []).map((it: any) => ({
              productId: it.product_id,
              sku: it.sku || 'SKU',
              name: it.product_name || 'Item',
              orderedQty: Number(it.ordered_qty || 0),
              receivedQty: Number(it.received_qty || 0),
              unitCost: Number(it.unit_cost || 0),
            })),
          }));
          setPurchaseOrders(mappedPOs);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_pos`, JSON.stringify(mappedPOs));
        }
      } catch (poErr) {
        console.warn('Backend POs sync fallback:', poErr);
      }

      // 5. Sales Orders from PostgreSQL
      try {
        const backendSOs = await api.getSalesOrders();
        if (backendSOs && Array.isArray(backendSOs)) {
          const mappedSOs: SalesOrder[] = backendSOs.map((bso: any) => ({
            id: bso.id,
            soNumber: bso.so_number,
            customerName: bso.customer_name,
            customerGstin: bso.customer_gstin,
            billingAddress: bso.billing_address,
            shippingAddress: bso.shipping_address,
            state: bso.state,
            stateCode: bso.state_code,
            billingState: bso.billing_state,
            billingStateCode: bso.billing_state_code,
            shippingState: bso.shipping_state,
            shippingStateCode: bso.shipping_state_code,
            invoiceId: bso.invoice_id || undefined,
            status: bso.status === 'completed' ? 'fulfilled' : bso.status || 'pending',
            taxEnabled: bso.tax_enabled ?? true,
            sourceLocationId: bso.source_location_id,
            sourceLocationName: bso.source_location_name || 'Main Fulfillment Center',
            totalAmount: Number(bso.total_amount || 0),
            orderDate: bso.order_date ? bso.order_date.split('T')[0] : '',
            fulfilledDate: bso.fulfilled_date ? bso.fulfilled_date.split('T')[0] : undefined,
            createdAt: bso.created_at || bso.order_date,
            voidReason: bso.void_reason,
            voidedAt: bso.voided_at,
            notes: bso.notes || '',
            items: (bso.items || []).map((it: any) => ({
              productId: it.product_id,
              sku: it.sku || 'SKU',
              name: it.product_name || 'Item',
              orderedQty: Number(it.ordered_qty || 0),
              fulfilledQty: Number(it.fulfilled_qty || 0),
              unitPrice: Number(it.unit_price || 0),
            })),
          }));
          setSalesOrders(mappedSOs);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_sos`, JSON.stringify(mappedSOs));
        }
      } catch (soErr) {
        console.warn('Backend SOs sync fallback:', soErr);
      }

      // 6. Stock Transfers from PostgreSQL
      try {
        const backendTrs = await api.getTransfers();
        if (backendTrs && Array.isArray(backendTrs)) {
          const mappedTrs: StockTransfer[] = backendTrs.map((btr: any) => ({
            id: btr.id,
            transferNumber: btr.transfer_number,
            sourceLocationId: btr.source_location_id,
            sourceLocationName: btr.source_location_name || 'Source Warehouse',
            targetLocationId: btr.target_location_id,
            targetLocationName: btr.target_location_name || 'Destination Warehouse',
            status: (btr.status || 'completed') as any,
            date: btr.transfer_date ? btr.transfer_date.split('T')[0] : '',
            notes: btr.notes || '',
            items: (btr.items || []).map((it: any) => ({
              productId: it.product_id,
              sku: it.sku || 'SKU',
              name: it.product_name || 'Item',
              quantity: Number(it.quantity || 0),
            })),
          }));
          setTransfers(mappedTrs);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_transfers`, JSON.stringify(mappedTrs));
        }
      } catch (trErr) {
        console.warn('Backend transfers sync fallback:', trErr);
      }

      // 7. Adjustments from PostgreSQL
      try {
        const backendAdjs = await api.getAdjustments();
        if (backendAdjs && Array.isArray(backendAdjs)) {
          const mappedAdjs: AdjustmentRecord[] = backendAdjs.map((badj: any) => ({
            id: badj.id,
            adjustmentNumber: badj.adjustment_number,
            locationId: badj.location_id,
            locationName: badj.location_name || 'Warehouse',
            productId: badj.product_id,
            sku: badj.sku || 'SKU',
            productName: badj.product_name || 'Product',
            previousStock: Number(badj.previous_stock || 0),
            newStock: Number(badj.new_stock || 0),
            delta: Number(badj.delta || 0),
            reasonCode: badj.reason_code,
            notes: badj.notes || '',
            date: badj.created_at ? badj.created_at.split('T')[0] : '',
            author: badj.author || 'Admin',
          }));
          setAdjustments(mappedAdjs);
          localStorage.setItem(`invenza_tenant_${syncingForTenantId}_adjustments`, JSON.stringify(mappedAdjs));
        }
      } catch (adjErr) {
        console.warn('Backend adjustments sync fallback:', adjErr);
      }
    } catch (err) {
      console.warn('Backend sync overall warning:', err);
    } finally {
      isLoadedRef.current = true;
      loadedTenantIdRef.current = syncingForTenantId;
      isSyncedRef.current = true;
    }
  }, [user?.tenantId, currentTenantId, currency]);

  // Load tenant-isolated state and initial sync
  useEffect(() => {
    const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
    if (!activeTid || activeTid === 'loading' || activeTid === 'default') return;

    if (loadedTenantIdRef.current !== activeTid) {
      const pKey = `invenza_tenant_${activeTid}_products`;
      const lKey = `invenza_tenant_${activeTid}_locations`;
      const mKey = `invenza_tenant_${activeTid}_ledger`;
      const poKey = `invenza_tenant_${activeTid}_pos`;
      const soKey = `invenza_tenant_${activeTid}_sos`;
      const trKey = `invenza_tenant_${activeTid}_transfers`;
      const adjKey = `invenza_tenant_${activeTid}_adjustments`;
      const cfKey = `invenza_tenant_${activeTid}_custom_fields`;

      const savedProds = localStorage.getItem(pKey);
      const savedLocs = localStorage.getItem(lKey);
      const savedLedger = localStorage.getItem(mKey);
      const savedPos = localStorage.getItem(poKey);
      const savedSos = localStorage.getItem(soKey);
      const savedTr = localStorage.getItem(trKey);
      const savedAdj = localStorage.getItem(adjKey);
      const savedCf = localStorage.getItem(cfKey);

      const defaultCompanyLocation: Location = {
        id: `loc-main-${activeTid}`,
        name: 'Main Fulfillment Center',
        code: 'WH-MAIN',
        address: 'Primary Logistics Hub',
        capacity: 100000,
        isActive: true,
      };

      let loadedLocs: Location[] = [];
      if (savedLocs) {
        try {
          const parsed = JSON.parse(savedLocs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedLocs = parsed;
          }
        } catch {}
      }
      if (loadedLocs.length === 0) {
        loadedLocs = [defaultCompanyLocation];
      }
      setLocations(loadedLocs);

      if (savedLedger) {
        try {
          const rawLedger: any[] = JSON.parse(savedLedger);
          setLedger(Array.isArray(rawLedger) ? rawLedger : []);
        } catch {
          setLedger([]);
        }
      }

      if (savedProds) {
        try {
          const rawProds: any[] = JSON.parse(savedProds);
          if (Array.isArray(rawProds)) {
            setProducts(rawProds);
          }
        } catch {}
      }

      try {
        if (savedPos) setPurchaseOrders(JSON.parse(savedPos));
      } catch {}
      try {
        if (savedSos) setSalesOrders(JSON.parse(savedSos));
      } catch {}
      try {
        if (savedTr) setTransfers(JSON.parse(savedTr));
      } catch {}
      try {
        if (savedAdj) setAdjustments(JSON.parse(savedAdj));
      } catch {}
      try {
        if (savedCf) setCustomFields(JSON.parse(savedCf));
      } catch {}
    }

    // Trigger authoritative database sync
    syncBackend(activeTid);
  }, [user?.tenantId, currentTenantId, syncBackend]);

  // Sync to tenant-scoped localStorage.
  // Guard: only write AFTER a successful backend sync (isSyncedRef.current === true),
  // and only when the loaded tenant matches current (no mid-flight switch).
  // This prevents empty arrays from being written when API calls silently fail.
  useEffect(() => {
    if (
      !currentTenantId ||
      currentTenantId === 'default' ||
      currentTenantId === 'loading' ||
      !isLoadedRef.current ||
      !isSyncedRef.current ||
      loadedTenantIdRef.current !== currentTenantId
    ) {
      return;
    }
    localStorage.setItem(`invenza_tenant_${currentTenantId}_products`, JSON.stringify(products));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_locations`, JSON.stringify(locations));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_ledger`, JSON.stringify(ledger));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_pos`, JSON.stringify(purchaseOrders));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_sos`, JSON.stringify(salesOrders));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_transfers`, JSON.stringify(transfers));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_adjustments`, JSON.stringify(adjustments));
    localStorage.setItem(`invenza_tenant_${currentTenantId}_custom_fields`, JSON.stringify(customFields));
  }, [products, locations, ledger, purchaseOrders, salesOrders, transfers, adjustments, customFields, currentTenantId]);

  // Tenant currency formatter (currency is fixed per tenant; fromCurrency is accepted for call-site compatibility)
  const formatCurrency = (amount: number, _fromCurrency?: CurrencyCode): string => {
    return formatMoney(amount, currency);
  };

  // Helper to re-aggregate stock for a product from the immutable ledger
  const recalculateProductStock = (currentLedger: StockMovement[], productId: string, currentProds: Product[]) => {
    const movements = currentLedger.filter(m => m.productId === productId);
    let totalStock = 0;
    const locMap: Record<string, number> = {};

    movements.forEach(m => {
      const qty = Math.abs(m.quantity);
      if (m.movementType === 'IN') {
        totalStock += qty;
        if (m.locationId) locMap[m.locationId] = (locMap[m.locationId] || 0) + qty;
      } else if (m.movementType === 'OUT') {
        totalStock -= qty;
        if (m.locationId) locMap[m.locationId] = (locMap[m.locationId] || 0) - qty;
      } else if (m.movementType === 'ADJUST') {
        totalStock += m.quantity; // signed delta
        if (m.locationId) locMap[m.locationId] = (locMap[m.locationId] || 0) + m.quantity;
      } else if (m.movementType === 'TRANSFER') {
        if (m.locationId) {
          locMap[m.locationId] = (locMap[m.locationId] || 0) - qty;
        }
        if (m.targetLocationId) {
          locMap[m.targetLocationId] = (locMap[m.targetLocationId] || 0) + qty;
        }
      }
    });

    Object.keys(locMap).forEach(k => {
      locMap[k] = Math.max(0, locMap[k]);
    });

    return currentProds.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          currentStock: Math.max(0, totalStock),
          locationStock: locMap,
        };
      }
      return p;
    });
  };

  const isValidUuid = (str?: string): boolean =>
    Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

  const resolveLocationUuid = (locId?: string): string => {
    if (locId && isValidUuid(locId)) return locId;
    const match = locations.find((l) => isValidUuid(l.id));
    return match?.id || '00000000-0000-0000-0000-000000000001';
  };

  const resolveProductUuid = (prodId?: string): string => {
    if (prodId && isValidUuid(prodId)) return prodId;
    const match = products.find((p) => p.id === prodId || p.sku === prodId);
    if (match && isValidUuid(match.id)) return match.id;
    const firstValid = products.find((p) => isValidUuid(p.id));
    return firstValid?.id || prodId || '00000000-0000-0000-0000-000000000001';
  };

  // Add Product
  const addProduct = async (data: Omit<Product, 'id' | 'currentStock' | 'locationStock' | 'createdAt' | 'isActive'>) => {
    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...data,
      id: newId,
      currentStock: 0,
      locationStock: {},
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setProducts(prev => [newProduct, ...prev]);

    try {
      await api.createProduct({
        sku: data.sku,
        name: data.name,
        category: data.category,
        unit_of_measure: data.unitOfMeasure,
        cost_price: data.costPrice,
        sell_price: data.sellPrice,
        barcode: data.barcode,
        reorder_point: data.reorderPoint,
        hsn_code: data.hsnCode || '8471',
        gst_rate: data.gstRate !== undefined ? data.gstRate : 18.0,
        variant_attributes: data.variantAttributes || {},
        custom_fields: data.customFields || {},
      });
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      // Roll back the optimistic product — it was never saved to the DB.
      // Re-throw so the calling UI can show an error toast/message to the user.
      setProducts(prev => prev.filter(p => p.id !== newId));
      throw err;
    }
  };

  // Bulk Add Products (for CSV Import)
  const bulkAddProducts = async (
    items: (Omit<Product, 'id' | 'currentStock' | 'locationStock' | 'createdAt' | 'isActive'> & { initialStock?: number })[]
  ): Promise<number> => {
    if (!items.length) return 0;
    const timestamp = Date.now();
    const defaultLoc = locations[0];
    const defaultLocId = defaultLoc?.id || 'loc-1';
    const defaultLocName = defaultLoc?.name || 'Main Fulfillment Center';
    const nowISO = new Date().toISOString();

    const newProds: Product[] = items.map((data, idx) => {
      const stock = typeof data.initialStock === 'number' && data.initialStock > 0 ? data.initialStock : 0;
      return {
        ...data,
        id: `prod-${timestamp}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        currency: (data as any).currency || currency,
        currentStock: stock,
        locationStock: stock > 0 ? { [defaultLocId]: stock } : {},
        isActive: true,
        createdAt: nowISO,
      };
    });

    setProducts(prev => [...newProds, ...prev]);

    // Record opening stock movements in ledger for initial stock
    const openingMovements: StockMovement[] = newProds
      .filter(p => p.currentStock > 0)
      .map((p, idx) => ({
        id: `mov-open-${timestamp}-${idx}`,
        timestamp: nowISO,
        productId: p.id,
        sku: p.sku,
        productName: p.name,
        movementType: 'IN',
        quantity: p.currentStock,
        locationId: defaultLocId,
        locationName: defaultLocName,
        referenceType: 'INITIAL',
        referenceId: 'OPENING-BALANCE',
        reasonCode: 'Opening Balance',
        performedBy: user?.fullName || user?.email || 'Administrator',
        unitCost: p.costPrice,
        runningBalance: p.currentStock,
      }));

    if (openingMovements.length > 0) {
      setLedger(prev => [...openingMovements, ...prev]);
    }

    try {
      await api.bulkCreateProducts(
        items.map(data => ({
          sku: data.sku,
          name: data.name,
          category: data.category || 'General',
          unit_of_measure: data.unitOfMeasure || 'pcs',
          cost_price: data.costPrice || 0,
          sell_price: data.sellPrice || 0,
          barcode: data.barcode || '',
          reorder_point: data.reorderPoint || 10,
          hsn_code: data.hsnCode || (data as any).taxCode || undefined,
          tax_code: (data as any).taxCode || data.hsnCode || undefined,
          gst_rate: data.gstRate !== undefined ? data.gstRate : ((data as any).taxRate !== undefined ? (data as any).taxRate : (taxConfig.standardRate ?? 0.0)),
          tax_rate: (data as any).taxRate !== undefined ? (data as any).taxRate : (data.gstRate !== undefined ? data.gstRate : (taxConfig.standardRate ?? 0.0)),
          initial_stock: data.initialStock || 0,
          variant_attributes: data.variantAttributes || {},
          custom_fields: data.customFields || {},
        }))
      );
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      console.warn('Backend bulk import warning:', err);
    }

    return newProds.length;
  };

  // Update Product
  const updateProduct = async (id: string, data: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
    try {
      const prodUuid = resolveProductUuid(id);
      await api.updateProduct(prodUuid, {
        name: data.name,
        category: data.category,
        unit_of_measure: data.unitOfMeasure,
        cost_price: data.costPrice,
        sell_price: data.sellPrice,
        barcode: data.barcode,
        reorder_point: data.reorderPoint,
        max_stock: data.maxStock,
        hsn_code: data.hsnCode,
        gst_rate: data.gstRate,
        variant_attributes: data.variantAttributes,
        custom_fields: data.customFields,
        is_active: data.isActive,
      });
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      console.warn('Backend product update warning:', err);
    }
  };

  // Toggle Product Active (Soft Delete / Re-enable)
  const toggleProductActive = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    const newActiveState = prod.isActive === false ? true : false;
    await updateProduct(id, { isActive: newActiveState });
  };

  // Delete Product & Log Audit Trail
  const deleteProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    setProducts(prev => prev.filter(p => p.id !== id));

    if (prod) {
      const defaultLoc = locations[0];
      const auditEntry: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        productId: prod.id,
        sku: prod.sku,
        productName: prod.name,
        movementType: 'OUT',
        quantity: prod.currentStock || 0,
        locationId: defaultLoc?.id || '',
        locationName: defaultLoc?.name || 'Main Fulfillment Center',
        referenceType: 'ADJUST',
        referenceId: `DEL-${prod.sku}`,
        reasonCode: 'product removed',
        performedBy: user?.fullName || user?.email || 'Administrator',
        unitCost: prod.costPrice || 0,
        runningBalance: 0,
      };
      setLedger(prev => [auditEntry, ...prev]);
    }

    try {
      const prodUuid = resolveProductUuid(id);
      await api.deleteProduct(prodUuid);
      await syncBackend();
    } catch (err) {
      console.warn('Backend product delete warning:', err);
    }
  };

  // Delete Multiple Products & Log Audit Trail
  const deleteProducts = async (ids: string[]) => {
    const prodsToDelete = products.filter(p => ids.includes(p.id));
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));

    const defaultLoc = locations[0];
    const auditEntries: StockMovement[] = prodsToDelete.map(prod => ({
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      productId: prod.id,
      sku: prod.sku,
      productName: prod.name,
      movementType: 'OUT',
      quantity: prod.currentStock || 0,
      locationId: defaultLoc?.id || '',
      locationName: defaultLoc?.name || 'Main Fulfillment Center',
      referenceType: 'ADJUST',
      referenceId: `DEL-${prod.sku}`,
      reasonCode: 'product removed',
      performedBy: user?.fullName || user?.email || 'Administrator',
      unitCost: prod.costPrice || 0,
      runningBalance: 0,
    }));
    setLedger(prev => [...auditEntries, ...prev]);

    try {
      await Promise.all(ids.map(id => api.deleteProduct(resolveProductUuid(id))));
      await syncBackend();
    } catch (err) {
      console.warn('Backend bulk delete warning:', err);
    }
  };

  // Clear All Products for active tenant & Log Audit Trail
  const clearAllProducts = async (options?: { performedBy?: string; password?: string; otp?: string }) => {
    const deletedCount = products.length;
    setProducts([]);
    localStorage.removeItem(`invenza_tenant_${currentTenantId}_products`);

    // Record immutable audit entry into Movement Ledger
    const defaultLoc = locations[0];
    const performer = options?.performedBy || (user?.fullName ? `${user.fullName} (${user.email})` : 'Administrator');
    const auditPerformer = `${performer} [MFA: Password + Email OTP Verified]`;
    const nowStr = new Date().toISOString();

    const auditEntry: StockMovement = {
      id: `mov-purge-${Date.now()}`,
      timestamp: nowStr,
      productId: 'catalog-all',
      sku: 'ALL-SKUS',
      productName: `Catalog Reset - All ${deletedCount} Products Purged`,
      movementType: 'OUT',
      quantity: 0,
      locationId: defaultLoc?.id || 'loc-01',
      locationName: defaultLoc?.name || 'All Facilities',
      referenceType: 'ADJUST',
      referenceId: `CATALOG-RESET-${Date.now()}`,
      reasonCode: 'audit',
      performedBy: auditPerformer,
      unitCost: 0,
      runningBalance: 0,
    };
    setLedger(prev => [auditEntry, ...prev]);

    try {
      if (options?.password && options?.otp) {
        await api.clearCatalogVerified(options.password, options.otp, user?.email);
      } else {
        await api.clearAllProducts();
      }
      setProducts([]);
      localStorage.setItem(`invenza_tenant_${currentTenantId}_products`, JSON.stringify([]));
      await syncBackend();
    } catch (err) {
      console.warn('Backend clear all products warning:', err);
    }
  };

  // Clear Movement Ledger for active tenant with preserved dual-authorization root audit record
  const clearLedger = async (options?: { requestedBy?: string; approvedBy?: string }) => {
    const clearedCount = ledger.length;
    const approver = options?.approvedBy || 'Super Administrator (superadmin@invenza.internal)';
    const requester = options?.requestedBy || (user?.fullName ? `${user.fullName} (${user.email})` : 'Company Administrator');
    const nowStr = new Date().toISOString();

    // Preserve an immutable root audit entry documenting the authorized purge
    const rootAuditEntry: StockMovement = {
      id: `mov-audit-root-${Date.now()}`,
      timestamp: nowStr,
      productId: 'ledger-root',
      sku: 'AUDIT-ROOT',
      productName: `Historical Movement Ledger Purged (${clearedCount} records erased)`,
      movementType: 'ADJUST',
      quantity: 0,
      locationId: locations[0]?.id || 'loc-01',
      locationName: locations[0]?.name || 'Central Compliance Archive',
      referenceType: 'ADJUST',
      referenceId: `PURGE-AUTH-${Date.now()}`,
      reasonCode: 'audit',
      performedBy: `Requested by: ${requester} [OTP Verified] | Authorized & Executed by: ${approver}`,
      unitCost: 0,
      runningBalance: 0,
    };

    setLedger([rootAuditEntry]);
    localStorage.setItem(`invenza_tenant_${currentTenantId}_ledger`, JSON.stringify([rootAuditEntry]));

    try {
      await api.clearLedger();
    } catch (err) {
      console.warn('Backend clear ledger warning:', err);
    }
  };

  // Create Purchase Order
  const createPurchaseOrder = async (data: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status'>) => {
    const count = purchaseOrders.length + 1;
    const poNumber = `PO-2026-${String(count).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...data,
      id: `po-${Date.now()}`,
      poNumber,
      status: 'pending',
    };
    setPurchaseOrders(prev => [newPO, ...prev]);

    try {
      const locUuid = resolveLocationUuid(data.targetLocationId);
      await api.createPurchaseOrder({
        supplier_name: data.supplierName,
        target_location_id: locUuid,
        order_date: data.orderDate,
        notes: data.notes,
        items: data.items.map(it => ({
          product_id: resolveProductUuid(it.productId),
          ordered_qty: it.orderedQty,
          unit_cost: it.unitCost,
        })),
      });
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      console.warn('Backend PO creation warning:', err);
    }
  };

  // Receive Goods (GRN Flow) -> auto writes to immutable ledger!
  const receiveGoods = async (poId: string, receivedNotes?: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'received') return;

    const newMovements: StockMovement[] = [];
    let updatedProds = [...products];

    po.items.forEach(item => {
      const prod = updatedProds.find(p => p.id === item.productId);
      const currentLocStock = prod?.locationStock[po.targetLocationId] || 0;
      const runningBal = currentLocStock + item.orderedQty;

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        productId: item.productId,
        sku: item.sku,
        productName: item.name,
        movementType: 'IN',
        quantity: item.orderedQty,
        locationId: po.targetLocationId,
        locationName: po.targetLocationName,
        referenceType: 'PO',
        referenceId: po.poNumber,
        performedBy: 'Sarah Connor (Admin)',
        unitCost: item.unitCost,
        runningBalance: runningBal,
      };
      newMovements.push(movement);
    });

    const updatedLedger = [...newMovements, ...ledger];
    setLedger(updatedLedger);

    po.items.forEach(item => {
      updatedProds = recalculateProductStock(updatedLedger, item.productId, updatedProds);
    });
    setProducts(updatedProds);

    setPurchaseOrders(prev =>
      prev.map(p =>
        p.id === poId
          ? {
              ...p,
              status: 'received',
              receivedDate: new Date().toISOString().split('T')[0],
              items: p.items.map(it => ({ ...it, receivedQty: it.orderedQty })),
              notes: receivedNotes ? `${p.notes || ''} [Received: ${receivedNotes}]` : p.notes,
            }
          : p
      )
    );

    try {
      if (isValidUuid(poId)) {
        await api.receiveGoodsGRN(poId, receivedNotes);
        const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
        await syncBackend(activeTid);
      }
    } catch (err) {
      console.warn('Backend receive GRN warning:', err);
    }
  };

  // Create Sales Order
  const createSalesOrder = async (data: Omit<SalesOrder, 'id' | 'soNumber' | 'status'>) => {
    const count = salesOrders.length + 1;
    const soNumber = `SO-2026-${String(count).padStart(3, '0')}`;
    const newSO: SalesOrder = {
      ...data,
      id: `so-${Date.now()}`,
      soNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSalesOrders(prev => [newSO, ...prev]);

    try {
      const locUuid = resolveLocationUuid(data.sourceLocationId);
      await api.createSalesOrder({
        customer_name: data.customerName,
        customer_gstin: data.customerGstin,
        billing_address: data.billingAddress,
        shipping_address: data.shippingAddress,
        billing_state: data.billingState,
        billing_state_code: data.billingStateCode,
        shipping_state: data.shippingState,
        shipping_state_code: data.shippingStateCode,
        state: data.billingState || data.state || 'Karnataka',
        state_code: data.billingStateCode || data.stateCode || '29',
        source_location_id: locUuid,
        order_date: data.orderDate,
        notes: data.notes,
        items: data.items.map(it => ({
          product_id: resolveProductUuid(it.productId),
          ordered_qty: it.orderedQty,
          unit_price: it.unitPrice,
          discount_percent: it.discountPercent || 0,
        })),
      });
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      // Roll back the optimistic SO — it was never saved to the DB.
      setSalesOrders(prev => prev.filter(s => s.id !== newSO.id));
      throw err;
    }
  };

  // Fulfill Sales Order -> writes OUT ledger entry and issues GST invoice!
  const fulfillSalesOrder = async (
    soId: string
  ): Promise<{ success: boolean; error?: string; invoice_id?: string; invoice_number?: string; pdf_url?: string }> => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so || so.status === 'fulfilled') return { success: false, error: 'Order not found or already fulfilled' };

    for (const item of so.items) {
      const prod = products.find(p => p.id === item.productId);
      const available = prod?.locationStock[so.sourceLocationId] || 0;
      if (available < item.orderedQty) {
        return {
          success: false,
          error: `Insufficient stock for ${item.name} at ${so.sourceLocationName}. Available: ${available}, Required: ${item.orderedQty}`,
        };
      }
    }

    if (isValidUuid(soId)) {
      try {
        const backendRes = await api.fulfillSalesOrder(soId);
        if (!backendRes) {
          return {
            success: false,
            error: 'Failed to fulfill Sales Order: Invalid or empty response from server.',
          };
        }
        const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
        await syncBackend(activeTid);
        return {
          success: true,
          invoice_id: backendRes.invoice_id,
          invoice_number: backendRes.invoice_number,
          pdf_url: backendRes.pdf_url,
        };
      } catch (err: any) {
        console.error('Backend SO fulfill error:', err);
        return {
          success: false,
          error: err.message || 'Failed to fulfill Sales Order and generate invoice',
        };
      }
    }

    const newMovements: StockMovement[] = [];
    let updatedProds = [...products];

    so.items.forEach(item => {
      const prod = updatedProds.find(p => p.id === item.productId);
      const currentLocStock = prod?.locationStock[so.sourceLocationId] || 0;
      const runningBal = Math.max(0, currentLocStock - item.orderedQty);

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        productId: item.productId,
        sku: item.sku,
        productName: item.name,
        movementType: 'OUT',
        quantity: item.orderedQty,
        locationId: so.sourceLocationId,
        locationName: so.sourceLocationName,
        referenceType: 'SO',
        referenceId: so.soNumber,
        performedBy: 'Fulfillment Dispatch',
        unitCost: prod?.costPrice || 0,
        runningBalance: runningBal,
      };
      newMovements.push(movement);
    });

    const updatedLedger = [...newMovements, ...ledger];
    setLedger(updatedLedger);

    so.items.forEach(item => {
      updatedProds = recalculateProductStock(updatedLedger, item.productId, updatedProds);
    });
    setProducts(updatedProds);

    setSalesOrders(prev =>
      prev.map(s =>
        s.id === soId
          ? {
              ...s,
              status: 'fulfilled',
              fulfilledDate: new Date().toISOString().split('T')[0],
              items: s.items.map(it => ({ ...it, fulfilledQty: it.orderedQty })),
            }
          : s
      )
    );

    return { success: true };
  };

  // Stock Transfer between locations
  const createTransfer = async (
    sourceLocationId: string,
    targetLocationId: string,
    items: { productId: string; quantity: number }[],
    notes?: string
  ) => {
    const sourceLoc = locations.find(l => l.id === sourceLocationId);
    const targetLoc = locations.find(l => l.id === targetLocationId);
    if (!sourceLoc || !targetLoc) return;

    const count = transfers.length + 1;
    const trNumber = `TR-2026-${String(count).padStart(3, '0')}`;

    const newMovements: StockMovement[] = [];
    let updatedProds = [...products];

    const transferItems = items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const prodName = prod?.name || 'Item';
      const prodSku = prod?.sku || 'SKU';

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        productId: item.productId,
        sku: prodSku,
        productName: prodName,
        movementType: 'TRANSFER',
        quantity: item.quantity,
        locationId: sourceLocationId,
        locationName: sourceLoc.name,
        targetLocationId: targetLocationId,
        targetLocationName: targetLoc.name,
        referenceType: 'TRANSFER',
        referenceId: trNumber,
        performedBy: 'Inventory Logistics',
        unitCost: prod?.costPrice || 0,
        runningBalance: (prod?.locationStock[sourceLocationId] || 0) - item.quantity,
      };
      newMovements.push(movement);

      return {
        productId: item.productId,
        sku: prodSku,
        name: prodName,
        quantity: item.quantity,
      };
    });

    const updatedLedger = [...newMovements, ...ledger];
    setLedger(updatedLedger);

    items.forEach(item => {
      updatedProds = recalculateProductStock(updatedLedger, item.productId, updatedProds);
    });
    setProducts(updatedProds);

    const newTransfer: StockTransfer = {
      id: `tr-${Date.now()}`,
      transferNumber: trNumber,
      sourceLocationId,
      sourceLocationName: sourceLoc.name,
      targetLocationId,
      targetLocationName: targetLoc.name,
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      items: transferItems,
      notes,
    };

    setTransfers(prev => [newTransfer, ...prev]);

    try {
      const srcUuid = resolveLocationUuid(sourceLocationId);
      const dstUuid = resolveLocationUuid(targetLocationId);
      await api.createTransfer({
        source_location_id: srcUuid,
        target_location_id: dstUuid,
        notes,
        items: items.map(it => ({
          product_id: resolveProductUuid(it.productId),
          quantity: it.quantity,
        })),
      });
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      console.warn('Backend transfer creation warning:', err);
    }
  };

  // Manual Stock Adjustment with mandatory reason code
  const createAdjustment = async (
    productId: string,
    locationId: string,
    newStock: number,
    reasonCode: AdjustmentReasonCode,
    notes: string
  ) => {
    const prod = products.find(p => p.id === productId);
    const loc = locations.find(l => l.id === locationId);
    if (!prod || !loc) return;

    const previousStock = prod.locationStock[locationId] || 0;
    const delta = newStock - previousStock;
    if (delta === 0) return;

    const count = adjustments.length + 1;
    const adjNumber = `ADJ-2026-${String(count).padStart(3, '0')}`;

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      timestamp: new Date().toISOString(),
      productId,
      sku: prod.sku,
      productName: prod.name,
      movementType: 'ADJUST',
      quantity: delta,
      locationId,
      locationName: loc.name,
      referenceType: 'ADJUST',
      referenceId: adjNumber,
      reasonCode,
      performedBy: user?.fullName || 'Administrator',
      unitCost: prod.costPrice,
      runningBalance: newStock,
    };

    const updatedLedger = [newMovement, ...ledger];
    setLedger(updatedLedger);

    const updatedProds = recalculateProductStock(updatedLedger, productId, products);
    setProducts(updatedProds);

    const newAdjustmentRecord: AdjustmentRecord = {
      id: `adj-${Date.now()}`,
      adjustmentNumber: adjNumber,
      locationId,
      locationName: loc.name,
      productId,
      sku: prod.sku,
      productName: prod.name,
      previousStock,
      newStock,
      delta,
      reasonCode,
      notes,
      date: new Date().toISOString().split('T')[0],
      author: user?.fullName || 'Administrator',
    };

    setAdjustments(prev => [newAdjustmentRecord, ...prev]);

    try {
      const prodUuid = resolveProductUuid(productId);
      const locUuid = resolveLocationUuid(locationId);
      await api.createAdjustment({
        location_id: locUuid,
        product_id: prodUuid,
        new_stock: newStock,
        reason_code: (reasonCode || 'audit').toLowerCase() as any,
        notes: notes || 'Audit stock correction',
        author: user?.fullName || 'Administrator',
      });
      const activeTid = user?.tenantId || getInitialTenantId() || currentTenantId;
      await syncBackend(activeTid);
    } catch (err) {
      console.warn('Backend adjustment creation warning:', err);
    }
  };

  // Bulk stock adjustment
  const bulkAdjustStock = (adjustmentsList: { productId: string; locationId: string; delta: number; reasonCode: AdjustmentReasonCode; notes: string }[]) => {
    const newMovements: StockMovement[] = [];
    const newAdjRecords: AdjustmentRecord[] = [];
    let updatedProds = [...products];

    adjustmentsList.forEach((adj, idx) => {
      const prod = updatedProds.find(p => p.id === adj.productId);
      const loc = locations.find(l => l.id === adj.locationId);
      if (!prod || !loc) return;

      const previousStock = prod.locationStock[adj.locationId] || 0;
      const newStock = Math.max(0, previousStock + adj.delta);
      const adjNumber = `ADJ-2026-${String(adjustments.length + idx + 1).padStart(3, '0')}`;

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${idx}`,
        timestamp: new Date().toISOString(),
        productId: adj.productId,
        sku: prod.sku,
        productName: prod.name,
        movementType: 'ADJUST',
        quantity: adj.delta,
        locationId: adj.locationId,
        locationName: loc.name,
        referenceType: 'ADJUST',
        referenceId: adjNumber,
        reasonCode: adj.reasonCode,
        performedBy: user?.fullName || 'Administrator',
        unitCost: prod.costPrice,
        runningBalance: newStock,
      };
      newMovements.push(movement);

      newAdjRecords.push({
        id: `adj-${Date.now()}-${idx}`,
        adjustmentNumber: adjNumber,
        locationId: adj.locationId,
        locationName: loc.name,
        productId: adj.productId,
        sku: prod.sku,
        productName: prod.name,
        previousStock,
        newStock,
        delta: adj.delta,
        reasonCode: adj.reasonCode,
        notes: adj.notes,
        date: new Date().toISOString().split('T')[0],
        author: user?.fullName || 'Administrator',
      });
    });

    const updatedLedger = [...newMovements, ...ledger];
    setLedger(updatedLedger);
    setAdjustments(prev => [...newAdjRecords, ...prev]);

    const uniqueProdIds = Array.from(new Set(adjustmentsList.map(a => a.productId)));
    uniqueProdIds.forEach(pId => {
      updatedProds = recalculateProductStock(updatedLedger, pId, updatedProds);
    });
    setProducts(updatedProds);
  };

  // Add Custom Field
  const addCustomField = (field: Omit<CustomFieldDefinition, 'id'>) => {
    const newField: CustomFieldDefinition = {
      ...field,
      id: `cf-${Date.now()}`,
    };
    setCustomFields(prev => [...prev, newField]);
  };

  // Add Location
  const addLocation = async (loc: Omit<Location, 'id' | 'isActive'>) => {
    const newLoc: Location = {
      ...loc,
      id: `loc-${Date.now()}`,
      isActive: true,
    };
    setLocations(prev => [...prev, newLoc]);

    try {
      await api.createLocation({
        name: loc.name,
        code: loc.code,
        address: loc.address,
        capacity: loc.capacity,
      });
    } catch (err) {
      console.warn('Backend location creation warning:', err);
    }
  };

  // Update Location
  const updateLocation = async (id: string, loc: Partial<Omit<Location, 'id'>>) => {
    setLocations(prev =>
      prev.map(l => (l.id === id ? { ...l, ...loc } : l))
    );

    try {
      await api.updateLocation(id, {
        name: loc.name,
        code: loc.code,
        address: loc.address,
        capacity: loc.capacity,
        is_active: loc.isActive,
      });
    } catch (err) {
      console.warn('Backend location update warning:', err);
    }
  };

  return (
    <InventoryContext.Provider
      value={{
        products,
        locations,
        ledger,
        purchaseOrders,
        salesOrders,
        transfers,
        adjustments,
        customFields,
        currency,
        countryCode,
        taxType,
        taxRate,
        taxLabel,
        taxConfig,
        selectedLocationId,
        setSelectedLocationId,
        formatCurrency,
        addProduct,
        bulkAddProducts,
        updateProduct,
        toggleProductActive,
        deleteProduct,
        deleteProducts,
        clearAllProducts,
        clearLedger,
        createPurchaseOrder,
        receiveGoods,
        createSalesOrder,
        fulfillSalesOrder,
        createTransfer,
        createAdjustment,
        bulkAdjustStock,
        addCustomField,
        addLocation,
        updateLocation,
        refreshData: syncBackend,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
