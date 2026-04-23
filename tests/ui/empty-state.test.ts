import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/empty-state";

describe("EmptyState component", () => {
  it("renders title and description", () => {
    render(createElement(EmptyState, { title: "No results", description: "Generate to view variants" }));

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.getByText("Generate to view variants")).toBeInTheDocument();
  });
});

