const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${JSON.stringify(meta)}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(timestamp(), myFormat),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// Middleware function to log each request
function logRequest(req, res, next) {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip, user: req.student?.studentId });
    next();
}

module.exports = logRequest;