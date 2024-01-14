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