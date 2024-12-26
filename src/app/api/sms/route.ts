import { NextResponse } from 'next/server';
import * as twilio from 'twilio';

const validateTwilioRequest = async (request: Request) => {
  // For development, bypass validation
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: bypassing Twilio signature validation');
    return true;
  }

  const twilioSignature = request.headers.get('X-Twilio-Signature');
  
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
  const body = await request.clone().text();
  const params = Object.fromEntries(new URLSearchParams(body));
  
  // Get the full URL including the ngrok domain
  const url = request.url;

  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    params
  );

  return isValid;
};

export async function POST(request: Request) {
  try {
    // Clone the request for validation
    const requestClone = request.clone();
    
    // Parse the request body as JSON
    const body = await request.json();
    console.log('SMS message:', body.text);

    // Validate the request is from Twilio
    const isValid = await validateTwilioRequest(requestClone);
    
    if (!isValid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Send a simple acknowledgment response
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Message received and logged.');

    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });

  } catch (error) {
    console.error('Error processing SMS:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, something went wrong processing your message.');
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
} 