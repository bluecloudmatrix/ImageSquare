/**
 * Created by qiushan on 5/31/2016.
 */
var entries = [
    {"id":0001, "name":"MongoDB", "image":"weare.pub/mongodb-centos7:v305", "picture":"mongodb.png", "description":""},
    {"id":0002, "name":"Node.js", "image":"weare.pub/nodejs-clefos71:latest", "picture":"nodejs.png", "description":""},
    {"id":0003, "name":"MariaDB", "image":"weare.pub/mariadb-clefos71:v5.5", "picture":"mariadb.png", "description":""},
    {"id":0004, "name":"Nginx", "image":"weare.pub/nginx-clefos71:v1.8", "picture":"nginx.png", "description":""},
    {"id":0005, "name":"Golang", "image":"weare.pub/golang:v1.5", "picture":"golang.png", "description":""}
];

exports.getImagesEntries = function(){
    return entries;
}

exports.getImagesEntry = function (id){
    for(var i=0; i < entries.length; i++){
        if(entries[i].id == id) return entries[i];
    }
}