/* SB LOTUS TAILORING SHOP - Main JavaScript */

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', function() {
            navLinks.classList.toggle('open');
        });
    }

    // Auto-dismiss flash messages after 5 seconds
    document.querySelectorAll('.alert').forEach(function(alert) {
        setTimeout(function() { alert.style.display = 'none'; }, 5000);
    });

    // Close button for flash messages
    document.querySelectorAll('.alert-close').forEach(function(btn) {
        btn.addEventListener('click', function() {
            this.parentElement.style.display = 'none';
        });
    });

    // Product detail image gallery: click thumbnail to swap main image
    document.querySelectorAll('.product-thumbnails img').forEach(function(thumb) {
        thumb.addEventListener('click', function() {
            var mainImg = document.querySelector('.product-main-img');
            if (mainImg) {
                mainImg.src = this.src;
                document.querySelectorAll('.product-thumbnails img').forEach(function(t) {
                    t.classList.remove('active');
                });
                this.classList.add('active');
            }
        });
    });

    // Image upload preview
    var imageInput = document.getElementById('image-upload');
    if (imageInput) {
        imageInput.addEventListener('change', function() {
            var preview = document.getElementById('image-preview');
            if (preview) {
                preview.innerHTML = '';
                Array.from(this.files).forEach(function(file) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var img = document.createElement('img');
                        img.src = e.target.result;
                        img.style.width = '100px';
                        img.style.height = '100px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '6px';
                        preview.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }
});
