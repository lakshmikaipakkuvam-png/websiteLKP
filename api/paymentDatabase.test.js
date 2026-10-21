import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('isolated PostgreSQL enforces payment invariants and API-only table access', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table orders(id uuid primary key default gen_random_uuid(), customer_id uuid, subtotal_amount integer,
        grand_total_amount integer, status text default 'confirmed', tracking_id text, razorpay_order_id text unique);
      create table payments(id uuid primary key default gen_random_uuid(), order_id uuid references orders,
        customer_id uuid, provider text not null, provider_order_id text unique not null,
        provider_payment_id text unique not null, provider_signature_id text unique not null,
        amount integer not null, status text not null);
    `)
    for (const table of ['products', 'profile', 'product_categories', 'product_subcategories', 'order_items', 'combo_offers', 'customers', 'feedback_reviews', 'admin_customer_reviews']) {
      await db.exec(`create table ${table}(id uuid primary key default gen_random_uuid())`)
    }
    await db.exec(await readFile(new URL('../supabase/migrations/20261021090000_protect_guest_order_access.sql', import.meta.url), 'utf8'))
    await db.exec(`insert into orders(subtotal_amount,grand_total_amount,razorpay_order_id,payment_mode) values
      (250,250,'order_live','live'), (250,250,'order_test','test'), (250,250,'order_cancel','live');
      update orders set status='cancelled' where razorpay_order_id='order_cancel';`)
    const record = (order = 'order_live', payment = 'pay_live', amount = 25000, currency = 'INR', mode = 'live', refund = 0) =>
      db.query('select * from lkp_record_payment($1,$2,$3,$4,$5,$6)', [order, payment, amount, currency, mode, refund])
    await assert.rejects(db.exec("update orders set status='shipped' where razorpay_order_id='order_live'"), /captured live payment/)
    await assert.rejects(db.exec("update orders set tracking_id='TRACK' where razorpay_order_id='order_live'"), /captured live payment/)
    for (const args of [ ['order_live','pay_live',100], ['order_live','pay_live',25000,'USD'], ['order_live','pay_live',25000,'INR','test'], ['order_live','pay_live',25000,'INR','live',-1] ]) {
      await assert.rejects(record(...args), /does not match/)
    }
    await Promise.all(Array.from({ length: 5 }, () => record()))
    assert.equal((await db.query('select count(*)::int as count from payments')).rows[0].count, 1)
    await assert.rejects(record('order_live', 'pay_different'), /Conflicting/)
    await db.exec("update orders set status='preparing' where razorpay_order_id='order_live'")
    await record('order_live','pay_live',25000,'INR','live',100)
    await record() // stale capture must not undo the refund
    assert.equal((await db.query("select payment_state from orders where razorpay_order_id='order_live'")).rows[0].payment_state, 'refunded')
    await assert.rejects(db.exec("update orders set status='shipped' where razorpay_order_id='order_live'"), /captured live payment/)
    await record('order_test','pay_test',25000,'INR','test')
    await assert.rejects(db.exec("update orders set status='shipped' where razorpay_order_id='order_test'"), /captured live payment/)
    await record('order_cancel','pay_cancel')
    assert.equal((await db.query("select payment_state from orders where razorpay_order_id='order_cancel'")).rows[0].payment_state, 'review')
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.query('select * from orders'), /permission denied/)
      await assert.rejects(record(), /permission denied/)
      await db.exec('reset role')
    }
    await db.exec('set role service_role')
    assert.equal((await db.query('select count(*)::int as count from orders')).rows[0].count, 3)
  } finally { await db.close() }
})
