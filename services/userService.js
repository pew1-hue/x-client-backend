import Validate from '../libs/validate.js'
import Tools from '../libs/tools.js'
import { DB, ObjectId } from '../libs/db.js'

const userService = {
    login(id, password) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const findQuery = {
                    id,
                    password
                }

                const whatQuery = {
                    projection: {
                        id: 1,
                        nick: 1,
                        status: 1
                    }
                }

                const pool = await DB.connect()
                // console.log(findQuery)
                r.data = await pool.collection('users').findOne(findQuery, whatQuery)
                // console.log(r.data)
                resolve(r)
            } catch (err) {
                r.error = err
                resolve(r)
            }
        })
    },
    loginLogs(id, nick, status, reason, host, ipaddress, device, phone) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const insertQuery = {
                    id,
                    nick,
                    status,
                    reason,
                    host,
                    ipaddress,
                    device,
                    phone,
                    createdAt: new Date()
                }

                // console.log(insertQuery)
                // console.log(optionQuery)

                const pool = await DB.connect()
                r.data = await pool.collection('userLoginLogs').insertOne(insertQuery)

                resolve(r)
            } catch (err) {
                console.log(err)
                r.error = err
                resolve(r)
            }
        })
    },
    checkDuplicate(keys, values) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                let findQuery = {
                    $or: []
                }

                for(let i = 0; i < keys.length; i++) {
                    const element = keys[i]
                    findQuery.$or.push({ [element]: values[i] })
                }

                let whatQuery = {
                    projection: {  }
                }

                for (let i = 0; i < keys.length; i++) {
                    const element = keys[i]
                    whatQuery.projection[element] = 1
                }

                const pool = await DB.connect()
                r.data = await pool.collection('users').findOne(findQuery, whatQuery)

                resolve(r)
            } catch (err) {
                r.error = err
                resolve(r)
            }
        })
    },
    createUser(
        id,
        // Encrypted password
        password,
        // original password
        originalPassword,
        // Encrypted passwordWithdraw
        passwordWithdraw,
        // original passwordWithdraw
        originalPasswordWithdraw,
        nick,
        cell,
        bank,
        bankAccount,
        bankHolder,) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const insertQuery = {
                    id,
                    password,
                    originalPassword,
                    passwordWithdraw,
                    originalPasswordWithdraw,
                    nick,
                    cell,
                    bank,
                    bankAccount,
                    bankHolder,
                    status: 0,
                    lastLoginHost: null,
                    lastLoginIpaddress: null,
                    lastLoginDevice: null,
                    lastAccessPhone: null,
                    lastLoginDateTime: null,
                    lastAccessHost: null,
                    lastAccessIpaddress: null,
                    lastAccessDevice: null,
                    lastAccessPhone: null,
                    lastAccessDateTime: null,
                    createdAt: new Date(),
                    updatedAt: null
                }

                const pool = await DB.connect()
                r.data = await pool.collection('users').insertOne(insertQuery)

                resolve(r)
            } catch (err) {
                
                r.error = err
                resolve(r)
            }
        })
    },
    updateUser(
        userOID,
        //Encrypted password
        password,
        //original password,
        nick
        ){

        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0}

            try{
                const findQuery = {
                    _id: userOID
                }

                let setQuery = {
                    $set: {
                        password,
                        originalPassword,
                        nick,
                        updateAt: new Date()
                    }
                }

                // console.log('setQuery', setQuery)

                // if(Tools.isEmpty(setQuery.$set.originalPassword)) {
                //     delete setQuery.$set.originalPassword
                //     delete setQuery.$set.password
                // }

                // if(Tools.isEmpty(setQuery.$set.nick)){
                //     delete setQuery.$set.nick
                // }

                const pool = await DB.connect()
                r.data = await pool.collection('users').updateOne(findQuery, setQuery)

                resolve(r)
            } catch (err) {
              
                r.error = err
                resolve(r)
            }
        })

    },
    updateLoginInfo (
        userOID,
        host,
        ipaddress,
        device,
        phone,) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const findQuery = {
                    _id: userOID
                }

                const setQuery = {
                    $set: {
                        lastLoginHost: host,
                        lastLoginIpaddress: ipaddress,
                        lastLoginDevice: device,
                        lastAccessPhone: phone,
                        lastLoginDateTime: new Date()
                    }
                }

                const pool = await DB.connect()
                r.data = await pool.collection('users').updateOne(findQuery, setQuery)

                resolve(r)
            } catch (err) {
                r.error = err
                resolve(r)
            }

           
        })

    },
    updateLastAccessAndGetInfo(
        userOID,
        host,
        ipaddress,
        device,
        phone) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const findQuery = {
                    _id: userOID,
                    status: 1
                }

                const setQuery = {
                    $set: {
                        lastAccessHost: host,
                        lastAccessIpaddress: ipaddress,
                        lastAccessDevice: device,
                        lastAccessPhone: phone,
                        lastAccessDateTime: new Date()
                    }
                }

                const whatQuery = {
                    projection: {
                        id: 1,
                        nick: 1
                    }
                }

                const optionQuery = {
                    projection: whatQuery.projection,
                    returnDocument: 'after',
                }
                
                const pool = await DB.connect()
                r.data = await pool.collection('users').findOneAndUpdate(findQuery, setQuery, optionQuery)

                resolve(r)

            } catch (err) {
                r.error = err
                resolve(r)
            }
        })

    },

    updateToken(
        userOID,
        token,
        dToken) {
        return new Promise(async (resolve) => {
            const r = { error: null, data: null, count: 0 }

            try {
                const findQuery = {
                    _id: userOID
                }

                const setQuery = {
                    $set: {
                        token,
                        dToken,
                        updatedAt: new Date()
                    }
                }

                const pool = await DB.connect()
                r.data = await pool.collection('users').updateOne(findQuery, setQuery)

                resolve(r)
            } catch (err) {
                r.error = err
                resolve(r)
            }
        })
    }
}

export default userService