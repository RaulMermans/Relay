import { z } from "zod";

const shopifyShopIdSchema = z.string().regex(/^gid:\/\/shopify\/Shop\/\d+$/);
const shopifyOrderIdSchema = z.string().regex(/^gid:\/\/shopify\/Order\/\d+$/);
const shopDomainSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/);
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const moneyAmountSchema = z.string().regex(/^-?\d+(?:\.\d+)?$/);

function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

const shopSchema = z.object({
  id: shopifyShopIdSchema,
  name: z.string().trim().min(1),
  currencyCode: currencySchema,
  ianaTimezone: z.string().trim().min(1).refine(validTimeZone),
  myshopifyDomain: shopDomainSchema,
}).strict();

const moneyBagSchema = z.object({
  shopMoney: z.object({
    amount: moneyAmountSchema,
    currencyCode: currencySchema,
  }).strict(),
}).strict();

const orderNodeSchema = z.object({
  id: shopifyOrderIdSchema,
  name: z.string().trim().min(1).max(120),
  createdAt: z.string().datetime({ offset: true }),
  totalPriceSet: moneyBagSchema,
}).strict();

const throttleStatusSchema = z.object({
  currentlyAvailable: z.number().finite().nonnegative(),
  restoreRate: z.number().finite().positive(),
}).passthrough();

const extensionsSchema = z.object({
  cost: z.object({
    requestedQueryCost: z.number().finite().nonnegative().optional(),
    throttleStatus: throttleStatusSchema,
  }).passthrough(),
}).passthrough();

const graphqlErrorSchema = z.object({
  message: z.string().optional(),
  extensions: z.object({ code: z.string().optional() }).passthrough().optional(),
}).passthrough();

const shopResponseSchema = z.object({
  data: z.object({ shop: shopSchema }).strict(),
  extensions: extensionsSchema.optional(),
}).passthrough();

const ordersResponseSchema = z.object({
  data: z.object({
    orders: z.object({
      edges: z.array(z.object({ cursor: z.string().trim().min(1), node: orderNodeSchema }).strict()),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().trim().min(1).nullable(),
      }).strict().refine((page) => !page.hasNextPage || page.endCursor !== null),
    }).strict(),
  }).strict(),
  extensions: extensionsSchema.optional(),
}).passthrough();

export const shopifyGraphqlEnvelopeSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(graphqlErrorSchema).min(1).optional(),
  extensions: extensionsSchema.optional(),
}).passthrough();

export type ShopifyShop = z.infer<typeof shopSchema>;
export type ShopifyOrder = z.infer<typeof orderNodeSchema>;
export type ShopifyOrdersResponse = z.infer<typeof ordersResponseSchema>;
export type ShopifyGraphqlEnvelope = z.infer<typeof shopifyGraphqlEnvelopeSchema>;

export function parseShopifyShopResponse(input: unknown): ShopifyShop {
  return shopResponseSchema.parse(input).data.shop;
}

export function parseShopifyOrdersResponse(input: unknown): ShopifyOrdersResponse {
  return ordersResponseSchema.parse(input);
}

export function parseShopifyGraphqlEnvelope(input: unknown): ShopifyGraphqlEnvelope {
  return shopifyGraphqlEnvelopeSchema.parse(input);
}

export function parseShopDomain(input: string): string {
  return shopDomainSchema.parse(input.trim().toLowerCase());
}
