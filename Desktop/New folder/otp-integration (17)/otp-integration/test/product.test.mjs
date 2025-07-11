import request from 'supertest';
import app from '../src/app.js'; // Adjust the path if necessary
import { expect } from 'chai';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Product from '../src/model/productmodel.js'; // Adjust the path if necessary
import User from '../src/model/authmodel.js'; // Adjust the path if necessary

let token;

before(async () => {
  await User.deleteMany({ email: 'testuser@example.com' }); // Cleanup any existing user
  const user = new User({
    name: 'Test User',
    email: 'testuser@example.com',
    password: await bcrypt.hash('password', 10)
  });
  await user.save();
  
  const res = await request(app)
  .post('/api/products')
  .set('Authorization', `Bearer ${token}`) // Ensure the token is set correctly
  .send({
    name: 'Test Product',
    description: 'A test product',
    price: 10.99,
    category: 'Test Category',
    stock: 100,
    vendor: {
      name: 'Test Vendor',
      number: '1234567890',
      location: 'Vendor Location',
      vendorId: 'unique-vendor-id'
    },
    variants: [
      { quantity: 50, color: 'Red' },
      { quantity: 30, color: 'Blue' }
    ]
  });


    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('success', true);
    expect(res.body.data).to.have.property('name', 'Test Product');
    expect(res.body.data.variants).to.have.lengthOf(2);
    expect(res.body.data.variants[0]).to.include({ color: 'Red', quantity: 50 });
    expect(res.body.data.variants[1]).to.include({ color: 'Blue', quantity: 30 });
  });

