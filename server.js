"use strict"
/* Serveur pour le site de recettes */
var express = require('express');
var mustache = require('mustache-express');

var model = require('./model');
var app = express();

// parse form arguments in POST requests
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', './views');

const cookieSession = require('cookie-session');
app.use(cookieSession({
secret: 'mot-de-passe-du-cookie',
}));

/**** Routes pour voir les pages du site ****/


function is_authenticated(req, res, next) {
  if (req.session.id != undefined){
    next();
  } else{
    res.status(401).send('Authentification Required !');
  }
}

/* Retourne une page principale avec le nombre de recettes */
app.get('/', (req, res) => {
  if (req.session.id != undefined){
    res.locals.authenticated = true;
    res.locals.name = req.session.name;
  } else{
    res.locals.authenticated = false;
  }
  res.render('index');
});

/* Retourne les résultats de la recherche à partir de la requête "query" */
app.get('/search', (req, res) => {
  var found = model.search(req.query.query, req.query.page);
  res.render('search', found);
});

/* Retourne le contenu d'une recette d'identifiant "id" */
app.get('/read/:id', (req, res) => {
  var entry = model.read(req.params.id);
  res.render('read', entry);
});

app.get('/create', is_authenticated, (req, res) => {
  res.render('create');
});

app.get('/update/:id', is_authenticated, (req, res) => {
  var entry = model.read(req.params.id);
  res.render('update', entry);
});

app.get('/delete/:id', is_authenticated, (req, res) => {
  var entry = model.read(req.params.id);
  res.render('delete', {id: req.params.id, title: entry.title});
});

/**** Routes pour modifier les données ****/

// Fonction qui facilite la création d'une recette
function post_data_to_recipe(req) {
  return {
    title: req.body.title, 
    description: req.body.description,
    img: req.body.img,
    duration: req.body.duration,
    ingredients: req.body.ingredients.trim().split(/\s*-/).filter(e => e.length > 0).map(e => ({name: e.trim()})),
    stages: req.body.stages.trim().split(/\s*-/).filter(e => e.length > 0).map(e => ({description: e.trim()})),
  };
}

app.post('/create', (req, res) => {
  var id = model.create(post_data_to_recipe(req));
  res.redirect('/read/' + id);
});

app.post('/update/:id', (req, res) => {
  var id = req.params.id;
  model.update(id, post_data_to_recipe(req));
  res.redirect('/read/' + id);
});

app.post('/delete/:id', (req, res) => {
  model.delete(req.params.id);
  res.redirect('/');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  if(model.login(req.body.name, req.body.password) != -1){
    req.session.id = model.login(req.body.name, req.body.password);
    req.session.name = req.body.name;
    res.redirect('/');
  }else{res.redirect('/login');}
});

app.get('/logout', (req, res) => {
  req.session= null;
  res.redirect('/');
});

app.get('/new_user', (req, res) => {
  res.render('new_user');
});



app.post('/new_user', (req, res) => {
  req.session.id = model.new_user(req.body.name, req.body.password);
  if(req.session.id != -1){
  req.session.name = req.body.name;
  res.redirect('/');
  }
});

app.listen(3000, () => console.log('listening on http://localhost:3000'));

