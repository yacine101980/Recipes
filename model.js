"use strict"
/* Module de recherche dans une base de recettes de cuisine */
const Sqlite = require('better-sqlite3');

let db = new Sqlite('db.sqlite');

/* Lire le contenu d'une recette à partir de son identifiant.

Cette fonction prend en argument un identifiant de recette.

Elle renvoie une recette sous la forme d'un objet :
- title: son titre
- description: la description textuelle de la recette
- duration: la durée totale de la recette
- img: l'url de son image
- ingredients: une liste d'ingrédients (pour chacun il y a un champ name)
- stages: une liste d'étapes pour la recette (chacune contient un champ description)

Cette fonction renvoie null si l'identifiant n'existe pas.
 */
exports.read = (id) => {
  var found = db.prepare('SELECT * FROM recipe WHERE id = ?').get(id);
  if(found !== undefined) {
    found.ingredients = db.prepare('SELECT name FROM ingredient WHERE recipe = ? ORDER BY rank').all(id);
    found.stages = db.prepare('SELECT description FROM stage WHERE recipe = ? ORDER BY rank').all(id);
    return found;
  } else {
    return null;
  }
};

/* Fonction pour créer une nouvelle recette dans la base.

Prend en paramètre un objet javascript décrivant la recette sous la forme suivante :
recipe = {
  title: 'text',
  description: 'text',
  duration: 'text',
  ingredients: [
    {name: 'text'},
    ...
  ],
  stages: [
    {description: 'text'},
    ...
  ]
}

Cette fonction retourne l'identifiant de la recette créée.
*/
exports.create = function(recipe) {
  var id = db.prepare('INSERT INTO recipe (title, img, description, duration) VALUES (@title, @img, @description, @duration)').run(recipe).lastInsertRowid;

  var insert1 = db.prepare('INSERT INTO ingredient VALUES (@recipe, @rank, @name)');
  var insert2 = db.prepare('INSERT INTO stage VALUES (@recipe, @rank, @description)');

  var transaction = db.transaction((recipe) => {
    for(var j = 0; j < recipe.ingredients.length; j++) {
      insert1.run({recipe: id, rank: j, name: recipe.ingredients[j].name});
    }
    for(var j = 0; j < recipe.stages.length; j++) {
      insert2.run({recipe: id, rank: j, description: recipe.stages[j].description});
    }
  });

  transaction(recipe);
  return id;
}

/* Fonction pour mettre à jour une recette de la base.

Un identifiant de recette doit être passé en premier argument.
Le second argument est un objet javascript au même format que pour la fonction create.

Cette fonction revoie true si l'identifiant existe dans la base.
*/
exports.update = function(id, recipe) {
  var result = db.prepare('UPDATE recipe SET title = @title, img = @img, description = @description WHERE id = ?').run(recipe, id);
  if(result.changes == 1) {
    var insert1 = db.prepare('INSERT INTO ingredient VALUES (@recipe, @rank, @name)');
    var insert2 = db.prepare('INSERT INTO stage VALUES (@recipe, @rank, @description)');

    var transaction = db.transaction((recipe) => {
      db.prepare('DELETE FROM ingredient WHERE recipe = ?').run(id);
      for(var j = 0; j < recipe.ingredients.length; j++) {
        insert1.run({recipe: id, rank: j, name: recipe.ingredients[j].name});
      }
      db.prepare('DELETE FROM stage WHERE recipe = ?').run(id);
      for(var j = 0; j < recipe.stages.length; j++) {
        insert2.run({recipe: id, rank: j, description: recipe.stages[j].description});
      }
    });

    transaction(recipe);
    return true;
  }
  return false;
}

/* Fonction pour effacer une recette dans la base à partir de son identifiant */
exports.delete = function(id) {
  db.prepare('DELETE FROM recipe WHERE id = ?').run(id);
  db.prepare('DELETE FROM ingredient WHERE recipe = ?').run(id);
  db.prepare('DELETE FROM stage WHERE recipe = ?').run(id);
}

/* Recherche d'une recette par requête, avec pagination des résultats

Cette fonction prend en argument la requête sous forme d'une chaîne de caractères
et le numéro de la page de résultats.

Cette fonction retourne un dictionnaire contenant les champs suivants :
- results: liste de recettes (version courte contenant l'identifiant de la recette, son titre et l'url de son image)
- num_found: le nombre de recettes trouvées
- query: la requête
- next_page: numero de la page suivante
- page: numero de la page courante
- num_pages: nombre total de pages
*/
exports.search = (query, page) => {
  const num_per_page = 32;
  query = query || "";
  page = parseInt(page || 1);

  // on utiliser l'opérateur LIKE pour rechercher dans le titre 
  var num_found = db.prepare('SELECT count(*) FROM recipe WHERE title LIKE ?').get('%' + query + '%')['count(*)'];
  var results = db.prepare('SELECT id as entry, title, img FROM recipe WHERE title LIKE ? ORDER BY id LIMIT ? OFFSET ?').all('%' + query + '%', num_per_page, (page - 1) * num_per_page);

  return {
    results: results,
    num_found: num_found, 
    query: query,
    next_page: page + 1,
    page: page,
    num_pages: parseInt(num_found / num_per_page) + 1,
  };
};


exports.login = function(name, password) {
  let res = db.prepare('SELECT id FROM user WHERE name = ? AND password = ?').get(name, password);
  if (res.id == undefined){
    return -1;
  }
  return res.id;
}


exports.new_user = function(name, password){
  let res = db.prepare('INSERT INTO user (name, password) VALUES (?, ?)').run(name, password);
  return res.lastInsertRowid;
}







