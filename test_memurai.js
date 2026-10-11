const net = require('net');

const client = net.createConnection({ port: 6379, host: '127.0.0.1' }, () => {
    console.log('Successfully connected to Memurai on port 6379.');
    // Send a PING command
    client.write('PING\r\n');
});

client.on('data', (data) => {
    console.log('Received from Memurai:', data.toString().trim());
    client.end();
});

client.on('error', (err) => {
    console.error('Failed to connect to Memurai:', err.message);
});
