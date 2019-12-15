const { assign } = require('lodash');

module.exports = assign({}, require('./lib/cache'), require('./lib/aws'));
