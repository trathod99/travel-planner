import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { title, location, category } = await request.json();

    if (!title || !location) {
      return NextResponse.json(
        { error: 'Title and location are required' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `Generate a helpful suggestions for an itinerary item in ${location}. The item is titled "${title}" and is categorized as ${category}.

        Try to determine the user's intent based on the title and category and location. For example, an item titled "Lunch" with category "Food" and location "San Diego" might indicate that the user is planning to eat lunch at a restaurant in San Diego. 

        Avoid generic suggestions like "eat at a restaurant" or "visit a museum". Focus on specific places and actionable suggestions. For example, "walk the busy streets and check out local restaurants" is not helpful. Try out [specific dish] at [specific restaurant] on [specific bustling street] is helpful.  

        The suggestions should:
1. Be very concise and scannable. Bullet points, short sentences, etc.
2. Include specific, local details about ${location} when relevant
3. Focus on practical information and tips
4. DO NOT repeat the title verbatim, or anything similar to the title
5. Be written in a friendly, casual tone
6. Do not include information that is not actionable. Flowery language is not helpful.
7. DO NOT include an introduction or conclusion sentence. ONLY the suggestions. The response should NOT INCLUDE any text like "Here are some helpful suggestios", etc.

For example, if the title is "Lunch at Sushi Roku" in San Diego, a good response would be Sushi Roku's best menu items, advice about reservations and attire, and recommendations for associated activities (bars, dessert, etc.) in the surrounding area. 

Generate a similar style description for this itinerary item:`
      }]
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : null;
    if (!content) {
      throw new Error('Unexpected response format from Claude API');
    }

    return NextResponse.json({ description: content });
  } catch (error) {
    console.error('Error generating description:', error);
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
} 