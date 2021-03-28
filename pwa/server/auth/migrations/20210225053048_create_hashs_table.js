exports.up = function(knex, Promise) {
    return knex.schema.createTable('hashs', function(table) {
      table.increments();
      table.string('hash').notNullable();
      table.integer('points').notNullable().defaultTo(1);
      table.boolean('valid').notNullable().defaultTo(false);
      table.integer('user_id').references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
  }
  
  exports.down = function(knex, Promise) {
    return knex.schema.dropTable('hashs');
  }