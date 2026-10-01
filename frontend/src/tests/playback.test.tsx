import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePlayback } from "../hooks";
import { Playback } from "../components/Playback";

afterEach(() => vi.useRealTimers());

describe("algorithm playback", () => {
  it("moves one real event at a time and pauses when the user seeks", () => {
    vi.useFakeTimers();
    const events = ["first", "second", "third"];
    const { result } = renderHook(() => usePlayback(events));
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(900));
    expect(result.current.index).toBe(1);
    act(() => result.current.seek(0));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(false);
  });

  it("stops at the last step and cleans up when the stage changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ events }) => usePlayback(events),
      { initialProps: { events: [1, 2] } },
    );
    act(() => result.current.setSpeed(2));
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(450));
    expect(result.current.index).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    rerender({ events: [5, 6, 7] });
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(false);
  });

  it("provides accessible next, previous, last, restart and speed controls", async () => {
    const user = userEvent.setup();
    const events = [1, 2, 3];
    function Player() {
      const player = usePlayback(events);
      return <Playback player={player} title="Test step" />;
    }
    render(<Player />);
    expect(
      screen.getByRole("button", { name: "Previous step" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByTestId("step-count")).toHaveTextContent("Step 2 / 3");
    await user.click(screen.getByRole("button", { name: "Last step" }));
    expect(screen.getByRole("button", { name: "Next step" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Restart playback" }));
    expect(screen.getByTestId("step-count")).toHaveTextContent("Step 1 / 3");
    await user.selectOptions(screen.getByLabelText("Playback speed"), "2");
    expect(screen.getByLabelText("Playback speed")).toHaveValue("2");
  });
});
