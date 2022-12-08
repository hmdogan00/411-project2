var users = [
  {
    id: 1,
    username: "hami",
    password: "hamipw",
  },
  {
    id: 2,
    username: "yaren",
    password: "yarenpw",
  },
  {
    id: 3,
    username: "ilke",
    password: "ilkepw",
  },
  {
    id: 4,
    username: "gamze",
    password: "gamzepw",
  },
];

var groups = [
  {
    id: 1,
    name: "CS411",
    members: [1, 2, 3, 4],
  },
  {
    id: 2,
    name: "Senior Project",
    members: [1, 2, 4],
  },
];

var userID = 4;
var groupID = 2;

const addGroup = function (name, members) {
  if (name && members.length != 0) {
    groupID++;
    groups.push({
      id: groupID,
      name: name,
      members: members,
    });
  }
};

const getUser = (id) => {
  if (id <= userID) {
    for (var user of users) {
      if (user.id == id) {
        return user;
      }
    }
  }
};

const getUsers = () => {
  return users;
};

module.exports = {
  addGroup: addGroup,
  getUser: getUser,
  getUsers: getUsers,
};
