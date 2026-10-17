# TCP Tic-Tac-Toe

Practical assignment for the Computer Networks course. It consists of a multiplayer Tic-Tac-Toe game built from scratch using only the native `net` module in Node.js, without any external frameworks.

## Features

* Creation and management of connections via **TCP Sockets**.
* Real-time gameplay between two distinct terminal instances.
* Manual parsing of text-based coordinates sent over the network.
* Game rules validation (win conditions, draws, and invalid moves).
* Graceful connection termination and error handling.

## How to run

1. Make sure you have Node.js installed on your computer.
2. Clone the repository and open the terminal in the project folder.
3. Start the application with the following command:

   ```bash
   node jogo.js