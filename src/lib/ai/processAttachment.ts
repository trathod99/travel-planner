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
      
      const prompt = `Please analyze this image carefully and ALWAYS provide a name, even if you have to make an educated guess. Return your response in this exact JSON format:

{
  "Name": "REQUIRED - You MUST provide a name, even if uncertain. Examples:
    - For flights: 'Flight LAX→SFO' or 'Flight to San Francisco'
    - For hotels: 'Marriott Downtown SF' or 'Hotel in San Francisco'
    - For activities: 'Museum of Modern Art Tour' or 'Museum Visit'
    - For restaurants: 'Dinner at Nobu' or 'Restaurant Reservation'
    If the type is unclear, use a descriptive name based on any visible details.",
  "Start Time": "time in HH:mm format (24h), or null if unclear",
  "End Time": "time in HH:mm format (24h), or null if unclear",
  "Description": "STRING. Do not nest JSON objects. Provide a detailed description including confirmation numbers, locations, contact info, etc. Use bullet points to aid with readability",
  "Category": "MUST be one of exactly: 'Travel', 'Food', 'Accommodation', or 'Activity'"
}

IMPORTANT:
1. The Name field is REQUIRED - you must ALWAYS provide a name
2. If the exact name is unclear, make your best guess based on the type of item and any visible details
3. Never return an empty string or null for the Name field
4. If truly uncertain, use a generic but descriptive name like 'Travel Booking' or 'Event Reservation'`;

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
              text: prompt
            }
          ]
        }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : null;
      if (!content) {
        throw new Error('Unexpected response format from Claude API');
      }

      // Parse the response and validate the name field
      const parsedContent = JSON.parse(content);
      if (!parsedContent.Name || parsedContent.Name.trim() === '') {
        console.log('AI returned empty name, using fallback');
        parsedContent.Name = 'Untitled Item';
        if (parsedContent.Category) {
          parsedContent.Name = `${parsedContent.Category} Item`;
        }
        if (parsedContent.Description) {
          // Try to extract a name from the first line of the description
          const firstLine = parsedContent.Description.split('\n')[0].trim();
          if (firstLine.length > 0) {
            parsedContent.Name = firstLine.substring(0, 50); // Limit to 50 characters
          }
        }
      }

      console.log('Claude response:', JSON.stringify(parsedContent));
      return JSON.stringify(parsedContent);
    }

    throw new Error('Unsupported file type for AI analysis');
  } catch (error) {
    console.error('Error processing attachment with AI:', error);
    throw error;
  }
} 