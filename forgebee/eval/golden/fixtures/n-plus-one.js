// GOLDEN FIXTURE (synthetic) — planted performance issue for review-performance.
// Expected finding: N+1 query — a per-iteration DB call inside a loop that
// should be a single batched query / JOIN.

const db = require('./db');

async function listOrdersWithCustomers() {
  const orders = await db.query('SELECT * FROM orders');
  const result = [];
  for (const order of orders) {
    // planted: N+1 — one query per order instead of a JOIN / batched IN (...)
    const customer = await db.query('SELECT * FROM customers WHERE id = ' + order.customer_id);
    result.push({ ...order, customer });
  }
  return result;
}

module.exports = { listOrdersWithCustomers };
