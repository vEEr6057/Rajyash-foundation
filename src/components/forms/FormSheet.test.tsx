import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { FormSheet } from "./FormSheet";

// FormSheet is the ONE shared create/edit-form overlay every persona's
// modal-form now goes through (Log surplus, New run, Post/Edit pickup,
// destinations, partners) — its open/close mechanics are worth a real test
// since every one of those forms depends on getting them right.
describe("FormSheet", () => {
  it("is closed until the trigger is clicked, then shows the title and content", async () => {
    const user = userEvent.setup();
    render(
      <FormSheet trigger={<button>Open form</button>} title="New thing">
        <p>form body</p>
      </FormSheet>,
    );

    expect(screen.queryByText("New thing")).not.toBeInTheDocument();
    expect(screen.queryByText("form body")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open form" }));

    expect(screen.getByText("New thing")).toBeInTheDocument();
    expect(screen.getByText("form body")).toBeInTheDocument();
  });

  it("passes a working close() to a function-child that dismisses the sheet", async () => {
    const user = userEvent.setup();
    render(
      <FormSheet trigger={<button>Open form</button>} title="Edit thing">
        {(close) => <button onClick={close}>Done editing</button>}
      </FormSheet>,
    );

    await user.click(screen.getByRole("button", { name: "Open form" }));
    expect(screen.getByText("Edit thing")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done editing" }));
    expect(screen.queryByText("Edit thing")).not.toBeInTheDocument();
  });

  it("in controlled mode, opens/closes from the parent's state instead of a trigger", async () => {
    const user = userEvent.setup();
    function Host() {
      const [editing, setEditing] = useState(false);
      return (
        <>
          <button onClick={() => setEditing(true)}>Start editing row</button>
          <FormSheet open={editing} onOpenChange={setEditing} title="Row editor">
            <p>row form</p>
          </FormSheet>
        </>
      );
    }
    render(<Host />);

    expect(screen.queryByText("Row editor")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start editing row" }));
    expect(screen.getByText("Row editor")).toBeInTheDocument();
  });
});
