
import fs from 'fs';
import pino from 'pino';

import console from 'console';
const { Console } = console;

const _console = new Console({stdout: process.stdout, stderr: process.stderr});
const _logConsole = pino({
    name: "console_logger",
    base: null,
    timestamp: pino.stdTimeFunctions.isoTime,
    prettyPrint: {colorize: true}
});
//dev only , const pinoCaller = require('pino-caller')(pino)
//npm install pino-caller


//var serializers = require('pino-std-serializers')
//var URL = require('fast-url-parser')
//require("fast-url-parser").replace();

import Promise from 'bluebird';

let fileTime = new Date().toISOString();
const useTimeInFileName = false;
if (useTimeInFileName) {
    fileTime = fileTime.slice(0, -1).split(".")[0];
    fileTime = fileTime.replace(/-/g, '').replace('T', '_').replace(/:/g, '');
}
const logFilename = useTimeInFileName ? ('./' + fileTime + '.log') : './cron.log';

if (fs.existsSync(logFilename)) {
    try {
        fs.unlinkSync(logFilename);
    } catch (err) {
        console.error(err);
    }
}

const _logFile = pino({
    name: "file_logger",
    base: null,
    timestamp: pino.stdTimeFunctions.isoTime,
    prettyPrint: {colorize: false}
}, pino.destination({
    dest: logFilename, // omit for stdout
    //
    //if sync: minLength: 0, sync: true
    minLength: 4096, // Buffer before writing
    sync: false // Asynchronous logging
}));


setInterval(function () {
// asynchronously flush every 10 seconds to keep the buffer empty
// in periods of low activity
    _logFile.flush();
}, 1 * 1000).unref();//10sec default

const handler = pino.final(_logFile, (err, finalLogger, evt) => {
// use pino.final to create a special logger that
// guarantees final tick writes
    _logConsole.info(`${evt} caught`);
    finalLogger.info(`${evt} caught`);
    //final logger make async log dest as sync , flush on every write
    if (err) {
        _logConsole.error(err, 'error caused exit');
        finalLogger.error(err, 'error caused exit');
    }
    try {
        _logFile.flush();
    }catch{}
    process.exit(err ? 1 : 0);
});

// catch all the ways node might exit
process.on('beforeExit', () => handler(null, 'beforeExit'));
process.on('exit', () => handler(null, 'exit'));
process.on('uncaughtException', (err) => handler(err, 'uncaughtException'));
process.on('SIGINT', () => handler(null, 'SIGINT'));
process.on('SIGQUIT', () => handler(null, 'SIGQUIT'));
process.on('SIGTERM', () => handler(null, 'SIGTERM'));


function overrideConsole() {
    console.trace = (msg) => {
        //_console.trace(msg);
        _logConsole.trace(msg);
        _logFile.trace(msg);
    };
    console.debug = (msg) => {
        //_console.debug(msg);
        _logConsole.debug(msg);
        _logFile.debug(msg);
    };
    console.log = (msg) => {
        //_console.log(msg);
        _logConsole.info(msg);
        _logFile.info(msg);
    };
    console.info = (msg) => {
        //_console.info(msg);
        _logConsole.info(msg);
        _logFile.info(msg);
    };
    console.warn = (msg) => {
        //_console.warn(msg);
        _logConsole.warn(msg);
        _logFile.warn(msg);
    };
    console.error = (msg) => {
        //_console.error(msg);
        _logConsole.error(msg);
        _logFile.error(msg);
    };
    //https://techsparx.com/nodejs/howto/console.log.html
}

//overrideConsole();

const api = {
    overrideConsole:overrideConsole,
    // trace: (msg) => {//hidden
    //     _logConsole.trace(msg);
    //     _logFile.trace(msg);
    // },
    // debug: (msg) => {//hidden
    //     _logConsole.debug(msg);
    //     _logFile.debug(msg);
    // },
    // info: (msg) => {
    //     _logConsole.info(msg);
    //     _logFile.info(msg);
    // },
    // warn: (msg) => {
    //     _logConsole.warn(msg);
    //     _logFile.warn(msg);
    // },
    // error: (msg) => {
    //     _logConsole.error(msg);
    //     _logFile.error(msg);
    // },
    fatal: (msg) => {//sync
        _logConsole.fatal(msg);
        _logFile.fatal(msg);
//        process.exit(1);
    }
};

export {overrideConsole};