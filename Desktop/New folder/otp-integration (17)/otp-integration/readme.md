1 PREREQUISITES
~ Node.js installed = Node.js (LTS) - Download from Node.js
~ MongoDB instance (local or cloud)
~ Message Central API Key

2 SETUP COMMANDS:
~ mkdir otp-backend
--> Create the project folder/directory named "otp-backend".

~ cd otp-backend
--> Changes the current working directory to "otp-backend".

~ npm init -y
--> Initializes a new Node.js project inside the "otp-backend" directory by creating a package.json file with default settings.

~ npm install express mongoose dotenv request-promise-native
--> Installs the essential packages for building a Node.js application with a web server (Express), database interaction (Mongoose), environment variable management (dotenv), and HTTP requests (request-promise-native).

~ npm install nodemon --save-dev
--> Installs nodemon as a development tool, allowing automatic server restarts during code changes, and adds it as a development dependency.

3 DEPENDENCIES:

~ dotenv
--> Loads environment variables from a .env file into process.env. This helps manage configuration and secrets such as API keys and database URIs securely.
~ express
--> A web application framework for Node.js that simplifies building APIs and web applications by providing features like routing and middleware support.
~ mongoose
--> An Object Data Modeling (ODM) library for MongoDB and Node.js, used to define schemas and models, and interact with MongoDB databases.
~ mongodb
--> Official MongoDB driver for Node.js. It allows direct interaction with MongoDB, handling operations such as querying and updating documents.
~ request-promise-native
--> Provides a promise-based API for making HTTP requests, making it easier to handle asynchronous operations.
~ Message Central
--> Integrates with the Message Central API for sending OTPs and SMS messages, facilitating communication through Message Central's messaging services.

DEVDEPENDENCIES
~ nodemon
--> A development tool that automatically restarts the Node.js server when file changes are detected, improving the development workflow by avoiding manual restarts.

4 CREATE PROJECT DIRECTORIES/FOLDERS

-- COMMANDS TO CREATE THE DIRECTORY STRUCTURE:

~ New-Item -ItemType Directory -Path src/config, src/controllers, src/models, src/routes, src/services, src/middleware
--> Creates the necessary directories for the project structure.

-- COMMANDS TO CREATE THE FILES:
New-Item -Path src/config/db.js -ItemType File
New-Item -Path src/controllers/authController.js -ItemType File
New-Item -Path src/controllers/cartController.js -ItemType File
New-Item -Path src/controllers/productController.js -ItemType File
New-Item -Path src/controllers/vendorController.js -ItemType File
New-Item -Path src/controllers/adminController.js -ItemType File
New-Item -Path src/controllers/couponController.js -ItemType File
New-Item -Path src/controllers/inventoryController.js -ItemType File
New-Item -Path src/models/authModel.js -ItemType File
New-Item -Path src/models/cartModel.js -ItemType File
New-Item -Path src/models/productModel.js -ItemType File
New-Item -Path src/models/vendorModel.js -ItemType File
New-Item -Path src/models/adminModel.js -ItemType File
New-Item -Path src/models/couponModel.js -ItemType File
New-Item -Path src/models/inventoryModel.js -ItemType File
New-Item -Path src/routes/authRoutes.js -ItemType File
New-Item -Path src/routes/productRoutes.js -ItemType File
New-Item -Path src/routes/cartRoutes.js -ItemType File
New-Item -Path src/routes/adminRoutes.js -ItemType File
New-Item -Path src/routes/couponRoutes.js -ItemType File
New-Item -Path src/routes/inventoryRoutes.js -ItemType File
New-Item -Path src/services/otpService.js -ItemType File
New-Item -Path src/middleware/authMiddleware.js -ItemType File
New-Item -Path src/middleware/authenticateAdmin.js -ItemType File
New-Item -Path src/app.js -ItemType File
New-Item -Path src/server.js -ItemType File
New-Item -Path .env -ItemType File

# File Explanations

~ Config
src/config/db.js: Manages the MongoDB connection configuration and connection handling.
~ Controllers

authController.js: Handles user authentication operations, including registration, login, OTP sending, and verification.
cartController.js: Manages cart operations like creating/retrieving a cart, adding/removing/updating items, and applying coupons.
productController.js: Handles CRUD operations for products, including managing product variants and validating product data.
vendorController.js: Manages vendor-specific operations, including registration, login, and managing vendor profiles.
adminController.js: Manages administrative tasks like managing users, vendors, and products.
couponController.js: Handles coupon creation, updating, deletion, and retrieval.
inventoryController.js: Manages product inventory operations such as adding/removing products and checking inventory status.

~ Models
authModel.js: Defines schemas for user authentication, including fields for email, phone number, and password.
cartModel.js: Defines schemas for cart and cart items, including product ID, quantity, and variants.
productModel.js: Defines the product schema, including name, price, description, images, category, nutritional information, vendor ID, and variants.
vendorModel.js: Defines vendor schema, including fields for vendor-specific information like name, location, and login credentials.
adminModel.js: Defines the schema for admin users, including fields for managing administrative roles.
couponModel.js: Defines the schema for coupons, including discount type, value, expiration date, and usage limits.
inventoryModel.js: Defines the schema for managing inventory, including product SKU, quantity, and other inventory details.
~ Routes
authRoutes.js: Defines routes related to user and vendor authentication.
productRoutes.js: Defines routes for managing product CRUD operations.
cartRoutes.js: Defines routes for cart operations, including adding/removing items and applying coupons.
adminRoutes.js: Defines routes for administrative operations, including managing users, vendors, and products.
couponRoutes.js: Defines routes for managing coupon codes.
inventoryRoutes.js: Defines routes for managing product inventory.
~ Services

otpService.js: Contains functions to interact with the Message Central API for sending and verifying OTPs.
couponService.js : It is responsible for managing coupon-related operations, including fetching a coupon by its code, validating the coupon against the items in a cart, and applying discounts based on the coupon's rules.

~ Middleware

authMiddleware.js: Handles token verification and secures routes by checking if a user or vendor is authenticated.
authenticateAdmin.js: Secures admin routes by verifying if the user is an authenticated admin.
~ App Setup

app.js: Initializes the Express application, sets up middleware, and defines the route handlers.
server.js: Starts the Express server and listens on the specified port.

Starts the Express server, listening on the specified port.

5. Route Definitions
5.1. Authentication Routes
File: src/routes/authRoutes.js

POST /register - Register a new user.

POST /login - User login with email and password.

POST /login-phone - User login with phone number.

POST /sendOtp - Send OTP to user's phone.

POST /verifyOtp - Verify the received OTP.

GET /profile - Retrieve the authenticated user's profile.

PUT /profile - Update the authenticated user's profile.

Vendor Routes:

POST /register-vendor - Register a new vendor.

POST /login-vendor - Vendor login with email and password.

POST /login-vendor-phone - Vendor login with phone number.

POST /verify-vendor-otp - Verify OTP for vendor login.

GET /vendor-profile - Retrieve the authenticated vendor's profile.

PUT /vendor-profile - Update the authenticated vendor's profile.

5.2. Product Routes
File: src/routes/productRoutes.js

POST / - Create a new product (Vendor only).
GET / - Retrieve all products.
GET /:id - Retrieve a product by its ID.
PUT /:id - Update an existing product (Vendor only).
DELETE /:id - Delete a product by its ID (Vendor only).
5.3. Cart Routes
File: src/routes/cartRoutes.js

GET / - Create or retrieve the current user's cart.

POST /add-item - Add an item to the cart.

POST /remove-item - Remove an item from the cart.

POST /update-item - Update the quantity of an item in the cart.

GET /summary - Get the summary and pricing of the cart.

POST /apply-coupon - Apply a coupon to the cart.

5.4. Admin Routes
File: src/routes/adminRoutes.js

POST /register - Register a new admin.
POST /login/email - Admin login with email.
POST /login/phone - Admin login with phone number.
Admin Management:

PUT /update - Update admin details.
DELETE /:id - Delete an admin by ID.
User Management:

GET /users - Retrieve all users.
PUT /users/:id - Update a user by ID.
DELETE /users/:id - Delete a user by ID.
Vendor Management:

GET /vendors - Retrieve all vendors.
PUT /vendors/:id - Update a vendor by ID.
DELETE /vendors/:id - Delete a vendor by ID.
Product Management:

GET /products - Retrieve all products.
PUT /products/:id - Update a product by ID.
DELETE /products/:id - Delete a product by ID.
5.5. Coupon Routes
File: src/routes/couponRoutes.js

POST /create - Create a new coupon.
GET /all - Retrieve all coupons.
GET /:code - Retrieve a coupon by its code.
PUT /:id - Update an existing coupon by ID.
DELETE /:id - Delete a coupon by ID.

6 SETUP ENVIRONMENT VARIABLES:

~ Create a .env file in the root directory
--> The .env file is used to store environment-specific variables that are sensitive or change between deployments, such as API keys, database URIs, and port numbers.
--> By using a .env file, you keep these values out of your source code, enhancing security and making configuration easier across different environments (development, testing, production).

7 RUN THE APPLICATION:

~ npm start
--> Starts the application, running the Express server and initializing the backend services.
