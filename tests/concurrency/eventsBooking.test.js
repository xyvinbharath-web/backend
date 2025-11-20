const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const Event = require('../../models/Event');

// Use a fixed valid ObjectId string for test users so casting works with the schema
const USER_ID = '507f191e810c19729de860ea';

describe('Event booking concurrency', () => {
  it('does not exceed event capacity under concurrent bookings', async () => {
    const event = await Event.create({
      title: 'Concurrent Event',
      description: 'Race condition test',
      date: new Date(),
      capacity: 50,
    });

    const parallel = 100;

    const requests = Array.from({ length: parallel }).map(() =>
      request(app)
        .post(`/api/v1/events/${event._id}/book`)
        .set('x-test-role', 'user')
        .set('x-test-user-id', USER_ID) // reserved for possible future use
    );

    await Promise.all(requests);

    const updated = await Event.findById(event._id);
    // Core guarantee: no overbooking beyond declared capacity
    expect(updated.bookings.length).toBeLessThanOrEqual(event.capacity);
  });
});
