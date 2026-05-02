import { z } from "zod";

import { normalizePakistanMobile } from "@/lib/pakistan-phone";

const CUSTOMER_NAME_MAX_LENGTH = 80;
const CUSTOMER_AREA_MAX_LENGTH = 60;
const CUSTOMER_ADDRESS_MAX_LENGTH = 220;
const CUSTOMER_NOTES_MAX_LENGTH = 300;

const pakistanPhoneSchema = z
  .string()
  .trim()
  .min(1, "Primary phone is required")
  .refine(
    (value) => normalizePakistanMobile(value) !== null,
    "Enter a valid Pakistan mobile number",
  )
  .transform((value) => normalizePakistanMobile(value)!);

const optionalPakistanPhoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => value?.trim() ?? "")
  .refine(
    (value) => value === "" || normalizePakistanMobile(value) !== null,
    "Enter a valid Pakistan mobile number",
  )
  .transform((value) => (value === "" ? undefined : normalizePakistanMobile(value)!));

export const customerSchema = z
  .object({
    id: z.string().optional(),
    name: z
      .string()
      .trim()
      .min(2, "Customer name is required")
      .max(CUSTOMER_NAME_MAX_LENGTH, `Name must be ${CUSTOMER_NAME_MAX_LENGTH} characters or less`),
    phone: pakistanPhoneSchema,
    alternatePhone: optionalPakistanPhoneSchema,
    area: z
      .string()
      .trim()
      .min(2, "Area is required")
      .max(CUSTOMER_AREA_MAX_LENGTH, `Area must be ${CUSTOMER_AREA_MAX_LENGTH} characters or less`),
    address: z
      .string()
      .trim()
      .min(8, "Detailed address is required")
      .max(
        CUSTOMER_ADDRESS_MAX_LENGTH,
        `Address must be ${CUSTOMER_ADDRESS_MAX_LENGTH} characters or less`,
      ),
    notes: z
      .string()
      .trim()
      .max(CUSTOMER_NOTES_MAX_LENGTH, `Notes must be ${CUSTOMER_NOTES_MAX_LENGTH} characters or less`)
      .optional()
      .transform((value) => value || undefined),
    isActive: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.alternatePhone && value.alternatePhone === value.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["alternatePhone"],
        message: "Alternate phone must be different from the primary phone",
      });
    }
  });

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerInput = z.output<typeof customerSchema>;
