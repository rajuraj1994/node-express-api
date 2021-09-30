const User=require('../model/user')
const jwt=require('jsonwebtoken')  //authentication
const expressJwt=require('express-jwt') //authorization
const crypto=require('crypto')
const Token=require('../model/token')
const sendEmail=require('../utils/setEmail')


//register user
exports.userRegister=async(req,res)=>{
    let user= new User({
        name:req.body.name,
        email:req.body.email,
        password:req.body.password
    })
    User.findOne({email:user.email},async(error,data)=>{
        if(data==null){
            user= await user.save()
    if(!user){
        return res.status(400).json({error:'something went wrong'})
    }
    //at first store token and user id in the token model
    let token=new Token({
        token:crypto.randomBytes(16).toString('hex'),
        userId:user._id
    })
    token = await token.save()
    if(!token){
        return res.status(400).json({error:"Something went wrong while storing token"})
    }
    //send mail
    sendEmail({
        from:'no-reply@myecommerce.com',
        to:user.email,
        subject:'Email Verification Link',
        text:`Hello, \n\n Please verify your account by click in the below link: \n\n http:\/\/${req.headers.host}\/api\/confirmation\/${token.token}`,
        //http://localhost:5000/api/confirmation/token-number
        html:`<h1>Verify your Email</h1>`
    })
    res.send(user)
        }
        else{
            return res.status(400).json({error:"email is already taken"})
        }
    })
    
}

// confirming the email
exports.postEmailConfirmation=(req,res)=>{
    // at first find the valid or matching token
    Token.findOne({token:req.params.token},(error,token)=>{
        if(error || !token){
            return res.status(400).json({error:"invalid token or token may have expired"})
        }
        //if we find the valid token then find the valid user for that token
        User.findOne({_id:token.userId},(error,user)=>{
            if(error || !user){
                return res.status(400).json({error:"we are unable to find the valid user for this token"})
            }
            //check if user is already verified or not
            if(user.isVerified){
                return res.status(400).json({error:"the email is already verified please login to continue"})
            }
            //save the verified user
            user.isVerified=true
            user.save((error)=>{
                if(error){
                    return res.status(400).json({error:error})
                }
                res.json({message:"congrats,your account has been verified"})
            })
        })
    })
}

//resend verification mail
exports.resendVerificationMail=async(req,res)=>{
    //at first find the register user
    let user=await User.findOne({email:req.body.email})
    if(!user){
        return res.status(400).json({error:"sorry the email you provided not found in our system please try another  or create new account"})

    }
    //check if email is already verified
    if(user.isVerified){
        return res.status(400).json({error:"email is already verified login to contine"})
    }
    //now create token to store in database and send to the email verification link

    let token=new Token({
        token:crypto.randomBytes(16).toString('hex'),
        userId:user._id
    })
    token=await token.save()
    if(!token){
        return res.status(400).json({error:"something went wrong"})
    }
    //sendEmail
    sendEmail({
        from:'no-reply@myecommerce.com',
        to:user.email,
        subject:'Email Verification Link',
        text:`Hello, \n\n Please verify your account by click in the below link: \n\n http:\/\/${req.headers.host}\/api\/confirmation\/${token.token}`,
        //http://localhost:5000/api/confirmation/token-number
        html:`<h1>Verify your Email</h1>`
    })
    res.json({message:"verification link has been  sent to your mail"})
}

//signin process
exports.signIn=async(req,res)=>{
    const{email,password} =req.body
    //at first check if the email is registered in the database or not
    const user=await User.findOne({email})
    if(!user){
        return res.status(400).json({error:"sorry the email you provided is not found in our system"})
    }
    //if the email found then check password for that email
    if(!user.authenticate(password)){
        return res.status(400).json({error:"email and password doesnot match"})
    }
    // check if user is verified or not
    if(!user.isVerified){
        return res.status(400).json({errror:"verfiy your email first to continue"})
    }
    //now generate  token with user id and jwt secret
    const token=jwt.sign({_id:user._id,user:user.role},process.env.JWT_SECRET)
    
    // store token in the cookie
    res.cookie('myCookie',token,{expire:Date.now()+9999999})

    //return user information to frontend
    const{_id,name,role}=user
    return res.json({token,user:{name,email,role,_id}})
}


//signout
exports.signout=(req,res)=>{
    res.clearCookie('myCookie')
    res.json({message:"Signout Success"})
}

//forget password link
exports.forgetPassword=async(req,res)=>{
    const user=await User.findOne({email:req.body.email})
    if(!user){
        return res.status(400).json({error:"sorry the email you provided not found in our system please try another"})
    }
    let token=new Token({
        userId:user._id,
        token:crypto.randomBytes(16).toString('hex')   
    })
    token= await token.save()
    if(!token){
        return res.status(400).json({error:"something went wrong"})
    }
    //send mail
    sendEmail({
        from:'no-reply@myecommerce.com',
        to:user.email,
        subject:'Password Reset Link',
        text:`Hello, \n\n Please reset your password by click in the below link: \n\n http:\/\/${req.headers.host}\/api\/resetpassword\/${token.token}`,
        html:`<h1>Reset Your Password</h1>`
    })
    res.json({message:"password reset link has been sent to your mail"})

}

//reset password
exports.resetPassword=async(req,res)=>{
    //at first find the valid token

    let token=await Token.findOne({token:req.params.token})
    if(!token){
        return res.status(400).json({error:"invalid token or token may have expired"})
    }
    //if token found the find the valid user for that token
    let user=await User.findOne({
        _id:token.userId,
        email:req.body.email
    })
    if(!user){
        return res.status(400).json({error:"sorry the email you provided not associated with this token, please try valid one"})
    }
    //update new password
    user.password=req.body.password
    user=await user.save()
    if(!user){
        return res.status(400).json({error:"failed to reset password"})
    }
    res.json({message:"password has been reset successfully"})
}

//user list
exports.userList=async(req,res)=>{
    const user= await User.find().select('-hashed_password')
    if(!user){
        return res.status(400).json({error:"something went wrong"})
    }
    res.send(user)
}

//user details or single user
exports.userDetails=async(req,res)=>{
    const user=await User.findById(req.params.userid).select('-hashed_password')
    if(!user){
        return res.status(400).json({error:"something went wrong"})
    }
    res.send(user)
}

//require signin
exports.requireSignin=expressJwt({
    secret:process.env.JWT_SECRET,
    algorithms:['HS256'],
    userProperty:'auth'
})