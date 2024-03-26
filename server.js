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


app.get('/user/:id', (req, res) => {
  const userId = req.params.id;

  // Effectuer une requête SQL pour récupérer les données de l'utilisateur avec cet ID
  connection.query('SELECT * FROM comptes WHERE id = ?', [userId], (error, results, fields) => {
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



app.get('/messages', (req, res) => {
  // Effectuer une requête SQL pour récupérer tous les messages de la table messages
  connection.query('SELECT m.id,  DATE_FORMAT(date, \'%Y-%m-%d\') AS date, titre,text, idcompte, nom, prenom, titre FROM message m, comptes c WHERE m.idCompte = c.id', (error, results, fields) => {
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

app.get('/messages/:id', (req, res) => {
  const userId = req.params.id; // Récupérer l'ID de l'utilisateur depuis les paramètres de l'URL
  // Effectuer une requête SQL pour récupérer tous les messages de l'utilisateur spécifié avec le nom et le prénom de l'auteur
  connection.query('SELECT titre, text, date,nom,prenom FROM Comptes C, Message M WHERE C.id=M.idCompte and M.idCompte=?', [userId], (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la récupération des messages :', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des messages' });
    } else {
      if (results.length > 0) {
        res.status(200).json(results); // Renvoyer tous les messages trouvés pour l'utilisateur spécifié
      } else {
        res.status(404).json({ message: 'Aucun message trouvé pour cet utilisateur' });
      }
    }
  });
});





app.post('/log', (req, res) => {
  const { email, password } = req.body;
  
  const query = 'SELECT * FROM comptes WHERE email = ?';
  connection.query(query, [email], (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la récupération du compte :', error);
      res.status(500).json({ message: 'Erreur lors de la connexion' });
    } else {
      if (results.length === 0) {
        // Le compte n'existe pas
        res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      } else {
        // Comparer le mot de passe haché stocké en base de données avec le mot de passe fourni par l'utilisateur
        const storedHashedPassword = results[0].password; // Supposons que le mot de passe haché est stocké dans la colonne "password" de la table users
        bcrypt.compare(password, storedHashedPassword, (err, result) => {
          if (result) {
            // Mot de passe correct
            const userId = results[0].id;
            res.status(200).json({ message: 'Connexion réussie', id: userId });
          } else {
            // Mot de passe incorrect
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
          }
        });
      }
    }
  });
});

app.post('/update/:id', (req, res) => {
  const userId = req.params.id;
  const { nom, prenom, email, telephone } = req.body;
  
  // Attention à l'écriture de la requête SQL
  const query = 'UPDATE `comptes` SET `nom`=?, `prenom`=?, `email`=?, `telephone`=? WHERE id=?';
  // Assurez-vous de fournir les valeurs dans le bon ordre et sous forme de tableau
  connection.query(query, [nom, prenom, email, telephone, userId], (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la mise à jour du compte :', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour' });
    } else {
      if (results.affectedRows === 0) {
        // Aucune ligne mise à jour, cela signifie probablement que le compte avec l'ID spécifié n'existe pas
        res.status(404).json({ message: 'Compte non trouvé' });
      } else {
        // Mise à jour réussie
        res.status(200).json({ message: 'Mise à jour réussie' });
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

app.post('/addMessage', (req, res) => {
  const date = new Date().toISOString(); // Utilisation de la date actuelle au format ISO
  const { titre, text, idCompte } = req.body; // Ajout de idCompte

  const query = 'INSERT INTO message (titre, date, text, idCompte) VALUES (?, ?, ?, ?)'; // Modification de la requête pour inclure idCompte
  connection.query(query, [titre, date, text, idCompte], (error, results, fields) => {
    if (error) {
      console.error('Erreur lors de la création du message :', error);
      res.status(500).json({ message: 'Erreur lors de la création du message' });
    } else {
      console.log('Message créé avec succès');
      res.status(200).json({ message: 'Message créé avec succès' });
    }
  });
});

app.post('/suivre', (req, res) => {
  const {idCompte,idSuivis } = req.body;
  const query = 'INSERT INTO `abonnes`(`idCompte`, `idSuivis`) VALUES (?, ?)'; 
  connection.query(query, [idCompte, idSuivis], (error, results, fields) => {
    if (error) {
      console.error('Erreur compte non suivi :', error);
      res.status(500).json({ message: 'Erreur' });
    } else {
      res.status(200).json({ message: 'Suivi' });
    }
  });
});


app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
