const { z } = require('zod');
const createTicketSchema = z.object({ body: z.object({ title: z.string().trim().min(5).max(200), description: z.string().trim().min(10).max(2000), category: z.string().regex(/^[0-9a-fA-F]{24}$/), location: z.string().trim().min(2).max(200) }) });
const ticketQuerySchema = z.object({ query: z.object({ page: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().positive().max(50).optional(), status: z.string().optional(), category: z.string().optional(), priority: z.string().optional(), q: z.string().trim().max(100).optional(), assignedTo: z.string().optional(), overdue: z.enum(['true', 'false']).optional(), sort: z.string().optional() }) });
const updateStatusSchema = z.object({ body: z.object({ status: z.enum(['IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']), note: z.string().trim().max(1000).optional() }) });
const assignTicketSchema = z.object({ body: z.object({ assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/) }) });
module.exports = { createTicketSchema, ticketQuerySchema, updateStatusSchema, assignTicketSchema };
