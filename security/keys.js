const fs = require('fs');// PRIVATE and PUBLIC key
const path = require('path');

var privateKEY = fs.readFileSync(path.resolve(__dirname, 'private.key'), 'utf8');
var publicKEY = fs.readFileSync(path.resolve(__dirname, 'public.key'), 'utf8');

module.exports = {
    privateKEY,
    publicKEY
}