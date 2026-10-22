import { ApiError } from "./client";

export function registrationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "An account with this email already exists. Try logging in instead.";
    }
    if (error.status === 403) {
      return "This account type cannot be registered here. Contact an administrator for help.";
    }
    if (error.status === 404) {
      return "We couldn't find a restaurant with that ID. Check it and try again.";
    }
    if (error.status === 400) {
      const fieldMessages = error.details
        .map(({ path }) => registrationFieldMessage(path))
        .filter((message): message is string => message !== null);

      if (fieldMessages.length > 0) return [...new Set(fieldMessages)].join(" ");

      const message = error.message.toLowerCase();
      if (message.includes("name")) return "Enter your name.";
      if (message.includes("email")) return "Enter a valid email address.";
      if (message.includes("password")) return "Password must be between 8 and 72 characters.";
      if (message.includes("restaurant")) return "Enter a restaurant ID.";
      if (message.includes("address")) return "Enter a valid delivery address.";
      return "Check your registration details and try again.";
    }
    if (error.status >= 500) {
      return "We couldn't create your account right now. Please try again later.";
    }
  }

  if (error instanceof TypeError) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return "We couldn't complete registration. Please try again.";
}

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return "Enter both your email address and password.";
    if (error.status === 401) return "Email or password is incorrect. Check your details and try again.";
    if (error.status >= 500) return "We couldn't log you in right now. Please try again later.";
  }

  if (error instanceof TypeError) {
    return "Unable to reach the server. Check your connection and try again.";
  }
  return "We couldn't log you in. Please try again.";
}

function registrationFieldMessage(path: string): string | null {
  switch (path) {
    case "name":
      return "Enter your name.";
    case "email":
      return "Enter a valid email address.";
    case "password":
      return "Password must be between 8 and 72 characters.";
    case "role":
      return "Choose a valid account type.";
    case "address.lat":
      return "Enter a latitude between -90 and 90.";
    case "address.lng":
      return "Enter a longitude between -180 and 180.";
    case "restaurantId":
      return "Enter a restaurant ID.";
    default:
      return null;
  }
}
