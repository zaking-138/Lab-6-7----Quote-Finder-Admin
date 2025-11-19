import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

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
    res.render('home.ejs')
});

// Display form to add a new author to the database.
app.get('/addAuthor', (req, res) => {
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

app.get('/addQuote', async (req, res) => {
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

app.get('/authors', async (req, res) =>{
    let sql = `SELECT authorId, firstName, lastName
                FROM authors
                ORDER BY lastName`
    const [authors] = await pool.query(sql)
    res.render('authors.ejs', {authors})
})

app.get('/updateAuthor', async(req, res) =>{
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

app.get('/quotes', async (req,res) =>{
    let sql = `SELECT quoteId, quote
                FROM quotes`;
    const [quotes] = await pool.query(sql)
    res.render('quotes.ejs', {quotes})
})

app.get('/updateQuote', async (req,res) =>{
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