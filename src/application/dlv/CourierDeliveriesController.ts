import type { Request, Response } from "express";
import { toOrderDTO } from "../ord/OrderDTO.ts";
import type { CourierDeliveriesService } from "./CourierDeliveriesService.ts";
import { respond, toActor } from "./DeliveryHttp.ts";

export class CourierDeliveriesController {
  constructor(private readonly service: CourierDeliveriesService) {}

  list = (req: Request, res: Response) => respond(res, async () => {
    const deliveries = await this.service.current(toActor(req.user));
    res.json({
      deliveries: deliveries.map(({ assignment, order, restaurantLocation, customerLocation }) => ({
        assignment: {
          orderId: assignment.orderId,
          courierId: assignment.courierId,
          status: assignment.status,
        },
        order: toOrderDTO(order),
        restaurantLocation,
        customerLocation,
      })),
    });
  });
}
