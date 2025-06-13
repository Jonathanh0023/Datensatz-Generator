const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// =============================================================================
// MINIMAL ROGATOR AUTOMATION - SIMPLIFIED LOGIC
// =============================================================================
// 
// SIMPLE RULES:
// 1. Multiple/Single choice → set v-value(s) to 1 → next()
// 2. Information page → next()  
// 3. Text field → write text → set t-value to 1 → next()
// 4. Use screener config when available
// 5. No complex fallbacks or edge cases
//
// =============================================================================

// Load configuration
let config;
try {
  const configPath = path.join(__dirname, '..', 'config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  console.log("Configuration loaded successfully.");
} catch (error) {
  console.error("Error loading config.json:", error);
  process.exit(1);
}

const SURVEY_URL = config.surveyUrl;
const NUM_TEST_RUNS = config.numTestRuns;
const LOG_DIRECTORY = config.logDirectory;
const PREFERRED_LANGUAGE = config.preferredLanguage;
const SCREENER_CONFIG = config.screener || { enabled: false, questions: [] };
const TURBO_MODE = process.argv.includes('--turbo');
const VISUAL_MODE = process.argv.includes('--visual') || process.argv.includes('--show-browser');

// Helper functions
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(array) {
  if (!array || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

// Check screener config for predefined answers
function getScreenerAnswer(questionText) {
  if (!SCREENER_CONFIG.enabled) return null;
  
  const qText = (questionText || "").trim();
  for (const rule of SCREENER_CONFIG.questions) {
    const ruleQuestionText = (rule.questionText || "").trim();
    if (qText.includes(ruleQuestionText) || ruleQuestionText.includes(qText)) {
      console.log(`  [Screener] Found answer: "${rule.answerText}"`);
      return rule.answerText;
    }
  }
  return null;
}

// Main page processing function
async function processPage(page) {
  try {
    // Wait for page to be stable before evaluating
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 200 : 500)); // Reduced delay for stability
    
    const result = await page.evaluate(() => {
    // --- Helper function to generate a stable selector for an element (FIXED SCOPE) ---
    const getSelector = (el) => {
      if (el.id) {
        // Prefer ID-based selector
        return `#${el.id}`;
      }
      // Fallback to a detailed attribute and path-based selector
      let selector = el.tagName.toLowerCase();
      const attrs = ['name', 'class', 'type', 'placeholder'];
      attrs.forEach(attr => {
        const value = el.getAttribute(attr);
        if (value) {
          selector += `[${attr}="${value}"]`;
        }
      });

      // Add nth-child to distinguish between identical siblings
      let child = el;
      let i = 1;
      let parent = el.parentNode;
      while (parent) {
        const children = Array.from(parent.children);
        const elIndex = children.indexOf(child);
        if (elIndex !== -1) {
            i = elIndex + 1;
            break;
        }
        child = parent;
        parent = parent.parentNode;
      }
      selector += `:nth-child(${i})`;
      
      return selector;
    };

    // Get question text and auxiliary text
    const questionElement = document.querySelector('#qtts0');
    const questionText = questionElement ? questionElement.textContent.trim() : '';
    
    // Get auxiliary text (the specific statement for repeated question blocks)
    const auxTextElement = document.querySelector('.questionauxtext');
    const auxText = auxTextElement ? auxTextElement.textContent.trim() : '';
    const combinedText = questionText + (auxText ? ' | ' + auxText.substring(0, 100) : '');
    
    // DEBUG: Add page state information
    const debugInfo = {
      hasMainForm: !!document.querySelector('#mainform'),
      hasStartLink: !!document.querySelector('#startlink'),
      hasLanguageSelection: !!(document.querySelector('#law_lsel0') || document.querySelector('#law_lsel1')),
      hasNextButton: !!document.querySelector('#next_btn'),
      nextButtonVisible: (() => {
        const btn = document.querySelector('#next_btn');
        return btn ? btn.style.display !== 'none' : false;
      })(),
      hasPopup: (() => {
        const popup = document.getElementById('pophelpbox');
        return popup ? popup.style.visibility === 'visible' : false;
      })(),
      isHiddenQuestion: (() => {
        // Check for hidden question with preselected answers
        const styleElements = document.querySelectorAll('style');
        for (const style of styleElements) {
          if (style.textContent && style.textContent.includes('.maincontainer{visibility:hidden;}')) {
            return true;
          }
        }
        // Also check if maincontainer is actually hidden via CSS
        const mainContainer = document.querySelector('.maincontainer');
        if (mainContainer) {
          const computedStyle = window.getComputedStyle(mainContainer);
          if (computedStyle.visibility === 'hidden') {
            return true;
          }
        }
        return false;
      })(),
      bodyTextLength: document.body.textContent.length,
      bodyPreview: document.body.textContent.substring(0, 200)
    };
    
    // Check if this is an end page (more specific detection)
    const bodyText = document.body.textContent.toLowerCase();
    
    // Check for redirect pages (Google, error pages, etc.)
    const hasMetaRefresh = document.querySelector('meta[http-equiv="refresh"]');
    const isVeryLongBody = document.body.textContent.length > 50000; // Unusually long suggests redirect page
    const hasGoogleContent = bodyText.includes('google') || bodyText.includes('search');
    
    if (hasMetaRefresh || (isVeryLongBody && hasGoogleContent)) {
      console.log('Redirect or error page detected - treating as survey end');
      return { 
        type: 'end_page', 
        debug: { ...debugInfo, reason: 'Redirect page detected (meta refresh or Google content)' }
      };
    }
    
    if (bodyText.includes('umfrage beendet') || bodyText.includes('survey finished') || 
        bodyText.includes('thank you') || bodyText.includes('vielen dank') ||
        bodyText.includes('survey complete') || bodyText.includes('questionnaire complete')) {
      return { type: 'end_page', debug: debugInfo };
    }
    
    // Check for start link (initial page)
    if (document.querySelector('#startlink')) {
      return { type: 'start_page', debug: debugInfo };
    }
    
    // Check for main form - but don't immediately assume end page if missing
    const hasMainForm = document.querySelector('#mainform');
    
    // Only consider it an end page if there's no mainform AND no other interactive elements
    if (!hasMainForm) {
      // Check if there are any buttons, links, or forms that might indicate it's not an end page
      const hasButtons = document.querySelectorAll('button, input[type="button"], input[type="submit"]').length > 0;
      const hasLinks = document.querySelectorAll('a[href]').length > 0;
      const hasForms = document.querySelectorAll('form').length > 0;
      
      // If no interactive elements and body text suggests completion, then it's likely an end page
      if (!hasButtons && !hasLinks && !hasForms && 
          (bodyText.includes('completed') || bodyText.includes('finished') || 
           bodyText.includes('ende') || bodyText.includes('abgeschlossen'))) {
        return { type: 'end_page', debug: debugInfo };
      }
      
      // NEW: Also consider it an end page if there are absolutely no interactive elements
      // and no next button available (likely redirected to error page or survey ended)
      if (!hasButtons && !hasLinks && !hasForms && !debugInfo.hasNextButton && !debugInfo.hasStartLink && !debugInfo.hasLanguageSelection) {
        console.log('No interactive elements found - treating as survey end');
        return { 
          type: 'end_page', 
          debug: { ...debugInfo, reason: 'No interactive elements available - survey likely completed or redirected' }
        };
      }
      
      // Otherwise, treat as information page and try to continue
      return { 
        type: 'information_page', 
        questionText: questionText,
        debug: { ...debugInfo, reason: 'No mainform but has interactive elements or unclear completion status' }
      };
    }
    
    // Check for language selection
    if (document.querySelector('#law_lsel0') || document.querySelector('#law_lsel1')) {
      return { type: 'language_selection', debug: debugInfo };
    }
    
    // Look for text inputs (priority: text fields first)
    const textInputs = document.querySelectorAll('input[type="text"]:not([type="hidden"]), textarea');
    const visibleTextInputs = Array.from(textInputs).filter(input => {
      const style = window.getComputedStyle(input);
      const rect = input.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && 
             rect.width > 0 && rect.height > 0;
    });
    
    if (visibleTextInputs.length > 0) {
      return {
        type: 'text_input',
        questionText: combinedText,
        inputs: visibleTextInputs.map(input => ({
          selector: getSelector(input),
          name: input.name,
          type: input.tagName.toLowerCase()
        })),
        debug: debugInfo
      };
    }
    
    // Check for ranking question first (has text inputs with class pattern abstimm_01_text_)
    const rankingInputs = document.querySelectorAll('input[type="text"][class*="abstimm_01_text_"]');
    if (rankingInputs.length > 0) {
      const rankingOptions = document.querySelectorAll('.questiontable .answer.clickable');
      if (rankingOptions.length > 0) {
        return {
          type: 'ranking_question',
          questionText: combinedText,
          options: Array.from(rankingOptions).map(el => ({
            id: el.id || `ranking_${Math.random()}`,
            selector: el.id ? `#${el.id}` : `.answer:nth-child(${Array.from(rankingOptions).indexOf(el) + 1})`,
            text: el.textContent.trim() || `Ranking Option ${Array.from(rankingOptions).indexOf(el) + 1}`,
            classes: el.className
          })),
          inputs: Array.from(rankingInputs).map(input => ({
            selector: `#${input.id}` || `.${input.className}`,
            name: input.name,
            className: input.className
          })),
          debug: debugInfo
        };
      }
    }
    
    // Look for clickable answer options (single/multiple choice)
    const answerOptions = document.querySelectorAll('.answer, td[id^="qtd0r"], .genpointer[id^="qtd0r"]');
    const clickableOptions = Array.from(answerOptions).filter(el => el.id || el.classList.contains('answer') || el.hasAttribute('name')).map(el => ({
      id: el.id,
      selector: getSelector(el),
      text: el.textContent.trim() || `Option_${el.id}`,
      classes: el.className
    }));
    
    if (clickableOptions.length > 0) {
      // Determine if single or multiple choice based on classes
      const isSingle = clickableOptions.some(opt => opt.classes.includes('single')) ||
                       document.querySelector('.questiontable.q_single');
      const isMultiple = clickableOptions.some(opt => opt.classes.includes('multiple')) ||
                         document.querySelector('.questiontable.q_multiple');
      
      return {
        type: isSingle ? 'single_choice' : (isMultiple ? 'multiple_choice' : 'choice'),
        questionText: combinedText,
        options: clickableOptions,
        debug: debugInfo
      };
    }
    
    // Fallback: information page (has mainform but no inputs/options)
    return {
      type: 'information_page',
      questionText: combinedText,
      debug: debugInfo
    };
  });
  
  return result;
  
  } catch (error) {
    console.warn(`Error in processPage: ${error.message}`);
    // Return a safe fallback if page evaluation fails
    return {
      type: 'information_page',
      questionText: '',
      error: error.message,
      debug: { error: 'processPage evaluation failed' }
    };
  }
}

// Handle different question types
async function handleQuestion(page, questionInfo, runId, pageNum) {
  const { type, questionText, options, inputs } = questionInfo;
  
  console.log(`Page ${pageNum}: ${type} - "${(questionText || '').substring(0, 80)}..."`);
  
  // Add debug info for troubleshooting
  if (questionInfo.debug) {
    console.log(`  Debug: ${JSON.stringify(questionInfo.debug)}`);
  }
  
  // Check if this is a hidden question - if so, skip all interaction
  if (questionInfo.debug && questionInfo.debug.isHiddenQuestion) {
    console.log(`  Hidden question detected - waiting for Rogator to auto-process (no interaction)`);
    
    try {
      // Wait for Rogator to automatically process and navigate away from the hidden question
      // This usually happens within 1-2 seconds
      console.log(`    Waiting for automatic navigation...`);
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      // Additional wait to ensure the page is fully processed
      await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 500 : 1000));
      
      console.log(`    Hidden question auto-processed successfully`);
      return { success: true };
      
    } catch (navigationError) {
      console.warn(`    Navigation timeout on hidden question: ${navigationError.message}`);
      // Fallback: wait a bit more and continue
      await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 1500 : 2000));
      return { success: true };
    }
  }
  
  // Clear any previous selections before handling this question (only for visible questions)
  if (['single_choice', 'multiple_choice', 'choice', 'text_input'].includes(type)) {
    console.log(`  Checking if selections should be cleared...`);
    const clearResult = await clearAllSelections(page);
    if (clearResult && clearResult.cleared === false) {
      console.log(`  ${clearResult.reason} - skipping selection clearing`);
    } else {
      console.log(`  Selections cleared successfully`);
    }
    await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
  }
  
  try {
    switch (type) {
      case 'end_page':
        console.log(`  Survey completed!`);
        return { success: true, completed: true };
        
      case 'start_page':
        console.log(`  Start page detected - clicking start link`);
        try {
          await page.click('#startlink');
          await page.waitForLoadState('domcontentloaded');
          console.log(`  Start link clicked successfully`);
        } catch (error) {
          console.warn(`  Failed to click start link: ${error.message}`);
        }
        return { success: true };
        
      case 'language_selection':
        const langButton = PREFERRED_LANGUAGE === 'deutsch' ? '#law_lsel0' : '#law_lsel1';
        await page.click(langButton);
        console.log(`  Language selected: ${PREFERRED_LANGUAGE}`);
        return { success: true };
        
      case 'information_page':
        console.log(`  Information page - calling next()`);
        const infoResult = await callNext(page);
        if (infoResult.popupAppeared) {
          console.log(`    Popup appeared on information page - waiting and retrying`);
          // Wait longer after popup dismissal for page to be ready
          await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 1000 : 1500));
          const retryResult = await callNext(page);
          if (retryResult.popupAppeared) {
            console.log(`    Popup appeared again - this might indicate a validation issue, but continuing`);
            // If popup appears again, just wait and continue to next page detection
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        return { success: true };
        
      case 'text_input':
        console.log(`  Text input detected - ${inputs.length} fields`);
        
        for (const input of inputs) {
          const screenerAnswer = getScreenerAnswer(questionText);
          const textValue = screenerAnswer || generateRandomText();
          
          console.log(`    Attempting to fill ${input.selector} with: "${textValue}"`);
          
          try {
            // New, more robust method: focus, click, clear, then type slowly.
            await page.focus(input.selector);
            await page.click(input.selector, { clickCount: 3 }); // Select any existing text
            await page.keyboard.press('Backspace'); // Clear it
            await page.type(input.selector, textValue, { delay: 50 }); // Type slowly to simulate user
            
            // After typing, explicitly trigger change and blur events for validation
            await page.evaluate((selector) => {
              const element = document.querySelector(selector);
              if (element) {
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            }, input.selector);
            
            console.log(`    Typed value. Adding stabilization delay for validation scripts...`);
            await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 400 : 800));
            
            // Verify the value was set correctly
            const actualValue = await page.inputValue(input.selector);
            if (actualValue === textValue) {
              console.log(`    ✓ Successfully verified value in ${input.selector}`);
            } else {
              console.warn(`    ⚠ Verification failed for ${input.selector}. Expected: "${textValue}", Got: "${actualValue}"`);
            }
            
          } catch (error) {
            console.warn(`    Failed to fill ${input.selector}: ${error.message}`);
          }
        }
        
        // Set t-values and call next
        await setTValues(page);
        const textResult = await callNext(page);
        if (textResult.popupAppeared) {
          console.log(`    Popup appeared after text input - validation likely failed.`);
        }
        return { success: true };
        
      case 'single_choice':
        console.log(`  Single choice - ${options.length} options`);
        const screenerOption = findScreenerOption(questionText, options);
        const selectedOption = screenerOption || getRandomItem(options);
        
        if (selectedOption) {
          await selectOption(page, selectedOption);
          
          // NEW: Check if we need to click "Next" or if the page auto-advances
          if (questionInfo.debug.hasNextButton) {
            console.log('    Next button is present, waiting for it to be ready...');
            await waitForNextState(page);
            await callNext(page);
          } else {
            console.log('    No next button detected, waiting for automatic navigation...');
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
          }
        } else {
          console.warn(`    No option could be selected!`);
          // If no option, still try to proceed
          await callNext(page);
        }
        
        return { success: true };
        
      case 'ranking_question':
        console.log(`  Ranking question - ${options.length} options to rank`);
        
        // Get ranking parameters from the page
        const rankingParams = await page.evaluate(() => {
          const maxRankEl = document.getElementById('maxRank');
          const minRankEl = document.getElementById('minRank');
          return {
            maxRank: maxRankEl ? parseInt(maxRankEl.textContent) : 3,
            minRank: minRankEl ? parseInt(minRankEl.textContent) : 1
          };
        });
        
        console.log(`    Ranking params: min=${rankingParams.minRank}, max=${rankingParams.maxRank}`);
        
        // Shuffle options and select how many to rank
        const shuffledOptions = [...options].sort(() => Math.random() - 0.5);
        const numToRank = Math.min(
          Math.max(rankingParams.minRank, getRandomInt(rankingParams.minRank, rankingParams.maxRank)),
          options.length
        );
        
        console.log(`    Will rank ${numToRank} options`);
        
        // Click options in ranking order
        for (let i = 0; i < numToRank; i++) {
          const option = shuffledOptions[i];
          try {
            await page.click(option.selector);
            console.log(`    Ranked ${i + 1}: ${option.text}`);
            
            // Small delay between clicks to allow the ranking script to process
            await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 100 : 200));
          } catch (error) {
            console.warn(`    Failed to click ranking option ${option.selector}: ${error.message}`);
          }
        }
        
        // Wait for validation and next button to appear
        await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 500 : 1000));
        
        // Check if next button is visible and click it
        const nextVisible = await page.evaluate(() => {
          const nextBtn = document.getElementById('next_btn');
          return nextBtn && nextBtn.style.display !== 'none';
        });
        
        if (nextVisible) {
          const rankingResult = await callNext(page);
          if (rankingResult.popupAppeared) {
            console.log(`    Popup appeared after ranking - may need more selections`);
            // Try to add more ranking selections if minimum not met
            const remainingOptions = shuffledOptions.slice(numToRank);
            if (remainingOptions.length > 0) {
              const additionalOption = remainingOptions[0];
              await page.click(additionalOption.selector);
              console.log(`    Added additional ranking: ${additionalOption.text}`);
              await new Promise(resolve => setTimeout(resolve, 500));
              await callNext(page);
            }
          }
          console.log(`    Ranking completed and next button clicked`);
        } else {
          console.warn(`    Next button not visible after ranking - trying to proceed anyway`);
          const rankingFallbackResult = await callNext(page);
          if (rankingFallbackResult.popupAppeared) {
            console.log(`    Popup appeared - ranking may be incomplete`);
          }
        }
        
        return { success: true };
        
      case 'multiple_choice':
      case 'choice':
        console.log(`  Multiple choice - ${options.length} options`);
        const screenerOptions = findScreenerOption(questionText, options);
        let selectedOptions = [];
        
        if (screenerOptions) {
          selectedOptions = [screenerOptions];
        } else {
          const numToSelect = Math.min(getRandomInt(1, 3), options.length);
          const availableOptions = [...options];
          while (selectedOptions.length < numToSelect && availableOptions.length > 0) {
            const index = Math.floor(Math.random() * availableOptions.length);
            const option = availableOptions.splice(index, 1)[0];
            selectedOptions.push(option);
          }
        }
        
        for (const option of selectedOptions) {
          await selectOption(page, option);
        }

        // NEW: Check if we need to click "Next" or if the page auto-advances
        if (questionInfo.debug.hasNextButton) {
            console.log('    Next button is present, waiting for it to be ready...');
            await waitForNextState(page);
            await callNext(page);
        } else {
            console.log('    No next button detected, waiting for automatic navigation...');
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        }
        
        return { success: true };
        
      default:
        console.warn(`  Unknown question type: ${type}`);
        const defaultResult = await callNext(page);
        if (defaultResult.popupAppeared) {
          console.log(`    Popup appeared on unknown question type - dismissed`);
        }
        return { success: true };
    }
  } catch (error) {
    console.error(`  Error handling ${type}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// New: Proactive popup observer to instantly dismiss validation popups
async function startPopupObserver(page) {
  await page.evaluate(() => {
    // Check if observer is already running
    if (window.popupObserver) {
      return;
    }
    
    console.log('[Observer] Initializing popup observer...');
    
    const targetNode = document.getElementById('pophelpbox');
    
    if (!targetNode) {
      console.log('[Observer] Popup container #pophelpbox not found. Skipping.');
      return;
    }
    
    // Function to dismiss the popup
    const dismissPopup = () => {
      if (targetNode.style.visibility === 'visible') {
        const okButton = document.getElementById('popok');
        if (okButton) {
          console.log('[Observer] Popup detected! Clicking OK.');
          okButton.click();
        }
      }
    };
    
    // Create an observer instance linked to the callback function
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          dismissPopup();
        }
      }
    });
    
    // Start observing the target node for configured mutations
    observer.observe(targetNode, { attributes: true });
    
    // Attach the observer to the window object to manage it
    window.popupObserver = observer;
    
    // Initial check in case the popup is already visible on load
    dismissPopup();
    console.log('[Observer] Popup observer is now active.');
  });
}

// OLD POPUP HANDLER (No longer primary method)
async function handlePopup(page) {
  // This function is now a fallback. The primary method is the observer.
  try {
    const popupVisible = await page.evaluate(() => {
      const popup = document.getElementById('pophelpbox');
      return popup && popup.style.visibility === 'visible';
    });
    
    if (popupVisible) {
      console.log(`    [Fallback] Popup detected - clicking OK to dismiss`);
      await page.evaluate(() => {
        const okButton = document.querySelector('#popok');
        if (okButton) okButton.click();
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`    Error in fallback popup handler: ${error.message}`);
    return false;
  }
}

// --- NEW: A robust, unified function to select any type of option ---
async function selectOption(page, option) {
  console.log(`    Selecting: "${option.text}" using selector: ${option.selector}`);
  
  // NEW: Add detailed element state logging for debugging
  const elementState = await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (!el) return { error: `Element not found with selector: ${selector}` };
    return {
      tagName: el.tagName,
      id: el.id,
      className: el.className,
      textContent: el.textContent.trim(),
      attributes: Array.from(el.attributes).map(attr => ({ name: attr.name, value: attr.value })),
      computedStyle: {
        visibility: window.getComputedStyle(el).visibility,
        display: window.getComputedStyle(el).display,
        opacity: window.getComputedStyle(el).opacity,
      },
      boundingClientRect: el.getBoundingClientRect(),
    };
  }, option.selector);
  console.log('    [DEBUG] Element State:', JSON.stringify(elementState, null, 2));
  
  // Use a direct page evaluation for maximum reliability
  const success = await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    if (!element) {
      console.error(`[EVAL] Element not found for selector: ${selector}`);
      return false;
    }

    // Directly trigger the click event that Rogator's scripts listen for
    if (typeof element.click === 'function') {
      element.click();
    } else {
      // Fallback for elements that don't have a click method
      const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    }
    
    return true;
  }, option.selector);
  
  if (success) {
    console.log(`    Selection successful.`);
    // Wait for the UI to update after the click
    await page.waitForTimeout(TURBO_MODE ? 150 : 300);
  } else {
    console.warn(`    Selection failed for selector: ${option.selector}`);
  }
  return success;
}

// --- NEW: A smarter wait function ---
async function waitForNextState(page, timeout = 5000) {
    console.log(`    Waiting for the next button to be ready...`);
    try {
        await page.waitForFunction(() => {
            const nextBtn = document.querySelector('#next_btn');
            // Check if button exists, is not hidden, and is not disabled
            return nextBtn && nextBtn.style.display !== 'none' && !nextBtn.disabled;
        }, { timeout });
        console.log(`    Next button is ready.`);
        return true;
    } catch (e) {
        console.warn(`    Timeout waiting for next button to become ready.`);
        return false;
    }
}

// Clear all previous selections on the page
async function clearAllSelections(page) {
  return page.evaluate(() => {
    // Check if this is a hidden question with preselected answers
    // Look for style tag with .maincontainer{visibility:hidden;}
    const styleElements = document.querySelectorAll('style');
    let isHiddenQuestion = false;
    
    for (const style of styleElements) {
      if (style.textContent && style.textContent.includes('.maincontainer{visibility:hidden;}')) {
        isHiddenQuestion = true;
        break;
      }
    }
    
    // Also check if maincontainer is actually hidden via CSS
    const mainContainer = document.querySelector('.maincontainer');
    if (mainContainer) {
      const computedStyle = window.getComputedStyle(mainContainer);
      if (computedStyle.visibility === 'hidden') {
        isHiddenQuestion = true;
      }
    }
    
    if (isHiddenQuestion) {
      console.log('Hidden question detected - preserving preselected answers, not clearing selections');
      return { cleared: false, reason: 'Hidden question with preselected answers' };
    }
    
    // Clear all v-value attributes and checked classes for visible questions
    const allAnswers = document.querySelectorAll('.answer');
    allAnswers.forEach(answer => {
      answer.removeAttribute('v-value');
      answer.classList.remove('checked');
    });
    
    // Clear any text inputs
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
      input.value = '';
    });
    
    // Reset question table state for repeated question blocks
    const questionTable = document.querySelector('.questiontexttable');
    if (questionTable) {
      questionTable.classList.add('incomplete');
      questionTable.style.backgroundColor = 'rgb(255, 204, 204)';
    }
    
    console.log('Cleared all previous selections and reset question state');
    return { cleared: true, reason: 'Normal question - selections cleared' };
  });
}

// Helper functions for form manipulation
async function setTValues(page) {
  return page.evaluate(() => {
    const textInputs = document.querySelectorAll('input[type="text"], textarea');
    let tValuesSet = 0;
    
    textInputs.forEach(input => {
      if (input.name && input.name.startsWith('t0_')) {
        // Method 1: Look for corresponding hidden input with same name
        const hiddenInput = document.querySelector(`input[type="hidden"][name="${input.name}"]`);
        if (hiddenInput) {
          hiddenInput.value = '1';
          tValuesSet++;
          console.log(`Set hidden t-value for ${input.name}: ${hiddenInput.value}`);
        } else {
          // Method 2: Set t-value attribute on the input itself
          input.setAttribute('t-value', '1');
          tValuesSet++;
          console.log(`Set t-value attribute on ${input.name}`);
        }
        
        // Method 3: Also try to find any input with a name pattern like the text input
        // For example, if text input is t0_0, look for hidden inputs with similar patterns
        const inputNumber = input.name.replace('t0_', '');
        const possibleHiddenNames = [
          `t0_${inputNumber}`,
          `t${inputNumber}`,
          `tval_${inputNumber}`,
          `t_${inputNumber}`
        ];
        
        possibleHiddenNames.forEach(hiddenName => {
          const hiddenField = document.querySelector(`input[type="hidden"][name="${hiddenName}"]`);
          if (hiddenField && hiddenField !== hiddenInput) {
            hiddenField.value = '1';
            console.log(`Set additional hidden field ${hiddenName}: 1`);
          }
        });
      }
    });
    
    console.log(`Total t-values set: ${tValuesSet}`);
    return tValuesSet;
  });
}

// Modified `callNext` to be simpler
async function callNext(page) {
  try {
    const result = await page.evaluate(() => {
      // This function now primarily focuses on just clicking the button if it's there.
      const nextBtn = document.querySelector('#next_btn');
      if (nextBtn && nextBtn.style.display !== 'none' && !nextBtn.disabled) {
        nextBtn.click();
        return 'Next button clicked';
      }
      if (typeof next === 'function') {
        next();
        return 'next() function called';
      }
      return 'No next method available';
    });
    
    console.log(`    Next action: ${result}`);
    
    // Only wait for navigation if a next action was actually performed
    if (result !== 'No next method available') {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    }
    
  } catch (error) {
    console.error(`    Error in callNext or subsequent navigation: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  return { success: true };
}

function generateRandomText() {
  const words = ['Test', 'Eingabe', 'Antwort', 'Beispiel', 'Daten', 'Gut', 'Schön', 'Interessant'];
  return `${getRandomItem(words)}${getRandomInt(1, 100)}`;
}

function findScreenerOption(questionText, options) {
  const screenerAnswer = getScreenerAnswer(questionText);
  if (!screenerAnswer) return null;
  
  return options.find(option => 
    option.text.toLowerCase().includes(screenerAnswer.toLowerCase()) ||
    screenerAnswer.toLowerCase().includes(option.text.toLowerCase())
  );
}

// Main survey runner
async function runSurvey(browser, runId) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  if (TURBO_MODE) {
    await context.route('**/*', route => {
      const type = route.request().resourceType();
      if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });
  }
  
  const page = await context.newPage();
  const logs = [];
  
  try {
    console.log(`\n--- Survey Run ${runId} ${TURBO_MODE ? '(Turbo)' : ''} ---`);
    
    await page.goto(SURVEY_URL, { waitUntil: 'domcontentloaded' });
    
    let pageCount = 0;
    const maxPages = 400; // Reduced from 400
    let consecutiveNoInteractionPages = 0; // Track pages with no interactive elements
    let lastPageUrl = '';
    
    while (pageCount < maxPages) {
      pageCount++;
      
      try {
        // Ensure page is ready before processing
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        
        // New: Start the popup observer on every new page
        await startPopupObserver(page);
        
        await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 150 : 300)); // Small stability delay
        
        const currentUrl = page.url();
        const questionInfo = await processPage(page);
        
        // Defensive check to ensure questionInfo is valid
        if (!questionInfo || typeof questionInfo !== 'object') {
          console.error(`Survey ${runId} failed on page ${pageCount}: Invalid question info`);
          logs.push({
            run_id: runId,
            page: pageCount,
            type: 'error',
            question: 'Invalid question info',
            success: false,
            error: 'processPage returned invalid data'
          });
          break;
        }
        
        // Check if we're stuck on the same page with no interactive elements
        if (questionInfo.type === 'information_page' && questionInfo.debug) {
          const debug = questionInfo.debug;
          const hasNoInteractiveElements = !debug.hasMainForm && !debug.hasNextButton && 
                                         !debug.hasStartLink && !debug.hasLanguageSelection;
          
          if (hasNoInteractiveElements && currentUrl === lastPageUrl) {
            consecutiveNoInteractionPages++;
            console.warn(`Survey ${runId} page ${pageCount}: No interactive elements for ${consecutiveNoInteractionPages} consecutive attempts`);
            
            if (consecutiveNoInteractionPages >= 20) {
              console.log(`Survey ${runId} completed - stuck on page with no interactive elements for 20+ attempts`);
              logs.push({
                run_id: runId,
                page: pageCount,
                type: 'end_page',
                question: 'Survey ended - no interactive elements available',
                success: true,
                error: null
              });
              break;
            }
          } else {
            consecutiveNoInteractionPages = 0;
          }
        } else {
          consecutiveNoInteractionPages = 0;
        }
        
        lastPageUrl = currentUrl;
        
        const result = await handleQuestion(page, questionInfo, runId, pageCount);
        
        logs.push({
          run_id: runId,
          page: pageCount,
          type: questionInfo.type || 'unknown',
          question: (questionInfo.questionText || '').substring(0, 100) || 'N/A',
          success: result.success,
          error: result.error || null
        });
        
        if (result.completed) {
          console.log(`Survey ${runId} completed successfully on page ${pageCount}`);
          break;
        }
        
        if (!result.success) {
          console.error(`Survey ${runId} failed on page ${pageCount}: ${result.error}`);
          break;
        }
        
        // Small delay between pages
        await new Promise(resolve => setTimeout(resolve, TURBO_MODE ? 50 : (VISUAL_MODE ? 1000 : 300)));
        
      } catch (pageError) {
        console.error(`Survey ${runId} page ${pageCount} error: ${pageError.message}`);
        logs.push({
          run_id: runId,
          page: pageCount,
          type: 'page_error',
          question: 'Page processing failed',
          success: false,
          error: pageError.message
        });
        
        // Try to continue to next page after error
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
        } catch (recoveryError) {
          console.error(`Survey ${runId} recovery failed: ${recoveryError.message}`);
          break;
        }
      }
    }
    
    if (pageCount >= maxPages) {
      console.error(`Survey ${runId} hit page limit (${maxPages})`);
      logs.push({
        run_id: runId,
        page: pageCount,
        type: 'error',
        question: 'Page limit reached',
        success: false,
        error: 'Maximum pages exceeded'
      });
    }
    
  } catch (error) {
    console.error(`Survey ${runId} crashed: ${error.message}`);
    logs.push({
      run_id: runId,
      page: -1,
      type: 'crash',
      question: 'Survey crashed',
      success: false,
      error: error.message
    });
  } finally {
    await context.close();
  }
  
  return logs;
}

// Main execution
async function main() {
  console.log("=== Minimal Rogator Automation ===");
  
  // Parse command line arguments for concurrent execution
  const concurrentArg = process.argv.find(arg => arg.startsWith('--concurrent='));
  let CONCURRENT_INSTANCES = concurrentArg ? parseInt(concurrentArg.split('=')[1]) : 1;
  
  if (VISUAL_MODE && CONCURRENT_INSTANCES > 1) {
    console.log("Visual mode cannot be used with concurrent execution. Running single instance.");
    CONCURRENT_INSTANCES = 1;
  }
  
  if (VISUAL_MODE) {
    console.log("Visual mode: Browser will be visible with slowed-down actions");
  }
  
  if (TURBO_MODE && !VISUAL_MODE) {
    console.log("Turbo mode: Headless browser with fast execution");
  }
  
  if (SCREENER_CONFIG.enabled) {
    console.log(`Screener mode: ${SCREENER_CONFIG.questions.length} predefined answers`);
  }
  
  if (CONCURRENT_INSTANCES > 1) {
    console.log(`Running ${CONCURRENT_INSTANCES} concurrent instances`);
  }
  
  const allLogs = [];
  
  // Function to run a batch of surveys in one browser
  async function runBrowserBatch(batchNumber, runsInBatch) {
    const browser = await chromium.launch({ 
      headless: TURBO_MODE && !VISUAL_MODE,
      slowMo: VISUAL_MODE ? 500 : 0
    });
    
    const batchLogs = [];
    
    try {
      for (let i = 0; i < runsInBatch; i++) {
        const globalRunId = (batchNumber * Math.ceil(NUM_TEST_RUNS / CONCURRENT_INSTANCES)) + i + 1;
        if (globalRunId > NUM_TEST_RUNS) break;
        
        console.log(`\n[Batch ${batchNumber + 1}] Starting run ${globalRunId}/${NUM_TEST_RUNS}`);
        const runLogs = await runSurvey(browser, globalRunId);
        batchLogs.push(...runLogs);
      }
    } finally {
      await browser.close();
    }
    
    return batchLogs;
  }
  
  try {
    if (CONCURRENT_INSTANCES === 1) {
      // Single instance execution (original behavior)
      const browser = await chromium.launch({ 
        headless: TURBO_MODE && !VISUAL_MODE,
        slowMo: VISUAL_MODE ? 500 : 0
      });
      
      try {
        for (let i = 1; i <= NUM_TEST_RUNS; i++) {
          const runLogs = await runSurvey(browser, i);
          allLogs.push(...runLogs);
        }
      } finally {
        await browser.close();
      }
    } else {
      // Concurrent execution
      const runsPerBatch = Math.ceil(NUM_TEST_RUNS / CONCURRENT_INSTANCES);
      const batchPromises = [];
      
      for (let batchNumber = 0; batchNumber < CONCURRENT_INSTANCES; batchNumber++) {
        const runsInThisBatch = Math.min(runsPerBatch, NUM_TEST_RUNS - (batchNumber * runsPerBatch));
        if (runsInThisBatch > 0) {
          batchPromises.push(runBrowserBatch(batchNumber, runsInThisBatch));
        }
      }
      
      console.log(`\nStarting ${batchPromises.length} concurrent browser instances...`);
      const startTime = Date.now();
      
      const batchResults = await Promise.all(batchPromises);
      
      const endTime = Date.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      
      // Flatten all batch results
      for (const batchLogs of batchResults) {
        allLogs.push(...batchLogs);
      }
      
      console.log(`\nAll ${NUM_TEST_RUNS} surveys completed in ${totalTimeSeconds.toFixed(1)} seconds`);
      console.log(`Average time per survey: ${(totalTimeSeconds / NUM_TEST_RUNS).toFixed(1)} seconds`);
    }
    
    // Save logs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '_').replace('T', '_').slice(0, 19);
    const logFile = path.join(LOG_DIRECTORY, `minimal_test_${timestamp}.json`);
    
    if (!fs.existsSync(LOG_DIRECTORY)) {
      fs.mkdirSync(LOG_DIRECTORY, { recursive: true });
    }
    
    fs.writeFileSync(logFile, JSON.stringify(allLogs, null, 2));
    console.log(`\nLogs saved to: ${logFile}`);
    console.log(`Total surveys completed: ${allLogs.filter(log => log.type === 'end_page').length}`);
    
  } catch (error) {
    console.error("Error in concurrent execution:", error);
  }
}

main().catch(error => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
}); 
