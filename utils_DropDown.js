const fs = require('fs');
const { getAIAnswer } = require('./ai_module');
const userProfile = require('./profile');

//-------------------------------------------------3.DropDown response HANDLER-------------------------
const dropdownAnswersFilePath = './dropdown_response.json';
let dropdownAnswersDatabase = {};
if (fs.existsSync(dropdownAnswersFilePath)) {
  const data = fs.readFileSync(dropdownAnswersFilePath, 'utf8');
  dropdownAnswersDatabase = JSON.parse(data);
} else {
  console.log('dropdown_response.json file not found. Creating a new one.');
  fs.writeFileSync(dropdownAnswersFilePath, JSON.stringify(dropdownAnswersDatabase, null, 2));
}

async function answerDropDown(page) {
  const dropdownQuestionSelector = 'div[data-test-text-entity-list-form-component]';
  const dropdownElements = await page.$$(dropdownQuestionSelector);

  for (let dropdownElement of dropdownElements) {
    try {
      const questionTextElement = await dropdownElement.$('label span:not(.visually-hidden)');
      if (!questionTextElement) continue;

      const questionText = (await questionTextElement.textContent()).trim();
      console.log("Dropdown Question:", questionText);

      // Skip unnecessary questions
      if (
        questionText.toLowerCase() === 'phone country code' ||
        questionText.toLowerCase().includes("email")
      ) {
        console.log(`⚠️ Skipping "${questionText}" — non-interactive or irrelevant.`);
        continue;
      }

      const selectElement = await dropdownElement.$('select');
      if (!selectElement) {
        console.warn(`⚠️ No <select> element found for "${questionText}", skipping.`);
        continue;
      }

      const tagName = await selectElement.evaluate(el => el.tagName.toLowerCase());
      if (tagName !== 'select') {
        console.warn(`⚠️ Element for "${questionText}" is not a <select>, skipping.`);
        continue;
      }

      const optionHandles = await selectElement.$$('option:not([disabled]):not([hidden])');
      if (!optionHandles || optionHandles.length === 0) {
        console.warn(`⚠️ No valid options for "${questionText}".`);
        continue;
      }

      // Retrieve known answer or generate it
      let answer = dropdownAnswersDatabase[questionText];

      if (!answer) {
        const availableOptions = [];

        for (const opt of optionHandles) {
          const text = await opt.textContent();
          if (text && !['select', 'choose'].includes(text.trim().toLowerCase())) {
            availableOptions.push(text.trim());
          }
        }

        if (availableOptions.length === 0) {
          console.warn(`⚠️ No selectable options found for "${questionText}".`);
          continue;
        }

        // ✅ AI logic
        answer = await getAIAnswer(questionText, availableOptions);
        console.log(`💡 AI selected "${answer}" for "${questionText}"`);

        dropdownAnswersDatabase[questionText] = answer;
        fs.writeFileSync(dropdownAnswersFilePath, JSON.stringify(dropdownAnswersDatabase, null, 2));
      }

      const success = await selectElement.selectOption({ label: answer });
      if (success.length === 0) {
        console.warn(`⚠️ Could not select "${answer}" for "${questionText}".`);
      }

    } catch (err) {
      console.error(`❌ Error processing dropdown "${questionText}":`, err.message);
    }
  }
}



async function handleNewAnswerDropDown(questionText, page) {
  let answer = '';

  const dropdownElement = await page.$('select');
  if (dropdownElement) {
    // Get all valid options
    const optionsHandles = await dropdownElement.$$(
      'option:not([disabled]):not([hidden])'
    );

    if (optionsHandles.length > 0) {
      const options = [];
      for (let opt of optionsHandles) {
        const text = await opt.textContent();
        if (text && text.trim().toLowerCase() !== 'select') {
          options.push(text.trim());
        }
      }

      // 🔍 Ask AI for the best option
      answer = await getAIAnswer(questionText, options);
      console.log(`AI selected "${answer}" for question "${questionText}"`);

      // Find and select the option matching the AI answer
      const matchingOption = await dropdownElement.$(`option:text("${answer}")`);
      if (matchingOption) {
        const value = await matchingOption.getAttribute('value');
        await dropdownElement.selectOption(value);
      } else {
        console.log(`AI-chosen answer "${answer}" not found in dropdown options.`);
        answer = 'unknown';
      }
    } else {
      console.log('No valid option found in dropdown.');
      answer = 'unknown';
    }
  } else {
    console.log('No dropdown element found on the page.');
    answer = 'unknown';
  }

  return answer;
}


module.exports = {
  answerDropDown,
  handleNewAnswerDropDown,
};
