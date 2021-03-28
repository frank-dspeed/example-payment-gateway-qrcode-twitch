
exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('users').del()
    .then(function () {
      // Inserts seed entries
      return knex('users').insert([
        { id: 1, email: 'frank+opensource@dspeed.eu',password: '1234' },
      ]);
    });
};
