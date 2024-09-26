**E-Commerce Website**

This is a full-featured e-commerce website built using Node.js, Express, MongoDB, and Handlebars. It includes functionalities such as user authentication, product management, shopping cart, order management, and an admin panel for managing products and users.

**Features**
**User Features**
User Authentication: Sign up, login, and session-based authentication for a secure user experience.
Product Search: Real-time search functionality to find products quickly.
Shopping Cart: Add, update, and remove products from the cart with a dynamic total price calculation.
Order Management: Place orders, view order history, and track the status of current orders.
Profile Management: View and update profile information, including uploading a profile photo.

**Admin Features**
Admin Authentication: Secure login with session management.
Product Management: Add, edit, delete, and categorize products with image uploads.
User Management: View all registered users with options to manage user details.
Order Management: View and manage all customer orders, update order status, and track payments.

**Technologies Used**
Backend: Node.js, Express.js
Frontend: Handlebars (HBS), HTML, CSS, JavaScript
Database: MongoDB
File Uploads: express-fileupload for handling image uploads
Authentication: passport.js with passport-local strategy
Session Management: express-session for handling user sessions
Styling: Custom CSS with animations for a visually dynamic experience

**Setup Instructions**
Prerequisites
Node.js (v14 or later)
MongoDB (Make sure MongoDB is running)

**Installation**
Clone the repository:

git clone https://github.com/ansarkp10/e-commerce-website.git

**Navigate to the project directory:**

cd e-commerce-website
**Install dependencies:**

npm install

**Set up environment variables:**

Create a .env file in the project root directory and add the following environment variables:

PORT=3000
MONGODB_URI=mongodb://localhost:27017/ecommerceDB
SESSION_SECRET=YourSessionSecret

**Start the MongoDB server:**

mongod
**
Run the application:**

npm start
The website should now be running at http://localhost:3000.

**Admin Access**
Use the following credentials to access the admin panel:
Email: admin@example.com
Password: adminpassword

**Usage**
Visit http://localhost:3000 for the user view.
Visit http://localhost:3000/admin for the admin view.

**Contributing**
Fork the repository.
Create your feature branch (git checkout -b feature/YourFeature).
Commit your changes (git commit -m 'Add new feature').
Push to the branch (git push origin feature/YourFeature).
Open a pull request.

**License**
This project is licensed under the MIT License - see the LICENSE file for details.

**Acknowledgments**
Express - Fast, unopinionated, minimalist web framework for Node.js
MongoDB - Document-oriented NoSQL database
Handlebars - Minimal templating on steroids
Bootstrap - Frontend component library
