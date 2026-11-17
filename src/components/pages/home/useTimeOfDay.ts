import { useEffect, useState } from "react";

export type TimeOfDay = "day" | "dusk" | "night";

export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 7 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "dusk";
  return "night";
}

export default function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState(() => getTimeOfDay(new Date()));

  useEffect(() => {
    const updateFromDate = () => setTimeOfDay(getTimeOfDay(new Date()));
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") updateFromDate();
    };
    const interval = window.setInterval(updateFromDate, 60_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", updateFromDate);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", updateFromDate);
    };
  }, []);

  return timeOfDay;
}
