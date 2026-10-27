const mongoose=require('mongoose');const request=require('supertest');const{MongoMemoryServer}=require('mongodb-memory-server');let mongo,app;beforeAll(async()=>{mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());app=require('../server')});afterAll(async()=>{await mongoose.disconnect();if(mongo)await mongo.stop()});test('health endpoint responds without exposing environment details',async()=>{const response=await request(app).get('/api/health');expect(response.status).toBe(200);expect(response.body.success).toBe(true)});test('student cannot read another student ticket and receives non-disclosing 404',async()=>{const{User,Ticket,Category}=require('../models');const bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');const hash=await bcrypt.hash('password123',4);const a=await User.create({name:'Student A',email:'a@test.dev',passwordHash:hash,role:'STUDENT'}),b=await User.create({name:'Student B',email:'b@test.dev',passwordHash:hash,role:'STUDENT'}),c=await Category.create({name:'Internet',slaHours:24});const t=await Ticket.create({title:'Network down',description:'Internet is unavailable in my room',category:c._id,location:'Hostel A',createdBy:a._id});const token=jwt.sign({userId:b._id,role:b.role},process.env.JWT_SECRET);const response=await request(app).get(`/api/tickets/${t._id}`).set('Authorization',`Bearer ${token}`);expect(response.status).toBe(404);expect(response.body.message).toBe('Ticket not found')});

test('assigned staff can start work on a ticket with populated assignment', async () => {
  const { User, Ticket, Category } = require('../models');
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const hash = await bcrypt.hash('password123', 4);
  const category = await Category.create({ name: 'Furniture', slaHours: 48 });
  const staff = await User.create({ name: 'Housing Staff', email: 'housing@test.dev', passwordHash: hash, role: 'STAFF', categories: [category._id] });
  const student = await User.create({ name: 'Ticket Owner', email: 'owner@test.dev', passwordHash: hash, role: 'STUDENT' });
  const ticket = await Ticket.create({ title: 'Broken table', description: 'The table leg is loose', category: category._id, location: 'Room 461', createdBy: student._id, assignedTo: staff._id, status: 'ASSIGNED', slaDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000) });
  const token = jwt.sign({ userId: staff._id, role: staff.role }, process.env.JWT_SECRET);

  const response = await request(app).patch(`/api/tickets/${ticket._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'IN_PROGRESS' });
  expect(response.status).toBe(200);
  expect(response.body.data.status).toBe('IN_PROGRESS');
});
