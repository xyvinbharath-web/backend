import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api/v1';

export default function () {
  // Auth OTP send (if exposed under /auth/send-otp or similar)
  const phone = __ENV.TEST_USER_PHONE || '+911234567890';
  const otpRes = http.post(`${BASE_URL}/auth/send-otp`, JSON.stringify({ phone }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(otpRes, {
    'otp status is 2xx or 4xx': (r) => r.status >= 200 && r.status < 500,
  });

  // Events
  const eventsRes = http.get(`${BASE_URL}/events?page=1&limit=10`);
  check(eventsRes, {
    'events status is 200 or 4xx': (r) => r.status >= 200 && r.status < 500,
  });

  // Bookings (unauthenticated; expect 4xx)
  const bookingsRes = http.get(`${BASE_URL}/bookings`);
  check(bookingsRes, {
    'bookings status is 4xx or 2xx': (r) => r.status >= 200 && r.status < 500,
  });

  sleep(1);
}
