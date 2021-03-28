// load the things we need
const Datastore = require('nedb');
const nedbPromises = require('./nedb-promises.js.js.js')
const users = nedbPromises(new Datastore({ filename: './nedb-users.json', autoload: true }))

var bcrypt   = require('bcrypt-nodejs');

class User {
    constructor(profile) {
        this.points = 0
        //email,password
        this.local = {}
        //id,email
        this.twitch = {}
        //id,token,name,email
        this.facebook = {}
        //id,token,name,email
        this.google = {}
        //id,token,displayName,username
        this.twitter = {}
        Object.assign(this,profile)
    }
    static find(...args) {
        return nedbPromises.find(...args)
    }
    static findOne(query) {
        return nedbPromises.findOne(query)
    }
    save(callback) {
        nedbPromises.update( { 'this.local.email': this.local.email },JSON.parse(JSON.stringify(this)),{ upsert: true },callback)
    }
    static generateHash(password) {
        return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
    }
    
    validPassword(password) {
        return bcrypt.compareSync(password, this.local.password);
    }
    
}

//User.find({},(err,done)=>console.log(done))

//User.findOne({'local.email': 'test@test.de'}).then(console.log)
// create the model for users and expose it to our app
module.exports = User;