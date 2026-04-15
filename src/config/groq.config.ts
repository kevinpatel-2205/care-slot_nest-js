import Groq from 'groq-sdk';

let groqInstance: Groq;

export const getGroqInstance = (): Groq => {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY missing in env');
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
};
