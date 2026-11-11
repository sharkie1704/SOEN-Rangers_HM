import { AssignmentError } from "../../domain/dlv/AssignmentError.ts";
import type { Order } from "../../domain/ord/Order.ts";
import type { Assignment } from "../../domain/dlv/Assignment.ts";
import { hasPermission } from "../../domain/reg/permissions";
import { Role } from "../../domain/reg/Role.ts";
import type { OrderRepository } from "../ord/OrderRepository.ts";
import type { AssignmentActor } from "./AssignmentService.ts";
import type { AssignmentRepository } from "./AssignmentRepository.ts";
import type { RestaurantReadRepository } from "../ord/RestaurantReadRepository.ts";
import type { UserRepository } from "../../domain/reg/ports/UserRepository.ts";
import { Customer } from "../../domain/reg/Customer.ts";

export interface DeliveryLocation {
  readonly lat: number;
  readonly lng: number;
}

export interface CourierDelivery {
  readonly assignment: Assignment;
  readonly order: Order;
  readonly restaurantLocation?: DeliveryLocation;
  readonly customerLocation?: DeliveryLocation;
}

export class CourierDeliveriesService {
  constructor(
    private readonly assignments: AssignmentRepository,
    private readonly orders: OrderRepository,
    private readonly restaurants?: RestaurantReadRepository,
    private readonly users?: UserRepository,
  ) {}

  async current(actor: AssignmentActor | null): Promise<readonly CourierDelivery[]> {
    if (!actor || actor.role !== Role.COURIER || !actor.userId.trim()) {
      throw new AssignmentError("FORBIDDEN", "Only an authenticated courier can view assigned deliveries.");
    }

    const assignment = await this.assignments.findActiveByCourierId(actor.userId);
    if (!assignment) return [];
    if (!hasPermission(
      { name: "answerOffer", courierId: assignment.courierId },
      { ...actor, id: actor.userId },
    )) {
      throw new AssignmentError("FORBIDDEN", "Only the assigned courier can view this delivery.");
    }

    const order = await this.orders.findById(assignment.orderId);
    if (!order) throw new AssignmentError("NOT_FOUND", "The assigned order was not found.");

    const restaurant = await this.restaurants?.findRestaurantById(order.restaurantId);
    const customer = await this.users?.findById(order.customerId);
    return [{
      assignment,
      order,
      ...(restaurant?.lat != null && restaurant.lng != null
        ? { restaurantLocation: { lat: restaurant.lat, lng: restaurant.lng } }
        : {}),
      ...(customer instanceof Customer ? { customerLocation: customer.address } : {}),
    }];
  }
}
