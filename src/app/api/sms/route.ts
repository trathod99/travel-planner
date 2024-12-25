import { NextResponse } from 'next/server';
import { database } from '@/lib/firebase/clientApp';
import { ref, get, set } from 'firebase/database';
import { processQuickAdd } from '@/lib/ai/processQuickAdd';
import { processAttachment } from '@/lib/ai/processAttachment';
import { uploadFile } from '@/hooks/useFileUpload';
import * as twilio from 'twilio';

const twilioClient = new twilio.Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Verify the request is coming from Twilio
const validateTwilioRequest = async (request: Request) => {
  // For development, bypass validation
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: bypassing Twilio signature validation');
    return true;
  }

  const twilioSignature = request.headers.get('X-Twilio-Signature');
  console.log('Twilio signature:', twilioSignature);
  
  if (!twilioSignature) {
    console.error('No Twilio signature found in request');
    return false;
  }
  
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN is not set');
    return false;
  }

  // Get the raw form data
  const formData = await request.clone().formData();
  const params = Object.fromEntries(formData.entries());
  console.log('Request params:', params);
  
  // Get the full URL including the ngrok domain
  const url = request.url;
  console.log('Webhook URL:', url);

  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    params
  );

  console.log('Signature validation result:', isValid);
  return isValid;
};

export async function POST(request: Request) {
  try {
    console.log('Received webhook request');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    // Validate the request is from Twilio
    const isValid = await validateTwilioRequest(request);
    
    if (!isValid) {
      console.error('Failed Twilio signature validation');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const from = formData.get('From') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string) || 0;
    
    console.log('Processing message from:', from);
    console.log('Number of media attachments:', numMedia);
    
    // Clean the phone number to match our database format
    const cleanPhoneNumber = from.replace(/[^0-9]/g, '');

    // Check if the user exists
    const userRef = ref(database, `users/${cleanPhoneNumber}`);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists()) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Sorry, I don\'t recognize this phone number. Please sign up for an account first.');
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // If there are no media attachments, return
    if (numMedia === 0) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Please include an image with your message.');
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Get all trips where this user has an RSVP
    const tripsRef = ref(database, 'trip-rsvps');
    const tripsSnapshot = await get(tripsRef);
    const userTrips: any[] = [];

    if (tripsSnapshot.exists()) {
      const allTrips = tripsSnapshot.val();
      console.log('All trips from database:', allTrips);
      
      for (const tripId in allTrips) {
        const tripRSVPs = allTrips[tripId];
        const userRSVP = tripRSVPs[cleanPhoneNumber];
        console.log(`Checking trip ${tripId} for user RSVP:`, userRSVP);
        
        if (userRSVP) {
          // Get the trip details
          const tripRef = ref(database, `trips/${tripId}`);
          const tripSnapshot = await get(tripRef);
          if (tripSnapshot.exists()) {
            const tripDetails = tripSnapshot.val();
            console.log(`Found trip details for ${tripId}:`, tripDetails);
            userTrips.push({
              ...tripDetails,
              rsvpStatus: userRSVP.status
            });
          }
        }
      }
    }

    console.log('User trips found:', userTrips);

    if (userTrips.length === 0) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('You don\'t have any active trips. Please RSVP to a trip first.');
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    let lastMatchedTrip = null;
    let processedCount = 0;

    // Process each media attachment
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string;
      const contentType = formData.get(`MediaContentType${i}`) as string;
      console.log(`Processing media ${i}:`, { mediaUrl, contentType });

      // Only process image files
      if (!contentType.startsWith('image/')) {
        console.log(`Skipping non-image file: ${contentType}`);
        continue;
      }

      try {
        // Download and process the image
        console.log('Downloading image from Twilio...');
        const accountSid = process.env.TWILIO_ACCOUNT_SID!;
        const authToken = process.env.TWILIO_AUTH_TOKEN!;
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const response = await fetch(mediaUrl, {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        // Get the image data as a Blob with the correct content type
        const imageBlob = await response.blob();
        console.log('Image downloaded, size:', imageBlob.size);

        // Create a File object from the Blob
        const file = new File([imageBlob], `image${i}.${contentType.split('/')[1]}`, { 
          type: contentType,
          lastModified: Date.now()
        });
        console.log('Created File object:', { name: file.name, type: file.type, size: file.size });

        // First upload the file to Firebase Storage
        console.log('Uploading file to Firebase Storage...');
        const attachment = await uploadFile(
          file,
          'sms-uploads', // Use a dedicated folder for SMS uploads
          Date.now().toString()
        );
        console.log('File uploaded:', attachment);

        // Then analyze it with Claude using the blob data
        console.log('Processing image with AI...');
        const analysisResponse = await processAttachment(
          file,
          '',
          ''
        );
        console.log('AI analysis response:', analysisResponse);

        // Remove all newlines and extra spaces from the response
        const cleanedResponse = analysisResponse.replace(/\s+/g, ' ').trim();
        console.log('Cleaned response:', cleanedResponse);
        
        // Parse the JSON response
        const analysis = JSON.parse(cleanedResponse);
        console.log('Parsed analysis:', analysis);
        
        const processedItem = await processQuickAdd(cleanedResponse, '');
        console.log('Processed quick add item:', processedItem);

        // Try to match with a trip
        console.log('Attempting to match with user trips...');
        let matchedTrip = null;
        for (const trip of userTrips) {
          console.log(`Checking trip location "${trip.location}" against description:`, processedItem.description);
          // Simple location matching - can be made more sophisticated
          if (trip.location && processedItem.description.toLowerCase().includes(trip.location.toLowerCase())) {
            console.log('Found matching trip:', trip);
            matchedTrip = trip;
            lastMatchedTrip = trip;
            break;
          }
        }

        if (matchedTrip) {
          console.log('Adding item to matched trip:', matchedTrip.shareCode);
          
          // Extract date from the AI analysis
          let itemDate = new Date();
          const currentYear = new Date().getFullYear();
          
          console.log('AI provided date:', analysis.Date);
          if (analysis.Date) {
            // If the AI provided a specific date, use it
            itemDate = new Date(analysis.Date);
            console.log('Parsed date from AI:', itemDate);
            
            // If the date is in the past, move it to the same date next year
            if (itemDate < new Date()) {
              console.log('Date is in the past, adjusting year...');
              itemDate.setFullYear(currentYear);
              // If it's still in the past, move to next year
              if (itemDate < new Date()) {
                itemDate.setFullYear(currentYear + 1);
              }
              console.log('Adjusted date:', itemDate);
            }
          } else if (analysis["Start Time"]) {
            // If we have a start time but no date, try to extract date from the description
            const dateMatch = processedItem.description.match(/\b\d{4}-\d{2}-\d{2}\b/);
            if (dateMatch) {
              itemDate = new Date(dateMatch[0]);
              console.log('Extracted date from description:', itemDate);
              
              // If the date is in the past, move it to the same date next year
              if (itemDate < new Date()) {
                console.log('Date is in the past, adjusting year...');
                itemDate.setFullYear(currentYear);
                // If it's still in the past, move to next year
                if (itemDate < new Date()) {
                  itemDate.setFullYear(currentYear + 1);
                }
                console.log('Adjusted date:', itemDate);
              }
            } else {
              console.log('No date found in description, using current date:', itemDate);
            }
          } else {
            console.log('No date information found, using current date:', itemDate);
          }
          
          // Format the date as YYYY-MM-DD
          const dateString = itemDate.toISOString().split('T')[0];
          console.log('Final date string for item:', dateString);
          const itemId = Date.now().toString();
          
          // Use the same database path as other itinerary items
          const itemRef = ref(database, `trips/${matchedTrip.shareCode}/itinerary/${dateString}/${itemId}`);
          const newItem = {
            ...processedItem,
            id: itemId,
            name: analysis.Name || 'Untitled Item',
            startTime: analysis["Start Time"] ? `${dateString}T${analysis["Start Time"]}:00.000Z` : `${dateString}T09:00:00.000Z`,
            endTime: analysis["End Time"] ? `${dateString}T${analysis["End Time"]}:00.000Z` : `${dateString}T10:00:00.000Z`,
            createdAt: new Date().toISOString(),
            createdBy: cleanPhoneNumber,
            attachments: [{
              ...attachment,
              name: `SMS Attachment ${i + 1}`
            }]
          };
          console.log('New itinerary item:', newItem);
          await set(itemRef, newItem);
          processedCount++;
        } else {
          console.log('No matching trip found for the image');
        }
      } catch (error) {
        console.error(`Error processing image ${i}:`, error);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
    }

    // Return a TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    if (lastMatchedTrip) {
      const message = processedCount === 1
        ? 'Thanks! I\'ve added your image to your trip itinerary.'
        : `Thanks! I've added ${processedCount} images to your trip itinerary.`;
      console.log('Success response:', message);
      twiml.message(message);
    } else {
      const message = 'I couldn\'t find a matching trip for your image(s). Make sure the image contains location information that matches one of your trips.';
      console.log('No match response:', message);
      twiml.message(message);
    }

    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    console.error('Error processing SMS:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, something went wrong processing your image. Please try again later.');
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
} 