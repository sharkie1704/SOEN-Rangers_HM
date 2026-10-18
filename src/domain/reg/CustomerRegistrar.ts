import { AccountRegistrar, BaseRegistrationData, NewAccountProps } from "./AccountRegistrar";
import { Customer, LatLong } from "./Customer";
import { ValidationError } from "./Errors";

export interface CustomerRegistrationData extends BaseRegistrationData {
  address: LatLong;
}

export class CustomerRegistrar extends AccountRegistrar<CustomerRegistrationData> {
  protected validate(data: CustomerRegistrationData): void {
    super.validate(data);
    if (!data.address) throw new ValidationError("Delivery address is required");
  }

  protected createAccount(props: NewAccountProps, data: CustomerRegistrationData): Customer {
    return new Customer({ ...props, address: data.address });
  }
}