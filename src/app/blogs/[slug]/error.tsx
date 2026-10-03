'use client';

import RouteErrorFallback from '@/components/ui/RouteErrorFallback';

export default function Error(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback {...props} />;
}
