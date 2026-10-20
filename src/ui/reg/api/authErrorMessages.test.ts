import { expect, test } from "vitest";
import { ApiError } from "./client";
import { loginErrorMessage, registrationErrorMessage } from "./authErrorMessages";

test("shows a helpful message when the registration email is already in use", () => {
  const error = new ApiError(409, "An account with this email already exists");
  const message = registrationErrorMessage(error);

  expect(message).toBe("An account with this email already exists. Try logging in instead.");
});

test("explains invalid delivery coordinates during registration", () => {
  const error = new ApiError(400, "Invalid registration data", [
    { path: "address.lat", message: "Invalid input" },
    { path: "address.lng", message: "Invalid input" },
  ]);
  const message = registrationErrorMessage(error);

  expect(message).toBe("Enter a latitude between -90 and 90. Enter a longitude between -180 and 180.");
});

test("does not show technical details when registration fails on the server", () => {
  const error = new ApiError(500, "Internal server error");
  const message = registrationErrorMessage(error);

  expect(message).toBe("We couldn't create your account right now. Please try again later.");
});

test("shows a clear message when login details are incorrect", () => {
  const error = new ApiError(401, "Invalid email or password");
  const message = loginErrorMessage(error);

  expect(message).toBe("Email or password is incorrect. Check your details and try again.");
});

test("explains when the browser cannot reach the server", () => {
  const error = new TypeError("fetch failed");
  const message = loginErrorMessage(error);

  expect(message).toBe("Unable to reach the server. Check your connection and try again.");
});
