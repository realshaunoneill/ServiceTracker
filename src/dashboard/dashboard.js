const index = require('../index');
const schemaUtils = require('../database/schemaUtils');
const Account = require('../database/schemas/accountSchema');

const passport = require('passport');
const crypto = require("crypto");

exports.init = function (app) {

    app.post('/register', (req, res) => {
        try {
            if (!index.registrationEnabled) return res.status(200).json({
                error: `Registration is disabled at this time`
            });

            Account.register(new Account({
                username: req.body.username,
                apiKey: crypto.randomBytes(14).toString('hex')
            }), req.body.password, (err, account) => {
                if (err) {
                    console.error(err.stack);
                    return res.status(500).json({error: err.message, username: req.body.username});
                }

                passport.authenticate('local')(req, res, () => {
                    res.status(200).json({status: 'ok'});
                })
            })
        } catch (err) {
            res.status(500).json({error: `Unable to register user`})
        }
    });

    app.post('/login', passport.authenticate('local'), (req, res) => {
        res.redirect('/dashboard')
    });

    app.get('/login', (req, res) => {
        if (req.isAuthenticated()) return res.redirect('/dashboard');
        res.render('login', {user: req.user})
    });

    app.get('/logout', index.checkAuth, (req, res) => {
        req.logout();
        res.redirect('/');
    });

    app.get('/info', index.checkAuth, (req, res) => {
        res.json(req.user);
    });

    app.get('/dashboard', index.checkAuth, async (req, res) => {
        let apps = await schemaUtils.fetchService();

        res.render('dashboard', {
            services: apps || [],
            isAdmin: req.user.isAdmin || false,
            user: req.user
        })
    });
};

