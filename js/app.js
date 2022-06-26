/**
 * This works in two modes:
 *
 * 1 Allows user to pay with new card
 * 2 Allows user to pay with saved card
 *
 * 1 New card:
 *
 * Form is filled with data, on submit data is sent to Checkout which generates a card token. This token is received
 * by the onCardTokenized event handler function. Once received, it's then send to a local PHP endpoint (receive_token.php)
 * so that it can be used to process the actual payment. This endpoint will return the API call's response including
 * source_id. This source id is used to create a radio button that allows the user to make the second type of payment.
 *
 * 2 Saved card
 *
 * Form is not filled but a "saved card" radio button is selected. Once selected, the "pay" button will be enabled
 * manually to allow for the user to submit the form. In this case the source_id will be sent to a different local PHP
 * endpoint which will use this source_id to process a new payment and return the API call's response.
 */

/* global Frames */
var payButton = document.getElementById("pay-button");
var form = document.getElementById("payment-form");
var errorStack = [];
var cardTokens = document.getElementById('card-tokens');

/**
 * Initializes Frame
 *
 * On init, the form will be cleared
 */
function initializeFrames() {
  Frames.init({
    /*publicKey: "pk_test_8915ea5f-fa07-491e-97e4-b7fb248632f8",*/
    publicKey: "pk_test_4296fd52-efba-4a38-b6ce-cf0d93639d8a",
    localization: "ES-ES"
  });
}

/**
 * When app initializes, we need  to init the Frames thing and add
 * "saved cards" markup
 */
initializeFrames();
setNewCardCheckbox();

Frames.addEventHandler(
  Frames.Events.CARD_VALIDATION_CHANGED,
  onCardValidationChanged
);
function onCardValidationChanged(event) {
  console.log("CARD_VALIDATION_CHANGED: %o", event);
  payButton.disabled = !Frames.isCardValid();
}

Frames.addEventHandler(
  Frames.Events.FRAME_VALIDATION_CHANGED,
  onValidationChanged
);
function onValidationChanged(event) {
  console.log("FRAME_VALIDATION_CHANGED: %o", event);

  var errorMessageElement = document.querySelector(".error-message");
  var hasError = !event.isValid && !event.isEmpty;

  if (hasError) {
    errorStack.push(event.element);
  } else {
    errorStack = errorStack.filter(function (element) {
      return element !== event.element;
    });
  }

  var errorMessage = errorStack.length
    ? getErrorMessage(errorStack[errorStack.length - 1])
    : "";
  errorMessageElement.textContent = errorMessage;
}

function getErrorMessage(element) {
  var errors = {
    "card-number": "Please enter a valid card number",
    "expiry-date": "Please enter a valid expiry date",
    cvv: "Please enter a valid cvv code",
  };

  return errors[element];
}

Frames.addEventHandler(
  Frames.Events.CARD_TOKENIZATION_FAILED,
  onCardTokenizationFailed
);
function onCardTokenizationFailed(error) {
  console.log("CARD_TOKENIZATION_FAILED: %o", error);
  Frames.enableSubmitForm();
}

Frames.addEventHandler(Frames.Events.CARD_TOKENIZED, onCardTokenized);

/**
 * Card has been tokenized. Event handler
 *
 * @param event
 */
function onCardTokenized(event) {
  var el = document.querySelector(".success-payment-message");
  sendToken(event.token);
  /*
  el.innerHTML =
    "Card tokenization completed<br>" +
    'Your card token is: <span class="token">' +
    event.token +
    "</span>";
  */  
}

/**
 * Sends token to PHP endpoint so payment can be processed. Returns
 * payment API response including "source_id"
 *
 * @param token
 */
function sendToken(token) {
  /*
   * data prep
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
   */
  var data = new FormData();
  data.append('token', token);

  /*
   * send data
   * @see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
   */
  var r = new XMLHttpRequest();
  r.open('POST', 'php/receive_token.php');
  r.send(data);

  /*
   * Handle response
   */
  r.onreadystatechange =  function () {
    /*
     * Request done
     */
    if (r.readyState === 4) {
      var response = JSON.parse(r.responseText);

      /*
       * Request OK
       */
      if (r.status === 200) {
        console.log(response);

        /*
         * Payment successful
         */
        if (response.approved) {
          /*
           * Create new "saved card" radio button with source id
           */
          setIdCheckboxes(response.source);

          /*
           * Put message in screen
           */
          var el = document.querySelector(".success-payment-message");
          el.innerText = 'Payment using new card succeeded';

          /*
           * Clear form to receive new data
           */
          initializeFrames();
        }
        /*
         * Request not OK
         */
      } else {
        console.error(response);
      }
    }
  }
}

/**
 * Sends source id to PHP endpoint so that it can be used to
 * authorize a new payment with a previous source id
 * @param id
 */
function sendId(id) {
  /*
   * data prep
   * @see https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects
   */
  var data = new FormData();
  data.append('id', id);

  /*
   * send data
   * @see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest
   */
  var r = new XMLHttpRequest();
  r.open('POST', 'php/receive_id.php');
  r.send(data);

  r.onreadystatechange =  function () {
    if (r.readyState === 4) {
      var response = JSON.parse(r.responseText);
      if (r.status === 200) {

        if (response.approved) {
          var el = document.querySelector(".success-payment-message");
          el.innerText = 'Payment using saved card succeeded';
          initializeFrames();
        }
      } else {
        console.error(response);
      }
    }
  }
}

/**
 * Creates "new card" radio button
 *
 * <label>
 *     <input type=radio>
 *     <span>Text</span>
 * </label>
 */
function setNewCardCheckbox() {
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.classList.add('saved-card');
  radio.id = 'use-new-card';
  radio.name = 'card-id';
  radio.value = '0';
  radio.onchange = handleCheckboxChange;

  const label = document.createElement('label');
  label.for = 'use-new-card';

  const labelText = document.createElement('span');
  labelText.innerText = 'Use new card';

  label.appendChild(
      radio
  );

  label.appendChild(
      labelText
  );

  cardTokens.appendChild(
      label
  );
}

/**
 * Creates "saved card" radio button
 */
function setIdCheckboxes(source) {
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.classList.add('saved-card');
  radio.id = 'use-card-' + source.id;
  radio.name = 'card-id';
  radio.value = source.id;
  /*
   * When selected, this radio button will call handleCheckboxChange to see if "pay button" must be
   * enabled or disabled
   */
  radio.onchange = handleCheckboxChange;

  const label = document.createElement('label');
  label.for = 'use-card-' + source.id;

  const labelText = document.createElement('span');
  labelText.innerText = 'Use your ' + source.scheme + ' ending in ' + source.last4;

  label.appendChild(
      radio
  );

  label.appendChild(
      labelText
  );

  cardTokens.appendChild(
      label
  );
}

/**
 * Handles radio buttons change events
 *
 * Pay button is enabled/disabled if form data is valid/invalid. When one selects a "saved card" as payment
 * method, one must be able to submit the form even though to Frames, the form is invalid (has no card number, exp, cvv)
 */
function handleCheckboxChange() {
  payButton.disabled = !this.checked || this.value === '0';
}

/**
 * Returns true only if a radio button with a value other than "0" is selected. Saved cards will have "source_id" as
 * value. "New card" radio button has "0" as value to differentiate from the real saved cards.
 * @returns {boolean}
 */
function isSavedCardSelected() {
  const boxes = document.getElementsByClassName('saved-card');
  let savedCardSelected = false;

  for (const box of boxes) {
    if (box.value !== '0') {
      savedCardSelected = savedCardSelected || box.checked;
    }
  }

  return savedCardSelected;
}

/**
 * Obtain source_id of selected saved card radio button
 * @returns {boolean}
 */
function getSelectedCardId() {
  const boxes = document.getElementsByClassName('saved-card');
  let savedCardSelected = false;

  for (const box of boxes) {
    if (box.checked && box.value !== '0') {
      savedCardSelected = box.value;
    }
  }

  return savedCardSelected;
}

/**
 * Handles the form submission
 */
form.addEventListener("submit", function (event) {
  event.preventDefault();

  /*
   * When a form is submitted, it'll check if a "saved card" radio button was selected and, if selected, will call the
   * sendId function (the one that sends a source_id istead of a token).
   *
   * If no "saved card" radio button is selected, it will call checkout's API call to obtain a card token which is then
   * used in onCardTokenized function.
   */
  if (isSavedCardSelected()) {
    sendId(getSelectedCardId());
  } else {
    Frames.submitCard();
  }
});
