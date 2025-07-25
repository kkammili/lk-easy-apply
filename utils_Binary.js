const fs = require('fs');
const getAIAnswer = require('./ai_module')

//-------------------------------------------------2.Binary response HANDLER-------------------------
const binaryAnswersFilePath  = './binary_response.json';
let binaryAnswersDatabase  = {};
if (fs.existsSync(binaryAnswersFilePath)) {
  const data = fs.readFileSync(binaryAnswersFilePath, 'utf8');
  binaryAnswersDatabase = JSON.parse(data);
} else {
  console.log('binary_response.json file not found. Creating a new one.');
  fs.writeFileSync(binaryAnswersFilePath, JSON.stringify(binaryAnswersDatabase, null, 2));
}

async function answerBinaryQuestions(page) {
  const binaryQuestionSelectors = [
    'fieldset[data-test-form-builder-radio-button-form-component="true"]',
  ];

  for (let selector of binaryQuestionSelectors) {
    const questionElements = await page.$$(selector);
    for (let questionElement of questionElements) {
      const questionTextElement = await questionElement.$('span[data-test-form-builder-radio-button-form-component__title]');
      const questionText = (await questionTextElement.textContent()).trim();
      console.log("Binary Question:", questionText);

      let answer = binaryAnswersDatabase[questionText];

      if (!answer) {
        answer = await handleNewQuestionBinary(questionText, page);
        binaryAnswersDatabase[questionText] = answer;
        fs.writeFileSync(binaryAnswersFilePath, JSON.stringify(binaryAnswersDatabase, null, 2));
      }

      const yesInput = await questionElement.$('input[value="Yes"]');
      const noInput = await questionElement.$('input[value="No"]');

      try {
        if (answer === 'Yes' && yesInput) {
          await yesInput.scrollIntoViewIfNeeded();
          await yesInput.click({ force: true });
        } else if (answer === 'No' && noInput) {
          await noInput.scrollIntoViewIfNeeded();
          await noInput.click({ force: true });
        } else {
          console.log(`No suitable answer found for: "${questionText}". Skipping.`);
        }
      } catch (error) {
        console.error(`Failed to click on the answer for: "${questionText}". Error: ${error}`);
      }
    }
  }
}

async function handleNewQuestionBinary(questionText, page) {
  let answer = '';

  const yesInput = await page.$('input[value="Yes"]');
  const noInput = await page.$('input[value="No"]');

  const isYesChecked = await page.$('input[value="Yes"]:checked');
  const isNoChecked = await page.$('input[value="No"]:checked');

  if (isYesChecked) {
    answer = 'Yes';
  } else if (isNoChecked) {
    answer = 'No';
  } else if (yesInput || noInput) {
    // Use AI to answer based on user profile
    console.log('getting ai answer for new quetion', questionText)
    answer = await getAIAnswer(questionText, ['Yes', 'No']);
    console.log('ai answered', answer)
  } else {
    console.log('No Yes/No inputs found on the page.');
    answer = 'unknown';
  }

  return answer;
}

module.exports = {
    answerBinaryQuestions,
    handleNewQuestionBinary,
  };