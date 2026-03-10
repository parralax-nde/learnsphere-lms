import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ProfileEdit from "./ProfileEdit";
import * as api from "../../services/api";

jest.mock("../../services/api");

const MOCK_USER = {
  id: "user-001",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Smith",
  bio: "Educator and learner.",
  phone: "+1-555-0100",
  website: "https://alice.example.com",
};

beforeEach(() => {
  jest.clearAllMocks();
  api.fetchProfile.mockResolvedValue({ user: MOCK_USER });
  api.updateProfile.mockResolvedValue({
    message: "Profile updated successfully.",
    user: MOCK_USER,
  });
});

describe("ProfileEdit – initial load", () => {
  it("renders the heading", async () => {
    render(<ProfileEdit userId="user-001" />);
    expect(screen.getByRole("heading", { name: /edit profile/i })).toBeInTheDocument();
  });

  it("pre-fills form fields with the fetched user data", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() =>
      expect(screen.getByDisplayValue("Alice")).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue("Smith")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Educator and learner.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+1-555-0100")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://alice.example.com")).toBeInTheDocument();
  });

  it("shows a retry button when profile load fails", async () => {
    api.fetchProfile.mockRejectedValueOnce(new Error("Network error"));
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    );
  });
});

describe("ProfileEdit – client-side validation", () => {
  it("shows an error when firstName is empty", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    await userEvent.clear(screen.getByLabelText(/first name/i));
    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(await screen.findByTestId("firstName-error")).toHaveTextContent(
      "First name is required."
    );
  });

  it("shows an error when lastName is empty", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Smith"));

    await userEvent.clear(screen.getByLabelText(/last name/i));
    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(await screen.findByTestId("lastName-error")).toHaveTextContent(
      "Last name is required."
    );
  });

  it("shows an error when bio exceeds 500 characters", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    const bioField = screen.getByLabelText(/bio/i);
    fireEvent.change(bioField, { target: { name: "bio", value: "x".repeat(501) } });
    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(await screen.findByTestId("bio-error")).toHaveTextContent(
      "Bio must not exceed 500 characters."
    );
  });

  it("shows an error for an invalid website URL", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    await userEvent.clear(screen.getByLabelText(/website/i));
    await userEvent.type(screen.getByLabelText(/website/i), "not-a-url");
    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(await screen.findByTestId("website-error")).toHaveTextContent(
      "Website must be a valid URL"
    );
  });

  it("shows an error for an invalid phone number", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    await userEvent.clear(screen.getByLabelText(/phone/i));
    await userEvent.type(screen.getByLabelText(/phone/i), "abc-xyz");
    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(await screen.findByTestId("phone-error")).toHaveTextContent(
      "Phone number is invalid"
    );
  });

  it("clears a field error as the user starts typing", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    // Clear the field and submit to trigger validation error
    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { name: "firstName", value: "" } });
    fireEvent.submit(screen.getByTestId("profile-form"));
    expect(await screen.findByTestId("firstName-error")).toBeInTheDocument();

    // Typing should clear the error
    fireEvent.change(firstNameInput, { target: { name: "firstName", value: "A" } });
    expect(screen.queryByTestId("firstName-error")).not.toBeInTheDocument();
  });
});

describe("ProfileEdit – form submission", () => {
  it("shows a success message after a successful save", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(
      await screen.findByTestId("success-message")
    ).toHaveTextContent("Profile updated successfully.");
  });

  it("calls updateProfile with the correct payload", async () => {
    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    fireEvent.submit(screen.getByTestId("profile-form"));

    await waitFor(() =>
      expect(api.updateProfile).toHaveBeenCalledWith("user-001", {
        firstName: "Alice",
        lastName: "Smith",
        bio: "Educator and learner.",
        phone: "+1-555-0100",
        website: "https://alice.example.com",
      })
    );
  });

  it("displays server-side validation errors when the API returns 422", async () => {
    const serverError = new Error("Validation failed.");
    serverError.errors = ["First name is required.", "Bio must not exceed 500 characters."];
    serverError.status = 422;
    api.updateProfile.mockRejectedValueOnce(serverError);

    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    fireEvent.submit(screen.getByTestId("profile-form"));

    const errorsDiv = await screen.findByTestId("server-errors");
    expect(errorsDiv).toHaveTextContent("First name is required.");
    expect(errorsDiv).toHaveTextContent("Bio must not exceed 500 characters.");
  });

  it("disables the submit button while saving", async () => {
    // Make the update hang so we can observe the loading state
    api.updateProfile.mockImplementation(
      () => new Promise(() => {})
    );

    render(<ProfileEdit userId="user-001" />);
    await waitFor(() => screen.getByDisplayValue("Alice"));

    const btn = screen.getByTestId("submit-button");
    fireEvent.submit(screen.getByTestId("profile-form"));

    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Saving…");
  });
});
