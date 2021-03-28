// Overwrites existing Sample Data
const DB = require('./DB/db.js');
let serialPromise = Promise.resolve()
const addSerial = p => serialPromise = serialPromise.then(()=>p)


    addSerial(DB.User.findOrCreate({ mail: 'testmail@test.de' })
    .then(console.log)
    .catch(x=>console.log('LOG',x)));

    // Expected Error wrong mail fild
    addSerial(DB.User.findOrCreate({ smail: 'testmail@test.de' })
        .then(console.log)
        .catch(x=>console.log('LOG',x)));

    addSerial(DB.Code.create('xxx2x',20))
    addSerial(DB.Code.redeem({ mail: 'testmail@test.de', code: 'xxx2x'})
        .then(x=>console.log('Now Havving',x)));

    addSerial(DB.Code.redeem({ mail: 'testmail@test.de', code: 'xxxx'})
        .then(x=>console.log('Now Havving',x)));



serialPromise.then(console.log);





