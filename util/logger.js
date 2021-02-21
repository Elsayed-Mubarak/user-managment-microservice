const fs = require('fs')

module.exports.logger = (...args) => {

    const fileName = args[0];
    const fileContent = args[1]

    fs.appendFile(fileName, fileContent, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}