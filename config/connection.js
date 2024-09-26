const mongoose = require('mongoose');

const state = {
    db: null
};

module.exports.connect = function (done) {
    const url = 'mongodb://127.0.0.1:27017/shopping'; 

    mongoose.connect(url)
        .then(() => {
            state.db = mongoose.connection;
            done();
        })
        .catch(err => {
            console.error("Error connecting to MongoDB with Mongoose:", err);
            done(err);
        });
};

module.exports.get = function () {
    return state.db;
};
