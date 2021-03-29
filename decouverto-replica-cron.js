const schedule = require('node-schedule');
const exec = require('child_process').exec;

schedule.scheduleJob('0 0 12 ? * TUE *', function() {
    exec('node decouverto-replica.js', console.log);
});