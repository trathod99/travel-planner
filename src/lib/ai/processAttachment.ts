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
  itemName: string,
  itemDescription?: string
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
                data: fileContent.split(',')[1] // Remove the data URL prefix
              }
            },
            {
              type: 'text',
              text: `Please analyze this image carefully. It's related to a travel itinerary item named "${itemName}". Extract ALL relevant travel information you can find, such as confirmation numbers, dates, times, locations, contact details, prices, and any special instructions.

Format your response like this:
"AI found the following details:
• [Category]: [Details]
..."

Be thorough - include ALL relevant details you can find. If truly no relevant information is found, only then say "No relevant information found in the attachment."`
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
          content: `You are a helpful AI assistant analyzing a file attachment for a travel itinerary item.

Current Itinerary Item:
Name: ${itemName}
${itemDescription ? `Current Description: ${itemDescription}\n` : ''}

I've attached a ${file.type} file that contains travel-related information. Please analyze it carefully and extract ALL helpful information that could enhance the itinerary item description. Pay special attention to:

1. Confirmation/Booking Numbers
2. Exact Times and Dates
3. Location Details (addresses, terminals, etc.)
4. Contact Information
5. Important Instructions
6. Pricing Information
7. Any Special Requirements or Notes

Format your response like this:
"AI found the following details:
• [Category]: [Details]
..."

Be thorough - include ALL relevant details you can find. If truly no relevant information is found, only then say "No relevant information found in the attachment."

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