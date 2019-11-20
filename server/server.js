const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const generateGuid = require('uuid/v1');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

let games = {};

function isExistingGame(id) {
	return Object.keys(games).filter(g => g == id).length > 0;
}

function ok(res, data) {
	res.send({status: 200, data: data});
}

function error(res, error) {
	res.send({status: 500, error: error});
}

app.post('/finishGame/:id', function (req, res) {
	const id = req.params.id;
	const game = games[id];
	game.finished = true;

	ok(res);
});

app.post('/finishQuestion/:id', function (req, res) {
	const id = req.params.id;
	const game = games[id];
	game.currentQuestion.timeUp = true;

	ok(res);
});

app.post('/games', function (req, res) {
	console.log(req.body);
	
	const id = req.body.id;
	if (isExistingGame(id)) {
		error(res, "Já existe um jogo com este identificador");
		return;
	}

	const secret = generateGuid();
	const game = { id: id, players: [], secret: secret, finished: false, keepAlive: Date.now() };
	games[id] = game;

	ok(res, { secret: secret });
});

app.post('/games/:id/keepAlive', function (req, res) {
	const id = req.params.id;
	const guid = req.body.guid;

	if (!isExistingGame(id)) {
		error(res, "Jogo não existente");
		return;
	}

	game.keepAlive = Date.now();
	ok(res);
});

app.post('/enterGame', function(req, res) {
	const id = req.body.id;
	const teamName = req.body.teamName;

	if (!isExistingGame(id)) {
		error(res, "Jogo não existente");
		return;
	}

	const player = {
		guid: generateGuid(),
		teamName: teamName,
		keepAlive: Date.now()
	};

	console.log(player);

	const game = games[id];
	game.players.push(player);

	console.log(game.players);

	ok(res);
})

app.get('/state/:id', function(req, res) {
	const id = req.params.id;
	if (!isExistingGame(id)) {
		error(res, "Jogo não existente");
		return;
	}

	const game = games[id];

	ok(res, { started: game.currentQuestion != undefined, currentQuestion: game.currentQuestion });
});

app.get('/answers/:id', function(req, res) {
	const id = req.params.id;
	if (!isExistingGame(id)) {
		error(res, "Jogo não existente");
		return;
	}

	ok(res, { answers: games[id].answers });
});

app.get('/players/:id', function(req, res) {
	const id = req.params.id;
	if (!isExistingGame(id)) {
		error(res, "Jogo não existente");
		return;
	}

	const players = games[id].players;

	ok(res, { players: players });
});

app.post('/sendQuestion/:id', function(req, res) {
	const id = req.params.id;
	const question = {
		operatorA: req.body.operatorA,
		operatorB: req.body.operatorB,
		operation: req.body.operation,
		options: req.body.options,
		timeUp: false
	};

	console.log(question);

	let game = games[id];
	game.currentQuestion = question;
	game.answers = [];
	ok(res);
});

app.post('/sendAnswer/:id', function(req, res) {
	const id = req.params.id;

	let game = games[id];
	game.answers.push({player: req.body.player, answer: req.body.answer});

	ok(res);
});

app.get('/games', function (req, res) {
	let toRemoveGames = [];
	const now = Date.now();
	Object.keys(games).map((g) => 
	{
		if (g.keepAlive + 10000 > now) {
			toRemoveGames.push(g);
		}
	});

	Object.keys(toRemoveGames).map((g) => {
		delete games[g.id];
	});

	const response = { games: Object.keys(games).map((g) => 
	{
		return {id: g};
	})};
	ok(res, response);
});

const port = process.env.PORT || 3000;
app.listen(port, function () {
	console.log(`Server listening on port ${port}`);
});