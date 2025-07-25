// const { Configuration, OpenAIApi } = require("openai");
// const config = new Configuration({ apiKey:});
// const openai = new OpenAIApi(config);
require('dotenv').config();
const profile = require('./profile.js').userProfile
const OpenAI = require('openai');
const userProfile = require('./profile'); // if needed here

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getAIAnswer(questionText, options) {
  const prompt = `
You are helping fill out a job application automatically.

Question: "${questionText}"
Options: [${options.map(opt => `"${opt}"`).join(", ")}]
User profile: ${JSON.stringify(profile)}

Choose the best option strictly from the Options list above and return only that option (case-sensitive).
`;

const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }]
});  

  const aiAnswer = response.data.choices[0].message.content.trim();
  return aiAnswer;
}

module.exports = {
    getAIAnswer
}