'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function CopyShareLink({ shareCode }: { shareCode: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/trip/${shareCode}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
      <code className="flex-1 text-sm truncate">{shareUrl}</code>
      <Button onClick={copyToClipboard} variant="outline" size="sm">
        {copied ? "Copied!" : "Copy"}
      </Button>
    </div>
  );
} 