require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DISCORD_CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://la-sentinelle-production.up.railway.app/auth/callback';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jirito-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

const { DEFAULT_EMBEDS } = require('../embedConfig');

const DEFAULT_CONFIG = {
  bienvenue: { actif: false, salonId: '', message: 'Bienvenue {user} !', mention: true, embed: true, mp: false },
  reglement: { salonId: '', messageId: '', roleAcceptationId:
