import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyBv8GMRrXAhRRpELV28lT0tCZxxBxanJkE');

export async function chat(message: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error in Gemini chat:', error);
    throw error;
  }
}
