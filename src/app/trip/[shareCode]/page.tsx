import { TripPageClient } from './TripPageClient';

export default function TripPage({ params }: { params: { shareCode: string } }) {
  return <TripPageClient shareCode={params.shareCode} />;
} 