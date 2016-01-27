/* eslint no-console: 0 */

import path from 'path';
import express from 'express';
import webpack from 'webpack';
import webpackMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import config from './webpack.config.js';

import jwt from 'express-jwt';
import cors from 'cors';
var bodyParser = require('body-parser')
import request from 'request';

import serverConfig from './server_config.js';

const isDeveloping = process.env.NODE_ENV !== 'production';
console.log('isDeveloping=' + isDeveloping)
const port = isDeveloping ? 3000 : process.env.PORT;
const app = express();

var authenticate = jwt({
  secret: new Buffer(serverConfig.auth0ClientSecret, 'base64'),
  audience: serverConfig.auth0ClientID
});

if (isDeveloping) {
  const compiler = webpack(config);
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    contentBase: 'src',
    stats: {
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  });

  app.use(middleware);
  app.use(webpackHotMiddleware(compiler));
  app.get('/', function response(req, res) {
    res.write(middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/index.html')));
    res.end();
  });
} else { // production
  app.use(express.static(__dirname + '/dist'));
  app.get('/', function response(req, res) {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}

// other express configuration
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// set up the secured api using the jwt verfivier
app.use('/secured', authenticate);

app.get('/ping', function(req, res) {
  res.send(200, {text: "All good. You don't need to be authenticated to call this"});
});


app.get('/secured/ping', function(req, res) {
  var url = 'https://' + serverConfig.auth0Domain + '/api/v2/users/' + encodeURIComponent(req.user.sub)
  request({
      'url': url,
      'auth': {
        'bearer': serverConfig.auth0ApiToken
      }
    }, function(err, response, body) {
      res.send(200, {text: "All good. You only get this message if you're authenticated"});
    })

})

app.get('/secured/getUsers', function(req, res) {
  var url = 'https://' + serverConfig.auth0Domain + '/api/v2/users'
  request({
      'url': url,
      'auth': {
        'bearer': serverConfig.auth0ApiToken
      }
    }, function(err, response, body) {
      res.json(body)
    })
})

app.post('/secured/updateUser', function(req, res) {
  var url = 'https://' + serverConfig.auth0Domain + '/api/v2/users/' + req.body.user_id
  request({
      'url': url,
      'method': 'patch',
      'auth': {
        'bearer': serverConfig.auth0ApiToken
      },
      'body' : {
        'app_metadata': {
          'datatools' : req.body.data
        }
      },
      'json' : true
    }, function(err, response, body) {
      res.send(200);
    })
})

app.post('/secured/createUser', function(req, res) {

  var user = {
    'connection': "Username-Password-Authentication",
    'email': req.body.email,
    'password': req.body.password,
    'app_metadata': {
      'datatools' : {
        'projects' : req.body.projects
      }
    }
  }
  console.log(user)

  var url = 'https://' + serverConfig.auth0Domain + '/api/v2/users'
  console.log('create: ' + url)
  request({
      'url': url,
      'method': 'post',
      'auth': {
        'bearer': serverConfig.auth0ApiToken
      },
      'body' : user,
      'json' : true
    }, function(err, response, body) {
      res.send(200);
    })
})

app.listen(port, '0.0.0.0', function onStart(err) {
  if (err) {
    console.log(err);
  }
  console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
});
