import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true
});

// Helper function to get the correct media type for Claude API
function getClaudeMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'image/jpeg';
    case 'image/png':
      return 'image/png';
    case 'image/gif':
      return 'image/gif';
    case 'image/webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // fallback to JPEG
  }
}

export async function getFileContent(file: File | ArrayBuffer): Promise<string> {
  try {
    let arrayBuffer: ArrayBuffer;
    
    if (file instanceof File) {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = file;
    }
    
    // Convert to base64 without the data URL prefix
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    console.log('Base64 length:', base64.length);
    
    // Validate the base64 string
    if (!base64 || base64.length === 0) {
      throw new Error('Failed to convert image to base64');
    }
    
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

export async function processAttachment(
  file: File | ArrayBuffer,
  currentTitle: string,
  currentDescription: string | undefined
): Promise<string> {
  try {
    const fileType = file instanceof File ? file.type : 'image/png';
    console.log('Processing attachment:', fileType);
    const base64Data = await getFileContent(file);
    console.log('Base64 data length:', base64Data.length);
    
    if (fileType.startsWith('image/')) {
      console.log('Sending image to Claude...');
      const mediaType = getClaudeMediaType(fileType);
      console.log('Using media type:', mediaType);
      
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: `Please analyze this image carefully. Extract ONLY the information you are highly confident about. Return your response in this exact JSON format:

{
  "Name": "descriptive name - for flights: 'Flight LAX→SFO', for hotels: 'Marriott Downtown SF', for activities: 'Museum of Modern Art Tour'",
  "Date": "date in YYYY-MM-DD format, or null if unclear. If no year is specified in the image, use the current year. Example: '2024-03-15'",
  "Start Time": "time in HH:mm format (24h), or null if unclear",
  "End Time": "time in HH:mm format (24h), or null if unclear",
  "Description": "STRING. Do not nest JSON objects. Provide a detailed description including confirmation numbers, locations, contact info, etc. Use bullet points to aid with readability",
  "Category": "MUST be one of exactly: 'Travel', 'Food', 'Accommodation', or 'Activity'. Choose based on these rules:\\n- Travel: For flights, trains, buses, car rentals, or any transportation\\n- Food: For restaurants, cafes, food tours, or any dining experiences\\n- Accommodation: For hotels, resorts, Airbnbs, or any lodging\\n- Activity: For tours, attractions, shows, or any other activities"
}

Only include fields where you are highly confident about the information. Use null for uncertain fields. For the title, be as specific as possible while keeping it concise. For description, you can include less certain but potentially useful details.

For the Date field:
1. Extract it from any dates mentioned in the image (e.g., flight date, hotel check-in date, reservation date, etc.)
2. If multiple dates are found, use the most relevant one for the event
3. If no year is specified, use the current year (${new Date().getFullYear()})
4. Always return the date in YYYY-MM-DD format

Based on the content of the image (e.g., if it's a flight confirmation, hotel booking, restaurant reservation, etc.), make sure to set the appropriate Category value.`
            }
          ]
        }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : null;
      if (!content) {
        throw new Error('Unexpected response format from Claude API');
      }

      console.log('Claude response:', content);
      return content;
    }

    throw new Error('Unsupported file type for AI analysis');
  } catch (error) {
    console.error('Error processing attachment with AI:', error);
    throw error;
  }
} 