# Odysee Tip Goal

Widget for OBS to create a tip goal for your Odysee livestream. 

![tip goal](https://thumbs.odycdn.com/76b41aae2d7b6035efdc713d9ddb782d.webp)

## Prerequisites

1. Node.js v16 or higher (latest LTS version recommended).
2. npm (included with Node.js).
3. OBS Studio.

## Installation

Clone this repository or download the files. Open a terminal in the project folder. Run the following command to install the dependencies:

Use the command: **npm install**. Rename the **.env.example file to .env** in the project root, change the AR wallet address (arweave) and the other data for the widget.

```
WALLET_ADDRESS=AR wallet address
PORT=3002
GOAL_AR=10  # Monthly goal in AR
STARTING_AR=0  # Initial tip value
```

Save the changes and then run **npm start** at the terminal. The server will run the app and you can monitor it in the terminal.

## OBS Integration:

1. In OBS Studio, add a new "Source" of type "Browser" to your scene.
2. Set the URL to http://localhost:3002.
3. Adjust the size according to your needs.

And that's it, the widget is now working. You can monitor the entire process from the terminal and check for any unexpected errors. You can also test it temporarily from a web browser before using it in OBS or any live streaming software.

## Main Dependencies:

1. Express: Web server
1. WebSockets: Real-time communication
1. Axios: HTTP requests
1. dotenv: Environment variable management

## Some considerations:

The widget's styles and messages are fully customizable from the project files. If you'd like to run some **local notification testing** before receiving any real transactions, you can use this command below.

## For the terminal on Windows:

```
curl.exe -X POST http://localhost:3002/update-tips -H "Content-Type: application/json" -d '{"amount": 20}'
```

## For the terminal on Linux:

```
curl -X POST http://localhost:3002/update-tips \ -H "Content-Type: application/json" \ -d '{"amount": 20}'
```

**This is an independent project for fun; it is not an official Odysee product.**