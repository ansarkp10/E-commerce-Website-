var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var session = require('express-session');
const fs = require('fs');
const path = require('path');
const userHelpers = require('../helpers/user-helpers'); // Adjust the path as necessary

// Initialize express-session
router.use(session({
  secret: 'sdfjhWER3489vWER$#fwefFE3345few@9urSDF',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60 * 60 * 1000 } // Set session expiration time to 1 hour
}));


// Admin login credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@123gmail.com',
  password: 'ansar@123'
};

// Middleware to protect routes
function verifyAdmin(req, res, next) {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// Route to serve login page
router.get('/login', (req, res) => {
  if (req.session.adminLoggedIn) {
    res.redirect('/admin');
  } else {
    res.render('admin/login', { admin: true, loginErr: req.session.loginErr , isAdmin: true});
    req.session.loginErr = null; // Clear login error
  }
});

// Route to handle admin login
router.post('/login', (req, res) => {
  const { Email, Password } = req.body;

  if (Email === ADMIN_CREDENTIALS.email && Password === ADMIN_CREDENTIALS.password) {
    req.session.adminLoggedIn = true;
    res.redirect('/admin');
  } else {
    req.session.loginErr = 'Invalid email or password';
    res.redirect('/admin/login');
  }
});

// Route to handle admin logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
    } else {
      res.redirect('/admin/login');
    }
  });
});

router.get('/', verifyAdmin, async (req, res) => {
  try {
    let products = await productHelpers.getAllproducts();
    res.render('admin/view-products', { admin: true, products, isAdmin: true });
  } catch (err) {
    console.error("Error fetching products: ", err);
    res.status(500).render('error-page', { message: "Internal Server Error" });
  }
});

// Route to list products
router.get('/admin', verifyAdmin, async (req, res) => {
  try {
    let products = await productHelpers.getAllproducts();
    res.render('admin/view-products', { admin: true, products, isAdmin: true });
  } catch (err) {
    console.error("Error fetching products: ", err);
    res.status(500).render('error-page', { message: "Internal Server Error" });
  }
});



// Route to serve Add Product page
router.get('/add-product', verifyAdmin, (req, res) => {
  res.render('admin/add-product', { admin: true , isAdmin: true});
});

// Route to handle Add Product form submission (without image upload)

router.post('/add-product', verifyAdmin, async (req, res) => {
    try {
        // Accessing form data
        const { Name, Category, Price, Description } = req.body;
        const productData = {
            Name,
            Category,
            Price,
            Description,
        };

        // Insert the product data to the database
        let insertedId = await productHelpers.addProduct(productData);

        // Check if there is an image uploaded
        if (req.files && req.files.Image) {
            let imageFile = req.files.Image;
            const imagePath = path.join(__dirname, '../public/product-images/', insertedId + '.jpg');

            // Save the image file
            imageFile.mv(imagePath, (err) => {
                if (err) {
                    console.error('Error saving image:', err);
                }
            });
        }
        
        res.redirect('/admin');
    } catch (err) {
        console.error("Error adding product: ", err);
        res.status(500).render('error-page', { message: "Internal Server Error" });
    }
});


// Route to delete a product
router.get('/delete-product/:id', verifyAdmin, async (req, res) => {
  try {
    await productHelpers.deleteProduct(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error("Error deleting product: ", err);
    res.status(500).render('error-page', { message: "Failed to delete product" });
  }
});

// Route to serve Edit Product page
router.get('/edit-product/:id', verifyAdmin, async (req, res) => {
  try {
    let product = await productHelpers.getProductDetails(req.params.id);
    res.render('admin/edit-product', { admin: true, product, isAdmin: true });
  } catch (err) {
    console.error("Error fetching product details: ", err);
    res.status(500).render('error-page', { message: "Failed to fetch product details" });
  }
});

// Route to handle Edit Product form submission (with image upload)
router.post('/edit-product/:id', verifyAdmin, async (req, res) => {
  try {
    let updatedData = {
      Name: req.body.Name,
      Category: req.body.Category,
      Price: req.body.Price,
      Description: req.body.Description,
    };

    await productHelpers.updateProduct(req.params.id, updatedData);

    // Check if an image file was uploaded
    if (req.files && req.files.Image) {
      let imageFile = req.files.Image;
      const imagePath = path.join(__dirname, '../public/product-images/', req.params.id + '.jpg');

      // Save the new image file
      imageFile.mv(imagePath, (err) => {
        if (err) {
          console.error('Error saving image:', err);
        }
      });
    }

    res.redirect('/admin');
  } catch (err) {
    console.error("Error updating product: ", err);
    res.status(500).render('error-page', { message: "Failed to update product" });
  }
});

router.get('/orders', verifyAdmin, async (req, res) => {
  try {
      let orders = await productHelpers.getAllOrders();
      res.render('admin/view-orders', { admin: true, orders, isAdmin: true });
  } catch (err) {
      console.error("Error fetching orders: ", err);
      res.status(500).render('error-page', { message: "Failed to fetch orders" });
  }
});


router.get('/users', verifyAdmin, async (req, res) => {
  try {
    let users = await userHelpers.getAllUsers();
    console.log(users); // Check if user data is being fetched
    res.render('admin/view-users', { admin: true, users });
  } catch (err) {
    console.error("Error fetching users: ", err);
    res.status(500).render('error-page', { message: "Failed to fetch users" });
  }
});



module.exports = router;
