const passport = require('passport');
const request = require('request');
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const axios = require('axios');

const User = require('../models/User');

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	User.findById(id, (err, user) => {
		done(err, user);
	});
});

/**
 * Sign in using Email and Password.
 */
passport.use(
	new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
		User.findOne({ email: email.toLowerCase() }, (err, user) => {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false, { msg: `Email ${email} not found.` });
			}
			user.comparePassword(password, (err, isMatch) => {
				if (err) {
					return done(err);
				}
				if (isMatch) {
					return done(null, user);
				}
				return done(null, false, { msg: 'Invalid email or password.' });
			});
		});
	})
);

/**
 * OAuth Strategy Overview
 *
 * - User is already logged in.
 *   - Check if there is an existing account with a provider id.
 *     - If there is, return an error message. (Account merging not supported)
 *     - Else link new OAuth account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and we are done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, return an error message.
 *       - Else create a new account.
 */

/**
 * Sign in with Facebook.
 */
passport.use(
	new FacebookStrategy(
		{
			clientID: process.env.FACEBOOK_ID,
			clientSecret: process.env.FACEBOOK_SECRET,
			callbackURL: '/auth/facebook/callback',
			profileFields: [
				'name',
				'email',
				'link',
				'locale',
				'timezone',
				'gender'
			],
			passReqToCallback: true
		},
		(req, accessToken, refreshToken, profile, done) => {
			if (req.user) {
				User.findOne({ facebook: profile.id }, (err, existingUser) => {
					// Procura o usuário no banco de dados pelo id do Facebook
					if (err) {
						return done(err);
					}
					if (existingUser) {
						req.flash('errors', {
							msg:
								'There is already a Facebook account that belongs to you. Sign in with that account or delete it, then link it with your current account.'
						});
						done(err);
					} else {
						User.findById(req.user.id, (err, user) => {
							if (err) {
								return done(err);
							}
							user.facebook = profile.id;
							user.tokens.push({ kind: 'facebook', accessToken });
							user.profile.name =
								user.profile.name ||
								`${profile.name.givenName} ${
									profile.name.familyName
								}`;
							user.profile.gender =
								user.profile.gender || profile._json.gender;
							user.profile.picture =
								user.profile.picture ||
								`https://graph.facebook.com/${
									profile.id
								}/picture?type=large`;
							user.save(err => {
								req.flash('info', {
									msg: 'Facebook account has been linked.'
								});
								done(err, user);
							});
						});
					}
				});
			} else {
				User.findOne({ facebook: profile.id }, (err, existingUser) => {
					if (err) {
						return done(err);
					}
					if (existingUser) {
						return done(null, existingUser);
					}
					User.findOne(
						{ email: profile._json.email },
						(err, existingEmailUser) => {
							if (err) {
								return done(err);
							}
							if (existingEmailUser) {
								req.flash('errors', {
									msg:
										'There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.'
								});
								done(err);
							} else {
								const user = new User();
								user.email = profile._json.email;
								user.facebook = profile.id;
								user.tokens.push({
									kind: 'facebook',
									accessToken
								});
								user.profile.name = `${
									profile.name.givenName
								} ${profile.name.familyName}`;
								user.profile.gender = profile._json.gender;
								user.profile.picture = `https://graph.facebook.com/${
									profile.id
								}/picture?type=large`;
								user.profile.location = profile._json.location
									? profile._json.location.name
									: '';
								user.save(err => {
									done(err, user);
								});
							}
						}
					);
				});
			}
		}
	)
);

/**
 * Sign in with Google.
 */
passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_ID,
			clientSecret: process.env.GOOGLE_SECRET,
			callbackURL: '/auth/google/callback',
			passReqToCallback: true
		},
		(req, accessToken, refreshToken, profile, done) => {
			if (req.user) {
				User.findOne({ google: profile.id }, (err, existingUser) => {
					// Procura o usuário no banco de dados pelo id do Google
					if (err) {
						return done(err);
					}
					if (existingUser) {
						req.flash('errors', {
							msg:
								'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.'
						});
						done(err);
					} else {
						User.findById(req.user.id, (err, user) => {
							if (err) {
								return done(err);
							}
							user.google = profile.id;
							user.tokens.push({ kind: 'google', accessToken });
							user.profile.name =
								user.profile.name || profile.displayName;
							user.profile.gender =
								user.profile.gender || profile._json.gender;
							user.profile.picture =
								user.profile.picture || profile._json.image.url;
							user.save(err => {
								req.flash('info', {
									msg: 'Google account has been linked.'
								});
								done(err, user);
							});
						});
					}
				});
			} else {
				User.findOne({ google: profile.id }, (err, existingUser) => {
					if (err) {
						return done(err);
					}
					if (existingUser) {
						return done(null, existingUser);
					}
					User.findOne(
						{ email: profile.emails[0].value },
						(err, existingEmailUser) => {
							if (err) {
								return done(err);
							}
							if (existingEmailUser) {
								req.flash('errors', {
									msg:
										'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.'
								});
								done(err);
							} else {
								const user = new User();
								user.email = profile.emails[0].value;
								user.google = profile.id;
								user.tokens.push({
									kind: 'google',
									accessToken
								});
								user.profile.name = profile.displayName;
								user.profile.gender = profile._json.gender;
								user.profile.picture = profile._json.image.url;
								user.save(err => {
									done(err, user);
								});
							}
						}
					);
				});
				console.log('E-mail Logado:');
				var loggedEmail = profile.emails.filter(email => {
					return email.type == 'account';
				})[0].value;
				console.log('\x1b[33m%s\x1b[0m', loggedEmail);
				axios
					.get(
						'https://' +
							process.env.SHOPIFY_APP_KEY +
							':' +
							process.env.SHOPIFY_APP_SECRET +
							'@' +
							process.env.SHOPIFY_SHOP_DOMAIN +
							'/admin/customers/search.json?query=' +
							loggedEmail
					)
					.then(function(response) {
						if (response.data.state != 'enabled') {
							console.log(
								'Usuário tem conta no shopify, mas precisa ativá-la!'
							);
							// Manda mensagem para o usuário avisando que deve ativar a conta do Shopify
						} else if (response.data.customers.length > 0) {
							console.log('Usuário tem conta no shopify!');
							// Cadastra o id do usuário no nosso banco de dados
						} else {
							console.log('Usuário não tem conta no shopify!');
							// Redireciona para o shopify
						}
					})
					.catch(function(error) {
						console.log('Erro: '.error);
					});
			}
		}
	)
);

/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
	const provider = req.path.split('/').slice(-1)[0];
	const token = req.user.tokens.find(token => token.kind === provider);
	if (token) {
		next();
	} else {
		res.redirect(`/auth/${provider}`);
	}
};
