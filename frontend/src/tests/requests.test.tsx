import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useRequest } from "../hooks";

afterEach(() => vi.unstubAllGlobals());

it("discards a stale server response even if an aborted fetch still resolves", async () => {
  const pending: ((value: Response) => void)[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => pending.push(resolve))),
  );
  const { result } = renderHook(() => useRequest<{ regex: string }>("compile"));
  let first!: Promise<void>, second!: Promise<void>;
  act(() => {
    first = result.current.run({ regex: "a" });
  });
  act(() => {
    second = result.current.run({ regex: "b" });
  });
  await act(async () => {
    pending[1](new Response(JSON.stringify({ regex: "b" })));
    await second;
  });
  await act(async () => {
    pending[0](new Response(JSON.stringify({ regex: "a" })));
    await first;
  });
  expect(result.current.data).toEqual({ regex: "b" });
});

it("reset invalidates an in-flight compile and displays structured server errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "invalid_regex",
            message: "Missing operand",
            position: 1,
          },
        }),
        { status: 422 },
      ),
    ),
  );
  const { result } = renderHook(() => useRequest("compile"));
  await act(async () => {
    await result.current.run({ regex: "a|" });
  });
  expect(result.current.error?.position).toBe(1);
  act(() => result.current.reset());
  await waitFor(() => expect(result.current.error).toBeNull());
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(false);
});

it("clears loading and explains an unreachable backend", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Network error")),
  );
  const { result } = renderHook(() => useRequest("compile"));
  await act(async () => {
    await result.current.run({ regex: "a" });
  });
  expect(result.current.error?.code).toBe("connection");
  expect(result.current.loading).toBe(false);
});
