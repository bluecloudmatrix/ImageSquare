/*******************************************************************************
* Qiushan
* 4/1/2016
*******************************************************************************/

var express = require('express');
var fs = require('fs');
var hbs = require('hbs');
var imagesEngine = require('./images');
var agency = require('./agency.js');
var monitor = require('./monitorManager.js');
var config = require('./conf/config.js');

var path = require('path'),
		mongoose = require('mongoose'),
		hash = require('./pass').hash;


// handle post
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session')

// port&host setting
var settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
// disable process.env.PORT for now as it cause problem on mesos slave
var port = (process.env.VMC_APP_PORT || process.env.VCAP_APP_PORT || settings.port);
var host = (process.env.VCAP_APP_HOST || 'localhost');

// underlying variables
var serverStarted = false;
var app = express();


/*
 Database and Models
 */
mongoose.connect("mongodb://localhost/myapp");
var UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	salt: String,
	hash: String
});

var User = mongoose.model('users', UserSchema);


/*
 Middlewares and configurations
 */
//app.configure(function () {
	app.use(bodyParser());
//app.use(bodyParser.urlencoded({
//	extended: true
//}));
	app.use(cookieParser('Authentication Tutorial '));
	app.use(session());
	//app.use(express.static(path.join(__dirname, 'public')));
	app.use(express.static(__dirname + '/public'));
	//app.set('views', __dirname + '/views');
	app.set('view engine', 'html');
app.engine('html', hbs.__express);
//});

app.use(function (req, res, next) {
	var err = req.session.error,
			msg = req.session.success;
	delete req.session.error;
	delete req.session.success;
	res.locals.message = '';
	if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
	if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
	next();
});

/*
 Helper Functions
 */
function authenticate(name, pass, fn) {
	if (!module.parent) console.log('authenticating %s:%s', name, pass);

	User.findOne({
				username: name
			},

			function (err, user) {
				if (user) {
					if (err) return fn(new Error('cannot find user'));
					hash(pass, user.salt, function (err, hash) {
						if (err) return fn(err);
						if (hash == user.hash) return fn(null, user);
						fn(new Error('invalid password'));
					});
				} else {
					return fn(new Error('cannot find user'));
				}
			});

}

function requiredAuthentication(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.session.error = 'Access denied!';
		res.redirect('/login');
	}
}

function userExist(req, res, next) {
	User.count({
		username: req.body.username
	}, function (err, count) {
		if (count === 0) {
			next();
		} else {
			req.session.error = "User Exist"
			res.redirect("/sign");
		}
	});
}



// basic configuration
//app.use(express.static(__dirname + '/public'));     	// set the static files location /public/img will be /img for users
//app.use(bodyParser.urlencoded({
//	extended: true
//}));
//app.set('view engine', 'html');
//app.engine('html', hbs.__express);
//app.engine('.html', require('ejs').renderFile);

/******************
 * route listing
 *
 * post /order
 * get  /order
 * get  /services_listing
 * get  /square
 * get  /deploy_setting
 * get  /remove
 *****************/

app.post('/order', multipartMiddleware, function(req, res) {
	//agency.get_processed_data(req.body, res);
});
app.get('/order', function(req, res) {
	//agency.grabUsrServices(res);
});

app.get('/services_listing', function(req, res) {
    //agency.grabUsrServices(res);
});

app.get('/square', function(req, res) {
	res.render('square', {entries:imagesEngine.getImagesEntries()});
});

app.get('/table', function(req, res) {
	var image_name = imagesEngine.getImagesEntry(req.query.id).image;
	res.render('table', {id:req.query.id, name:req.query.name, image:image_name});
});

app.get('/deploy_setting', function(req, res) {
	var image_name = imagesEngine.getImagesEntry(req.query.id).image;
	res.render('deploy_setting', {id:req.query.id, name:req.query.name, image:image_name});
});

app.get('/remove', function(req, res) {
	var name = req.query.name;
	//agency.removeContainer(name, res)
});

app.get("/sign", function (req, res) {
	if (req.session.user) {
		res.redirect("/profile");
	} else {
		res.render("sign");
	}
});

app.post("/sign", userExist, function (req, res) {
	var password = req.body.password;
	var username = req.body.username;

	console.log(password);
	console.log(username);

	//agency.signRegistry(username, password);

	hash(password, function (err, salt, hash) {
		if (err) throw err;
		var user = new User({
			username: username,
			salt: salt,
			hash: hash,
		}).save(function (err, newUser) {
			if (err) throw err;
			authenticate(newUser.username, password, function(err, user){
				if(user){
					req.session.regenerate(function(){
						req.session.user = user;
						req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
						res.redirect('/profile');
					});
				}
			});
		});
	});
});

app.get("/profile", function (req, res) {
	var username = req.query.username;
	//res.render('profile', {username:username});
	agency.grabOwnImages(username, res);
});

app.get("/login", function (req, res) {
	res.render("login");
});

app.post("/login", function (req, res) {
	console.log("login done");
	authenticate(req.body.username, req.body.password, function (err, user) {
		console.log("login authenticate");
		if (user) {

			req.session.regenerate(function () {

				req.session.user = user;
				req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
				res.redirect('/profile?username='+user.username);
			});
		} else {
			req.session.error = 'Authentication failed, please check your ' + ' username and password.';
			res.redirect('/login');
		}
	});
});

app.get('/logout', function (req, res) {
	req.session.destroy(function () {
		res.redirect('/');
	});
});

// basic function
function startServer() {
	if (serverStarted ) return;
	serverStarted = true;
	app.listen(port);
	console.log("CloudServer listening on port " + port);

	/*
	    monitor
	 */
	//var container = {};
	//container.server =
	//container.port =
	//container._id = '97c267a38919225efae56a4efb6db05a3b919ab0f9140250a12ddf8104b17453';
	//monitor.getContainerInfo(container);
	/*monitor.getStats(config.cadvisors_hostname, config.cadvisors_port, container._id, function(containerInfo, subcontainers) {
		if (window.cadvisor.firstRun) {
			window.cadvisor.firstRun = false;

			if (containerInfo.spec.has_filesystem) {
				startFileSystemUsage(
						'filesystem-usage', machineInfo, containerInfo);
			}
			if (containerInfo.spec.has_network) {
				startNetwork('network-selection', containerInfo);
			}
			if (containerInfo.spec.has_custom_metrics) {
				startCustomMetrics('custom-metrics-chart', containerInfo);
			}
		}
		drawCharts(machineInfo, containerInfo, subcontainers);

		if (containerInfo.spec.has_cpu) {
			console.log("has cpu");
		}

	});*/
}

// start the server
startServer();
