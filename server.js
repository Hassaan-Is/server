const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
require('dotenv').config();

const app = express();
const bcrypt = require('bcrypt');
const saltRounds = 10; // Nombre de "salage" pour le hachage
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:4200',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Mettez votre mot de passe MySQL ici
  database: 'tpweb'
});


app.get('/user/:nom', (req, res) => {
  const nomUtilisateur = req.params.nom;

  // Effectuer une requête SQL pour récupérer les données de l'utilisateur avec ce nom
  connection.query('SELECT * FROM comptes WHERE nom = ?', [nomUtilisateur], (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la récupération des données de l\'utilisateur :', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des données de l\'utilisateur' });
    } else {
      if (results.length > 0) {
        res.status(200).json(results[0]); // Renvoyer les données de l'utilisateur trouvé
      } else {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
    }
  });
});




app.post('/log', (req, res) => {
  const { nom, password } = req.body;
  
  const query = 'SELECT * FROM comptes WHERE nom = ?';
  connection.query(query, [nom], (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la récupération du compte :', error);
      res.status(500).json({ message: 'Erreur lors de la connexion' });
    } else {
      if (results.length === 0) {
        // Le compte n'existe pas
        res.status(401).json({ message: 'Nom ou mot de passe incorrect' });
      } else {
        // Comparer le mot de passe haché stocké en base de données avec le mot de passe fourni par l'utilisateur
        const storedHashedPassword = results[0].password; // Supposons que le mot de passe haché est stocké dans la colonne "password" de la table users
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (result) {
            // Mot de passe correct
            res.status(200).json({ message: 'Connexion réussie' });
          } else {
            // Mot de passe incorrect
            res.status(401).json({ message: 'Nom ou mot de passe incorrect' });
          }
        });
      }
    }
  });
});


app.post('/create', (req, res) => {
  const { nom, prenom,mail, telephone,password } = req.body;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error('Erreur lors du hachage du mot de passe :', err);
      res.status(500).json({ message: 'Erreur lors de la création du compte' });
    } else {
      const query = 'INSERT INTO comptes (nom, prenom, email, telephone,password) VALUES (?, ?, ?, ?, ?)';
      connection.query(query, [nom, prenom, mail, telephone, hash], (error, results, fields) => {
        if (error) {
          console.error('Erreur lors de la création du compte :', error);
          res.status(500).json({ message: 'Erreur lors de la création du compte' });
        } else {
          console.log('Compte créé avec succès');
          res.status(200).json({ message: 'Compte créé avec succès' });
        }
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});

app.get('/messages', (req, res) => {
  // Effectuer une requête SQL pour récupérer tous les messages de la table messages
  connection.query('SELECT m.id,  DATE_FORMAT(date, \'%Y-%m-%d\') AS date, text, idcompte, nom, prenom FROM message m, comptes c WHERE m.idCompte = c.id', (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la récupération des messages :', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    } else {
      if (results.length > 0) {
        res.status(200).json(results); // Renvoyer tous les messages trouvés
      } else {
        res.status(404).json({ message: 'Aucun message trouvé' });
      }
    }
  });
});
