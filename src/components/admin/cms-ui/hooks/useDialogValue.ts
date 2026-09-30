import { useCallback, useEffect, useState } from 'react';

/** Keep a dialog's value available while Radix plays its closing animation. */
export function useDialogValue<T>() {
  const [value, setValue] = useState<T | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open || value === null) return;
    const timeout = window.setTimeout(() => setValue(null), 200);
    return () => window.clearTimeout(timeout);
  }, [open, value]);

  const setDialogValue = useCallback((nextValue: T | null) => {
    if (nextValue === null) {
      setOpen(false);
    } else {
      setValue(nextValue);
      setOpen(true);
    }
  }, []);

  const updateDialogValue = useCallback((update: (current: T | null) => T | null) => {
    setValue(update);
  }, []);

  return { value, open, setDialogValue, updateDialogValue };
}
