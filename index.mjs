import express from 'express';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import session from 'express-session';

const app = express();
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'cst336',
  resave: false,
  saveUninitialized: true,
//   cookie: { secure: true } // Only works in web servers.
}))

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({ extended: true }));

//setting up database connection pool
const pool = mysql.createPool({
    host: "s3lkt7lynu0uthj8.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "yil571kkht6sqhny",
    password: "rr3befy9nqxees47",
    database: "uq6us0wk88su4qpi",
    connectionLimit: 10,
    // waitForConnection: true
});

const [rowsAuthors] = await pool.query('SELECT authorId, firstName, lastName FROM `authors`')
const [rowsCategories] = await pool.query('SELECT DISTINCT category FROM `quotes`')
//routes
app.get('/', (req, res) => {
    res.render('login.ejs')
});
// app.get('/test', async (req, res) =>{
//     let accessToken = "48027fa6e5ae4e90a670bb831279bbe6"

//     let response = await fetch('https://api.spotify.com/v1/search?q=remaster%2520track%3ADoxy%2520artist%3AMiles%2520Davis&type=album', {
//         headers: {
//             Authorization: 'Bearer' + accessToken
//         }
//     })
//     let data = await response.json()
//     console.log(data);
//     res.redirect('/')
// })
app.post('/attemptLogin', async (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let match = false;

    let sql = 'SELECT * FROM users WHERE username = ?'
    const [rows] = await pool.query(sql, [username]);
    if(rows.length > 0){
        let hashedPW = rows[0].password;
        match = await bcrypt.compare(password, hashedPW);
    }

    if(match){
        req.session.isUserAuthenticated = true;
        req.session.fullName = `${rows[0].firstName} ${rows[0].lastName}`
        console.log(`${rows[0].firstName} ${rows[0].lastName} logged in.`)
        res.redirect('/home')
    }else{
        res.render('login.ejs', {"loginError":"Wrong Credentials!"})
    }
});
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

//middleware functions.
function isUserAuthenticated(req, res, next){
    if(req.session.isUserAuthenticated){
        next()
    }else{
        res.redirect('/')
    }
}

app.get('/home', isUserAuthenticated, (req, res) => {
    let name = req.session.fullName;
    res.render('home.ejs', {name})
});

app.get('/deleteAuthor', isUserAuthenticated, async(req, res) =>{
    let deleteId = req.query.authorId
    let sql = `DELETE FROM authors
                WHERE authorId = ${deleteId}`
    const [rows] = await pool.query(sql)
    res.redirect('/authors')
})
app.get('/deleteQuote', isUserAuthenticated, async(req, res) =>{
    let deleteId = req.query.quoteId
    let sql = `DELETE FROM quotes
                WHERE quoteId = ${deleteId}`
    const [rows] = await pool.query(sql)
    res.redirect('/quotes')
})

// Display form to add a new author to the database.
app.get('/addAuthor', isUserAuthenticated, (req, res) => {
    res.render('addAuthor.ejs')
})

app.post('/addAuthor', async (req, res) => {
    let firstName = req.body.firstName
    let lastName = req.body.lastName
    let dob = req.body.dob
    let dod = req.body.dod
    let sex = req.body.sex
    let prof = req.body.profession
    let country = req.body.country
    let portrait = req.body.img
    let bio = req.body.bio

    let sql = `INSERT INTO authors
                (firstName, lastName, dob, dod, sex, profession, country, portrait, biography)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let sqlParams = [firstName, lastName, dob, dod, sex, prof, country, portrait, bio]
    console.log(sqlParams)
    const [rows] = await pool.query(sql, sqlParams)
    res.render('addAuthor.ejs')
})

app.get('/addQuote', isUserAuthenticated, async (req, res) => {
    let error = ''
    res.render('addQuote.ejs', { rowsAuthors, rowsCategories, error })
})

app.post('/addQuote', async (req, res) => {
    let quote = req.body.quote
    let authorId = req.body.authorId
    let category = req.body.category
    let likes = req.body.likes
    let error

    if (!(quote.length > 4)) {
        error = 'Quote must be 5 or more characters!'
        console.log(error)
    } else {
        error = ''
        let sql = `INSERT INTO quotes
                (quote, authorId, category, likes)
                VALUES (?, ?, ?, ?)`
        let sqlParams = [quote, authorId, category, likes]
        const [rows] = await pool.query(sql, sqlParams)
    }

    res.render('addQuote.ejs', { rowsAuthors, rowsCategories, error })
})

app.get('/authors', isUserAuthenticated, async (req, res) =>{
    let sql = `SELECT authorId, firstName, lastName
                FROM authors
                ORDER BY lastName`
    const [authors] = await pool.query(sql)
    res.render('authors.ejs', {authors})
})

app.get('/updateAuthor', isUserAuthenticated, async(req, res) =>{
    let authorId = req.query.authorId
    console.log(authorId)
    let sql = `SELECT * , DATE_FORMAT(dob, '%Y-%m-%d') ISOdob, DATE_FORMAT(dod, '%Y-%m-%d') ISOdod
                FROM authors
                WHERE authorId = ?`;
    const [authorInfo] = await pool.query(sql, [authorId]);
    res.render('updateAuthor.ejs', {authorInfo});
})

app.post(`/updateAuthor`, async (req, res) =>{
    let firstName = req.body.firstName
    let lastName = req.body.lastName
    let authorId = req.body.authorId
    
    let sql = `UPDATE authors SET firstName = ?, 
                lastName = ?, WHERE authorId = ?`
    let sqlParams = [firstName, lastName, authorId]
    const [update] = await pool.query(sql, sqlParams)
    res.redirect('/authors') // Display list of authors again.
})

app.get('/quotes', isUserAuthenticated, async (req,res) =>{
    let sql = `SELECT quoteId, quote
                FROM quotes`;
    const [quotes] = await pool.query(sql)
    res.render('quotes.ejs', {quotes})
})

app.get('/updateQuote', isUserAuthenticated, async (req,res) =>{
    let quoteId = req.query.quoteId
    let sql = `SELECT *
                FROM quotes WHERE quoteId = ?`;
    const [quoteInfo] = await pool.query(sql, [quoteId])

    let sqlAuthors = `SELECT authorId, firstName, lastName FROM authors`
    let sqlCategories = `SELECT DISTINCT category FROM quotes`

    const [rowsAuthors] = await pool.query(sqlAuthors)
    const [rowsCategories] = await pool.query(sqlCategories)

    res.render('updateQuote.ejs', {quoteInfo, rowsAuthors, rowsCategories})
})

app.get("/dbTest", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT CURDATE()");
        res.send(rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).send("Database error!");
    }
});//dbTest

app.listen(3000, () => {
    console.log("Express server running")
})