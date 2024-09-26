var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const varifyLogin = (req, res, next) => {
  if (req.session.user && req.session.user.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
};


/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id);
  }

  productHelpers.getAllproducts().then((products) => {
    res.render('user/view-products', { products, user, cartCount });
  });
});



router.get('/cart', varifyLogin, async (req, res) => {
  try {
    let products = await userHelpers.getCartProducts(req.session.user._id);
    let total = await userHelpers.getTotalAmount(req.session.user._id); // Get total amount
    console.log(products);
    res.render('user/cart', { products, user: req.session.user, total });
  } catch (error) {
    console.error('Error fetching cart products:', error);
    res.status(500).send('Error fetching cart products');
  }
});

router.get('/add-to-cart/:id', (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  }).catch(err => {
    res.json({ status: false, error: err });
  });
});

router.post('/change-product-quantity', (req, res) => {
  userHelpers.changeProductQuantity(req.body).then((response) => {
      res.json(response); // Return the response to the frontend (status or removeProduct)
  }).catch((err) => {
      res.json({ status: false });
  });
});


router.post('/remove-cart-item', (req, res) => {
  let { cart, product } = req.body;
  userHelpers.removeCartItem(cart, product).then((response) => {
      res.json({ status: true });
  }).catch((err) => {
      res.json({ status: false });
  });
});

// Place Order Route
router.get('/place-order', varifyLogin,async function(req, res) {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total, user:req.session.user}); // Render the place-order.hbs view
});

router.get('/get-total-amount', varifyLogin, async (req, res) => {
  try {
    let total = await userHelpers.getTotalAmount(req.session.user._id);
    res.json({ status: true, total: total });
  } catch (err) {
    res.json({ status: false, error: err });
  }
});

router.post('/place-order', async (req, res) => {
  try {
    let products = await userHelpers.getCartProductList(req.body.userId);
    let totalPrice = await userHelpers.getTotalAmount(req.body.userId);

    // Place the order and get the response (which includes the orderId)
    userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
      if (req.body['payment-method'] === 'COD') {
        res.json({ codSuccess: true });
      } else {
        // Now pass the correct orderId and totalPrice to generateRazorpay
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    }).catch((err) => {
      console.error("Error placing order:", err);
      res.status(500).json({ status: false, message: "Error placing order" });
    });

  } catch (error) {
    console.error("Error in place-order route:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});


router.get('/order-success',(req,res)=>{
  res.render('user/order-success',{user:req.session.user})
})

router.get('/orders', varifyLogin, async (req, res) => {
  try {
    let orders = await userHelpers.getUserOrders(req.session.user._id);
    res.render('user/orders', { user: req.session.user, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Error fetching orders');
  }
});


router.get('/view-order-products/:id', async (req, res) => {
  try {
    let products = await userHelpers.getOrderProducts(req.params.id); // Corrected from _id to id
    res.render('user/view-order-products', { user: req.session.user, products });
  } catch (error) {
    console.error('Error fetching order products:', error);
    res.status(500).send('Error fetching order products');
  }
});

router.post('/varify-payment', (req, res) => {
  console.log('Received Payment Details:', req.body);  // Log full body
  userHelpers.varifypayment(req.body.payment)
      .then(() => {
          return userHelpers.changePaymentStatus(req.body.order.receipt);
      })
      .then(() => {
          res.json({ status: true });
      })
      .catch((err) => {
          console.error('Payment verification failed:', err);
          res.json({ status: false });
      });
});

// Profile Page Route
router.get('/profile', (req, res) => {
  if (req.session.user) {
    // Fetch user details from the session or database
    let userId = req.session.user._id;
    userHelpers.getUserDetails(userId).then((userDetails) => {
      res.render('user/profile', {
        user: userDetails,
        isProfilePage: true // Pass the variable to indicate the profile page
      });
    }).catch((error) => {
      console.error('Error fetching user details:', error);
      res.status(500).send('Error fetching profile details');
    });
  } else {
    res.redirect('/login');
  }
});

// Delete Account Route
router.delete('/delete-account', (req, res) => {
  if (req.session.user) {
    let userId = req.session.user._id;
    userHelpers.deleteUserAccount(userId).then(() => {
      req.session.destroy(); // Destroy session after deletion
      res.status(200).send({ message: 'Account deleted successfully.' });
    }).catch((error) => {
      console.error('Error deleting account:', error);
      res.status(500).send({ error: 'Error deleting account.' });
    });
  } else {
    res.status(403).send({ error: 'User not logged in.' });
  }
});

// Display Change Password Page
router.get('/change-password', (req, res) => {
  if (req.session.user) {
    res.render('user/change-password', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// Handle Change Password Request
router.post('/change-password', varifyLogin, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const userId = req.session.user._id;

  if (newPassword !== confirmNewPassword) {
    return res.render('user/change-password', { errorMsg: "New passwords do not match" });
  }

  try {
    const passwordUpdated = await userHelpers.changePassword(userId, currentPassword, newPassword);
    if (passwordUpdated) {
      res.redirect('/profile'); // Redirect to profile page after successful update
    } else {
      res.render('user/change-password', { errorMsg: "Current password is incorrect" });
      
    }
  } catch (error) {
    console.error('Error updating password:', error);
    res.render('user/change-password', { errorMsg: "Failed to update password" });
  }
});


router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
  }
})

router.get('/signup',(req,res)=>{
  res.render('user/signup')
})

// POST request for signup
router.post('/signup', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No profile photo uploaded');
  }

  let profilePhoto = req.files.profilePhoto;
  let photoPath = '/uploads/' + Date.now() + '-' + profilePhoto.name;

  // Server-side validation for password matching
  if (req.body.Password !== req.body.ConfirmPassword) {
    return res.status(400).send('Passwords do not match'); // Send error response
  }

  // Save the photo to the uploads directory
  profilePhoto.mv('.' + photoPath, (err) => {
    if (err) {
      console.error('File upload failed:', err);
      return res.status(500).send('Failed to upload profile photo');
    }

    // Add the photo path to the user data
    req.body.profilePhoto = photoPath;

    userHelpers.doSignup(req.body).then((response) => {
      req.session.user = response;
      req.session.user.loggedIn = true;
      res.redirect('/');
    }).catch((error) => {
      if (error.message === 'Email already in use') {
        res.render('user/signup', { emailError: 'Email is already registered' });
      } else {
        console.error('Signup failed:', error);
        res.status(500).send('Signup failed');
      }
    });
  });
});

// POST request for login
router.post('/login', (req, res) => {
  if (!req.body.Email || !req.body.Password) {
    req.session.userLoginErr = "Email and Password are required";
    return res.redirect('/login');
  }

  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.user.loggedIn = true;
      res.redirect('/');
    } else {
      req.session.userLoginErr = "Invalid Username or Password";
      res.redirect('/login');
    }
  });
});

router.get('/logout',(req,res)=>{
  req.session.user=null
  res.redirect('/')
});



module.exports = router;
