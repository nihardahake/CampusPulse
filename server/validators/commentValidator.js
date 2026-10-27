const { z } = require('zod');
module.exports = { createCommentSchema: z.object({ body: z.object({ message: z.string().trim().min(1).max(1000) }) }) };
