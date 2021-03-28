
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('hashs').del()
    .then(function () {
      // Inserts seed entries
      return knex('hashs').insert([
        {id: 1, hash: 'rowValue1'},
      ]);
    });
};
