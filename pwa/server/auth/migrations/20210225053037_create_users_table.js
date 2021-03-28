exports.up = function(knex, Promise) {
    return knex.schema.createTable('users', function(table) {
      table.increments();
      table.string('email').notNullable();
      table.string('password').notNullable();
      table.integer('points').notNullable().defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now())
      table.timestamp('updated_at').defaultTo(knex.fn.now())
    })
  }
  
  exports.down = function(knex, Promise) {
    return knex.schema.dropTable('users');
  }