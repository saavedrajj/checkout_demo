<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header("Access-Control-Allow-Headers: X-Requested-With");
header('Content-Type: application/json; charset=utf-8');

$secret_key = "sk_test_bd47782d-c190-42c0-8394-274b302fa861";
$card_token = $_POST['token'];

  /*
   * Request new Payment
   * @see //https://api-reference.checkout.com/#operation/requestAPaymentOrPayout
   * 
   * Request stored card Payment
   * @see //https://www.checkout.com/docs/payments/accept-payments/pay-with-stored-details#Request_a_payment_using_an_existing_card
   */

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://api.sandbox.checkout.com/payments',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>'{ 
    "source": {
        "type": "token",
        "token": "'. $card_token . '" 
    },
    "amount": 1000,
    "currency": "USD",
    "reference": "request-01"
}',
  CURLOPT_HTTPHEADER => array(
    "Authorization: " . $secret_key . "",
    "Content-Type: application/json"
  ),
));

$response = curl_exec($curl); // GUARDAR source.id de este response para pasarlo luego a receive_id.php

curl_close($curl);

echo $response;