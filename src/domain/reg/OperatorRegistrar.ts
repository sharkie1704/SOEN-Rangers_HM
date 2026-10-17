import { AccountRegistrar, BaseRegistrationData, NewAccountProps } from "./AccountRegistrar";
import { Operator } from "./Operator";

export class OperatorRegistrar extends AccountRegistrar<BaseRegistrationData> {
  protected createAccount(props: NewAccountProps): Operator {
    return new Operator(props);
  }
}