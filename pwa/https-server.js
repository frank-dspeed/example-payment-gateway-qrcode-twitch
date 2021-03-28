/**
 * Manual
 */
/*
## Certs
Use GoLang
```
go run github.com/FiloSottile/mkcert
```

Download and chmod +x https://github.com/FiloSottile/mkcert/releases
sudo ln -s ~/Downloads/mkcert-v1.4.3-linux-amd64 /usr/bin/mkcert

# mkcert -install localhost # maybe shortcut NotVerifyed
mkcert -install # to create a local CA
mkcert localhost 127.0.0.1 ::1 # to create a trusted cert for localhost in the current directory

NodeJS (doesn't use the system root store)
export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
node https-server.js
*/
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();    
app.use(express.static('public'));
const server = https.createServer({
    key: fs.readFileSync('./security/localhost+2-key.pem'), // where's me key?
    cert: fs.readFileSync('./security/localhost+2.pem'), // where's me cert?
    requestCert: false,
    rejectUnauthorized: false,
}, app).listen(8080,() => {
    console.log('server running at https://localhost:' + 8080)
}); 