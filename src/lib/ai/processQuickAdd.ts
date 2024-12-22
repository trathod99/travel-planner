import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true  // Enable browser usage
});

interface ProcessedItem {
  title: string;  // includes emoji
  startTime: string;  // HH:mm format
  endTime: string;   // HH:mm format
  description: string;
}

export async function processQuickAdd(input: string): Promise<ProcessedItem> {
  const prompt = `Given this quick description of an itinerary item: "${input}", 
  please analyze it and return a JSON object with the following fields:
  - title: a concise title prefixed with a relevant emoji
  - startTime: the start time in HH:mm 24-hour format (e.g., "14:30")
  - endTime: the end time in HH:mm 24-hour format (e.g., "15:30")
  - description: a brief description with any relevant details

  If times aren't specified, make reasonable assumptions. For example:
  - Meals typically last 1-1.5 hours
  - Flights/transport typically need buffer time
  - Tourist activities typically last 2-3 hours

  Example inputs and expected processing:
  "Lunch at Sushi Roku" → { "title": "🍣 Lunch at Sushi Roku", "startTime": "12:00", "endTime": "13:30", "description": "Japanese dining experience at Sushi Roku restaurant" }
  "Flight AA123 to NYC at 3:45pm" → { "title": "✈️ Flight AA123 to NYC", "startTime": "15:45", "endTime": "19:45", "description": "American Airlines flight AA123 to New York City" }

  Return only the JSON object, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ 
        role: 'user', 
        content: prompt 
      }],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : null;
    if (!content) {
      throw new Error('Unexpected response format from Claude API');
    }

    const result = JSON.parse(content);
    return result as ProcessedItem;
  } catch (error) {
    console.error('Error processing quick add with AI:', error);
    throw error;
  }
} 