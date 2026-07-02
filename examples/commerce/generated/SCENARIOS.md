# Commerce Fulfillment Failures

Domain: `commerce`
Schema: `examples/commerce/schema.prisma`

## Scenarios

### Abandoned Cart

A known customer added products to cart but did not complete checkout. Requested focus: commerce fulfillment failures.

| Model | Generated fields |
| --- | --- |
| Customer | id, email, name, phone, createdAt |
| Product | id, sku, name, description, priceCents, inventory |
| Cart | customerId, id, status, totalCents, createdAt, updatedAt |
| CartItem | cartId, productId, id, quantity |
| Order | customerId, id, status, totalCents, currency, createdAt |
| OrderItem | orderId, productId, id, quantity, unitPriceCents |
| Shipment | orderId, id, status, carrier, trackingCode |

### Payment Failed

An order failed during payment and should keep inventory reserved briefly.

| Model | Generated fields |
| --- | --- |
| Customer | id, email, name, phone, createdAt |
| Product | id, sku, name, description, priceCents, inventory |
| Cart | customerId, id, status, totalCents, createdAt, updatedAt |
| CartItem | cartId, productId, id, quantity |
| Order | customerId, id, status, totalCents, currency, failureReason, createdAt |
| OrderItem | orderId, productId, id, quantity, unitPriceCents |
| Shipment | orderId, id, status, carrier, trackingCode |

### Refunded Order

A paid order has been refunded and needs support, inventory, and finance views to agree.

| Model | Generated fields |
| --- | --- |
| Customer | id, email, name, phone, createdAt |
| Product | id, sku, name, description, priceCents, inventory |
| Cart | customerId, id, status, totalCents, createdAt, updatedAt |
| CartItem | cartId, productId, id, quantity |
| Order | customerId, id, status, totalCents, currency, createdAt |
| OrderItem | orderId, productId, id, quantity, unitPriceCents |
| Shipment | orderId, id, status, carrier, trackingCode, shippedAt |

### Delayed Shipment

A shipment is late enough to trigger customer-facing delivery messaging.

| Model | Generated fields |
| --- | --- |
| Customer | id, email, name, phone, createdAt |
| Product | id, sku, name, description, priceCents, inventory |
| Cart | customerId, id, status, totalCents, createdAt, updatedAt |
| CartItem | cartId, productId, id, quantity |
| Order | customerId, id, status, totalCents, currency, createdAt |
| OrderItem | orderId, productId, id, quantity, unitPriceCents |
| Shipment | orderId, id, status, carrier, trackingCode, shippedAt |

## Model Coverage

| Model | Fields |
| --- | --- |
| Customer | id, email, name, phone, orders, carts, createdAt |
| Product | id, sku, name, description, priceCents, inventory, orderItems, cartItems |
| Cart | id, customerId, customer, status, totalCents, items, createdAt, updatedAt |
| CartItem | id, cartId, cart, productId, product, quantity |
| Order | id, customerId, customer, status, totalCents, currency, failureReason, refundedAt, items, shipment, createdAt |
| OrderItem | id, orderId, order, productId, product, quantity, unitPriceCents |
| Shipment | id, orderId, order, status, carrier, trackingCode, shippedAt, deliveredAt |

