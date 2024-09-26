var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('express');
const Razorpay = require('razorpay');
const { promiseHooks } = require('node:v8');
const { resolve } = require('node:path');
const { rejects } = require('node:assert');

var instance = new Razorpay({
  key_id: 'rzp_test_OXCuCZZpXXMT30',
  key_secret: 'OOg6baqHOLDxImnWSgqpePoP',
});

module.exports = {
doSignup: (userData) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if the email already exists
      let existingUser = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
      
      if (existingUser) {
        reject({ message: 'Email already in use' }); // Reject with error message
      } else {
        userData.Password = await bcrypt.hash(userData.Password, 10);
        const result = await db.get().collection(collection.USER_COLLECTION).insertOne(userData);

        // Add the inserted _id to the userData object
        userData._id = result.insertedId;
        resolve(userData);
      }
    } catch (error) {
      reject(error);
    }
  });
},  

  doLogin:(userData)=>{
    return new Promise(async(resolve,reject)=>{
        let loginStatus = false
        let response={}
        let user = await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
        if(user){
            bcrypt.compare(userData.Password,user.Password).then((status)=>{
                if(status){
                    console.log("login success")
                    response.user=user
                    response.status=true
                    resolve(response)
                }else{
                    console.log("login failed")
                    resolve({status:false})
                }
            })

        }else{
            console.log("login failed")
            resolve({status:false})
        }

    })
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: new ObjectId(proId),
      quantity: 1
    };
  
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
      
      if (userCart) {
        // Find if product already exists in the cart
        let proExist = userCart.products.findIndex(product => product.item.toString() === proId.toString());
        console.log(proExist);
  
        if (proExist !== -1) {
          // Increment the quantity of the existing product using the positional operator
          db.get().collection(collection.CART_COLLECTION).updateOne(
            { user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
            {
              $inc: { 'products.$.quantity': 1 } // Use positional operator $ to update the quantity of the specific product
            }
          ).then(() => {
            resolve();
          }).catch((err) => {
            reject(err);
          });
  
        } else {
          // Product doesn't exist, push a new product object to the array
          db.get().collection(collection.CART_COLLECTION).updateOne(
            { user: new ObjectId(userId) },
            {
              $push: { products: proObj }
            }
          ).then(() => {
            resolve();
          }).catch((err) => {
            reject(err);
          });
        }
  
      } else {
        // No cart exists for the user, create a new cart
        let cartObj = {
          user: new ObjectId(userId),
          products: [proObj]
        };
        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then(() => {
          resolve();
        }).catch((err) => {
          reject(err);
        });
      }
    });
  },
  
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      try {
        let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
          {
            $match: { user: new ObjectId(userId) }
          },
          {
            $unwind: '$products'
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity'
            }
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'product' // 'product' will now be an array
            }
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ['$product', 0] } // Now correctly referencing the 'product' array
            }
          }
        ]).toArray();
  
        resolve(cartItems);
      } catch (err) {
        reject(err);
      }
    });
  },
  
  getCartCount:(userId)=>{
    let count =0
    return new Promise(async(resolve,reject)=>{
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user: new ObjectId(userId)})
      if(cart){
          count = cart.products.length
      }
      resolve(count)
    })

  },
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count);
    return new Promise((resolve, reject) => {
        if (details.count === -1 && details.quantity === 1) {
            // If the count is -1 and quantity is 1, remove the product from the cart
            db.get().collection(collection.CART_COLLECTION).updateOne(
                { _id: new ObjectId(details.cart) },
                {
                    $pull: { products: { item: new ObjectId(details.product) } }
                }
            ).then(() => {
                resolve({ removeProduct: true });
            }).catch((err) => {
                reject(err);
            });
        } else {
            // Otherwise, just update the quantity
            db.get().collection(collection.CART_COLLECTION).updateOne(
                { _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) },
                {
                    $inc: { 'products.$.quantity': details.count }
                }
            ).then(() => {
                resolve({ status: true });
            }).catch((err) => {
                reject(err);
            });
        }
    });
},

  removeCartItem: (cartId, proId) => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.CART_COLLECTION).updateOne(
            { _id: new ObjectId(cartId) },
            {
                $pull: { products: { item: new ObjectId(proId) } } // Remove the product from the cart
            }
        ).then(() => {
            resolve();
        }).catch((err) => {
            reject(err);
        });
    });
},

getTotalAmount: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: new ObjectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            productPrice: { 
              $toDouble: {
                $replaceAll: {
                  input: '$product.Price', 
                  find: ',', 
                  replacement: '' 
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', '$productPrice'] } }
          }
        }
      ]).toArray();

      resolve(cartItems[0]?.total || 0); 
    } catch (err) {
      reject(err);
    }
  });
},

placeOrder: (order, products, total) => {
  return new Promise((resolve, reject) => {
    console.log(order, products, total);

    let status = order['payment-method'] === 'COD' ? 'placed' : 'pending';
    let orderObj = {
      deliveryDetails: {
        mobile: order.mobile,
        address: order.address,
        pincode: order.pincode
      },
      userId: new ObjectId(order.userId),
      paymentMethod: order['payment-method'],
      products: products,
      totalAmount: total,
      status: status,
      date: new Date()
    };

    db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
      db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(order.userId) });

      // MongoDB 4.x and above use insertedId instead of ops
      resolve(response.insertedId);
    }).catch((err) => {
      reject(err); // Handle any potential errors
    });
  });
},



getCartProductList: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
      
      // Check if cart is null
      if (cart && cart.products) {
        resolve(cart.products);
      } else {
        resolve([]); // Return an empty array if no cart or products are found
      }
    } catch (error) {
      reject(error); // Reject the promise if there's an error
    }
  });
},


getUserOrders: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray();
      resolve(orders);
    } catch (error) {
      reject(error);
    }
  });
},


getOrderProducts: (orderId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: { _id: new ObjectId(orderId) } // Match the order by the correct ID
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] } // Extract first element of product array
          }
        }
      ]).toArray();
      
      resolve(orderItems); // Return the order items
    } catch (err) {
      reject(err);
    }
  });
},

generateRazorpay:(orderId, total)=>{
  return new Promise((resolve,reject)=>{
    var options = {
      amount: total*100,
      currency: "INR",
      receipt: orderId
    };
    instance.orders.create(options, function(err, order){
      console.log("order: ",order)
      resolve(order)
    })
  })
},

varifypayment: (payment) => {
  return new Promise((resolve, reject) => {
      const { createHmac } = require('crypto');
      const secret = 'OOg6baqHOLDxImnWSgqpePoP';
      
      // Correctly access payment properties
      let razorpayOrderId = payment.razorpay_order_id;
      let razorpayPaymentId = payment.razorpay_payment_id;
      let razorpaySignature = payment.razorpay_signature;
      
      // Create the HMAC hash
      let hash = createHmac('sha256', secret)
          .update(razorpayOrderId + '|' + razorpayPaymentId)
          .digest('hex');
      
      if (hash === razorpaySignature) {
          resolve(); // Success
      } else {
          reject(new Error('Invalid signature')); // Signature mismatch
      }
  });
},

changePaymentStatus: (orderId) => {
  return new Promise((resolve, reject) => { // Fix "promise" to "Promise"
      db.get()
          .collection(collection.ORDER_COLLECTION)
          .updateOne(
              { _id: new ObjectId(orderId) },
              { $set: { status: 'placed' } }
          )
          .then(() => {
              resolve();
          })
          .catch((err) => {
              reject(err); // Add proper error handling
          });
  });
},

getAllUsers: () => {
  return new Promise(async (resolve, reject) => {
    try {
      const users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
      resolve(users);
    } catch (err) {
      reject(err);
    }
  });
},
// Existing function to get user details
getUserDetails: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: new ObjectId(userId) });
      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
},

// New function to delete user account
deleteUserAccount: (userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      await db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: new ObjectId(userId) });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
},


changePassword: (userId, currentPassword, newPassword) => {
  return new Promise(async (resolve, reject) => {
    try {
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: new ObjectId(userId) });
      if (user) {
        const passwordMatch = await bcrypt.compare(currentPassword, user.Password);
        if (passwordMatch) {
          const hashedNewPassword = await bcrypt.hash(newPassword, 10);
          await db.get().collection(collection.USER_COLLECTION).updateOne(
            { _id: new ObjectId(userId) },
            { $set: { Password: hashedNewPassword } }
          );
          resolve(true);
        } else {
          resolve(false);
        }
      } else {
        resolve(false);
      }
    } catch (error) {
      reject(error);
    }
  });
}



}
