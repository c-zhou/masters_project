/**
 * Created by michaelhall on 24/2/17.
 */
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('analysis');
});

module.exports = router;
