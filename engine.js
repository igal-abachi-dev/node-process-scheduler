import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs';

Promise.promisifyAll(fs);
import path from 'path';
import {fileURLToPath} from 'url';
import DateTime from 'luxon';
import LinkedList from 'mnemonist/linked-list.js';
import EventEmitter from 'eventemitter3';

import {spawn} from 'child_process';

/* difference is .
execFile() runs the executable until it exits or terminates,
then returns a buffer for data on stdout or stderr with a maximum size of 200Kb.

 spawn() can stream stdout or stderr back to the parent process once it starts running,
 and there is no limit to the size of data it can return.*/

function createProcess(cmd, args) {
    const proc = {
        emitter: new EventEmitter(),
        cmd: cmd,
        args: (args || []),
        isRunning: false,
        output: [],
        start: null,
        kill: () => {
        }
    };
    proc.start = () => spawnAsync(proc);
    return proc;
}

const spawnAsync = async function (proc) {
    const _proc = proc;
    return new Promise(function (resolve, reject) {
        if (_proc.isRunning) return;

        const procName = `[${_proc.cmd}${_proc.args.length == 0 ? "" : " " + _proc.args[0]}]`;
        console.log(`starting ${procName}...`);
        const childProc = spawn(_proc.cmd, _proc.args); //can hang if av/voodooshield config cmd run from user
        _.assign(_proc, {
            isRunning: true,
            kill: childProc.kill
        });
        //if windows os , use logic similar to: ShellExec_Win32Simulator.cs ?

        _proc.emitter.on("data", data => {
            _.assign(_proc, {
                output: _proc.output.concat([data.toString()])
            });
        });
        childProc.stdout.on("data", data => {
            //_proc.emitter.emit("data", data)
        });
        childProc.stderr.on("data", data => {
            _proc.emitter.emit("data", data);
        });

        childProc.on('error', (err) => {
            _.assign(_proc, {
                isRunning: false,
                kill: () => {
                }
            });
            console.error(`Failed to start: ${procName}`);
            reject(-1);
        });

        childProc.on("close", (exitCode, signal) => {
            if(!_proc.isRunning) return;// on error() happened before close
            _.assign(_proc, {
                isRunning: false,
                kill: () => {
                }
            });


            const wasNormalExit = (typeof exitCode === 'number' && isFinite(exitCode) && !isNaN(exitCode)
                && exitCode >= 0 && exitCode < 256)
                || !(signal === null || signal === void 0);

            const rejectNoneZero = false; //if (code !== 0)
            if (wasNormalExit) {
                if (exitCode === 0) {
                    console.log(`${procName} exited successfully!`);
                } else {
                    console.log(`${procName} exited with code: ${exitCode}`);
                    if (rejectNoneZero) {
                        reject(-1)
                        return;
                    }
                }
                //
                resolve(exitCode);
            } else {
                console.log(`${procName} had unexpected failure!!!`);
                //
                reject(-1);
            }
        });
    });
}

//https://github.com/CircleOfNice/CoreWorker/blob/master/src/NodeProcess.js

async function execNodeApp(jsFile, args) {

    let cwd = undefined;
    if (jsFile.indexOf('/') == -1) {
        jsFile = "./" + jsFile;
    } else {
        cwd = path.dirname(jsFile);
    }
    const _proc = createProcess('node', [jsFile].concat(args || []), {cwd: cwd});//don't put spaces in args
    const exitCode = await _proc.start();
    return exitCode == 0;
}

const execApp = async function (cmd, args) {
    const _proc = createProcess(cmd, args || []);
    const exitCode = await _proc.start();
    return exitCode == 0;
}


const sleep = async function (ms) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, ms);
    });
}


const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readJobs() {
    let jobs = [];
//    ESM is not node-specific, and node-specific "globals" (such as __dirname and module) will not work.
    //require('path').resolve(__dirname, '..')
    const jobsFile = path.join(__dirname, 'jobs.json');
    if (fs.existsSync(jobsFile)) {
        try {
            jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf-8'));
        } catch (err) {
            console.error(err)
        }
    }
    return LinkedList.from(jobs);

//LinkedList.from([1, 2, 3]);
//var list = new LinkedList();
//var item =list.shift();
//list.push(item); jobs;
}


export {
    readJobs,
    execApp,
    execNodeApp,
    sleep
};
