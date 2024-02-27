// Add a script to handle the form submission and redirect to the cart page
document.getElementById('addToCartForm').addEventListener('submit', function (event) {
  // Prevent the default form submission
  event.preventDefault();

  // Submit the form asynchronously using AJAX
  fetch('/add-to-cart', {
      method: 'POST',
      body: new FormData(event.target),
  })
  .then(response => response.json())
  .then(data => {
      // Redirect to the cart page after successful submission
      window.location.href = '/cart';
  })
  .catch(error => {
      console.error('Error:', error);
      // Handle errors if needed
  });
});
document.getElementById('confirmPurchaseBtn').addEventListener('click', function () {
    // Get the total amount from the rendered HTML
    const totalAmount = parseFloat(document.getElementById('totalAmount').innerText);

    // Make an AJAX request to generate the PromptPay QR code
    fetch('/generatePromptPay', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: totalAmount }),
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response, for example, display the QR code image
        if (data.RespCode === 200) {
            alert('PromptPay QR code generated successfully!');
            // You can display the QR code image or redirect to a new page for payment
            // Example: window.location.href = '/payment?promptPayUrl=' + encodeURIComponent(data.Result);
        } else {
            alert('Failed to generate PromptPay QR code: ' + data.RespMessage);
        }
    })
    .catch(error => {
        console.error('Error generating PromptPay QR code:', error);
        alert('An error occurred while generating the PromptPay QR code.');
    });
});