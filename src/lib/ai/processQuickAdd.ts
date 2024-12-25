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
  category: 'Travel' | 'Food' | 'Accommodation' | 'Activity';
}

export async function processQuickAdd(input: string, fileContent: string): Promise<ProcessedItem> {
  const prompt = `Given this quick description of an itinerary item: "${input}", 
  ${fileContent ? `and the following attached document content: "${fileContent}",` : ''}
  please analyze it and return a JSON object with the following fields:
  - title: a concise title prefixed with a relevant emoji (✈️ for flights, 🏨 for hotels, 🎫 for tickets, etc.)
  - startTime: the start time in HH:mm 24-hour format (e.g., "14:30")
  - endTime: the end time in HH:mm 24-hour format (e.g., "15:30")
  - description: a detailed description including any extracted information such as:
    - Confirmation numbers
    - Flight numbers and airlines
    - Hotel/venue names and addresses
    - Booking references
    - Important notes or requirements
  - category: MUST be one of exactly these values: "Travel", "Food", "Accommodation", or "Activity". Choose based on these rules:
    - Travel: For flights, trains, buses, car rentals, or any transportation
    - Food: For restaurants, cafes, food tours, or any dining experiences
    - Accommodation: For hotels, resorts, Airbnbs, or any lodging
    - Activity: For tours, attractions, shows, or any other activities

  If times aren't specified, make reasonable assumptions. For example:
  - Flights: Use actual flight times from documents
  - Hotel check-in: typically 15:00, check-out: typically 11:00
  - Shows/Events: Use actual times from tickets
  - Meals typically last 1-1.5 hours
  - Tourist activities typically last 2-3 hours

  Example inputs and expected processing:
  "Flight confirmation PDF for AA123" + {flight confirmation attachment} →
  {
    "title": "✈️ AA123 LAX to JFK",
    "startTime": "15:45",
    "endTime": "23:55",
    "description": "American Airlines flight AA123\\nConfirmation: ABC123\\nDeparture: LAX Terminal 4\\nArrival: JFK Terminal 8\\nSeat: 12A\\nBaggage: 1 checked bag",
    "category": "Travel"
  }

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