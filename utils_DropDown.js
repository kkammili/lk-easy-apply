const fs = require('fs');

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

      // Skip known non-interactive dropdown-like labels
      if (questionText.toLowerCase().includes("email")) {
        console.log(`⚠️ Skipping question "${questionText}" — looks like it's not a real dropdown.`);
        continue;
      }

      const selectElement = await dropdownElement.$('select');
      if (!selectElement) {
        console.log(`⚠️ No <select> element found for "${questionText}", skipping.`);
        continue;
      }

      const tagName = await selectElement.evaluate(el => el.tagName.toLowerCase());
      if (tagName !== 'select') {
        console.log(`⚠️ Element for "${questionText}" is not a <select>, skipping.`);
        continue;
      }

      const options = await selectElement.$$('option');
      if (options.length === 0) {
        console.log(`⚠️ No options available for "${questionText}", skipping.`);
        continue;
      }

      let answer = dropdownAnswersDatabase[questionText];

      if (!answer) {
        console.log(`Please select the answer for "${questionText}" via the browser UI.`);
        await selectElement.focus();

        // Wait for user to select an option
        let selectedValue = await selectElement.inputValue();
        while (selectedValue === "Select an option") {
          await page.waitForTimeout(500);
          selectedValue = await selectElement.inputValue();
        }

        answer = selectedValue;
        dropdownAnswersDatabase[questionText] = answer;
        fs.writeFileSync(dropdownAnswersFilePath, JSON.stringify(dropdownAnswersDatabase, null, 2));
      } else {
        const success = await selectElement.selectOption({ label: answer });
        if (success.length === 0) {
          console.log(`⚠️ Could not select "${answer}" for "${questionText}". Option may be missing.`);
        }
      }

    } catch (err) {
      console.log(`❌ Error processing dropdown:`, err.message);
    }
  }
}




async function handleNewAnswerDropDown(questionText, page) {
  let answer = '';

  while (!answer) {
    answer = await new Promise((resolve) => {
      setTimeout(resolve, 1000);  // Wait for 1 second before checking again
    });

    const dropdownElement = await page.$('select:checked');
    if (dropdownElement) {
      const selectedOption = await dropdownElement.$('option:checked');
      answer = await selectedOption.textContent();
      return answer;
    } else {
      console.log('No selection made via UI. Please provide the dropdown answer via terminal.');
    }
  }

  return answer;
}
module.exports = {
  answerDropDown,
  handleNewAnswerDropDown,
};
