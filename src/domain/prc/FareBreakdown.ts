
//the result that the calculator should return 
export interface FareBreakdown {
  readonly subtotalCents: number;
  readonly deliveryFeeCents: number;
  readonly serviceFeeCents: number;
  readonly smallOrderSurchargeCents: number;
  readonly totalCents: number;
}
