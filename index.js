const express=require('express')
require('dotenv').config()
const db=require('./database/connection')
const bodyParser=require('body-parser')
const morgan=require('morgan')
const expressValidator=require('express-validator')
const cookieParser=require('cookie-parser')
const cors=require('cors')



const CategoryRoute=require('./route/categoryRoute')
const ProductRoute=require('./route/productRoute')
const AuthRoute=require('./route/authRoute')
const OrderRoute=require('./route/orderRoute')

const app=express()

//middleware
app.use(bodyParser.json())
app.use('/public/uploads',express.static('public/uploads'))
app.use(morgan('dev'))
app.use(expressValidator())
app.use(cookieParser())
app.use(cors())



//routes
app.use('/api',CategoryRoute)
app.use('/api',ProductRoute)
app.use('/api',AuthRoute)
app.use('/api',OrderRoute)


const port=process.env.PORT || 5000

//server

app.listen(port,()=>{
    console.log(`Server started on port ${port}`)
})
