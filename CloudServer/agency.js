/**
 * Created by qiushan on 6/13/2016.
 */

var socket = require('socket.io-client')('http://9.125.103.239:10002');

socket.on('connect', function () {
    console.log("client connected.");
});

socket.on('connect_error', function(err){
    console.log(err);
});

socket.on('connect_timeout', function(){
    console.log("connect_timeout");
});

socket.on('reconnect_attempt', function(){
    console.log("reconnect_attempt");
});

socket.on('reconnecting', function(){
    console.log("reconnecting");
});


var transactionCntr = 0;

module.exports.get_processed_data = function(text, res) {
    var timestamp = new Date().getTime();
    var transactionId = transactionCntr++;
    console.log('sending data to client');
    var _data = {};
    _data.timestamp = timestamp;
    _data.transactionId = transactionId;
    _data.text = text;

    function onResponse(data) {
        // for concurrency reasons, make sure this is the right
        // response.  The server must return the same
        // transactionId that it was sent
        if (data.transactionId === transactionId) {
            //console.log(data.text);
            res.render('container_service.html', {container:data.text});
            socket.off('serverResponse', onResponse);
        }
    }

    socket.on('serverResponse', onResponse);

    // send data and transactionId
    socket.emit('deploy', _data, function (data) {
        console.log('\tSending query ... waiting for ACK');
        console.log(data);
    });
}

module.exports.grabUsrServices = function(res) {
    function getServicesListing(data) {
        res.render('services_listing.html', {items:data.text});
        socket.off('servicesListing', getServicesListing);
    }

    socket.on('servicesListing', getServicesListing);

// ask for services listing
    var usrServices = {};
    usrServices.text = {};

    socket.emit('services', usrServices, function (data) {
        console.log('\tSending query ... waiting for ACK');
        console.log(data);
    });

}

module.exports.removeContainer = function(name, res) {
    function afterRemoveServicesListing(data) {
        res.render('services_listing.html', {items:data.text});
        socket.off('removeListing', afterRemoveServicesListing);
    }

    socket.on('removeListing', afterRemoveServicesListing);

// ask for services listing
    var usrServices = {};
    usrServices.text = {};

    socket.emit('remove', usrServices, function (data) {
        console.log('\tSending query ... waiting for ACK');
        console.log(data);
    });

}

module.exports.signRegistry = function(username, password) {
    var _data = {};
    _data.username = username;
    _data.password = password;

    function onResponse(data) {
        console.log(data);
        socket.off('signStatus', onResponse);
    }

    socket.on('signStatus', onResponse);


    socket.emit('sign', _data, function (data) {
        console.log('\tSending sign ... waiting for ACK');
        console.log(data);
    });
}

module.exports.grabOwnImages = function(username, res) {
    var _data = {};
    _data.username = username;

    function onResponse(data) {
        res.render('profile', {username:username, images:data});
        socket.off('imagesList', onResponse);
    }

    socket.on('imagesList', onResponse);

    socket.emit('ownimages', _data, function (data) {
        console.log('\tSending sign ... waiting for ACK');
        console.log(data);
    });
}
