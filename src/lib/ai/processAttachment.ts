import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export async function getFileContent(file: File): Promise<string> {
  if (file.type.startsWith('text/') || file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        resolve(content);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize and compress
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to max 1024px on longest side
          const maxDimension = 1024;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with 85% quality
          const base64Data = canvas.toDataURL('image/jpeg', 0.85);
          console.log('Image dimensions after processing:', width, 'x', height);
          console.log('Base64 data length:', base64Data.length);
          resolve(base64Data);
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  throw new Error('Unsupported file type for AI analysis');
}

export async function processAttachment(
  file: File,
  currentTitle: string,
  currentDescription: string | undefined
): Promise<string> {
  const fileContent = await getFileContent(file);
  console.log('File type:', file.type);

  try {
    console.log('Sending request to Claude...');
    if (file.type.startsWith('image/')) {
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
                media_type: 'image/jpeg',
                data: fileContent.split(',')[1]
              }
            },
            {
              type: 'text',
              text: `Please analyze this image carefully. Extract ONLY the information you are highly confident about. Return your response in this exact JSON format:

{
  "Title": "descriptive title - for flights: 'Flight LAX→SFO', for hotels: 'Marriott Downtown SF', for activities: 'Museum of Modern Art Tour'",
  "Start Time": "time in HH:mm format (24h), or null if unclear",
  "End Time": "time in HH:mm format (24h), or null if unclear",
  "Description": "STRING. Do not nest JSON objects. Provide adetailed description including confirmation numbers, locations, contact info, etc. Use bullet points to aid with readability"
}

Only include fields where you are highly confident about the information. Use null for uncertain fields. For the title, be as specific as possible while keeping it concise. For description, you can include less certain but potentially useful details.`
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
    } else {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: `Please analyze this ${file.type} file carefully. Extract ONLY the information you are highly confident about. Format your response EXACTLY like this, with each field on a new line:

Title: [descriptive title including key details - for flights: "Flight LAX→SFO", for hotels: "Marriott Downtown SF", for activities: "Museum of Modern Art Tour"]
Start Time: [time in HH:mm format (24h), or leave blank if unclear]
End Time: [time in HH:mm format (24h), or leave blank if unclear]
Description: [detailed description including all relevant details like confirmation numbers, locations, contact info, etc.]

Only include fields where you are highly confident about the information. Leave fields blank if you're unsure. For the title, be as specific as possible while keeping it concise.

Content to analyze:
${fileContent}`
        }]
      });

      const content = response.content[0].type === 'text' ? response.content[0].text : null;
      if (!content) {
        throw new Error('Unexpected response format from Claude API');
      }

      console.log('Claude response:', content);
      return content;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('too long')) {
      return "Sorry, this file is too large for AI analysis. Please try with a smaller file or extract the relevant information manually.";
    }
    console.error('Error processing attachment with AI:', error);
    throw error;
  }
} 