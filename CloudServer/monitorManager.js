/**
 * Created by qiushan on 6/30/2016.
 */
'use strict';

var _ = require('underscore')
    , config = require('./conf/config.js')
    , httpTools = require('http')


function MonitorManager(){}

MonitorManager.prototype.getResourceUsage = function(container, done)
{
    var self = this

    this.getMachineInfo(container, function(err, machine)
    {
        if( err )
            return done(err)

        self.getContainerInfo(container, function(err, info)
        {
            if( err )
                return done(err)

            var data = self.getOverallUsage(machine, info)

            if( data )
                done(null, data)
            else
                done('error')
        })
    })
}

// Get the container stats for the specified container.
MonitorManager.prototype.getStats = function(hostname, port, containerId, callback) {
    // Request 60s of container history and no samples.
    var request = JSON.stringify({
        // Update main.statsRequestedByUI while updating "num_stats" here.
        'num_stats': 60,
        'num_samples': 0
    });

    var rootDir = hostname+':'+port+'/';

    $.when(
        $.post(rootDir + 'api/v1.3/containers' + containerId, request),
        $.post(rootDir + 'api/v1.3/subcontainers' + containerId, request))
        .done(function(containersResp, subcontainersResp) {
            callback(containersResp[0], subcontainersResp[0]);
        });
}


MonitorManager.prototype.getContainerInfo = function(container)
{
    var data = {
        port: config.cadvisors_port
        , hostname: container.server
        , method: 'POST'
        , path: '/api/v1.3/docker/' + container._id
    }

    /*httpTools.request(data, { num_stats: 2, num_samples: 0 }, function(err, data){
        //done(err, data)
        console.log("done haha");
        console.log(err);
        console.log(data);
    });*/
    var req = httpTools.request(data, function(res){
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('BODY: ' + chunk);
        });
    });

    req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();
}

MonitorManager.prototype.getMachineInfo = function(container, done)
{
    var data = {
        port: config.cadvisors_port
        , hostname: container.server
        , path: '/api/v1.0/machine'
    }

    console.log(data)

    httpTools.request(data, {}, function(err, data){
        done(err, data)
    })
}

MonitorManager.prototype.getInterval = function(current, previous)
{
    var cur = new Date(current)
        , prev = new Date(previous)

    return (cur.getTime() - prev.getTime()) * 1000000
}

MonitorManager.prototype.getOverallUsage = function(machineInfo, containerInfo)
{
    var cur = containerInfo.stats[containerInfo.stats.length - 1]
        , data = {}

    data.cpuUse = this.getCpuUse(machineInfo, containerInfo)
    data.memoryUse = this.getMemoryUse(machineInfo, containerInfo)
    data.broadband = this.getBroadbandUse(machineInfo, containerInfo)

    return data
}

MonitorManager.prototype.getBroadbandUse = function(machineInfo, stats)
{
    var cur = stats.stats[1]
        , prev = stats.stats[0]

    var rx_bytes = cur.network.rx_bytes - prev.network.rx_bytes
        , tx_bytes = cur.network.tx_bytes - prev.network.tx_bytes

    if( tx_bytes < 1024000 ){
        tx_bytes = (tx_bytes/1024).toFixed(2) + 'KB'
    }
    else{
        tx_bytes = (tx_bytes/1024/1024).toFixed(2) + 'MB'
    }

    if( rx_bytes < 1024000 ){
        rx_bytes = (rx_bytes/1024).toFixed(2) + 'KB'
    }
    else{
        rx_bytes = (rx_bytes/1024/1024).toFixed(2) + 'MB'
    }

    return { rx_bytes: rx_bytes, tx_bytes: tx_bytes }
}

MonitorManager.prototype.getMemoryUse = function(machineInfo, stats)
{
    var cur = stats.stats[1]
        , memoryUsage = 0
    if( stats.spec.has_memory)
    {
        var limit = stats.spec.memory.limit

        if( limit > machineInfo.memory_capacity ) {
            limit = machineInfo.memory_capacity
        }

        memoryUsage = Math.round(cur.memory.usage || 0);
    }

    return Math.round(memoryUsage / 1024 / 1024)
}


MonitorManager.prototype.hasResource = function(stats, resource) {
    return stats.stats.length > 0 && stats.stats[0][resource];
}

MonitorManager.prototype.getCpuUse = function(machineInfo, stats)
{
    if (stats.spec.has_cpu && !this.hasResource(stats, "cpu")) {
        return
    }

    var data = []
        , cur = stats.stats[1]
        , prev = stats.stats[0]
        , intervalInNs = this.getInterval(cur.timestamp, prev.timestamp)

    for (var j = 0; j < machineInfo.num_cores; j++) {


        data.push(((cur.cpu.usage.per_cpu_usage[j] - prev.cpu.usage.per_cpu_usage[j]) / intervalInNs * 100).toFixed(2));
    }

    return data
}

module.exports = new MonitorManager()