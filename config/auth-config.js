var keys = require('../security/keys');

module.exports = {
  secret: keys.publicKEY,
  tokenTime: 1.555e+7	//180 days === 6 months
};