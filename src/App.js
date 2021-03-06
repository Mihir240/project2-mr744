import './App.css';
import './Board.css';
import React, { useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import Board from './Board';
import User from './Users';
import Result from './Result';
import LeaderBoard from './LeaderBoard';

const socket = io();

function App() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currPlayers, setPlayers] = useState([]); // initial array is empty
  const inputRef = useRef(null); // get user input
  const [userName, setUser] = useState(null); // for username
  const [view, setView] = useState(false); // show board
  const [showLead, setLead] = useState(false); // show board
  const [results, setResults] = useState(false); // show the game results
  const [playerId, setPlayId] = useState(0); // player id
  const [activePlayer, setActive] = useState(false); // active player
  const [winner, setWinner] = useState(null);
  const [symbol, setSymbol] = useState('');
  const [leader, setLeader] = useState({});

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
    for (let i = 0; i < lines.length; i += 1) {
      const [a, b, c] = lines[i];
      if (
        squares[a]
        && squares[a] === squares[b]
        && squares[a] === squares[c]
      ) {
        return squares[a];
      }
    }
    return null;
  }

  function updateBoard(arrIndex) {
    let value = '';
    let valid = true;

    setActive((currAct) => {
      // only the active player can update the board
      if (currAct) {
        value = playerId === 1 ? 'X' : 'O';

        setBoard((prevBoard) => {
          const tempBoard = [...prevBoard];

          if (tempBoard[arrIndex] == null) {
            tempBoard[arrIndex] = value;
          } else {
            valid = false;
          }

          if (valid) {
            // if the game is not drawn or the board includes no empty elements
            if (
              calculateWinner(tempBoard) != null
              || !tempBoard.includes(null)
            ) {
              setUser((name) => {
                if (
                  calculateWinner(tempBoard) === 'X'
                  || calculateWinner(tempBoard) === 'O'
                ) {
                  socket.emit('turn', {
                    can_turn: 'able',
                    status: 1,
                    game: name,
                  });
                  setWinner(name);
                } else {
                  socket.emit('turn', {
                    can_turn: 'able',
                    status: 1,
                    game: '',
                  });
                  setWinner('');
                }
                return name;
              });

              // need to create a state to display the results
              setResults(true);
            } else {
              socket.emit('turn', {
                can_turn: 'able',
                status: 0,
                boardVal: value,
              });
              // setSymbol((symbol1) => value);
              setSymbol(value);
            }

            socket.emit('move', { arrIndex, boardVal: value });
          }

          return tempBoard;
        });

        return !valid;
      }
      return currAct;
    });
  }

  function onLogin() {
    if (inputRef != null) {
      const userInput = inputRef.current.value; // get the username from the UI
      setUser(userInput);
      setView(true); // once user clicks login then only show board
      socket.emit('login', { username: userInput, logged: 'loggedIn' }); // just send the username and room
    }
  }

  // define once and then always listening
  // always put listeners in useEffect
  useEffect(() => {
    // setup the data object in python file
    socket.on('move', (data) => {
      setBoard((prevBoard) => {
        const tempBoard = [...prevBoard];
        tempBoard[data.arrIndex] = data.boardVal;
        if (calculateWinner(tempBoard) != null || !tempBoard.includes(null)) {
          setResults(true);
        }
        return tempBoard;
      });
    });

    // going to need multiple socket.ons to listen for various events happening

    // updating the playerCount
    socket.on('login', (data) => {
      setActive(data.user_dict[socket.id][2]);
      setPlayId(data.user_dict[socket.id][1]);
      setPlayers([...data.users]);
      setLeader(JSON.parse(data.leaderboard));
    });
    socket.on('turn', (data) => {
      setSymbol(data.boardVal);
      setPlayId((id) => {
        if (id < 3) setActive(data.able);
        return id;
      });

      if (data.status === 1) {
        setWinner(data.game);
        setLeader(JSON.parse(data.leaderboard));
      }
    });

    socket.on('disconnect', () => {
      window.location.reload();
    });
    // socket.on('disconnect', window.location.reload());

    socket.on('replay', (data) => {
      setWinner(null);
      setBoard(data.board);
      setResults(false);
      setPlayId((id) => {
        if (id === 1) setActive(true);

        return id;
      });
    });
  }, []);

  function onReplay() {
    // reset the board
    setBoard(Array(9).fill(null));
    setWinner(null);

    // reset the active players
    if (playerId === 1) {
      setActive(true);
    }
    // reset the results

    setResults(false);
    // reset all of the items again
    socket.emit('replay', {
      board: Array(9).fill(null),
      res: false,
      active: false,
    });
  }

  // if they can see the board that means that they are logged in and only then
  let button = '';
  if (view && (playerId === 1 || playerId === 2)) {
    button = (
      <button type="button" className="again" onClick={() => onReplay()}>
        <span>Play Again!</span>
      </button>
    );
  } else {
    button = '';
    if (activePlayer) button = '';
  }

  let active1;
  let active2 = '';
  if (!results) {
    if (symbol === 'X') {
      active1 = 'no-show';
      active2 = 'show';
    } else if (symbol === 'O') {
      active1 = 'show';
      active2 = 'no-show';
    } else {
      active1 = 'show';
      active2 = 'no-show';
    }
  }

  return (
    <div>
      <div className="title-div">
        <h1 className="title"> Tic Tac Toe!</h1>
      </div>

      {view ? (
        <>
          <div className="players">
            <div>
              <h2 className="users">
                Welcome,
                {' '}
                <span>{userName}</span>
                !
              </h2>
            </div>
            <div>
              {' '}
              <h2 className="users1">
                {' '}
                <span className={active1}>{currPlayers[0]}</span>
                {' '}
                vs.
                {' '}
                <span className={active2}>
                  {currPlayers[1]}
                  {' '}
                </span>
              </h2>
              {' '}
            </div>
            <LeaderBoard
              leader={leader}
              setLead={setLead}
              showLead={showLead}
              user={userName}
            />
          </div>

          <div data-testid="board-shown" className="center-board">
            <Result result={results} button={button} winner={winner} />
            <Board updateBoard={updateBoard} board={board} />
            <User players={currPlayers} />
          </div>
        </>
      ) : (
        <>
          <div className="login-box">
            <div className="inner">
              <h3 className="enter-name"> Please Enter a Username!</h3>
              <div className="user-name">
                <input className="input" ref={inputRef} type="text" />
              </div>
              <div className="submit">
                <button
                  type="button"
                  className="submit-bttn"
                  onClick={() => onLogin()}
                >
                  <span>Login</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
