const schemaUtils = require('../database/schemaUtils');
const Account = require('../database/schemas/accountSchema');

const passport = require('passport');

exports.init = function (app) {

    app.post('/register', (req, res) => {
        try {
            Account.register(new Account({username: req.body.username}), req.body.password, (err, account) => {
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

    app.get('/logout', checkAuth, (req, res) => {
        req.logout();
        res.redirect('/dashboard');
    });

    app.get('/info', checkAuth, (req, res) => {
        res.json(req.user);
    });

    app.get('/dashboard', checkAuth, async (req, res) => {
        let apps = await schemaUtils.fetchService();

        res.render('dashboard', {
            services: apps || [],
            isAdmin: req.user.isAdmin || false,
            user: req.user
        })
    });
};

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        // We'll check for admin
        if (req.user.isAdmin) return next();
    }
    res.status(403).json({error: `You don't appear to be logged in or you don't have permission!`})
}