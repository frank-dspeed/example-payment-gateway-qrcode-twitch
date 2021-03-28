const fsPromises = require('fs').promises;
const assert = require('assert');
const log = console.log // () => { return; }

const readJSON = filePath => fsPromises.readFile(filePath).then(JSON.parse);
const writeJSON = (filePath, content )=> {
    log('writeJSON =>',filePath,content)
    return fsPromises.writeFile(filePath,JSON.stringify(content,0,2)).then(()=>content)
};

const DBModel = {
    // mail, points, twitch, google,
    User: {
        async find(user) {
            log('User.find', user)
            const { mail } = user;
            assert(mail,'User.find({ mail }) got no mail property')
            return readJSON(`${__dirname}/USERS/${mail}.json`);
        },
        /**
         * This Method Updates the Current DB user without passing
         * All User Filds.
         * @param {*} user 
         * @returns 
         */
        async assign(user) {
            log('User.assign',user);
            return DBModel.User.find(user)
                .then(currentUser=>Object.assign(currentUser, user ))
                .then(updatedUser=>writeJSON(`${__dirname}/USERS/${user.mail}.json`,updatedUser));
        },
        async modifyPoints({ mail }, amount) {
            log('modifyPoints', mail, amount);
            return DBModel.User.find({ mail }).then(currentUser=>{
                currentUser.points += amount;
                return DBModel.User.assign(currentUser);
            })
            
        },
        async findOrCreate(user) {
            log('findOrCreate',user);
            return DBModel.User.find(user).catch(err=>{
                if (err.code === 'ENOENT') {
                    log('insideCreate',err)
                    if (!user.points) {
                        user.points = 0;
                    }
                    return writeJSON(`${__dirname}/USERS/${user.mail}.json`,user);
                }
                log('insideCreate');
                return Promise.reject(err)
            })
            
        }    
    },
    Code: {
        // points, email,
        async read(code) {
            console.log('Code.read', code)
            return readJSON(`${__dirname}/CODES/${code}.json`);
        },
        async write({ code, points, mail }) {
            if (!code || !points) {
                return Promise.reject('Code.write({ code, points }) code or points missing')
            }
            return writeJSON(`${__dirname}/CODES/${code}.json`,{ points, mail });
        },
        /**
         * Transactional Method to Reedem Code.
         * @param {*} user { mail, points }
         * @param {*} code { mail, points }
         * @returns {Promise<Number|void>} The New Points Value of the User
         */
        async redeem({mail,code}) {
            const codeNotRedeemAble = currentCode => (!currentCode || currentCode.mail);
            // Load the Code if it exists
            DBModel.Code.read(code)
                .then(currentCode=>
                    // Check if the code is redeemable
                    codeNotRedeemAble(currentCode) 
                        ? Promise.reject('Not Reedemable') 
                        // add the points from the code => user.points
                        : DBModel.User.modifyPoints({ mail }, currentCode.points)
                            .then(modifyedUser => {
                                currentCode.mail = mail;
                                currentCode.code = code;
                                console.log(' => ', modifyedUser)
                                // add the users email to the code
                                return DBModel.Code.write(currentCode)
                                    .then(() => modifyedUser.points)
                                    .catch(err=> {
                                        //unroll prev changes and return void
                                        log('Err in CodeWrite after UserModify',err)
                                        DBModel.User.modifyPoints({ mail }, parseInt(`-${currentCode.points}`))
                                    });
                            })
                );
        },
        async findOrCreate(code,points) {
            return DBModel.Code.read(code).catch(err=>{
                if (err.code === 'ENOENT') {
                    return DBModel.Code.write({code, points })
                }
            });
        },    
        async create(code,points) {
            return DBModel.Code.write({ code, points })
        }    
    }
}
module.exports = DBModel;