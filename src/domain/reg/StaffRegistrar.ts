import { AccountRegistrar, BaseRegistrationData, NewAccountProps } from "./AccountRegistrar";
import { Staff } from "./Staff";

export interface StaffRegistrationData extends BaseRegistrationData {
  restaurantId: string;
}

export class StaffRegistrar extends AccountRegistrar<StaffRegistrationData> {
  protected validate(data: StaffRegistrationData): void {
    super.validate(data);
    if (!data.restaurantId?.trim()) {
      throw new Error("Restaurant id is required for a restaurant account");
    }
  }

  protected createAccount(props: NewAccountProps, data: StaffRegistrationData): Staff {
    return new Staff({ ...props, restaurantId: data.restaurantId.trim() });
  }
}