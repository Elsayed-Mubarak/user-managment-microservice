const fs = require('fs');
const path = require('path');

var privateKey = fs.readFileSync(path.resolve(__dirname, 'private.key'), 'utf8');
var publicKey = fs.readFileSync(path.resolve(__dirname, 'public.key'), 'utf8');

module.exports = { privateKey, publicKey };