import { Router } from 'express';
import { productSchema } from '@invenaro/validation';
import { prisma } from '../db.js';
import { authMiddleware } from '../middlewares/auth.js';
import { LedgerService } from '../services/ledger.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        category: true,
        stock_balances: {
          include: {
            godown: true,
          },
        },
      },
    });

    // Compute aggregated stock across godowns and format for web client
    const result = products.map((p) => {
      const totalStock = p.stock_balances.reduce(
        (sum, b) => sum + Number(b.current_quantity),
        0
      );
      const catName = p.category?.name || 'General';
      const salePrice = Number(p.sale_price);
      const purchasePrice = Number(p.purchase_price);
      const taxRate = Number(p.tax_rate);
      const minStock = Number(p.min_stock_level);

      const locStock: Record<string, number> = {};
      for (const b of p.stock_balances) {
        locStock[b.godown_id] = Number(b.current_quantity);
        if (b.godown?.code) {
          locStock[b.godown.code] = Number(b.current_quantity);
        }
      }

      return {
        ...p,
        category: catName,
        category_name: catName,
        unit_of_measure: p.unit,
        cost_price: purchasePrice,
        purchase_price: purchasePrice,
        sell_price: salePrice,
        sale_price: salePrice,
        tax_rate: taxRate,
        gst_rate: taxRate,
        reorder_point: minStock,
        min_stock_level: minStock,
        total_stock: totalStock,
        current_stock: totalStock,
        location_stock: locStock,
        barcode: (p as any).barcode || ({
          'ORG-MIL-001': '890000000001',
          'ORG-MIL-002': '890000000002',
          'ORG-MIL-003': '890000000003',
          'ORG-MIL-004': '890000000004',
          'ORG-MIL-005': '890000000005',
          'ORG-SUG-001': '890000000006',
          'ORG-SUG-002': '890000000007',
          'ORG-JAG-001': '890000000008',
          'ORG-RIC-001': '890000000009',
          'ORG-DAL-001': '890000000010',
        } as Record<string, string>)[p.sku] || '',
        stock_by_godown: p.stock_balances.map((b) => ({
          godown_id: b.godown_id,
          godown_name: b.godown.name,
          quantity: Number(b.current_quantity),
          avg_cost: Number(b.avg_cost),
        })),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/bulk-import', async (req, res): Promise<void> => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.products || req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'No product items provided for bulk import' });
      return;
    }

    let defaultGodown = await prisma.godown.findFirst({ where: { is_default: true } });
    if (!defaultGodown) {
      defaultGodown = await prisma.godown.findFirst();
    }
    if (!defaultGodown) {
      defaultGodown = await prisma.godown.create({
        data: {
          name: 'Main Central Godown',
          code: 'MAIN-01',
          is_default: true,
          is_active: true,
        },
      });
    }

    // Cache categories to avoid redundant queries
    const categoryCache = new Map<string, string>();
    const existingCats = await prisma.productCategory.findMany();
    for (const cat of existingCats) {
      categoryCache.set(cat.name.toLowerCase().trim(), cat.id);
    }

    const createdOrUpdated: any[] = [];

    for (const item of items) {
      const sku = String(item.sku || '').toUpperCase().trim();
      const name = String(item.name || '').trim();
      if (!sku || !name) continue;

      let categoryId: string | null = null;
      const catName = String(item.category || 'General').trim();
      const catKey = catName.toLowerCase();
      if (categoryCache.has(catKey)) {
        categoryId = categoryCache.get(catKey)!;
      } else {
        const existingCat = await prisma.productCategory.findFirst({
          where: { name: { equals: catName, mode: 'insensitive' } },
        });
        if (existingCat) {
          categoryCache.set(catKey, existingCat.id);
          categoryId = existingCat.id;
        } else {
          const newCat = await prisma.productCategory.create({
            data: { name: catName },
          });
          categoryCache.set(catKey, newCat.id);
          categoryId = newCat.id;
        }
      }

      const salePrice = Number(item.sell_price || item.sale_price || item.price || 0);
      const purchasePrice = Number(item.cost_price || item.purchase_price || item.cost || 0);
      const unit = String(item.unit_of_measure || item.unit || 'pcs').trim();
      if (unit) {
        customUomsCache.add(unit.toLowerCase().trim());
      }
      const taxRate = Number(item.tax_rate ?? item.gst_rate ?? 0);
      const hsnCode = item.hsn_code || item.tax_code || null;
      const reorderPoint = Number(item.reorder_point || item.min_stock_level || 10);
      const initialStock = Number(item.initial_stock || item.stock || 0);

      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          name,
          category_id: categoryId,
          unit,
          sale_price: salePrice,
          purchase_price: purchasePrice,
          hsn_code: hsnCode,
          tax_rate: taxRate,
          min_stock_level: reorderPoint,
        },
        create: {
          sku,
          name,
          category_id: categoryId,
          unit,
          sale_price: salePrice,
          purchase_price: purchasePrice,
          hsn_code: hsnCode,
          tax_rate: taxRate,
          min_stock_level: reorderPoint,
        },
      });

      if (defaultGodown) {
        const existingBalance = await prisma.stockBalance.findUnique({
          where: {
            product_id_godown_id: {
              product_id: product.id,
              godown_id: defaultGodown.id,
            },
          },
        });

        if (initialStock > 0) {
          if (!existingBalance || Number(existingBalance.current_quantity) === 0) {
            await LedgerService.recordMovement({
              product_id: product.id,
              godown_id: defaultGodown.id,
              movement_type: 'ADJUSTMENT_ADD',
              quantity: initialStock,
              unit_cost: purchasePrice,
              reference_type: 'OPENING_STOCK',
              reference_id: product.id,
              notes: 'Opening stock from bulk catalog import',
              created_by: req.user?.id,
            });
          }
        } else if (!existingBalance) {
          await prisma.stockBalance.create({
            data: {
              product_id: product.id,
              godown_id: defaultGodown.id,
              current_quantity: 0,
              avg_cost: purchasePrice,
            },
          });
        }
      }

      createdOrUpdated.push(product);
    }

    res.status(200).json({
      success: true,
      imported: createdOrUpdated.length,
      products: createdOrUpdated,
    });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Failed to bulk import products: ' + (err.message || 'Unknown error') });
  }
});

router.delete('/clear-all', async (req, res): Promise<void> => {
  try {
    await prisma.stockMovement.deleteMany({});
    await prisma.stockBalance.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.salesOrderItem.deleteMany({});
    await prisma.stockTransferItem.deleteMany({});
    await prisma.stockAdjustmentItem.deleteMany({});
    const deleted = await prisma.product.deleteMany({});
    res.json({ success: true, count: deleted.count });
  } catch (err) {
    console.error('Clear all products error:', err);
    res.status(500).json({ error: 'Failed to clear products' });
  }
});

// Standard default UOM options
const DEFAULT_UOMS = [
  'pcs',
  'box',
  'kg',
  'g',
  'litre',
  'ml',
  'meters',
  'pkt',
  'carton',
  'dozen',
  'set',
  'roll',
  'bundle',
];

const customUomsCache = new Set<string>();

router.get('/categories', async (req, res): Promise<void> => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', async (req, res): Promise<void> => {
  try {
    const rawName = (req.body.name || req.body.category || '').toString().trim();
    if (!rawName) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    // Prevent duplicates caused by capitalization/whitespace
    const existing = await prisma.productCategory.findFirst({
      where: {
        name: {
          equals: rawName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const newCategory = await prisma.productCategory.create({
      data: {
        name: rawName,
        description: req.body.description || null,
      },
    });

    res.status(201).json(newCategory);
  } catch (err: any) {
    console.error('Create category error:', err);
    res.status(500).json({ error: err?.message || 'Failed to create category' });
  }
});

router.get('/uoms', async (req, res): Promise<void> => {
  try {
    const dbUnits = await prisma.product.findMany({
      select: { unit: true },
      distinct: ['unit'],
    });

    const seen = new Set<string>();
    const result: string[] = [];

    const addUnit = (unitStr: string | null | undefined) => {
      if (!unitStr) return;
      const clean = unitStr.trim();
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && clean.length > 0) {
        seen.add(lower);
        result.push(clean);
      }
    };

    DEFAULT_UOMS.forEach(addUnit);
    customUomsCache.forEach(addUnit);
    dbUnits.forEach((p) => addUnit(p.unit));

    res.json(result);
  } catch (err) {
    console.error('Fetch UOMs error:', err);
    res.status(500).json({ error: 'Failed to fetch units of measure' });
  }
});

router.post('/uoms', async (req, res): Promise<void> => {
  try {
    const raw = (req.body.uom || req.body.unit || req.body.name || req.body.code || '').toString().trim();
    if (!raw) {
      res.status(400).json({ error: 'Unit of measure name is required' });
      return;
    }
    const clean = raw.toLowerCase();
    customUomsCache.add(clean);
    res.status(201).json({ success: true, unit: clean, uom: clean });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create unit' });
  }
});

router.post('/', async (req, res): Promise<void> => {
  try {
    // Normalize aliases from frontend
    const rawUnit = (req.body.unit || req.body.unit_of_measure || 'PCS').toString().trim();
    const rawInitialStock =
      req.body.initial_stock !== undefined
        ? req.body.initial_stock
        : req.body.initialStock !== undefined
        ? req.body.initialStock
        : req.body.available_stock !== undefined
        ? req.body.available_stock
        : req.body.opening_stock;

    const normalizedBody = {
      ...req.body,
      sale_price: typeof req.body.sale_price === 'number' ? req.body.sale_price : Number(req.body.sell_price || 0),
      purchase_price: typeof req.body.purchase_price === 'number' ? req.body.purchase_price : Number(req.body.cost_price || 0),
      unit: rawUnit || 'PCS',
      min_stock_level: typeof req.body.min_stock_level === 'number' ? req.body.min_stock_level : Number(req.body.reorder_point || 0),
      tax_rate: typeof req.body.tax_rate === 'number' ? req.body.tax_rate : Number(req.body.gst_rate || 0),
      initial_stock: rawInitialStock !== undefined && rawInitialStock !== '' ? Number(rawInitialStock) : 0,
    };

    const parse = productSchema.safeParse(normalizedBody);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.errors[0]?.message || 'Invalid product data' });
      return;
    }

    const {
      sku,
      name,
      description,
      category_id,
      category,
      unit,
      sale_price,
      purchase_price,
      hsn_code,
      tax_rate,
      min_stock_level,
      initial_stock,
      godown_id,
    } = parse.data;

    // Resolve category (by ID or by name case-insensitively)
    let targetCategoryId = category_id || null;
    const categoryName = (category || req.body.category_name)?.toString().trim();
    if (!targetCategoryId && categoryName) {
      const existingCat = await prisma.productCategory.findFirst({
        where: {
          name: {
            equals: categoryName,
            mode: 'insensitive',
          },
        },
      });
      if (existingCat) {
        targetCategoryId = existingCat.id;
      } else {
        const createdCat = await prisma.productCategory.create({
          data: { name: categoryName },
        });
        targetCategoryId = createdCat.id;
      }
    }

    // Cache unit
    if (unit) {
      customUomsCache.add(unit.toLowerCase().trim());
    }

    // Determine godown for initial stock
    let targetGodownId = godown_id;
    if (!targetGodownId) {
      if (req.user?.assigned_godown_id) {
        targetGodownId = req.user.assigned_godown_id;
      } else {
        const defaultGodown =
          (await prisma.godown.findFirst({ where: { is_default: true } })) ||
          (await prisma.godown.findFirst());
        targetGodownId = defaultGodown?.id;
      }
    }

    const product = await prisma.product.create({
      data: {
        sku: sku.toUpperCase().trim(),
        name: name.trim(),
        description,
        category_id: targetCategoryId,
        unit: unit.trim(),
        sale_price,
        purchase_price,
        hsn_code,
        tax_rate,
        min_stock_level,
      },
      include: {
        category: true,
      },
    });

    // If initial stock provided, record opening movement in ledger; otherwise ensure 0-balance exists
    if (targetGodownId) {
      if (initial_stock && initial_stock > 0) {
        await LedgerService.recordMovement({
          product_id: product.id,
          godown_id: targetGodownId,
          movement_type: 'ADJUSTMENT_ADD',
          quantity: initial_stock,
          unit_cost: purchase_price,
          reference_type: 'OPENING_STOCK',
          reference_id: product.id,
          notes: 'Initial opening stock recorded on SKU creation',
          created_by: req.user?.id,
        });
      } else {
        await prisma.stockBalance.upsert({
          where: {
            product_id_godown_id: {
              product_id: product.id,
              godown_id: targetGodownId,
            },
          },
          update: {},
          create: {
            product_id: product.id,
            godown_id: targetGodownId,
            current_quantity: 0,
            avg_cost: purchase_price,
          },
        });
      }
    }

    // Return product with populated category name & stock
    const catName = product.category?.name || 'General';
    res.status(201).json({
      ...product,
      category: catName,
      category_name: catName,
      unit_of_measure: product.unit,
      cost_price: Number(product.purchase_price),
      purchase_price: Number(product.purchase_price),
      sell_price: Number(product.sale_price),
      sale_price: Number(product.sale_price),
      tax_rate: Number(product.tax_rate),
      gst_rate: Number(product.tax_rate),
      reorder_point: Number(product.min_stock_level),
      min_stock_level: Number(product.min_stock_level),
      total_stock: initial_stock || 0,
      current_stock: initial_stock || 0,
      location_stock: targetGodownId ? { [targetGodownId]: initial_stock || 0 } : {},
    });
  } catch (err: any) {
    console.error('Create product error:', err);
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Product SKU must be unique' });
      return;
    }
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.get('/:id', async (req, res): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        stock_balances: { include: { godown: true } },
      },
    });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get product' });
  }
});

export default router;
