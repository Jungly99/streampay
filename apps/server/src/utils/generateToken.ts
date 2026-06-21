import { nanoid } from 'nanoid'

export function generateOverlayToken(): string {
  return `otk_${nanoid(32)}`
}

export function generateOrderId(): string {
  return `sp_${Date.now()}_${nanoid(8)}`
}

export function generateInvoiceNumber(year: number, seq: number): string {
  return `INV-${year}-${String(seq).padStart(4, '0')}`
}
