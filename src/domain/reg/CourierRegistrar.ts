import { AccountRegistrar, BaseRegistrationData, NewAccountProps } from "./AccountRegistrar";
import { Courier } from "./Courier";

export class CourierRegistrar extends AccountRegistrar<BaseRegistrationData> {
  protected createAccount(props: NewAccountProps): Courier {
    return new Courier(props);
  }
}