// express server: logic for connecting redis, pg, information broker between databases and react app
const keys = require('./keys');

// express app setup - load deps
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// create express app
const app = express();
// allow making req from one domain to a different domain/port
app.use(cors());
// parse incoming requests and turn body of post req into json object
app.use(bodyParser.json());


// postgres client setup
const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort,
});

pgClient.on('connect', client => {
    client
        .query('CREATE TABLE IF NOT EXISTS values (number INT)')
        .catch((err) => console.log(err));
});

// redis client setup - (sending relationship)
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    // tell the redis client to attempt to automatically reconnect when connection lost (every 1000 milisec) 
    retry_strategy: () => 1000
});

// make duplicate as pointed out in the redis docu
// because when a connection is dedicated to listen or subscribe or publish information it cannot be used
// for other purposes
const redisPublisher = redisClient.duplicate();

// express route handlers

app.get('/', (req, res) => {
    res.send('Hi');
});

    // get all indices that have been submitted
app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');

    // make sure to only send data (-> .rows)
    res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
    // get hash related values
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    } 

    redisClient.hset('values', index, 'Nothing yet!');
    // publish message -> so that subscriber can be informed
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true });
});

app.listen(5000, err => {
    console.log('Listening');
});
