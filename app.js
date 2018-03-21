/**
 * Module dependencies.
 */
const _ = require('lodash');
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const getRawBody = require('raw-body');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv').config();
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const axios = require('axios');
const multer = require('multer');
const crypto = require('crypto');

const upload = multer({ dest: path.join(__dirname, 'uploads') });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const apiController = require('./controllers/api');
const contactController = require('./controllers/contact');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('error', err => {
	console.error(err);
	console.log(
		'%s MongoDB connection error. Please make sure MongoDB is running.',
		chalk.red('✗')
	);
	process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(
	sass({
		src: path.join(__dirname, 'public'),
		dest: path.join(__dirname, 'public')
	})
);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // This line is responsible for adding the form inputs into the request.body, so they are accessible after they're submitted
app.use(expressValidator());
app.use(
	session({
		resave: true,
		saveUninitialized: true,
		secret: process.env.SESSION_SECRET,
		store: new MongoStore({
			url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
			autoReconnect: true,
			clear_interval: 3600
		})
	})
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
var csrfExclude = ['/shopify'];
app.use((req, res, next) => {
	if (_.includes(csrfExclude, req.path)) return next();
	if (req.path === '/api/upload') {
		next();
	} else {
		lusca.csrf()(req, res, next);
	}
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
	res.locals.user = req.user;
	next();
});
app.use((req, res, next) => {
	// After successful login, redirect back to the intended page
	if (
		!req.user &&
		req.path !== '/login' &&
		req.path !== '/signup' &&
		!req.path.match(/^\/auth/) &&
		!req.path.match(/\./)
	) {
		req.session.returnTo = req.path;
	} else if (req.user && req.path === '/account') {
		req.session.returnTo = req.path;
	}
	next();
});
app.use(
	express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */

app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/api/current_user', userController.getUser);

app.post('/shopify', async (req, res) => {
	let hmac = req.get('X-Shopify-Hmac-Sha256');
	let topic = req.get('X-Shopify-Topic');
	let shopDomain = req.get('X-Shopify-Shop-Domain');

	if (shopDomain != process.env.SHOPIFY_SHOP_DOMAIN) {
		res.sendStatus(401);
		console.log('Error: Could not validate domain in the request');
		return;
	}
	if (topic != 'customers/create') {
		res.sendStatus(401);
		console.log(
			'Error: Could not validate the topic. Expected customers/create'
		);
		return;
	}

	console.log(req.body);
	let clientId = req.body.id;
	// verifica se o usuário está cadastrado no banco de dados Caso não esteja faz um request para a API do shopify pedindo informações sobre ele
	console.log(topic);

	axios
		.get(
			'https://03666d14d153113c5f046f35e5f02bc4:efa8fcc9b6963db5db01985496c51aaf@store-fluxo.myshopify.com/admin/orders/388423548980.json'
		)
		.then(response => {
			console.log(response);
		});

	res.sendStatus(200);
});

app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post(
	'/account/profile',
	passportConfig.isAuthenticated,
	userController.postUpdateProfile
);
app.post(
	'/account/password',
	passportConfig.isAuthenticated,
	userController.postUpdatePassword
);
app.post(
	'/account/delete',
	passportConfig.isAuthenticated,
	userController.postDeleteAccount
);
app.get(
	'/account/unlink/:provider',
	passportConfig.isAuthenticated,
	userController.getOauthUnlink
);

/**
 * API examples routes.
 */
app.get('/api', apiController.getApi);
app.get('/api/lastfm', apiController.getLastfm);
app.get('/api/nyt', apiController.getNewYorkTimes);
app.get('/api/aviary', apiController.getAviary);
app.get(
	'/api/steam',
	passportConfig.isAuthenticated,
	passportConfig.isAuthorized,
	apiController.getSteam
);
app.get('/api/stripe', apiController.getStripe);
app.post('/api/stripe', apiController.postStripe);
app.get('/api/scraping', apiController.getScraping);
app.get(
	'/api/facebook',
	passportConfig.isAuthenticated,
	passportConfig.isAuthorized,
	apiController.getFacebook
);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/api/upload', apiController.getFileUpload);
app.post('/api/upload', upload.single('myFile'), apiController.postFileUpload);
app.get('/api/google-maps', apiController.getGoogleMaps);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get(
	'/auth/facebook',
	passport.authenticate('facebook', { scope: ['email', 'public_profile'] })
);
app.get(
	'/auth/facebook/callback',
	passport.authenticate('facebook', { failureRedirect: '/login' }),
	(req, res) => {
		res.redirect(req.session.returnTo || '/');
	}
);
app.get(
	'/auth/google',
	passport.authenticate('google', { scope: 'profile email' })
);
app.get(
	'/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/login' }),
	(req, res) => {
		res.redirect(req.session.returnTo || '/');
	}
);

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
	console.log(
		'%s App is running at http://localhost:%d in %s mode',
		chalk.green('✓'),
		app.get('port'),
		app.get('env')
	);
	console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
