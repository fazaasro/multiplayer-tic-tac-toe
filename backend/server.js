const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend/build')));

let players = { X: null, O: null };
let playerNames = { X: '', O: '' };
let gameState = {
  squares: Array(9).fill(null),
  xIsNext: true,
};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('chooseRole', ({ role, name }) => {
    if (!players[role]) {
      players[role] = socket.id;
      playerNames[role] = name;
      socket.emit('playerAssigned', role, name);
      io.emit('playerNames', playerNames);
      if (players.X && players.O) {
        io.emit('gameState', gameState);
      }
    }
  });

  socket.on('makeMove', (squares) => {
    gameState.squares = squares;
    gameState.xIsNext = !gameState.xIsNext;
    io.emit('gameState', gameState);
  });

  socket.on('resetGame', () => {
    gameState = {
      squares: Array(9).fill(null),
      xIsNext: true,
    };
    players = { X: null, O: null };
    playerNames = { X: '', O: '' };
    io.emit('resetGame');
    io.emit('playerNames', playerNames);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (players.X === socket.id) {
      players.X = null;
      playerNames.X = '';
    } else if (players.O === socket.id) {
      players.O = null;
      playerNames.O = '';
    }
    if (!players.X || !players.O) {
      io.emit('resetGame');
    }
  });
});

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
