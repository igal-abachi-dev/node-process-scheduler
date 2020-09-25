# node-process-scheduler
cron like hourly scheduling in node.js for PM2 manager


```javascript
  "dependencies": {
    "bluebird": "^3.7.2",
    "eventemitter3": "^4.0.7",
    "lodash": "^4.17.20",
    "luxon": "^1.25.0",
    "mnemonist": "^0.38.0",
    "pino": "^6.6.1",
    }
```


# jobs.json
```javascript
[
  {//windows:
    "cmd": "c:\\windows\\notepad.exe",
    "args": "d:\\Dev\\post.json",
    "time": ["4:09"] //utc
  },
  {//ubuntu:
    "cmd": "/var/www/git/proj1/script.sh",
    "args": "/abc",
    "time": ["4:09"] //utc
  }
  {//ubuntu:
    "cmd": "/var/www/git/proj2/nodeApp.js",
    "args": "--test",
    "time": ["5:00","8:20","19:00"] //utc
  }
]
```
