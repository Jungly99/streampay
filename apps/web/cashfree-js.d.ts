declare module '@cashfreepayments/cashfree-js' {
  interface CashfreeOptions { mode: 'sandbox' | 'production' }
  interface CheckoutOptions { paymentSessionId: string; redirectTarget?: string }
  interface CashfreeInstance { checkout(options: CheckoutOptions): Promise<void> }
  export function load(options: CashfreeOptions): Promise<CashfreeInstance>
}
