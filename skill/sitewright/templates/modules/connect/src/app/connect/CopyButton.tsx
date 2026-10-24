'use client';

import { useState } from 'react';
import { toast } from '@/components/fx';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn ghost"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          toast.success('Link copied', 'Paste it into your app.');
        } catch {
          setCopied(false);
          toast.error('Could not copy', 'Select the link and copy it by hand.');
        }
      }}
    >
      {copied ? 'Copied ✓' : 'Copy link'}
    </button>
  );
}
