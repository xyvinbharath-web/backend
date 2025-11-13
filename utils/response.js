const ok = (res, data = null, message = 'OK') => res.status(200).json({ success: true, message, data });
const created = (res, data = null, message = 'Created') => res.status(201).json({ success: true, message, data });
const badRequest = (res, message = 'Bad Request', data = null) => res.status(400).json({ success: false, message, data });
const unauthorized = (res, message = 'Unauthorized') => res.status(401).json({ success: false, message, data: null });
const forbidden = (res, message = 'Forbidden') => res.status(403).json({ success: false, message, data: null });
const notFoundRes = (res, message = 'Not Found') => res.status(404).json({ success: false, message, data: null });

module.exports = { ok, created, badRequest, unauthorized, forbidden, notFoundRes };
