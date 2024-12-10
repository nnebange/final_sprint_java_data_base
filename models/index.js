// models/index.js  
const mongoose = require('mongoose');  
  
const UserSchema = new mongoose.Schema({  
   username: {  
      type: String,  
      required: true,  
      unique: true  
   },  
   password: {  
      type: String,  
      required: true  
   },  
   votedPolls: [{  
      type: mongoose.Schema.Types.ObjectId,  
      ref: 'Poll'  
   }],  
   createdAt: {  
      type: Date,  
      default: Date.now  
   }  
});  
  
const PollOptionSchema = new mongoose.Schema({  
   answer: {  
      type: String,  
      required: true  
   },  
   votes: {  
      type: Number,  
      default: 0  
   }  
});  
  
const PollSchema = new mongoose.Schema({  
   question: {  
      type: String,  
      required: true  
   },  
   options: [PollOptionSchema],  
   creator: {  
      type: mongoose.Schema.Types.ObjectId,  
      ref: 'User',  
      required: true  
   },  
   createdAt: {  
      type: Date,  
      default: Date.now  
   }  
});  
  
const User = mongoose.model('User', UserSchema);  
const Poll = mongoose.model('Poll', PollSchema);  
  
module.exports = { User, Poll };
