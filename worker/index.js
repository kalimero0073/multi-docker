// business logic and redis connection
const keys = require('./keys');
const redis = require('redis');

// create client to save values (sending relationship)
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    // tell the redis client to attempt to automatically reconnect when connection lost (every 1000 milisec)
    retry_strategy: () => 1000
});

// sub stands for subscription - listens to incoming messages/events from redis (receiving relationship)
const sub = redisClient.duplicate();

function fib(index) {
    if (index < 2) return 1;
    return fib(index -1) + fib(index - 2);
};


sub.on('message', (channel, message) => {
    redisClient.hset('values', message, fib(parseInt(message)));
})

sub.subscribe('insert');