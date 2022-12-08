## Prerequisites

Only node and PostgreSQL is needed. You have to: 
1. create a database called messages
2. create a role in that database called 'me' with password 'password'
3. give it write and read permissions
4. give it sequence rights.

Optionally, you can use below statements to provide necessary database settings, provided you have a database cluster, and can enter to it 
using psql command line tool.

```
CREATE DATABASE messages;
\c messages;
CREATE TABLE messages ( ID SERIAL PRIMARY KEY, group_name VARCHAR(30), channel VARCHAR(30), username VARCHAR(30), time VARCHAR(8), text VARCHAR(250) );
CREATE USER me WITH PASSWORD 'password';
GRANT ALL ON messages TO me;
GRANT USAGE, SELECT ON messages_id_seq TO me;
```

## Running Instructions

1. Simply run: ``` node server.js ```
2. Go to ```localhost:3000```
3. Insert any of the users' id and password, which can be found in data.js, in the project root folder.
4. To text with another user, open another browser in **incognito mode**, go to ```localhost:3000``` and login with another user from the data.js file.
