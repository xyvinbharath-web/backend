const { z } = require('zod');

// Generic validate middleware using Zod schemas. All schemas are defined
// against a single object containing { body, params, query }.
function validate(schema) {
  return (req, res, next) => {
    const input = {
      body: req.body,
      params: req.params,
      query: req.query,
    };

    const result = schema.safeParse(input);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        data: result.error.flatten(),
      });
    }

    req.validated = result.data;
    return next();
  };
}

module.exports = validate;
