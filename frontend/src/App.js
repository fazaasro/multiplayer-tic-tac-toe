import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io();

function Square({ value, onSquareClick }) {
  return (
    <button className="square" onClick={onSquareClick}>
      {value}
    </button>
  );
}

function Board({ xIsNext, squares, onPlay, player }) {
  function handleClick(i) {
    if (calculateWinner(squares) || squares[i]) {
      return;
    }
    if ((xIsNext && player === 'X') || (!xIsNext && player === 'O')) {
      const nextSquares = squares.slice();
      nextSquares[i] = xIsNext ? 'X' : 'O';
      onPlay(nextSquares);
    }
  }

  const winner = calculateWinner(squares);
  const isTie = !winner && squares.every(square => square !== null);
  let status;
  if (winner) {
    status = 'Winner: ' + winner;
  } else if (isTie) {
    status = 'It\'s a tie!';
  } else {
    status = 'Next player: ' + (xIsNext ? 'X' : 'O');
  }

  return (
    <>
      <div className="status">{status}</div>
      <div className="board-row">
        <Square value={squares[0]} onSquareClick={() => handleClick(0)} />
        <Square value={squares[1]} onSquareClick={() => handleClick(1)} />
        <Square value={squares[2]} onSquareClick={() => handleClick(2)} />
      </div>
      <div className="board-row">
        <Square value={squares[3]} onSquareClick={() => handleClick(3)} />
        <Square value={squares[4]} onSquareClick={() => handleClick(4)} />
        <Square value={squares[5]} onSquareClick={() => handleClick(5)} />
      </div>
      <div className="board-row">
        <Square value={squares[6]} onSquareClick={() => handleClick(6)} />
        <Square value={squares[7]} onSquareClick={() => handleClick(7)} />
        <Square value={squares[8]} onSquareClick={() => handleClick(8)} />
      </div>
    </>
  );
}

export default function Game() {
  const [history, setHistory] = useState([Array(9).fill(null)]);
  const [currentMove, setCurrentMove] = useState(0);
  const [player, setPlayer] = useState(null);
  const [waiting, setWaiting] = useState(true);
  const [playerNames, setPlayerNames] = useState({ X: '', O: '' });
  const [gameState, setGameState] = useState({
    squares: Array(9).fill(null),
    xIsNext: true,
  });

  useEffect(() => {
    socket.on('gameState', (state) => {
      setGameState(state);
      setHistory([state.squares]);
      setCurrentMove(state.squares.filter(square => square !== null).length);
      setWaiting(false);
    });

    socket.on('playerAssigned', (role, name) => {
      setPlayer(role);
      setPlayerNames(prevNames => ({ ...prevNames, [role]: name }));
    });

    socket.on('resetGame', () => {
      setGameState({
        squares: Array(9).fill(null),
        xIsNext: true,
      });
      setHistory([Array(9).fill(null)]);
      setCurrentMove(0);
      setPlayer(null);
      setWaiting(true);
      setPlayerNames({ X: '', O: '' });
    });

    socket.on('playerNames', (names) => {
      setPlayerNames(names);
    });

    return () => {
      socket.off('gameState');
      socket.off('playerAssigned');
      socket.off('resetGame');
      socket.off('playerNames');
    };
  }, []);

  function handlePlay(nextSquares) {
    socket.emit('makeMove', nextSquares);
  }

  function jumpTo(nextMove) {
    setCurrentMove(nextMove);
    const newGameState = {
      squares: history[nextMove],
      xIsNext: nextMove % 2 === 0,
    };
    setGameState(newGameState);
    socket.emit('gameState', newGameState);
  }


  const currentSquares = gameState.squares;

  const handleRoleSelection = (role, name) => {
    if (!name) {
      alert('Please enter a name');
      return;
    }
    socket.emit('chooseRole', { role, name });
  };

  const resetGame = () => {
    socket.emit('resetGame');
  };

  return (
    <div className="game">
      {waiting ? (
        <div className="role-selection">
          <input type="text" placeholder="Enter your name" id="name-input" />
          <button onClick={() => handleRoleSelection('X', document.getElementById('name-input').value)}>Be X</button>
          <button onClick={() => handleRoleSelection('O', document.getElementById('name-input').value)}>Be O</button>
        </div>
      ) : (
        <>
          <div className="game-board">
            <Board xIsNext={gameState.xIsNext} squares={currentSquares} onPlay={handlePlay} player={player} />
          </div>
          <div className="game-info">
            <div>{player && `You are player ${player} (${playerNames[player]})`}</div>
            <div>{`Player X: ${playerNames.X}`}</div>
            <div>{`Player O: ${playerNames.O}`}</div>
            <button onClick={resetGame}>Reset Game</button>
          </div>
        </>
      )}
    </div>
  );
}

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
