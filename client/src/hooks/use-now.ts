import { isSameSecond } from 'date-fns';
import { useEffect, useState } from 'react';

export function useNow() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSameSecond(now, new Date())) {
        setNow(new Date());
      }
    }, 1_000);

    return () => {
      clearInterval(interval);
    };
  }, [now]);

  return now;
}
