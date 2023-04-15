"use strict"

const fs = require('fs');
const Sqlite = require('better-sqlite3');

let db = new Sqlite('db.sqlite');

let entries = JSON.parse(fs.readFileSync('data.json').toString());
let load = function(filename) {
  const recipes = JSON.parse(fs.readFileSync(filename));

  db.prepare('DROP TABLE IF EXISTS recipe').run();
  db.prepare('DROP TABLE IF EXISTS ingredient').run();
  db.prepare('DROP TABLE IF EXISTS stage').run();
  db.prepare('DROP TABLE IF EXISTS user').run();

  db.prepare('CREATE TABLE recipe (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, img TEXT, description TEXT, duration TEXT)').run();
  db.prepare('CREATE TABLE ingredient (recipe INT, rank INT, name TEXT)').run();
  db.prepare('CREATE TABLE stage (recipe INT, rank INT, description TEXT)').run();

  let insert1 = db.prepare('INSERT INTO recipe VALUES (@id, @title, @img, @description, @duration)');
  let insert2 = db.prepare('INSERT INTO ingredient VALUES (@recipe, @rank, @name)');
  let insert3 = db.prepare('INSERT INTO stage VALUES (@recipe, @rank, @description)');

  db.prepare('CREATE TABLE user (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, password TEXT)').run();
  db.prepare("INSERT INTO user(name, password) VALUES ('Yacine', 'Yacine2002.')").run();


  let transaction = db.transaction((recipes) => {

    for(let id = 0;id < recipes.length; id++) {
      let recipe = recipes[id];
      recipe.id = id;
      insert1.run(recipe);
      for(let j = 0; j < recipe.ingredients.length; j++) {
        insert2.run({recipe: id, rank: j, name: recipe.ingredients[j].name});
      }
      for(let j = 0; j < recipe.stages.length; j++) {
        insert3.run({recipe: id, rank: j, description: recipe.stages[j].description});
      }
    }
  });

  transaction(recipes);
}

load('data.json');

