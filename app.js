import {
    readJobs,
    execApp,
    execNodeApp,
    sleep
} from './engine.js';

import {overrideConsole} from './log.js';

import path from 'path';
import _ from 'lodash';
import EventEmitter from 'eventemitter3';

import luxon from 'luxon';

const {DateTime, Settings} = luxon; //npm install --save-dev @types/luxon
Settings.defaultLocale = "en";//he
Settings.defaultZoneName = "utc";//times in json are utc too

overrideConsole();

let jobs = readJobs();

//console.log(DateTime.utc().toISO());

function timeByHour(time) {
    if (time == null || time.length < 3 || time.indexOf(':') == -1) {
        return null;
    }
    if (time.length != 5) {
        let timeParts = time.split(':');//0-24 , 0-60
        time = `${_.padStart(timeParts[0], 2, '0')}:${_.padStart(timeParts[1], 2, '0')}`;
        //Padding characters are truncated if they exceed length.
    }
    const dt = DateTime.fromISO(time);

    if (!dt.isValid) return null;
    return dt;
}

const _runLog = {
//id:Expiration from Utc
}

function shouldExecuteScheduledJob(id, jobTime, utc) {
    if (jobTime == null || utc == null) return false;
    const range = Math.abs(utc.diff(jobTime, 'seconds').seconds);
    console.log(`Job [${id}] Scheduled to run @ ` + jobTime.toString());
    if (range >= 60) {
        //soft time range: +-60sec
        console.log(`Job [${id}] is outside scheduled time range: ` + range);
        return false;
    }
    if (_runLog[id] != null) {
        const secTillCanRunThisJobAgain = _runLog[id].diff(utc, 'seconds').seconds;
        if (secTillCanRunThisJobAgain > 0) {
            return false;//already ran as scheduled
        }
        _runLog[id] = null;
    }
    _runLog[id] = jobTime.plus({seconds: 61});
    return true;

}

async function runJobsLoop() {
    const utc = DateTime.utc();
    for (let i = 0; i < jobs.size; i++) {
        const job = jobs.shift();
        //
        const times = ((job || {}).time || [null]);
        for (let j = 0; j < times.length; j++) {
            const jobTime = timeByHour(times[j]);
            const jobId = (i + 1);

            if (shouldExecuteScheduledJob(jobId, jobTime, utc)) {
                //dont wait job to end, keep looping for next jobs
                execJob((job || {})).then(() => {
                    console.log(`Job ${jobId}: Execution Ended.`)
                });
            }
        }
        jobs.push(job);
    }
    await sleep(2 * 60 * 1000);
    setTimeout(runJobsLoop, 1);
}

async function execJob(job) {
    try {
        const args = (job.args || "").split(' ');
        if (path.extname(job.cmd.toUpperCase()) == ".JS") {
            await execNodeApp(job.cmd, args);
        } else {
            await execApp(job.cmd, args);
        }
    } catch (e) {
        console.error(e)
    }
}

//# Main timer loop #:
runJobsLoop();


//hrtime

//pm2

//ts



class EE extends EventEmitter {
    /*
            *   let eventArgs = {
                    id: playlistId,
                    playlist: this.listInfo[playlistId],
                    videos: this.listData[playlistId]
                } as playlistLoadedEvtArgs;

                this.EE.emit('playlist-loaded', eventArgs);
                *
                *
    */

    fireEvent(eventName, eventArgs) {
        if (eventName) {
            this.emit(eventName, eventArgs);
        }
    }


    subscribeEvent(eventName, callback, ctx = null) {
        if (eventName == null || callback == null) {
            return;
        }
        this.on(eventName, callback, ctx || this);
    }
}

class ScheduledTask extends EE {
    constructor(cronExpression, func, options) {
        super();
        if (!options) {
            options = {
                scheduled: true,
                recoverMissedExecutions: false
            };
        }
        let task = new Task(func);
        let scheduler = new Scheduler(cronExpression, options.timezone, options.recoverMissedExecutions);

        scheduler.subscribeEvent('scheduled-time-matched', (now) => {
            let result = task.execute(now);
            this.fireEvent('task-done', result);
        });

        if (options.scheduled !== false) {
            scheduler.start();
        }

        this.start = () => {
            scheduler.start();
        };

        this.stop = () => {
            scheduler.stop();
        };
    }
}

class Scheduler extends EE {
    constructor(pattern, timezone, autorecover) {
        super();
        this.timeMatcher = new TimeMatcher(pattern, timezone);
        this.autorecover = autorecover;
    }

    start() {
        // clear timeout if exsits
        this.stop();

        let lastCheck = process.hrtime();
        let lastExecution = new Date();

        var matchTime = () => {
            const delay = 1000;
            const elapsedTime = process.hrtime(lastCheck);
            const elapsedMs = (elapsedTime[0] * 1e9 + elapsedTime[1]) / 1e6;
            const missedExecutions = Math.floor(elapsedMs / 1000);

            for (let i = missedExecutions; i >= 0; i--) {
                var date = new Date(new Date().getTime() - i * 1000);
                if (lastExecution.getTime() < date.getTime() && (i === 0 || this.autorecover) && this.timeMatcher.match(date)) {
                    this.fireEvent('scheduled-time-matched', date);
                    date.setMilliseconds(0);
                    lastExecution = date;
                }
            }
            lastCheck = process.hrtime();
            this.timeout = setTimeout(matchTime, delay);
        };
        matchTime();
    }
}

class Task extends EE {
    constructor(execution) {
        super();
        if (typeof execution !== 'function') {
            throw 'execution must be a function';
        }
        this._execution = execution;
    }

    execute(now) {
        let exec;
        try {
            exec = this._execution(now);
        } catch (error) {
            return this.fireEvent('task-failed', error);
        }

        if (exec instanceof Promise) {
            return exec
                .then(() => this.fireEvent('task-finished'))
                .catch((error) => this.fireEvent('task-failed', error));
        } else {
            this.fireEvent('task-finished');
            return exec;
        }
    }
}