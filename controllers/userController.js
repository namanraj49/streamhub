const User = require('../models/userModel');

const bcrypt = require('bcrypt');

const loadLogin = async(req,res)=>{
    try {

        res.render('login');
        
    } catch (error) {
        console.log(error.message);
    }
}

const login = async(req, res) =>{
    try {
        
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({ email:email });
        if(userData){
            
            const passwordMatch = await bcrypt.compare(password, userData.password);
            if(passwordMatch){
                req.session.user = userData;
                res.redirect('/home');
            }
            else{
                res.render('login',{ message:'Email and Password is Incorrect!' });
            }
        }
        else{
            res.render('login',{ message:'Email and Password is Incorrect!' });
        }

    } catch (error) {
        console.log(error.message);
    }
}

const loadRegister = async(req,res) => {

    try{

        res.render('register');

    } catch (error) {
        console.log(error.message);
    }

}

const register = async(req, res)=>{

    try {

        var isUser = await User.findOne({name: req.body.name });
        if(isUser){
            res.render('register',{ success:false,message: 'This User Name ('+req.body.name+') is already exists!' });
        }
        else{

            const passwordHash = await bcrypt.hash(req.body.password, 10);

            const user = new User({
                name: req.body.name,
                email: req.body.email,
                password: passwordHash
            });

            await user.save();

            res.render('register',{ success:true, message: 'Your Registration has beend Completed!' });
        }
        
    } catch (error) {
        console.log(error.message);
    }

}

const loadHome = async(req,res) => {

    try{

        res.render('home');

    } catch (error) {
        console.log(error.message);
    }

}

const logout = async(req, res) =>{
    try {

        req.session.destroy();
        res.redirect('/');
        
    } catch (error) {
        console.log(error.message);
    }
}

module.exports = {
    loadLogin,
    loadRegister,
    loadHome,
    register,
    login,
    logout
}