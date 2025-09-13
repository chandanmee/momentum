const fs = require('fs');
const path = require('path');

exports.up = async function(knex) {
  // Create extensions (skip PostGIS for now)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  
  // Create departments table
  await knex.schema.createTable('departments', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });
  
  // Create geofences table
  await knex.schema.createTable('geofences', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.text('description');
    table.decimal('latitude', 10, 8).notNullable();
    table.decimal('longitude', 11, 8).notNullable();
    table.integer('radius_meters').notNullable().defaultTo(100);
    table.text('address');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.check('latitude >= -90 AND latitude <= 90');
    table.check('longitude >= -180 AND longitude <= 180');
    table.check('radius_meters > 0 AND radius_meters <= 10000');
  });
  
  // Create users table
  await knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('employee_id', 50).notNullable().unique();
    table.string('name', 100).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('role', 20).notNullable().defaultTo('employee');
    table.integer('department_id').references('id').inTable('departments').onDelete('SET NULL');
    table.integer('geofence_id').references('id').inTable('geofences').onDelete('SET NULL');
    table.string('phone', 20);
    table.text('avatar_url');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login');
    table.timestamp('password_changed_at');
    table.string('password_reset_token', 255);
    table.timestamp('password_reset_expires');
    table.string('email_verification_token', 255);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('email_verified_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
  });
  
  // Create punches table
  await knex.schema.createTable('punches', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 20).notNullable(); // 'clock_in', 'clock_out', 'break_start', 'break_end'
    table.timestamp('punch_time').notNullable();
    table.decimal('latitude', 10, 8);
    table.decimal('longitude', 11, 8);
    table.text('location_address');
    table.integer('geofence_id').references('id').inTable('geofences').onDelete('SET NULL');
    table.boolean('is_valid').defaultTo(true);
    table.text('notes');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at');
    table.index(['user_id', 'punch_time']);
    table.index(['punch_time']);
    table.index(['type']);
  });
};

exports.down = async function(knex) {
  // Drop all tables in reverse order
  await knex.raw('DROP TABLE IF EXISTS punches CASCADE');
  await knex.raw('DROP TABLE IF EXISTS users CASCADE');
  await knex.raw('DROP TABLE IF EXISTS geofences CASCADE');
  await knex.raw('DROP TABLE IF EXISTS departments CASCADE');
  
  // Drop extensions
  await knex.raw('DROP EXTENSION IF EXISTS "postgis"');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
};