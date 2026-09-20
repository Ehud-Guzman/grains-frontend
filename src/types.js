/**
 * Shared JSDoc typedefs — the project's light type layer.
 *
 * There is no TypeScript and no PropTypes anywhere (0 occurrences), yet a
 * deeply nested shape — `product.varieties[].packaging[]` with `priceKES`,
 * `quoteOnly`, `stock`, `lowStockThreshold`, `pricingTiers[]` — is dereferenced
 * defensively-with-optional-chaining in helpers.js, CartContext, ProductCard,
 * ProductPage, CheckoutPage and every admin product screen. These typedefs give
 * editors autocomplete and catch shape mistakes without a build change.
 *
 * Opt in per file with `// @ts-check` at the top, then annotate a value:
 *   const p = ... // as import('../types').Product
 * (See README of the JSDoc workflow: use the @type tag with the import form.)
 *
 * Nothing here is imported at runtime — it is purely for the language service.
 */

/**
 * A volume price break. Quantity >= minQty earns priceKES per unit.
 * @typedef {object} PricingTier
 * @property {number} minQty
 * @property {number} priceKES
 */

/**
 * One purchasable size of a variety (45kg, 50kg, Bulk…).
 * @typedef {object} Packaging
 * @property {string} size
 * @property {number|null} priceKES     null when quote-only
 * @property {boolean} [quoteOnly]      price on request — cannot be ordered online
 * @property {number} stock             units currently available
 * @property {number} [lowStockThreshold]
 * @property {PricingTier[]} [pricingTiers]
 */

/**
 * A named grade/cultivar of a product (e.g. "Yellow Maize").
 * @typedef {object} Variety
 * @property {string} varietyName
 * @property {string} [description]
 * @property {string[]} [imageURLs]
 * @property {Packaging[]} packaging
 */

/**
 * @typedef {object} Product
 * @property {string} _id
 * @property {string} name
 * @property {string} category
 * @property {string} [description]
 * @property {string[]} [imageURLs]
 * @property {Variety[]} varieties
 * @property {boolean} [taxable]        false = VAT-exempt
 * @property {boolean} [isActive]
 * @property {string} [branchId]
 */

/**
 * A line item snapshot inside an order.
 * @typedef {object} OrderItem
 * @property {string} productId
 * @property {string} productName
 * @property {string} variety
 * @property {string} packaging
 * @property {number} quantity
 * @property {number} priceKES          unit price actually charged
 * @property {string} [imageURL]
 * @property {boolean} [taxable]
 */

/**
 * A line item inside the client-side cart. `stock` is `null` when unknown
 * (reorder from an old order snapshot) — the quantity is then validated
 * server-side at checkout instead of client-side. Must be null, not Infinity:
 * Infinity does not survive JSON persistence.
 * @typedef {object} CartItem
 * @property {string} key               `${productId}-${variety}-${packaging}`
 * @property {string} productId
 * @property {string} productName
 * @property {string} variety
 * @property {string} packaging
 * @property {number} quantity
 * @property {number} priceKES
 * @property {PricingTier[]} [pricingTiers]
 * @property {boolean} [taxable]
 * @property {number|null} [stock]
 * @property {string} [imageURL]
 */

/** @typedef {'pending'|'approved'|'preparing'|'out_for_delivery'|'completed'|'rejected'|'cancelled'} OrderStatus */
/** @typedef {'mpesa'|'pickup'|'delivery'} PaymentMethod */
/** @typedef {'pickup'|'delivery'} DeliveryMethod */
/** @typedef {'staff'|'supervisor'|'admin'|'superadmin'|'driver'|'customer'} UserRole */
/** @typedef {'in'|'low'|'out'} StockStatus */

/**
 * @typedef {object} Branch
 * @property {string} _id
 * @property {string} name
 * @property {string} [slug]
 * @property {string} [location]
 * @property {boolean} [isDefault]
 */

/**
 * Authenticated user. Customer accounts carry `branchId: null` — they are
 * shared across branches, so one login works everywhere.
 * @typedef {object} AuthUser
 * @property {string} _id
 * @property {string} name
 * @property {string} phone
 * @property {string} [email]
 * @property {UserRole} role
 * @property {string|null} [branchId]
 * @property {string[]} [customPermissions]
 * @property {boolean} [marketingConsent]
 */

/**
 * @typedef {object} Order
 * @property {string} _id
 * @property {string} orderRef
 * @property {OrderStatus} status
 * @property {DeliveryMethod} deliveryMethod
 * @property {PaymentMethod} paymentMethod
 * @property {OrderItem[]} orderItems
 * @property {number} subtotal
 * @property {number} deliveryFee
 * @property {number} [vatAmount]
 * @property {number} [couponDiscount]
 * @property {number} total
 * @property {string} branchId
 * @property {string} createdAt
 */

export default {}
