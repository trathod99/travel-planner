import { createApi } from 'unsplash-js';
import { NextResponse } from 'next/server';

const unsplash = createApi({
  accessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '',
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const title = searchParams.get('title');

  if (!location && !title) {
    return NextResponse.json(
      { error: 'Location or title is required' },
      { status: 400 }
    );
  }

  try {
    // Combine location and title for a better search query
    const searchQuery = [location, title]
      .filter(Boolean)
      .join(' ')
      .trim();

    const result = await unsplash.search.getPhotos({
      query: searchQuery,
      orientation: 'landscape',
      perPage: 5,
    });

    if (result.errors) {
      throw new Error(result.errors[0]);
    }

    const photos = result.response?.results.map(photo => ({
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      credit: {
        name: photo.user.name,
        link: photo.user.links.html,
      },
    }));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching Unsplash images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image suggestions' },
      { status: 500 }
    );
  }
} 