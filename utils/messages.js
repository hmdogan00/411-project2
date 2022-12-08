const moment = require('moment');

function messageToObject(user, text) {
    return {
        user,
        text,
        time: moment().format('h:mm a')
    };
}

module.exports = messageToObject;