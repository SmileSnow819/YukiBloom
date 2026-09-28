/**
 * Error Fallback Component
 *
 * Displays a user-friendly error message with retry option.
 */

import { Button } from '@admin-ui/components/ui/button';
import { Icon } from '@iconify/react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Icon icon="ri:error-warning-line" className="size-16 text-destructive" />
      <h1 className="font-semibold text-xl">页面出了点问题</h1>
      <pre className="max-w-lg rounded-lg bg-muted p-4 text-sm">{error.message}</pre>
      <Button onClick={resetErrorBoundary}>重试</Button>
    </div>
  );
}
