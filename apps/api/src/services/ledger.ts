import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export interface RecordMovementParams {
  product_id: string;
  godown_id: string;
  movement_type:
    | 'PURCHASE_RECEIPT'
    | 'SALES_DELIVERY'
    | 'TRANSFER_OUT'
    | 'TRANSFER_IN'
    | 'ADJUSTMENT_ADD'
    | 'ADJUSTMENT_REDUCE'
    | 'RETURN_IN'
    | 'RETURN_OUT';
  quantity: number; // positive or negative
  unit_cost: number;
  reference_type: string;
  reference_id: string;
  notes?: string;
  created_by?: string;
}

export class LedgerService {
  /**
   * Records a stock movement and updates the Godown's StockBalance atomically.
   */
  static async recordMovement(
    params: RecordMovementParams,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const {
      product_id,
      godown_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_id,
      notes,
      created_by,
    } = params;

    // 1. Get or create current stock balance for (product, godown)
    let balance = await client.stockBalance.findUnique({
      where: {
        product_id_godown_id: {
          product_id,
          godown_id,
        },
      },
    });

    const prevQty = balance ? Number(balance.current_quantity) : 0;
    const prevCost = balance ? Number(balance.avg_cost) : 0;
    const newQty = prevQty + quantity;

    // Calculate weighted average cost if positive receipt
    let newCost = prevCost;
    if (quantity > 0 && newQty > 0) {
      newCost = (prevQty * prevCost + quantity * unit_cost) / newQty;
    }

    // 2. Upsert stock balance
    if (balance) {
      balance = await client.stockBalance.update({
        where: { id: balance.id },
        data: {
          current_quantity: newQty,
          avg_cost: newCost,
        },
      });
    } else {
      balance = await client.stockBalance.create({
        data: {
          product_id,
          godown_id,
          current_quantity: newQty,
          avg_cost: unit_cost,
        },
      });
    }

    // 3. Insert immutable stock movement record
    const movement = await client.stockMovement.create({
      data: {
        movement_type,
        product_id,
        godown_id,
        quantity,
        unit_cost,
        balance_after: newQty,
        reference_type,
        reference_id,
        notes,
        created_by,
      },
    });

    return { movement, balance };
  }
}
