export interface CourierIdleObserver {
  courierBecameIdle(courierId: string): Promise<void>;
}

export class CourierIdleSubject {
  readonly #observers: CourierIdleObserver[] = [];

  subscribe(observer: CourierIdleObserver): void {
    if (!this.#observers.includes(observer)) this.#observers.push(observer);
  }

  unsubscribe(observer: CourierIdleObserver): void {
    const index = this.#observers.indexOf(observer);
    if (index !== -1) this.#observers.splice(index, 1);
  }

  async notify(courierId: string): Promise<void> {
    for (const observer of this.#observers) {
      try {
        await observer.courierBecameIdle(courierId);
      } catch (error) {
        console.error("A courier idle observer failed:", error);
      }
    }
  }
}
