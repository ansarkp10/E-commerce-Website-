var db = require('../config/connection');
var collection = require('../config/collections');
const { ObjectId } = require('mongodb');

module.exports = {
    addProduct: (product, fileName) => {
        return new Promise((resolve, reject) => {
            product.Image = fileName; // Save the correct image filename
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product)
                .then((data) => resolve(data.insertedId))
                .catch((err) => reject(err));
        });
    },    
    
    getAllproducts: () => {
        return new Promise(async (resolve, reject) => {
          try {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
          } catch (err) {
            reject(err);
          }
        });
      },
      

    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(proId) }).then((response) => {
                resolve(response);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
                resolve(product);
            }).catch((err) => {
                reject(err);
            });
        });
    },

    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: new ObjectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    Description: proDetails.Description,
                    Price: proDetails.Price,
                    Category: proDetails.Category
                }
            }).then((response) => {
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });
    },
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
          try {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray();
            resolve(orders);
          } catch (err) {
            reject(err);
          }
        });
      },
      
};
