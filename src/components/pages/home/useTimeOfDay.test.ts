import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useTimeOfDay, { getTimeOfDay } from "./useTimeOfDay";

describe("local time ambience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([
    [0, 0, "night"], [6, 59, "night"], [7, 0, "day"], [12, 0, "day"],
    [17, 59, "day"], [18, 0, "dusk"], [20, 59, "dusk"], [21, 0, "night"], [23, 59, "night"],
  ])("selects the ambience at %i:%i local time", (hour, minute, expected) => {
    expect(getTimeOfDay(new Date(2026, 10, 3, Number(hour), Number(minute)))).toBe(expected);
  });

  it("updates overnight and clears its polling timer when unmounted", () => {
    vi.setSystemTime(new Date(2026, 10, 4, 6, 59));
    const { result, unmount } = renderHook(() => useTimeOfDay());
    expect(result.current).toBe("night");
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current).toBe("day");
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resynchronizes immediately on focus and removes the same listener", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    vi.setSystemTime(new Date(2026, 10, 3, 12));
    const { result, unmount } = renderHook(() => useTimeOfDay());
    const onFocus = add.mock.calls.find(([event]) => event === "focus")![1];
    vi.setSystemTime(new Date(2026, 10, 3, 22));
    act(() => window.dispatchEvent(new Event("focus")));
    expect(result.current).toBe("night");
    unmount();
    expect(remove).toHaveBeenCalledWith("focus", onFocus);
  });

  it("resynchronizes when the tab becomes visible and cleans up its listener", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const visibility = vi.spyOn(document, "visibilityState", "get");
    vi.setSystemTime(new Date(2026, 10, 3, 12));
    const { result, unmount } = renderHook(() => useTimeOfDay());
    const onVisibility = add.mock.calls.find(([event]) => event === "visibilitychange")![1];
    vi.setSystemTime(new Date(2026, 10, 3, 19));
    visibility.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe("day");
    visibility.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe("dusk");
    unmount();
    expect(remove).toHaveBeenCalledWith("visibilitychange", onVisibility);
  });
});
