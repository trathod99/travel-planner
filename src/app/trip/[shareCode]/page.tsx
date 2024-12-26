import { TripPageClient } from './TripPageClient';

interface PageProps {
  params: {
    shareCode: string;
  };
}

export default function TripPage({ params }: PageProps) {
  return <TripPageClient shareCode={params.shareCode} />;
} 