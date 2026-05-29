import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 700) {
  const [m, setM] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const h = (e) => setM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [breakpoint]);
  return m;
}
