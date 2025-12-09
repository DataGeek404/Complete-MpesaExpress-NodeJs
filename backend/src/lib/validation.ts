import { z } from 'zod';

export const phoneNumberSchema = z
  .string()
  .min(9, 'Phone number must be at least 9 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^[\d+]+$/, 'Phone number must contain only digits and optional + prefix');

export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .min(1, 'Minimum amount is 1')
  .max(150000, 'Maximum amount is 150,000');

export const stkPushSchema = z.object({
  phoneNumber: phoneNumberSchema,
  amount: amountSchema,
  accountReference: z
    .string()
    .min(1, 'Account reference is required')
    .max(12, 'Account reference must be at most 12 characters'),
  transactionDesc: z
    .string()
    .max(13, 'Transaction description must be at most 13 characters')
    .optional(),
});

export const c2bSimulateSchema = z.object({
  amount: amountSchema,
  msisdn: phoneNumberSchema,
  billRefNumber: z.string().max(20, 'Bill reference must be at most 20 characters').optional(),
  commandID: z.enum(['CustomerPayBillOnline', 'CustomerBuyGoodsOnline']).optional(),
});

export const b2cPaymentSchema = z.object({
  amount: amountSchema,
  phoneNumber: phoneNumberSchema,
  remarks: z.string().min(1, 'Remarks are required').max(100, 'Remarks must be at most 100 characters'),
  occasion: z.string().max(100, 'Occasion must be at most 100 characters').optional(),
  commandID: z.enum(['BusinessPayment', 'SalaryPayment', 'PromotionPayment']).optional(),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errors}`);
  }
  return result.data;
}
