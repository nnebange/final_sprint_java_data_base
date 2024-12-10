const express = require('express');  
const expressWs = require('express-ws');  
const path = require('path');  
const mongoose = require('mongoose');  
const session = require('express-session');  
const bcrypt = require('bcrypt');  
const { User, Poll } = require('./models');  
  
const PORT = 3000;  
const MONGO_URI = 'mongodb://localhost:27017/finals';  
const app = express();  
expressWs(app);  
  
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.use(express.static(path.join(__dirname, 'public')));  
app.set('views', path.join(__dirname, 'views'));  
app.set('view engine', 'ejs');  
app.use(session({  
   secret: 'voting-app-secret',  
   resave: false,  
   saveUninitialized: false,  
}));  
  
let connectedClients = [];  
  
// WebSocket connection handler  
app.ws('/ws', (socket, request) => {  
   connectedClients.push(socket);  
  
   socket.on('message', async (message) => {  
      try {  
        const data = JSON.parse(message);  
        if (data.type === 'vote') {  
           const poll = await Poll.findById(data.pollId);  
           if (!poll) throw new Error('Poll not found');  
  
           const option = poll.options.id(data.optionId);  
           if (!option) throw new Error('Option not found');  
  
           option.votes += 1;  
           await poll.save();  
  
           const user = await User.findById(request.session.user.id);  
           if (!user.votedPolls.includes(data.pollId)) {  
              user.votedPolls.push(data.pollId);  
              await user.save();  
           }  
  
           connectedClients.forEach(client => {  
              client.send(JSON.stringify({  
                type: 'vote',  
                pollId: data.pollId,  
                optionId: data.optionId,  
                newVoteCount: option.votes  
              }));  
           });  
        }  
      } catch (error) {  
        console.error('Error processing vote:', error);  
      }  
   });  
  
   socket.on('close', () => {  
      connectedClients = connectedClients.filter(client => client !== socket);  
   });  
});  
  
// Routes  
app.get('/', async (request, response) => {  
   const pollCount = await Poll.countDocuments();  
   if (request.session.user?.id) {  
      const polls = await Poll.find().sort({ createdAt: -1 });  
      return response.render('index/authenticatedIndex', {  
        polls,  
        pollCount,  
        user: request.session.user  
      });  
   }  
   response.render('index/unauthenticatedIndex', {  
      pollCount,  
      user: null  
   });  
});  
  
app.get('/login', (request, response) => {  
   if (request.session.user?.id) {  
      return response.redirect('/dashboard');  
   }  
   response.render('login', {  
      errorMessage: null,  
      user: null  
   });  
});  
  
app.post('/login', async (request, response) => {  
   const { username, password } = request.body;  
   try {  
      const user = await User.findOne({ username });  
      if (user && await bcrypt.compare(password, user.password)) {  
        request.session.user = { id: user._id, username: user.username };  
        response.redirect('/dashboard');  
      } else {  
        response.render('login', {  
           errorMessage: 'Invalid credentials',  
           user: null  
        });  
      }  
   } catch (error) {  
      response.render('login', {  
        errorMessage: 'An error occurred',  
        user: null  
      });  
   }  
});  
  
app.get('/signup', (request, response) => {  
   if (request.session.user?.id) {  
      return response.redirect('/dashboard');  
   }  
   response.render('signup', {  
      errorMessage: null,  
      user: null  
   });  
});  
  
app.post('/signup', async (request, response) => {  
   try {  
      const { username, password } = request.body;  
      const hashedPassword = await bcrypt.hash(password, 10);  
      const user = new User({ username, password: hashedPassword });  
      await user.save();  
      request.session.user = { id: user._id, username: user.username };  
      response.redirect('/dashboard');  
   } catch (error) {  
      response.render('signup', {  
        errorMessage: 'Error creating account',  
        user: null  
      });  
   }  
});  
  
app.get('/logout', (request, response) => {  
   request.session.destroy();  
   response.redirect('/');  
});  
  
app.get('/dashboard', async (request, response) => {  
   if (!request.session.user?.id) {  
      return response.redirect('/');  
   }  
   try {  
      const polls = await Poll.find().sort({ createdAt: -1 });  
      const pollCount = await Poll.countDocuments();  
      return response.render('index/authenticatedIndex', {  
        polls,  
        pollCount,  
        user: request.session.user  
      });  
   } catch (error) {  
      return response.render('index/authenticatedIndex', {  
        polls: [],  
        pollCount: 0,  
        user: request.session.user,  
        errorMessage: 'Error fetching polls'  
      });  
   }  
});  
  
app.get('/profile', async (request, response) => {  
   if (!request.session.user?.id) {  
      return response.redirect('/');  
   }  
   try {  
      const user = await User.findById(request.session.user.id)  
        .populate('votedPolls');  
      response.render('profile', {  
        user: request.session.user,  
        votedPolls: user.votedPolls  
      });  
   } catch (error) {  
      response.redirect('/dashboard');  
   }  
});  
  
app.get('/createPoll', (request, response) => {  
   if (!request.session.user?.id) {  
      return response.redirect('/');  
   }  
   response.render('createPoll', { user: request.session.user });  
});  
  
app.post('/createPoll', async (request, response) => {  
   try {  
      const { question, options } = request.body;  
      const formattedOptions = Object.values(options).map(option => ({  
        answer: option,  
        votes: 0  
      }));  
  
      const newPoll = new Poll({  
        question,  
        options: formattedOptions,  
        creator: request.session.user.id  
      });  
  
      await newPoll.save();  
  
      connectedClients.forEach(client => {  
        client.send(JSON.stringify({  
           type: 'newPoll',  
           poll: newPoll  
        }));  
      });  
  
      response.redirect('/dashboard');  
   } catch (error) {  
      response.render('createPoll', {  
        errorMessage: 'Error creating poll',  
        user: request.session.user  
      });  
   }  
});  
  
// Database connection  
mongoose.connect(MONGO_URI)  
   .then(() => {  
      console.log('Connected to MongoDB');  
      app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));  
   })  
   .catch((err) => {  
      console.error('MongoDB connection error:', err);  
      process.exit(1);  
   });
