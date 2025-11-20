const request = require('supertest');
const app = require('../../server');

function api() {
  return request(app);
}

module.exports = {
  api,
};
