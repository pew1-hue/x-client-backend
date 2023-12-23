import { logger } from '../libs/modules.js'
import crypto from 'crypto'

import Validate from '../libs/validate.js'
import Tools from '../libs/tools.js'
import Auth from '../libs/auth.js'
import { DB, ObjectId } from '../libs/db.js'
import RDB from '../libs/redisDB.js'

import config from '../configs/index.js'
import xError from '../libs/xError.js'

// services
import userService from '../services/userService.js'
import siteDomainService from '../services/siteDomainService.js'

const userController = {
    // @GET /v1/user/login
    async login(req, res) {
        const validateData = {
            id: {
                value: req.query.id ? req.query.id.toString().toLowerCase() : req.query.id,
                rule: {
                    required: true,
                    range: [2, 20]
                },
                message: {
                    required: {
                        en: 'Please enter an ID.',
                        ko: '아이디를 입력하세요.'
                    },
                    range: {
                        en: 'Please enter an ID consisting of 2 to 20 characters (letters and numbers).',
                        ko: '아이디는 2~20자(영문, 숫자)로 입력하세요.'
                    }
                }
            },
            password: {
                value: req.query.password,
                rule: {
                    required: true,
                    range: [4, 50]
                },
                message: {
                    required: {
                        en: 'Please enter a password.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    },
                    range: {
                        en: 'Please enter a password between 4 and 50 characters.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    }
                }
            }
        }

        // validate start
        let validate = new Validate()
        let v = validate.validate(validateData)

        if(v.error) {
            v.statusCode = 500
            v.errorTitle = {
                en: `Login Failed - ${v.statusCode}`,
                ko: `로그인 실패 - ${v.statusCode}`
            }

            res.status(v.statusCode).json(v)
            return
        }

        if(v.firstError) {
            v.statusCode = 400
            v.errorTitle = {
                en: `Login Failed - ${v.statusCode}`,
                ko: `로그인 실패 - ${v.statusCode}`
            }

            res.status(v.statusCode).json(v)
            return
        }

        v = Tools.generateReqValue(v.validates, req)
        // validate end

        try {
                // try login with id, password
                // 아이디, 비밀번호로 로그인 시도
                const rLogin = await userService.login(
                    v.id,
                    // Encrypted password
                    crypto.createHash('sha512').update(v.password).digest('base64'),
                )

                // Error Handling
                if(rLogin.error) {
                    throw new xError('login db error', {
                        v,
                        errorRule: 'db',
                        statusCode: 500,

                        errorTitle: {
                            en: 'Login Failed',
                            ko: '로그인 실패'
                        },
                        errorMessage: {
                            en: 'Database error',
                            ko: '데이터 베이스 에러'
                        },

                        errorTextForLogs: rLogin.error
                    })
                }

                // if id or password does not match
                // 만약 아이디 또는 비밀번호가 일치 하지 않는다면
                if(!rLogin.data) {
                    // 마스터 로그인 실패로그 남기기 (에러가 있더라도 무시한다)
                    // user login failed log (even if there is an error, ignore it)
                    // Without transaction
                    userService.loginLogs(
                        v.id,
                        '',
                        false,
                        {
                            en: 'id or password does not match.',
                            ko: '아이디 또는 비밀번호가 일치하지 않습니다.'
                        },
                        v.host,
                        v.ipaddress,
                        v.device,
                        v.phone
                    )

                    throw new xError('id or password does not match error', {
                        v,
                        errorRule: 'notMatch',
                        statusCode: 401,

                        errorTitle: {
                            en: 'Login Failed',
                            ko: '로그인 실패'
                        },
                        errorMessage: {
                            en: 'id or password does not match.',
                            ko: '아이디 또는 비밀번호가 일치하지 않습니다.'
                        },

                        errorTextForLogs: null
                    })
                }

                // if status is not 1
                // 만약 status 상태가 1이 아니라면
                if(rLogin.data.status !== 1) {
                    // user login failed log (even if there is an error, ignore it)
                    // 마스터 로그인 실패로그 남기기 (에러가 있더라도 무시한다)

                    // Without transaction
                    await userService.loginLogs(
                        v.id,
                        '',
                        false,
                        {
                            en: 'Your account is not in a valid state for login.',
                            ko: '아이디 상태가 정지 중입니다.'
                        },
                        v.host,
                        v.ipaddress,
                        v.device,
                        v.phone
                    )

                    throw new xError('user status error', {
                        v,
                        errorRule: 'status',
                        statusCode: 401,

                        errorTitle: {
                            en: 'Login Failed',
                            ko: '로그인 실패'
                        },
                        errorMessage: {
                            en: 'Your account is not in a valid state for login.',
                            ko: '아이디 상태가 정지 중입니다.'
                        },

                        errorTextForLogs: null
                    })
                }

                // login success
                // 로그인 성공
                // user login success log (even if there is an error, ignore it)
                // 마스터 로그인 실패로그 남기기 (에러가 있더라도 무시한다)

                // Without transaction
                await userService.loginLogs(
                    v.id,
                    rLogin.data.nick,
                    true,
                    {
                        en: 'Login Successful',
                        ko: '로그인 성공'
                    },
                    v.host,
                    v.ipaddress,
                    v.device,
                    v.phone
                )

                // create token
                // 토큰 생성
                const token = Auth.createToken({
                    _id: rLogin.data._id,
                    id: rLogin.data.id,
                    nick: rLogin.data.nick,
                })

                //update login info
                const rUpdateLoginInfo = await userService.updateLoginInfo(
                    new ObjectId(rLogin.data._id),
                    v.host,
                    v.ipaddress,
                    v.device,
                    v.phone,
                )

                if(rUpdateLoginInfo.error) {
                    throw new xError('login db error', {
                        v,
                        errorRule: 'db',
                        statusCode: 500,

                        errorTitle: {
                            en: 'Login Failed',
                            ko: '로그인 실패'
                        },
                        errorMessage: {
                            en: 'Database error',
                            ko: '데이터 베이스 에러'
                        },

                        errorTextForLogs: rLogin.error
                    })
                }
                
                // if allowDuplicateLogin of config is false then create dToken for duplicate login check
                const dToken = crypto.createHmac('sha512', config.jwtSecret).update(token).digest('base64')

                // set headers
                // 헤더 설정
                res.set('x-access-token', token)
                res.set('x-access-dtoken', dToken)

                //save user info to redis
                // Redis Section
                RDB.hmset(`userInfo:${rLogin.data.id}:${rLogin.data._id}`, {
                    _id: rLogin.data._id,
                    id: rLogin.data.id,
                    nick: rLogin.data.nick,
                    token: token,
                    dToken: dToken
                })

                res.json({
                result: null,
                messageTitle: {
                    en: 'Login Successful'
                },
                message: {
                    en: 'User login Sucess'
                }
                })

        } catch (error) {
            console.log(error)
            logger.error(error)

            // if xError instance
            // 만약 xError 인스턴스라면
            if(error instanceof xError) {
                const errorInfo = Tools.deepClone(error.errorInfo)
                const errorData = Tools.denyValidate(v, errorInfo.errorRule, errorInfo.statusCode, errorInfo.errorTitle, errorInfo.errorMessage)
                res.status(errorInfo.statusCode).json(errorData)
            }
            // else if general error
            // 그 외 일반 에러라면
            else {
                res.status(500).json({
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
    },
    // @POST /v1/user
    async createUser(req, res) {
        const validateData = {
            id: {
                value: req.body.id ? req.body.id.toString().toLowerCase() : req.body.id,
                rule: {
                    required: true,
                    range: [2, 20]
                },
                message: {
                    required: {
                        en: 'Please enter an ID.',
                        ko: '아이디를 입력하세요.'
                    },
                    range: {
                        en: 'Please enter an ID consisting of 2 to 20 characters (letters and numbers).',
                        ko: '아이디는 2~20자(영문, 숫자)로 입력하세요.'
                    }
                }
            },
            password: {
                value: req.body.password,
                rule: {
                    required: true,
                    range: [4, 50]
                },
                message: {
                    required: {
                        en: 'Please enter a password.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    },
                    range: {
                        en: 'Please enter a password between 4 and 50 characters.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    }
                }
            },
            passwordWithdraw: {
                value: req.body.passwordWithdraw,
                rule: {
                    required: true,
                    range: [4, 50]
                },
                message: {
                    required: {
                        en: 'Please enter a password Withdraw.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    },
                    range: {
                        en: 'Please enter a password between 4 and 50 characters.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    }
                }

            },
            nick: {
                value: req.body.nick ? req.body.nick.toString().toLowerCase() : req.body.nick,
                rule: {
                    required: true,
                    range: [1, 20]
                },
                message: {
                    required: {
                        en: 'Please enter a nick name.',
                        ko: '닉네임은 1~20자로 입력하세요.'
                    },
                    range: {
                        en: 'Please enter a nick name between 1 and 20 characters.',
                        ko: '닉네임은 1~20자로 입력하세요.'
                    }
                }
            },
            cell: {
                value: req.body.cell ? req.body.cell.toString() : req.body.cell,
                rule: {
                    required: true,
                    range: [11, 11]
                },
                message: {
                    required: {
                        en: 'Please enter a cellphone number.',
                        ko: '휴대폰번호를 입력해주세요.'
                    },
                    range: {
                        en: 'Please enter a cellphone number consist of 11 numbers.',
                        ko: '11자리 숫자로 구성된 휴대폰 번호를 입력하세요.'
                    }
                }

            },
            bank: {
                value: req.body.bank ? req.body.bank.toString().toLowerCase(): req.body.bank,
                rule: {
                    required: true,
                    range: [1, 20],
                },
                message: {
                    required: {
                        en: 'Please enter a type of bank',
                        ko: '은행 유형을 입력하세요.'
                    },
                    range: {
                        en: 'Please enter a type of bank between 1 and 20 characters.',
                        ko: '은행종류를 1~20자 이내로 입력해주세요.'
                    },
                }
            },
            bankAccount: {
                value: req.body.bankAccount ? req.body.bankAccount.toString().toLowerCase(): req.body.bankAccount,
                rule: {
                    required: true,
                    range: [1, 20]
                },
                message: {
                    required: {
                        en: 'Please enter a bank account.',
                        ko: '은행계좌를 입력해주세요.'
                    },
                    range: {
                        en: 'Please enter a bank account between 1 and 20 characters.',
                        ko: '은행 계좌를 1~20자 이내로 입력하세요.'
                    }
                }
            },
            bankHolder: {
                value: req.body.bankHolder ? req.body.bankHolder.toString().toLowerCase(): req.body.bankHolder,
                rule: {
                    required: true,
                    range: [1, 20]
                },
                message: {
                    required: {
                        en: 'Please enter a bank holder.',
                        ko: '은행주를 입력해주세요.'
                    },
                    range: {
                        en: 'Please enter a bank holder betweem 1 and 20 characters',
                        ko: '은행주를 1~20자 사이로 입력하세요.'
                    }
                }
            },
            domain: {
                value: req.body.domain,
                rule: {
                    trimUrl: true
                }
            }
            
        }
        
        // validate start
        let validate = new Validate()
        let v = validate.validate(validateData)

        if(v.error) {
            v.statusCode = 500
            v.errorTitle = {
                en: `Create user Failed - ${v.statusCode}`,
                ko: `마스터 생성 실패 - ${v.statusCode}`
            }

            res.status(v.statusCode).json(v)
            return
        }

        if(v.firstError) {
            v.statusCode = 400
            v.errorTitle = {
                en: `Create user Failed - ${v.statusCode}`,
                ko: `마스터 생성 실패 - ${v.statusCode}`
            }

            res.status(v.statusCode).json(v)
            return
        }

        v = Tools.generateReqValue(v.validates, req)
        // validate end

        // @@@ 트랜잭션 세션 시작
    
        try {
                // Check if the Users's ID and nickname exist in the database
                // 마스터의 아이디, 닉네임 이 디비에 존재하는지 체크
                const needCheckKey = ['id', 'nick']
                const needCheckValue = [v.id, v.nick]

                const rCheckDuplicate = await userService.checkDuplicate(needCheckKey, needCheckValue)
                if(rCheckDuplicate.error) {
                    throw new xError('checkDuplicate db error', {
                        v,
                        errorRule: 'db',
                        statusCode: 500,

                        errorTitle: {
                            en: 'Create user Failed',
                            ko: '마스터 생성 실패'
                        },
                        errorMessage: {
                            en: 'Database error',
                            ko: '데이터 베이스 에러'
                        },

                        errorTextForLogs: rCheckDuplicate.error
                    })
                }

                // if there is a duplicate ID or nickname
                // 만약에 중복된 아이디나 닉네임이 존재한다면
                if(rCheckDuplicate.data) {
                    let messageKo = ''
                    let messageEn = ''

                    if(rCheckDuplicate.data.id === v.id) {
                        messageEn = 'ID'
                        messageKo = '아이디'
                    }
                    else if(rCheckDuplicate.data.nick === v.nick) {
                        messageEn = 'Nick name'
                        messageKo = '닉네임'
                    }

                    throw new xError('checkDuplicate exist error', {
                        v,
                        errorRule: 'exist',
                        statusCode: 400,

                        errorTitle: {
                            en: 'Create user Failed',
                            ko: '마스터 생성 실패'
                        },
                        errorMessage: {
                            en: `${messageEn} already exists.`,
                            ko: `${messageKo}이(가) 이미 사용 중입니다.`
                        },

                        errorTextForLogs: null
                    })
                }

                const domain = req.headers.origin.replace(/(https?:\/\/)|(www\.)/g, '')
                const result = await siteDomainService.getDomain(domain)
                let siteOID = ''
                if(result.data.length <= 0){
                    v.statusCode = 400
                    v.errorTitle = {
                        en: `Create user Failed - ${v.statusCode}`,
                        ko: `마스터 생성 실패 - ${v.statusCode}`
                    }
        
                    res.status(v.statusCode).json(v)
                    return
                }else{
                    siteOID = result.data[0].siteOID
                }

                // Create user
                // 마스터 등록
                const rCreateUser = await userService.createUser(
                    v.id,
                    // Encrypted password
                    crypto.createHash('sha512').update(v.password).digest('base64'),
                    // original password
                    v.password,
                    //Encrypted passwordWithdraw
                    crypto.createHash('sha512').update(v.passwordWithdraw).digest('base64'),
                    v.passwordWithdraw,
                    v.nick,
                    v.cell,
                    v.bank,
                    v.bankAccount,
                    v.bankHolder,
                    siteOID,
                    domain
                )

                if(rCreateUser.error) {
                    throw new xError('createUser db error', {
                        v,
                        errorRule: 'db',
                        statusCode: 500,

                        errorTitle: {
                            en: 'Create user Failed',
                            ko: '마스터 생성 실패'
                        },
                        errorMessage: {
                            en: 'Database error',
                            ko: '데이터 베이스 에러'
                        },

                        errorTextForLogs: rCreateUser.error
                    })
                }

                res.json({
                    result: null,
                    messageTitle: {
                        en:'Create Success',
                        ko: '등록 성공.'
                    },
                    message: {
                        en: 'User created Success!',
                        ko: '관리자 등록 성공.'
                    }
                })

        } catch (error) {
            console.log(error)
            logger.error(error)

            // if xError instance
            // 만약 xError 인스턴스라면
            if (error instanceof xError) {
                const errorInfo = Tools.deepClone(error.errorInfo)
                const errorData = Tools.denyValidate(v, errorInfo.errorRule, errorInfo.statusCode, errorInfo.errorTitle, errorInfo.errorMessage)
                res.status(errorInfo.statusCode).json(errorData)
            }
            // else if general error
            // 그 외 일반 에러라면
            else {
                res.status(500).end({
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
    },
    async updateUser(req, res) {
        const validateData = {
            password: {
                value: req.body.password,
                rule: {
                    range: req.body.password ? [4, 50] : false
                },
                message: {
                    range: {
                        en: 'Please enter a password between 4 and 50 characters.',
                        ko: '비밀번호는 4~50자로 입력하세요.'
                    }
                }
            },
            nick: {
                value: req.body.nick ? req.body.nick.toString().toLowerCase() : req.body.nick,
                rule: {
                    required: req.body.nick ? true : false,
                    range: req.body.nick ? [1, 20] : false
                },
                message: {
                    range: {
                        en: 'Please enter a nick name between 1 and 20 characters.',
                        ko: '닉네임은 1~20자로 입력하세요.'
                    }
                }
            }
        }

        //validate start
        let validate = new Validate()
        let v = validate.validate(validateData)

        if(v.error) {
            v.statusCode = 500
            v.errorTitle = {
                en: `Update user Failed - ${v.statusCode}`,
                ko: `마스터 생성 실패 - ${v.statusCode}`
            }

            res.status(v.statusCode).json(v)
            return
        }


        v = Tools.generateReqValue(v.validates, req)

        //validate end
    
        try{
            //transaction block
          
                //Create User
                const rUpdateUser = await userService.updateUser(
                    new ObjectId(req.params.userOID),
                    //Encrypted password
                    crypto.createHash('sha512').update(v.password).digest('base64'),
                    //original passowrd
                    v.password,
                    v.nick,
                )

                //Error Handling
                if(rUpdateUser.error) {
                    throw new xError('updateUser db error', {
                        v,
                        errorRule: 'db',
                        statusCode: 500,

                        errorTitle: {
                            en: 'Create master Failed',
                            ko: '마스터 생성 실패'
                        },
                        errorMessage: {
                            en: 'Database error',
                            ko: '데이터 베이스 에러'
                        },

                        errorTextForLogs: rUpdateUser.error
                    })
                }

                res.json({
                    userInfo: req.decoded
                })
        } catch (error) {
            console.log(error)
            logger.error(error)

            //if xError instance
            if(error instanceof xError) {
                const errorInfo = Tools.deepClone(error.errorInfo)
                const errorData = Tools.denyValidate(v, errorInfo.errorRule, errorInfo.statusCode, errorInfo.errorTitle, errorInfo.errorMessage)
                res.status(errorInfo.statusCode).json(errorData)
            }
            // else if general error
            // 그 외 일반 에러라면
            else {
                res.status(500).end({
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

export default userController