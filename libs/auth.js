import jwt from 'jsonwebtoken'

import { logger, cache } from '../libs/modules.js'
import Tools from '../libs/tools.js'
import config from '../configs/index.js'
import xError from '../libs/xError.js'
import { DB, ObjectId } from '../libs/db.js'
import RDB from '../libs/redisDB.js'
import userService from '../services/userService.js'

class Auth {
    static createToken(obj) {
        return jwt.sign(obj, config.jwtSecret, { expiresIn: config.expiresIn })
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, config.jwtSecret)
        } catch (error) {
            return false
        }
    }

    static async authAndGetInfo(req, res, next) {
        
        // @@@ 트랜잭션 세션 시작
        try {
            
                const token = req.headers['x-access-token']
                const dToken = req.headers['x-access-dtoken']

                // console.log(token)
                // console.log(dToken)

                if(!token) {
                    throw new xError('authAndGetInfo error', {
                        v: {},
                        errorRule: 'auth',
                        statusCode: 401,

                        errorTitle: {
                            en: 'Authentication failed',
                            ko: '인증 실패'
                        },
                        errorMessage: {
                            en: 'Token is not exist',
                            ko: '토큰이 없습니다.'
                        },

                        errorTextForLogs: null

                    }) 
                }

                // config의 allowDuplicateLogin가 false일 경우만 중복 로그인 방지를 위한 dToken 검증
                // if allowDuplicateLogin of config is false then verify dToken for prevent duplicate login
                if(config.allowDuplicateLogin === false) {
                    if(!dToken) {
                        throw new xError('authAndGetInfo error', {
                            v: {},
                            errorRule: 'auth',
                            statusCode: 401,

                            errorTitle: {
                                en: 'Authentication failed',
                                ko: '인증 실패'
                            },
                            errorMessage: {
                                en: 'Token is not exist',
                                ko: '토큰이 없습니다.'
                            },

                            errorTextForLogs: null
                        })
                    }
                }

                // token 검증
                // verify token
                const decoded = Auth.verifyToken(token)
                if(decoded === false) {
                    throw new xError('Token authentication error', {
                        v: {},
                        errorRule: 'auth',
                        statusCode: 401,

                        errorTitle: {
                            en: 'Token authentication failed',
                            ko: '토큰 인증 실패'
                        },
                        errorMessage: {
                            en: 'Token authentication has failed',
                            ko: '토큰 인증이 실패하였습니다.'
                        },

                        errorTextForLogs: null
                    })
                }
                // req.decoded = decoded

                // if allowDuplicateLogin of config is false then verify dToken for prevent duplicate login
                if(config.allowDuplicateLogin === false){
                    // Redis Section
                    const dTokenFromCRedis = await RDB.hget(`userInfo:${decoded.id}:${decoded._id}`, 'dToken')


                    //Error Handling
                    if(dToken !== dTokenFromCRedis) {
                        throw new xError('authAndGetInfo error', {
                            v: {},
                            errorRule: 'auth',
                            statusCode: 401,

                            errorTitle: {
                                en: 'Authentication failed',
                                ko: '인증 실패'
                            },
                            errorMessage: {
                                en: 'dToken Authentication failed',
                                ko: 'dToken 인증 실패'
                            },

                            errorTextForLogs: null
                        })
                    }
                }

                const genReqValue = Tools.generateReqValue({}, req)

                //if status of user in db is 1 then update
                const rUpdateLastAccessAndGetInfo = await userService.updateLastAccessAndGetInfo(new ObjectId(decoded._id), genReqValue.host, genReqValue.ipaddress, genReqValue.device, genReqValue.phone)
                if(rUpdateLastAccessAndGetInfo.data === null) {
                    throw new xError('authAndGetInfo error', {
                        v: {},
                        errorRule: 'auth',
                        statusCode: 401,

                        errorTitle: {
                            en: 'Authentication failed',
                            ko: '인증 실패'
                        },
                        errorMessage: {
                            en: 'Information Authentication failed',
                            ko: '정보 인증 실패'
                        },

                        errorTextForLogs: null
                    })
                }

                req.decoded = Tools.deepClone(rUpdateLastAccessAndGetInfo.data)

                // regenerate token(update expiration date)
                // 토큰 재 생성(만료일 업데이트)
                const newToken = Auth.createToken({
                    _id: rUpdateLastAccessAndGetInfo.data._id,
                    id: rUpdateLastAccessAndGetInfo.data.id,
                    nick: rUpdateLastAccessAndGetInfo.data.nick,
                })

                res.set('x-access-token', newToken)
                res.set('x-access-dtoken', dToken)
                
                // console.log('=====================')
                // console.log(req.decoded)
                // console.log(req.userInfo)
                // console.log('=====================')
                next()
        } catch (error) {
            logger.error(error)

            // if xError instance
            // 만약 xError 인스턴스라면
            if(error instanceof xError) {
                const errorInfo = Tools.deepClone(error.errorInfo)
                const errorData = Tools.denyValidate({}, errorInfo.errorRule, errorInfo.statusCode, errorInfo.errorTitle, errorInfo.errorMessage)

                // 미들 웨어이기 때문에 return 을 써야 한다
                // it is a middleware so you have to use return
                return res.status(errorInfo.statusCode).json(errorData)
            }
            // else if general error
            // 그 외 일반 에러라면
            else {
                // 미들 웨어이기 때문에 return 을 써야 한다
                // it is a middleware so you have to use return
                return res.status(500).json({
                    statusCode: 500,
                    errorTitle: {
                        en: 'Unknown Error',
                        ko: '알 수 없는 에러'
                    },
                    errorMessage: {
                        en: 'Please contact the administrator.',
                        ko: '관리자에게 문의 하세요.'
                    }
                })
            }
        }
    }
}

export default Auth