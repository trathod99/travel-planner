import { database } from '@/lib/firebase/clientApp';
import { ref, get } from 'firebase/database';
import { notFound } from 'next/navigation';
import { Trip } from '@/types/trip';
import { CopyShareLink } from '@/components/CopyShareLink';

async function getTrip(shareCode: string): Promise<Trip | null> {
  const tripRef = ref(database, `trips/${shareCode}`);
  const snapshot = await get(tripRef);
  return snapshot.exists() ? snapshot.val() : null;
}

export default async function TripPage({ params }: { params: { shareCode: string } }) {
  const trip = await getTrip(params.shareCode);

  if (!trip) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{trip.name}</h1>
        <CopyShareLink shareCode={trip.shareCode} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Location</h2>
          <p>{trip.location}</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Dates</h2>
          <p>
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </p>
        </div>

        {trip.description && (
          <div>
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="whitespace-pre-wrap">{trip.description}</p>
          </div>
        )}
      </div>
    </div>
  );
} 