(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
   /* $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });*/
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Vendor carousel
    $('.vendor-carousel').owlCarousel({
        loop: true,
        margin: 29,
        nav: false,
        autoplay: true,
        smartSpeed: 1000,
        responsive: {
            0:{
                items:2
            },
            576:{
                items:3
            },
            768:{
                items:4
            },
            992:{
                items:5
            },
            1200:{
                items:6
            }
        }
    });


    // Related carousel
    $('.related-carousel').owlCarousel({
        loop: true,
        margin: 29,
        nav: false,
        autoplay: true,
        smartSpeed: 1000,
        responsive: {
            0:{
                items:1
            },
            576:{
                items:2
            },
            768:{
                items:3
            },
            992:{
                items:4
            }
        }
    });


    // Product Quantity
    $('.quantity button').on('click', function () {
        var button = $(this);
        var oldValue = button.parent().parent().find('input').val();
        if (button.hasClass('btn-plus')) {
            var newVal = parseFloat(oldValue) + 1;
        } else {
            if (oldValue > 0) {
                var newVal = parseFloat(oldValue) - 1;
            } else {
                newVal = 0;
            }
        }
        button.parent().parent().find('input').val(newVal);
    });



    // เลือกปุ่มหรือลิงก์ Add to Cart และเพิ่ม Event Listener เมื่อมีการคลิก
document.querySelector('.add-to-cart-btn').addEventListener('click', function(event) {
    event.preventDefault(); // ป้องกันการโหลดหน้าใหม่เมื่อคลิกที่ลิงก์
  
    const productId = this.getAttribute('data-product-id'); // ดึงข้อมูล product ID จาก attribute data-product-id
  
    // ส่งคำขอไปยังเซิร์ฟเวอร์เพื่อเพิ่มสินค้าลงในตะกร้า
    fetch('/add-to-cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId: productId, quantity: 1 }), // ส่งข้อมูล product ID และจำนวน 1 ไปยังเซิร์ฟเวอร์
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      console.log(data); // แสดงข้อความที่ได้รับจากเซิร์ฟเวอร์ (อาจเป็น "Item added to cart successfully")
      // ต่อไปคุณอาจทำการอัปเดต UI เพื่อแสดงการเพิ่มสินค้าลงในตะกร้า หรือปรับปรุงข้อมูลต่างๆ ตามต้องการ
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
      // ทำการจัดการข้อผิดพลาดเช่นแสดงข้อความผิดพลาดหรือทำอะไรตามที่คุณต้องการ
    });
  });

  // เลือกปุ่ม "Add To Cart" โดยใช้ ID และเพิ่ม Event Listener เมื่อมีการคลิก
document.getElementById('addToCartBtn').addEventListener('click', function(event) {
    event.preventDefault(); // ป้องกันการโหลดหน้าใหม่เมื่อคลิกที่ปุ่ม

    // เรียกใช้ฟังก์ชันหรือส่งคำขอไปยังเซิร์ฟเวอร์เพื่อเพิ่มสินค้าลงในฐานข้อมูล
    addToCart(); // ตัวอย่างการเรียกใช้ฟังก์ชันสำหรับการเพิ่มสินค้าลงในฐานข้อมูล
});

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
 
})(jQuery);


  

