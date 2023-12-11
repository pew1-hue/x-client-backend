import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import moment from 'moment'
import ip from 'ip'
import NodeCache from 'node-cache'
const cache = new NodeCache()

const customFormat = winston.format.printf(({ level, message, stack }) => {
    return `{'dateTime':'${moment().format('YYYY-MM-DD HH:mm:ss')}','level':'${level}','message':'${message}','stack':'${stack || ''}'}`;
})

const transport = new DailyRotateFile({
    filename: 'logs/system-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d'
})

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.errors({ stack: true }), // 스택 정보 포함
        winston.format.json(),
        customFormat
    ),
    transports: [
        transport
    ]
})

export { logger, moment, ip, cache }