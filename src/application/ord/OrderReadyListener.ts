// Told when an order is ready for a courier, after the change is saved.
// ORD only knows this interface, so it doesn't depend on DLV.
export interface OrderReadyListener {
  // Must not throw: a failure here can't undo the order being ready
  orderReady(orderId: number): Promise<void>;
}
