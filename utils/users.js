const online = [];

function joinUser(id, username, room) {
    const user = {
        id,
        username,
        room
    };
    online.push(user);
    return user;
}

function getCurrentUser(id) {
    return online.find(user => user.id === id);
}

function leaveUser(id) {
    const idx = online.findIndex(user => user.id === id);

    if (idx != -1) {
        return online.splice(idx, 1)[0];
    }
}

function getOnline(room) {
    return online.filter(user => user.room === room);
}



module.exports = {
    joinUser,
    getCurrentUser,
    leaveUser,
    getOnline
}