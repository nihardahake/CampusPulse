const { z } = require('zod');

/**
 * Schema for creating a new category.
 */
const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Category name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    slaHours: z
      .number({ required_error: 'SLA hours is required' })
      .min(1, 'SLA hours must be at least 1')
      .max(720, 'SLA hours cannot exceed 720'),
    description: z
      .string()
      .max(200, 'Description cannot exceed 200 characters')
      .optional(),
  }),
});

/**
 * Schema for updating a category (all fields optional).
 */
const updateCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters')
      .optional(),
    slaHours: z
      .number()
      .min(1, 'SLA hours must be at least 1')
      .max(720, 'SLA hours cannot exceed 720')
      .optional(),
    description: z
      .string()
      .max(200, 'Description cannot exceed 200 characters')
      .optional(),
  }),
});

/**
 * Schema for creating a new staff member.
 */
const createStaffSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Name is required' })
      .min(2, 'Name must be at least 2 characters')
      .max(50, 'Name cannot exceed 50 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please provide a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    categories: z
      .array(z.string(), { required_error: 'Categories are required' })
      .min(1, 'At least one category is required'),
  }),
});

/**
 * Schema for updating a staff member.
 */
const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    isActive: z.boolean().optional(),
    categories: z
      .array(z.string())
      .optional(),
  }),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  createStaffSchema,
  updateStaffSchema,
};
