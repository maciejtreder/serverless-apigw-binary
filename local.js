let app = require('./dist/app');
let port = process.env.PORT || 8000;

// Server
 app.listen(port, () => {
    console.log(`Listening on: http://localhost:${port}`);
});
